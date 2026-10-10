import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const inquiry = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let db: PGlite;
async function prepare({
  id = randomUUID(),
  actor = admin,
  inquiryId = inquiry,
  hash = "a".repeat(64),
  subject = "Phản hồi Mộc",
} = {}) {
  return db.query(
    "select public.prepare_inquiry_email($1,$2,$3,$4,$5,'Nội dung phản hồi') as id",
    [id, inquiryId, actor, hash, subject],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.admin_members(user_id uuid primary key references auth.users(id));
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_members where user_id=auth.uid())$$;
    create table public.inquiries(id uuid primary key,email text,name text);
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid(),public.is_admin() to anon,authenticated,service_role;
    insert into auth.users values('${admin}'),('${customer}');
    insert into public.admin_members values('${admin}');
    insert into public.inquiries values('${inquiry}','CUSTOMER@example.invalid','Khách Mộc');
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610100014_inquiry_email.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("truncate public.inquiry_email_replies");
});

describe("contact-form reply outbox", () => {
  it("resolves only the original inquiry address and stores the explicit staff reply", async () => {
    await prepare();
    expect(
      (
        await db.query(
          "select recipient_email,subject,body,status from public.inquiry_email_replies",
        )
      ).rows,
    ).toEqual([
      {
        recipient_email: "customer@example.invalid",
        subject: "Phản hồi Mộc",
        body: "Nội dung phản hồi",
        status: "pending",
      },
    ]);
  });
  it("replays one durable reply and rejects changed contents, account or inquiry", async () => {
    const id = randomUUID();
    await prepare({ id });
    await prepare({ id });
    expect(
      (
        await db.query(
          "select count(*)::integer as count from public.inquiry_email_replies",
        )
      ).rows[0],
    ).toEqual({ count: 1 });
    await expect(prepare({ id, hash: "b".repeat(64) })).rejects.toThrow(
      "EMAIL_IDEMPOTENCY_CONFLICT",
    );
    await expect(prepare({ id, inquiryId: randomUUID() })).rejects.toThrow(
      "EMAIL_IDEMPOTENCY_CONFLICT",
    );
    await expect(prepare({ actor: customer })).rejects.toThrow(
      "EMAIL_ADMIN_REQUIRED",
    );
  });
  it("rejects nonexistent inquiries and header injection without creating replies", async () => {
    await expect(prepare({ inquiryId: randomUUID() })).rejects.toThrow(
      "EMAIL_INQUIRY_NOT_FOUND",
    );
    await expect(
      prepare({ subject: "Hello\r\nBcc: other@example.invalid" }),
    ).rejects.toThrow("INVALID_REQUEST");
    expect(
      (await db.query("select * from public.inquiry_email_replies")).rows,
    ).toHaveLength(0);
  });
  it("atomically claims a reply once and never reclaims uncertain or failed sends", async () => {
    await prepare();
    const claim =
      "update public.inquiry_email_replies set status='sending' where status='pending' returning id";
    expect((await db.query(claim)).rows).toHaveLength(1);
    expect((await db.query(claim)).rows).toHaveLength(0);
    for (const status of ["sent", "failed", "unknown"]) {
      await db.query("update public.inquiry_email_replies set status=$1", [
        status,
      ]);
      expect((await db.query(claim)).rows).toHaveLength(0);
    }
  });
  it("exposes history only to admins and denies preparation/writes to every browser role", async () => {
    await prepare();
    for (const [actor, count] of [
      [customer, 0],
      [admin, 1],
    ] as const) {
      await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          actor,
        ]);
        expect(
          (await tx.query("select * from public.inquiry_email_replies")).rows,
        ).toHaveLength(count);
      });
    }
    for (const role of ["anon", "authenticated"]) {
      expect(
        (
          await db.query(
            "select has_function_privilege($1,'public.prepare_inquiry_email(uuid,uuid,uuid,text,text,text)','EXECUTE') as execute,has_table_privilege($1,'public.inquiry_email_replies','UPDATE') as update",
            [role],
          )
        ).rows[0],
      ).toEqual({ execute: false, update: false });
    }
  });
});
