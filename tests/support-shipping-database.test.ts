import { readFile, readdir } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { quoteShipping } from "@/lib/shipping";
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
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    return work(tx);
  });
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; create schema auth;
    create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb not null default '{}'::jsonb,created_at timestamptz default now(),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant select on storage.objects to anon,authenticated; grant insert on storage.objects to authenticated; grant all on storage.objects to service_role;
    insert into auth.users(id,email) values('${owner}','owner@example.invalid'),('${stranger}','stranger@example.invalid'),('${admin}','admin@example.invalid');
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, directory), "utf8"));
  await db.query("insert into public.admin_members(user_id) values($1)", [
    admin,
  ]);
}, 60000);
afterAll(async () => {
  await db?.close();
});

describe("staff support", () => {
  it("persists an account message visible to staff and owner but never another customer", async () => {
    await asRole("authenticated", owner, (tx) =>
      tx.query("select public.send_support_message('Where is MB-12?')"),
    );
    const read = (user: string) =>
      asRole("authenticated", user, (tx) =>
        tx.query("select body,sender from public.support_messages"),
      );
    expect((await read(owner)).rows).toEqual([
      { body: "Where is MB-12?", sender: "customer" },
    ]);
    expect((await read(stranger)).rows).toEqual([]);
    expect((await read(admin)).rows).toHaveLength(1);
    await expect(
      asRole("anon", null, (tx) =>
        tx.query("select * from public.support_messages"),
      ),
    ).rejects.toThrow();
  });
  it("prevents forged staff replies and customer resolution; staff replies reopen and reach the account", async () => {
    await expect(
      asRole("authenticated", stranger, (tx) =>
        tx.query("select public.send_support_message('forged',$1)", [owner]),
      ),
    ).rejects.toThrow("INVALID_REQUEST");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query(
          "insert into public.support_messages(user_id,sender,body) values($1,'staff','forged')",
          [owner],
        ),
      ),
    ).rejects.toThrow();
    await asRole("authenticated", owner, (tx) =>
      tx.query(
        "update public.support_threads set resolved=true where user_id=$1",
        [owner],
      ),
    );
    expect(
      (
        await db.query<{ resolved: boolean }>(
          "select resolved from public.support_threads where user_id=$1",
          [owner],
        )
      ).rows[0].resolved,
    ).toBe(false);
    await asRole("authenticated", admin, (tx) =>
      tx.query(
        "update public.support_threads set resolved=true where user_id=$1",
        [owner],
      ),
    );
    await asRole("authenticated", admin, (tx) =>
      tx.query(
        "select public.send_support_message('Mộc will check this order',$1)",
        [owner],
      ),
    );
    const result = await asRole("authenticated", owner, (tx) =>
      tx.query("select body,sender from public.support_messages order by id"),
    );
    expect(result.rows.at(-1)).toEqual({
      body: "Mộc will check this order",
      sender: "staff",
    });
    expect(
      (
        await db.query<{ resolved: boolean }>(
          "select resolved from public.support_threads where user_id=$1",
          [owner],
        )
      ).rows[0].resolved,
    ).toBe(false);
  });
});

describe("shipping source of truth", () => {
  it("uses matching ward first, province fallback second, and default fee elsewhere", async () => {
    const zones = [
      { name: "Province", province: "Hồ Chí Minh", wards: [], fee: 30000 },
      {
        name: "Local",
        province: "Hồ Chí Minh",
        wards: ["Phường Bến Thành"],
        fee: 15000,
      },
    ];
    await db.query(
      "update public.site_settings set shipping_fee=50000,shipping_zones=$1",
      [JSON.stringify(zones)],
    );
    for (const [city, ward, expected] of [
      ["Hồ Chí Minh", "Phường Bến Thành", 15000],
      ["Hồ Chí Minh", "Other", 30000],
      ["Other", "Other", 50000],
    ] as const) {
      const server = await asRole("service_role", null, (tx) =>
        tx.query<{ fee: number }>(
          "select public.quote_shipping_fee($1) as fee",
          [JSON.stringify({ city, ward })],
        ),
      );
      expect(Number(server.rows[0].fee)).toBe(expected);
      expect(quoteShipping(50000, zones, city, ward).fee).toBe(expected);
    }
    await expect(
      db.query("update public.site_settings set shipping_zones=$1", [
        JSON.stringify([{ ...zones[0], fee: -1 }]),
      ]),
    ).rejects.toThrow("INVALID_REQUEST");
  });
  it("retains atomic create_order variant and voucher logic while replacing only shipping", async () => {
    const result = await db.query<{ definition: string }>(
      "select pg_get_functiondef('public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text)'::regprocedure) as definition",
    );
    expect(result.rows[0].definition).toContain(
      "public.quote_shipping_fee(p_customer)",
    );
    expect(result.rows[0].definition).toContain("chosen_variant");
    expect(result.rows[0].definition).toContain("eligible_subtotal");
  });
});
