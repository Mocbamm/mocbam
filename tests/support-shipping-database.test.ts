import { readFile, readdir } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { quoteShipping } from "@/lib/shipping";
import { getAdminDashboard } from "@/lib/catalog";
const auth = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: auth.requireAdmin }));
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

describe("admin overview with the migrated support schema", () => {
  it("counts unresolved support threads and contact inquiries without failing the dashboard", async () => {
    await db.query(
      "insert into public.support_threads(user_id,resolved) values($1,false),($2,true) on conflict(user_id) do update set resolved=excluded.resolved",
      [owner, stranger],
    );
    await db.query(
      "insert into public.inquiries(name,email,message,resolved) values('Dashboard QA','dashboard@example.invalid','Unresolved contact',false),('Resolved QA','resolved@example.invalid','Resolved contact',true)",
    );
    // Execute the production reader's selected columns against the migrated
    // database: a nonexistent support-thread column must fail this test.
    auth.requireAdmin.mockResolvedValue({
      supabase: {
        from(table: string) {
          let fields = "*";
          let count = false;
          const filters: [string, unknown][] = [];
          async function execute() {
            try {
              const where = filters.length
                ? ` where ${filters.map(([column], i) => `${column}=$${i + 1}`).join(" and ")}`
                : "";
              const result = await asRole("authenticated", admin, (tx) =>
                tx.query<Record<string, unknown>>(
                  `select ${count ? `count(${fields})::integer as count` : fields} from public.${table}${where}`,
                  filters.map(([, value]) => value),
                ),
              );
              return count
                ? { data: null, count: result.rows[0].count, error: null }
                : { data: result.rows, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
          const query = {
            select(columns: string, options?: { head?: boolean }) {
              fields = columns;
              count = Boolean(options?.head);
              return query;
            },
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              return query;
            },
            order() {
              return query;
            },
            range: execute,
            then: (...args: Parameters<ReturnType<typeof execute>["then"]>) =>
              execute().then(...args),
          };
          return query;
        },
      },
    });
    expect(await getAdminDashboard()).toMatchObject({
      product_count: 0,
      order_count: 0,
      pending_orders: 0,
      inquiry_count: 2,
    });
    await asRole("authenticated", admin, (tx) =>
      tx.query(
        "update public.support_threads set resolved=true where user_id=$1",
        [owner],
      ),
    );
    expect((await getAdminDashboard()).inquiry_count).toBe(1);
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

describe("distance shipping quotes", () => {
  const address = {
    address: "12 Test Road, Test Ward",
    city: "Hồ Chí Minh",
    ward: "Test Ward",
  };
  const quote = async (meters: number) =>
    (
      await asRole("service_role", null, (tx) =>
        tx.query<{
          quote: { id: string; fee: number; distance_meters: number };
        }>(
          "select public.create_shipping_quote($1,$2,(select shipping_origin_address from public.site_settings where id=true)) as quote",
          [JSON.stringify(address), meters],
        ),
      )
    ).rows[0].quote;
  const fee = (id?: string, changes = {}) =>
    asRole("service_role", null, (tx) =>
      tx.query<{ fee: string }>("select public.quote_shipping_fee($1) as fee", [
        JSON.stringify({
          ...address,
          ...changes,
          ...(id ? { shipping_quote_id: id } : {}),
        }),
      ]),
    );
  it("validates ordered bands and uses inclusive road-distance boundaries with zone fallback", async () => {
    await db.query(
      "update public.site_settings set shipping_distance_enabled=true,shipping_origin_address='1 Store Road',shipping_distance_bands=$1",
      [
        JSON.stringify([
          { up_to_km: 5, fee: 10000 },
          { up_to_km: 10, fee: 20000 },
        ]),
      ],
    );
    expect((await quote(0)).fee).toBe(10000);
    expect((await quote(5000)).fee).toBe(10000);
    expect((await quote(5001)).fee).toBe(20000);
    expect((await quote(10000)).fee).toBe(20000);
    expect((await quote(10001)).fee).toBe(30000);
    for (const bands of [
      [{ up_to_km: 0, fee: 10 }],
      [
        { up_to_km: 5, fee: 10 },
        { up_to_km: 5, fee: 20 },
      ],
      [
        { up_to_km: 6, fee: 10 },
        { up_to_km: 5, fee: 20 },
      ],
    ]) {
      await expect(
        db.query("update public.site_settings set shipping_distance_bands=$1", [
          JSON.stringify(bands),
        ]),
      ).rejects.toThrow("INVALID_REQUEST");
    }
  });
  it("rejects absent, forged, expired, changed-address, and stale-configuration quotes", async () => {
    await expect(fee()).rejects.toThrow("SHIPPING_QUOTE_REQUIRED");
    await expect(fee("dddddddd-dddd-4ddd-8ddd-dddddddddddd")).rejects.toThrow(
      "SHIPPING_QUOTE_EXPIRED",
    );
    const q = await quote(4200);
    expect(Number((await fee(q.id)).rows[0].fee)).toBe(10000);
    expect(
      Number(
        (
          await fee(q.id, {
            address: " 12 test road, test ward ",
            city: "hồ chí minh",
            ward: "test ward ",
          })
        ).rows[0].fee,
      ),
    ).toBe(10000);
    await expect(fee(q.id, { address: "Another address" })).rejects.toThrow(
      "SHIPPING_QUOTE_EXPIRED",
    );
    await expect(fee(q.id, { ward: "Another ward" })).rejects.toThrow(
      "SHIPPING_QUOTE_EXPIRED",
    );
    await expect(fee(q.id, { city: "Another city" })).rejects.toThrow(
      "SHIPPING_QUOTE_EXPIRED",
    );
    await db.query(
      "update public.shipping_quotes set expires_at=now()-interval '1 second' where id=$1",
      [q.id],
    );
    await expect(fee(q.id)).rejects.toThrow("SHIPPING_QUOTE_EXPIRED");
    const fresh = await quote(4200);
    await db.query(
      "update public.site_settings set shipping_origin_address='2 Store Road'",
    );
    await expect(fee(fresh.id)).rejects.toThrow("SHIPPING_QUOTE_EXPIRED");
    await expect(
      asRole("service_role", null, (tx) =>
        tx.query(
          "select public.create_shipping_quote($1,4200,'1 Store Road')",
          [JSON.stringify(address)],
        ),
      ),
    ).rejects.toThrow("SHIPPING_QUOTE_EXPIRED");
    expect((await quote(4200)).fee).toBe(10000);
  });
  it("rejects a quote expiring while the checkout transaction waits", async () => {
    const q = await quote(4200);
    await expect(
      asRole("service_role", null, async (tx) => {
        await tx.query(
          "update public.shipping_quotes set expires_at=clock_timestamp()+interval '0.02 seconds' where id=$1",
          [q.id],
        );
        await tx.query("select pg_sleep(0.04)");
        return tx.query("select public.quote_shipping_fee($1)", [
          JSON.stringify({ ...address, shipping_quote_id: q.id }),
        ]);
      }),
    ).rejects.toThrow("SHIPPING_QUOTE_EXPIRED");
  });
  it("prevents customers from reading private address quotes or forging distance and limits requests atomically", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await expect(
        asRole(role, owner, (tx) =>
          tx.query("select * from public.shipping_quotes"),
        ),
      ).rejects.toThrow();
      await expect(
        asRole(role, owner, (tx) =>
          tx.query("select public.create_shipping_quote($1,1,'2 Store Road')", [
            JSON.stringify(address),
          ]),
        ),
      ).rejects.toThrow();
    }
    for (let i = 0; i < 11; i++) {
      const result = await asRole("service_role", null, (tx) =>
        tx.query<{ allowed: boolean }>(
          "select public.reserve_shipping_request($1) as allowed",
          ["a".repeat(64)],
        ),
      );
      expect(result.rows[0].allowed).toBe(i < 10);
    }
    await db.query(
      "update public.site_settings set shipping_distance_enabled=false",
    );
    expect(Number((await fee()).rows[0].fee)).toBe(30000);
  });
});
