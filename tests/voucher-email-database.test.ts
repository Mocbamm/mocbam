import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const other = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unverified = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const voucher = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
let db: PGlite;

async function prepare({
  id = randomUUID(),
  actor = admin,
  recipients = [customer],
  hash = "a".repeat(64),
} = {}) {
  return db.query<{ id: string }>(
    "select public.prepare_voucher_email($1,$2,$3,$4,'Voucher Mộc','Chào {ten_khach}',$5::uuid[]) as id",
    [id, voucher, actor, hash, recipients],
  );
}

beforeAll(async () => {
  db = new PGlite();
  // Exercise the production migration against real Postgres/RLS. Only the
  // preexisting tables it depends on are reduced to the relevant columns.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.admin_members(user_id uuid primary key references auth.users(id));
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_members where user_id=auth.uid())$$;
    create table public.profiles(id uuid primary key references auth.users(id),full_name text,email text);
    create table public.discounts(id uuid primary key,scope text,active boolean,ends_at timestamptz,max_uses integer,used_count integer,customer_user_ids uuid[],customer_user_id uuid);
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid(),public.is_admin() to anon,authenticated,service_role;
    insert into auth.users values
      ('${admin}','admin@example.invalid',now()),
      ('${customer}','TRUSTED@example.invalid',now()),
      ('${other}','other@example.invalid',now()),
      ('${unverified}','unverified@example.invalid',null);
    insert into public.admin_members values('${admin}');
    insert into public.profiles values('${customer}','Khách Mộc','spoofed-profile@example.invalid');
    insert into public.discounts values('${voucher}','private',true,null,null,0,array['${customer}'::uuid,'${unverified}'::uuid],null);
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610100012_voucher_email.sql",
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
  await db.exec(
    `truncate public.voucher_email_campaigns cascade; update public.discounts set scope='private',active=true,ends_at=null,max_uses=null,used_count=0,customer_user_ids=array['${customer}'::uuid,'${unverified}'::uuid],customer_user_id=null;`,
  );
});

describe("voucher email durable outbox", () => {
  it("creates a recipient from the verified auth address, ignoring editable profile email", async () => {
    const id = randomUUID();
    await prepare({ id });
    expect(
      (
        await db.query(
          "select campaign_id,recipient_email,recipient_name,status from public.voucher_email_deliveries",
        )
      ).rows,
    ).toEqual([
      {
        campaign_id: id,
        recipient_email: "trusted@example.invalid",
        recipient_name: "Khách Mộc",
        status: "pending",
      },
    ]);
  });

  it("replays a batch without inserting another email and rejects changed payload/administrator", async () => {
    const id = randomUUID();
    await prepare({ id });
    await prepare({ id });
    expect(
      (
        await db.query(
          "select count(*)::integer as count from public.voucher_email_deliveries",
        )
      ).rows[0],
    ).toEqual({ count: 1 });
    await expect(prepare({ id, hash: "b".repeat(64) })).rejects.toThrow(
      "EMAIL_IDEMPOTENCY_CONFLICT",
    );
    await expect(prepare({ actor: other })).rejects.toThrow(
      "EMAIL_ADMIN_REQUIRED",
    );
  });

  it("rejects unauthorized and unverified recipients atomically", async () => {
    await expect(prepare({ recipients: [customer, other] })).rejects.toThrow(
      "EMAIL_RECIPIENT_NOT_ELIGIBLE",
    );
    await expect(
      prepare({ recipients: [customer, unverified] }),
    ).rejects.toThrow("EMAIL_RECIPIENT_UNVERIFIED");
    expect(
      (
        await db.query(
          "select count(*)::integer as count from public.voucher_email_campaigns",
        )
      ).rows[0],
    ).toEqual({ count: 0 });
    await expect(prepare({ recipients: [customer, customer] })).rejects.toThrow(
      "INVALID_REQUEST",
    );
  });

  it("accepts legacy single-customer vouchers and rejects public, paused, expired or exhausted vouchers", async () => {
    await db.exec(
      `update public.discounts set customer_user_ids='{}',customer_user_id='${customer}'`,
    );
    await prepare();
    for (const update of [
      "scope='shop'",
      "scope='private',active=false",
      "active=true,ends_at=now()-interval '1 second'",
      "ends_at=null,max_uses=1,used_count=1",
    ]) {
      await db.exec(`update public.discounts set ${update}`);
      await expect(prepare()).rejects.toThrow(
        /EMAIL_PRIVATE_REQUIRED|DISCOUNT_UNAVAILABLE/,
      );
    }
  });

  it("claims each recipient once and never reclaims sent, failed or uncertain deliveries", async () => {
    await prepare();
    const claim =
      "update public.voucher_email_deliveries set status='sending',attempted_at=now() where status='pending' returning id";
    expect((await db.query(claim)).rows).toHaveLength(1);
    expect((await db.query(claim)).rows).toHaveLength(0);
    for (const status of ["sent", "failed", "unknown"]) {
      await db.query("update public.voucher_email_deliveries set status=$1", [
        status,
      ]);
      expect((await db.query(claim)).rows).toHaveLength(0);
    }
  });

  it("keeps customer/anonymous roles out of history and all email-write operations", async () => {
    await prepare();
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        customer,
      ]);
      expect(
        (await tx.query("select * from public.voucher_email_campaigns")).rows,
      ).toHaveLength(0);
      expect(
        (await tx.query("select * from public.voucher_email_deliveries")).rows,
      ).toHaveLength(0);
    });
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        admin,
      ]);
      expect(
        (await tx.query("select * from public.voucher_email_campaigns")).rows,
      ).toHaveLength(1);
      expect(
        (await tx.query("select * from public.voucher_email_deliveries")).rows,
      ).toHaveLength(1);
    });
    for (const role of ["anon", "authenticated"]) {
      const privileges = (
        await db.query(
          "select has_function_privilege($1,'public.prepare_voucher_email(uuid,uuid,uuid,text,text,text,uuid[])','EXECUTE') as execute,has_table_privilege($1,'public.voucher_email_deliveries','UPDATE') as update",
          [role],
        )
      ).rows[0];
      expect(privileges).toEqual({ execute: false, update: false });
    }
  });
});
