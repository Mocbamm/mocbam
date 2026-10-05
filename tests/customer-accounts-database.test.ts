import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const stranger = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let db: PGlite;

async function asRole<T>(
  role: "anon" | "authenticated" | "service_role",
  user: string | null,
  work: (tx: Transaction) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role};`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    return work(tx);
  });
}
async function insertOrder(
  email = "owner@example.com",
  userId: string | null = null,
) {
  const id = randomUUID();
  await db.query(
    "insert into public.orders(id,user_id,customer_name,email,phone,address,city,subtotal,shipping_fee,total,idempotency_key,payload_hash,guest_access_hash) values($1,$2,'Fixture customer',$3,'0901234567','Fixture address','Fixture city',0,0,0,$4,$5,$6)",
    [id, userId, email, randomUUID(), "a".repeat(64), "b".repeat(64)],
  );
  return id;
}
async function claim(userId = owner) {
  const result = await asRole("service_role", null, (tx) =>
    tx.query<{ count: number }>(
      "select public.claim_guest_orders($1) as count",
      [userId],
    ),
  );
  return result.rows[0].count;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema extensions;
    create schema auth;
    create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb not null default '{}'::jsonb,created_at timestamptz default now(),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    grant usage on schema public to anon,authenticated,service_role;
    -- Mirror Supabase's defaults, which must be removed by the migrations.
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant select on storage.objects to anon,authenticated;
    grant insert on storage.objects to authenticated;
    grant all on storage.objects to service_role;
    insert into auth.users(id,email,phone,raw_user_meta_data,created_at,email_confirmed_at) values
      ('${owner}','OWNER@example.com','', '{"full_name":"Khách Mẫu","phone":"0901234567"}','2024-01-01T00:00:00Z',now()),
      ('${stranger}','stranger@example.com','0907654321','{"name":"Khách Google"}','2024-02-01T00:00:00Z',null),
      ('${admin}','admin@example.com','','{}','2024-03-01T00:00:00Z',now());
  `);
  for (const migration of [
    "202610030001_initial.sql",
    "202610030002_manual_payments.sql",
    "202610050003_store_features.sql",
    "202610050004_customer_accounts_chat.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${migration}`, import.meta.url),
        "utf8",
      ),
    );
  }
  await db.query("insert into public.admin_members(user_id) values($1)", [
    admin,
  ]);
}, 60000);
beforeEach(async () => {
  await db.exec(
    "truncate public.orders cascade; truncate public.chat_conversations;",
  );
  await db.query(
    "update auth.users set email='OWNER@example.com',email_confirmed_at=now() where id=$1",
    [owner],
  );
  await db.query(
    "update auth.users set email='stranger@example.com',email_confirmed_at=null where id=$1",
    [stranger],
  );
  await db.query(
    "update public.profiles set full_name='Khách Mẫu',phone='0901234567' where id=$1",
    [owner],
  );
});
afterAll(async () => {
  await db?.close();
});

describe("customer-profile migration and privileges", () => {
  it("resets inherited Supabase privileges before granting only self contact edits", async () => {
    const { rows } = await db.query<{
      email_update: boolean;
      name_update: boolean;
      profile_truncate: boolean;
      chat_truncate: boolean;
    }>(
      "select has_column_privilege('authenticated','public.profiles','email','UPDATE') as email_update,has_column_privilege('authenticated','public.profiles','full_name','UPDATE') as name_update,has_table_privilege('authenticated','public.profiles','TRUNCATE') as profile_truncate,has_table_privilege('authenticated','public.chat_conversations','TRUNCATE') as chat_truncate",
    );
    expect(rows[0]).toEqual({
      email_update: false,
      name_update: true,
      profile_truncate: false,
      chat_truncate: false,
    });
    for (const table of ["profiles", "chat_conversations"]) {
      await expect(
        asRole("authenticated", owner, (tx) =>
          tx.exec(`truncate public.${table}`),
        ),
      ).rejects.toThrow("permission denied");
    }
  });
  it("backfills Google/email contact metadata and preserves the original account creation date", async () => {
    const { rows } = await db.query<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      created_at: Date;
    }>(
      "select id,full_name,email,phone,created_at from public.profiles order by id",
    );
    expect(rows.find((row) => row.id === owner)).toMatchObject({
      full_name: "Khách Mẫu",
      email: "owner@example.com",
      phone: "0901234567",
    });
    expect(rows.find((row) => row.id === owner)?.created_at.toISOString()).toBe(
      "2024-01-01T00:00:00.000Z",
    );
    expect(rows.find((row) => row.id === stranger)).toMatchObject({
      full_name: "Khách Google",
      phone: "0907654321",
    });
  });
  it("creates bounded profiles on signup and synchronizes auth email without overwriting edited contacts", async () => {
    const newId = randomUUID();
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,'NEW@example.com',$2)",
      [
        newId,
        JSON.stringify({ full_name: "N".repeat(150), phone: "9".repeat(50) }),
      ],
    );
    const first = (
      await db.query<{ full_name: string; phone: string; email: string }>(
        "select full_name,phone,email from public.profiles where id=$1",
        [newId],
      )
    ).rows[0];
    expect(first.full_name).toHaveLength(100);
    expect(first.phone).toHaveLength(30);
    expect(first.email).toBe("new@example.com");
    await db.query(
      "update public.profiles set full_name='Tên đã sửa',phone='0900000000' where id=$1",
      [newId],
    );
    await db.query(
      "update auth.users set email='CHANGED@example.com',raw_user_meta_data='{}' where id=$1",
      [newId],
    );
    expect(
      (
        await db.query(
          "select full_name,phone,email from public.profiles where id=$1",
          [newId],
        )
      ).rows[0],
    ).toEqual({
      full_name: "Tên đã sửa",
      phone: "0900000000",
      email: "changed@example.com",
    });
  });
  it("shows customers only their profile and allows administrators to read the customer list", async () => {
    for (const [user, count] of [
      [owner, 1],
      [stranger, 1],
      [admin, 3],
    ] as const) {
      const rows = await asRole("authenticated", user, (tx) =>
        tx.query(
          "select id,email,phone from public.profiles where id=any($1::uuid[])",
          [[owner, stranger, admin]],
        ),
      );
      expect(rows.rows).toHaveLength(count);
    }
    await expect(
      asRole("anon", null, (tx) => tx.query("select id from public.profiles")),
    ).rejects.toThrow("permission denied");
  });
  it("permits only self contact edits and updates their timestamp", async () => {
    await db.query("delete from public.profiles where id=$1", [owner]);
    await db.query(
      "insert into public.profiles(id,full_name,email,phone,updated_at) values($1,'Before','owner@example.com','0901234567','2000-01-01T00:00:00Z')",
      [owner],
    );
    const changed = await asRole("authenticated", owner, (tx) =>
      tx.query<{ full_name: string; updated_at: Date }>(
        "update public.profiles set full_name='After',phone='0900000000' where id=$1 returning full_name,updated_at",
        [owner],
      ),
    );
    expect(changed.rows[0].full_name).toBe("After");
    expect(changed.rows[0].updated_at.getUTCFullYear()).toBeGreaterThan(2000);
    expect(
      (
        await asRole("authenticated", stranger, (tx) =>
          tx.query(
            "update public.profiles set full_name='Intruder' where id=$1 returning id",
            [owner],
          ),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await asRole("authenticated", admin, (tx) =>
          tx.query(
            "update public.profiles set full_name='Admin edit' where id=$1 returning id",
            [owner],
          ),
        )
      ).rows,
    ).toEqual([]);
    for (const sql of [
      "update public.profiles set email='spoofed@example.com' where id=$1",
      "update public.profiles set id=gen_random_uuid() where id=$1",
      "delete from public.profiles where id=$1",
    ]) {
      await expect(
        asRole("authenticated", owner, (tx) => tx.query(sql, [owner])),
      ).rejects.toThrow("permission denied");
    }
  });
});

describe("verified guest ownership recovery", () => {
  it("claims exact email matches once without moving another account's orders or changing receipts", async () => {
    const guest = await insertOrder("owner@example.com");
    const upperCaseGuest = await insertOrder("OWNER@example.com");
    const assigned = await insertOrder("owner@example.com", stranger);
    const different = await insertOrder("other@example.com");
    expect(await claim()).toBe(2);
    expect(await claim()).toBe(0);
    const { rows } = await db.query<{
      id: string;
      user_id: string | null;
      guest_access_hash: string;
    }>("select id,user_id,guest_access_hash from public.orders");
    expect(rows.find((row) => row.id === guest)).toMatchObject({
      user_id: owner,
      guest_access_hash: "b".repeat(64),
    });
    expect(rows.find((row) => row.id === upperCaseGuest)?.user_id).toBe(owner);
    expect(rows.find((row) => row.id === assigned)?.user_id).toBe(stranger);
    expect(rows.find((row) => row.id === different)?.user_id).toBeNull();
    expect(
      (
        await asRole("authenticated", owner, (tx) =>
          tx.query("select id from public.orders"),
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("rejects editable profile email and unverified auth metadata as ownership proof", async () => {
    const guest = await insertOrder("stranger@example.com");
    await db.query("update auth.users set raw_user_meta_data=$1 where id=$2", [
      JSON.stringify({
        email: "stranger@example.com",
        email_confirmed_at: "forged",
      }),
      stranger,
    ]);
    expect(await claim(stranger)).toBe(0);
    await db.query(
      "update public.profiles set email='stranger@example.com' where id=$1",
      [owner],
    );
    expect(await claim(owner)).toBe(0);
    expect(
      (
        await db.query<{ user_id: string | null }>(
          "select user_id from public.orders where id=$1",
          [guest],
        )
      ).rows[0].user_id,
    ).toBeNull();
    expect(await claim(randomUUID())).toBe(0);
  });
  it("restricts recovery RPC to service role while retaining the ban on direct order updates", async () => {
    await insertOrder();
    for (const [role, user] of [
      ["anon", null],
      ["authenticated", owner],
      ["authenticated", admin],
    ] as const) {
      await expect(
        asRole(role, user, (tx) =>
          tx.query("select public.claim_guest_orders($1)", [owner]),
        ),
      ).rejects.toThrow("permission denied");
    }
    await expect(
      asRole("service_role", null, (tx) =>
        tx.query("update public.orders set user_id=$1", [owner]),
      ),
    ).rejects.toThrow("permission denied");
    expect(await claim()).toBe(1);
  });
});

describe("saved-chat owner isolation", () => {
  it("persists an owner's history and hides it from unrelated customers and administrators", async () => {
    const messages = [
      { role: "user", text: "Fixture question" },
      { role: "bot", text: "Fixture answer" },
    ];
    await asRole("authenticated", owner, (tx) =>
      tx.query(
        "insert into public.chat_conversations(user_id,messages) values($1,$2)",
        [owner, JSON.stringify(messages)],
      ),
    );
    const read = await asRole("authenticated", owner, (tx) =>
      tx.query<{ messages: unknown }>(
        "select messages from public.chat_conversations",
      ),
    );
    expect(read.rows[0].messages).toEqual(messages);
    for (const user of [stranger, admin])
      expect(
        (
          await asRole("authenticated", user, (tx) =>
            tx.query("select user_id from public.chat_conversations"),
          )
        ).rows,
      ).toEqual([]);
    await expect(
      asRole("anon", null, (tx) =>
        tx.query("select messages from public.chat_conversations"),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("blocks cross-account inserts, writes, deletion and owner-ID rewrites", async () => {
    await asRole("authenticated", owner, (tx) =>
      tx.query("insert into public.chat_conversations(user_id) values($1)", [
        owner,
      ]),
    );
    await expect(
      asRole("authenticated", stranger, (tx) =>
        tx.query("insert into public.chat_conversations(user_id) values($1)", [
          admin,
        ]),
      ),
    ).rejects.toThrow("row-level security");
    expect(
      (
        await asRole("authenticated", stranger, (tx) =>
          tx.query(
            "update public.chat_conversations set messages='[]' where user_id=$1 returning user_id",
            [owner],
          ),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await asRole("authenticated", stranger, (tx) =>
          tx.query(
            "delete from public.chat_conversations where user_id=$1 returning user_id",
            [owner],
          ),
        )
      ).rows,
    ).toEqual([]);
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query(
          "update public.chat_conversations set user_id=$1 where user_id=$2",
          [stranger, owner],
        ),
      ),
    ).rejects.toThrow("row-level security");
    expect(
      (
        await asRole("authenticated", owner, (tx) =>
          tx.query(
            "delete from public.chat_conversations where user_id=$1 returning user_id",
            [owner],
          ),
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("rejects non-array, excessively long and oversized message histories", async () => {
    for (const messages of [
      { text: "not an array" },
      Array.from({ length: 101 }, () => ({ role: "user", text: "A" })),
      [{ role: "user", text: "A".repeat(80001) }],
    ]) {
      await expect(
        asRole("authenticated", owner, (tx) =>
          tx.query(
            "insert into public.chat_conversations(user_id,messages) values($1,$2)",
            [owner, JSON.stringify(messages)],
          ),
        ),
      ).rejects.toThrow("check constraint");
    }
  });
});
