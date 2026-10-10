import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { demoProducts } from "@/lib/demo-data";
import { digest } from "@/lib/supabase/receipts";

const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customer = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const product = demoProducts[0].id;
const attribution = {
  consent: true,
  client_id: "123.456",
  session_id: "789",
  landing_path: "/san-pham",
};
let db: PGlite;
async function role<T>(
  name: string,
  user: string | null,
  work: (tx: Transaction) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${name}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    return work(tx);
  });
}
async function create(analytics: unknown = attribution, key = randomUUID()) {
  return role(
    "service_role",
    null,
    async (tx) =>
      (
        await tx.query<{ receipt: { id: string } }>(
          "select public.create_order_with_analytics($1::jsonb,$2::jsonb,$3::uuid,$4,$5,null,'cod','',$6::jsonb) as receipt",
          [
            JSON.stringify([{ product_id: product, quantity: 1 }]),
            JSON.stringify({
              name: "QA",
              email: "qa@example.invalid",
              phone: "0900000000",
              address: "No delivery",
              city: "Test",
              note: "",
            }),
            key,
            digest(key),
            digest(key),
            analytics == null ? null : JSON.stringify(analytics),
          ],
        )
      ).rows[0].receipt,
  );
}
const status = (id: string, state: string) =>
  role("authenticated", admin, (tx) =>
    tx.query(
      "select public.set_order_status($1::uuid,$2::public.order_status,false)",
      [id, state],
    ),
  );
const payment = (id: string, action: string) =>
  role("authenticated", admin, (tx) =>
    tx.query(
      "select public.record_order_payment($1::uuid,$2,'QA ledger confirmation')",
      [id, action],
    ),
  );
const claim = () =>
  role(
    "service_role",
    null,
    async (tx) =>
      (
        await tx.query<{ events: { order_id: string; event: string }[] }>(
          "select public.claim_order_analytics() as events",
        )
      ).rows[0].events,
  );
async function summary() {
  return role(
    "authenticated",
    admin,
    async (tx) =>
      (
        await tx.query<{
          data: {
            successful_orders: number;
            attributed_orders: number;
            landing_revenue: {
              name: string;
              orders: number;
              revenue: number;
            }[];
          };
        }>(
          "select public.traffic_order_summary(current_date-1,current_date+1) as data",
        )
      ).rows[0].data,
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated,service_role;
    grant select on storage.objects to anon,authenticated; grant insert on storage.objects to authenticated; grant all on storage.objects to service_role;
    insert into auth.users values('${admin}'),('${customer}');`);
  for (const name of [
    "202610030001_initial.sql",
    "202610030002_manual_payments.sql",
    "202610050003_store_features.sql",
    "202610090005_returned_status.sql",
    "202610090006_product_variants_returns.sql",
    "202610090007_promotion_scope.sql",
    "202610090010_costs.sql",
    "202610100013_analytics_attribution.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.admin_members(user_id) values($1)", [
    admin,
  ]);
}, 60000);
beforeEach(async () => {
  await db.exec(
    "truncate public.orders cascade; update public.products set stock=100,active=true",
  );
});
afterAll(async () => {
  await db?.close();
});

describe("durable successful-order analytics", () => {
  it("requires explicit consent atomically and preserves the first attribution on idempotent replay", async () => {
    await expect(create({ ...attribution, consent: false })).rejects.toThrow(
      "INVALID_ANALYTICS_CONSENT",
    );
    expect((await db.query("select id from public.orders")).rows).toEqual([]);
    const key = randomUUID();
    const first = await create(attribution, key);
    expect(await create({ ...attribution, client_id: "999.888" }, key)).toEqual(
      first,
    );
    expect(
      (
        await db.query(
          "select client_id,landing_path from public.order_analytics",
        )
      ).rows,
    ).toEqual([{ client_id: "123.456", landing_path: "/san-pham" }]);
    for (const user of [customer, admin])
      await expect(
        role("authenticated", user, (tx) =>
          tx.query("select * from public.order_analytics"),
        ),
      ).rejects.toThrow("permission denied");
    await expect(
      role("anon", null, (tx) =>
        tx.query("select public.claim_order_analytics()"),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("queues purchase only after both delivery and payment, leases it once and orders a real refund after purchase", async () => {
    const { id } = await create();
    expect(await claim()).toEqual([]);
    await status(id, "confirmed");
    await status(id, "processing");
    await status(id, "shipped");
    await status(id, "completed");
    expect(await claim()).toEqual([]);
    await payment(id, "paid");
    expect(await claim()).toMatchObject([{ order_id: id, event: "purchase" }]);
    expect(await claim()).toEqual([]);
    await payment(id, "paid");
    expect(
      (await db.query("select event from public.order_analytics_events")).rows,
    ).toEqual([{ event: "purchase" }]);
    expect(await summary()).toMatchObject({
      successful_orders: 1,
      attributed_orders: 1,
      landing_revenue: [
        { name: "/san-pham", orders: 1, revenue: demoProducts[0].price },
      ],
    });
    await status(id, "returned");
    await payment(id, "refunded");
    expect(await claim()).toEqual([]);
    await db.exec(
      "update public.order_analytics_events set status='sent',lease_until=null where event='purchase'",
    );
    expect(await claim()).toMatchObject([{ order_id: id, event: "refund" }]);
    await db.exec(
      "update public.order_analytics_events set lease_until=now()-interval '1 second' where event='refund'",
    );
    expect(await claim()).toEqual([]);
    expect(
      (
        await db.query(
          "select status from public.order_analytics_events where event='refund'",
        )
      ).rows,
    ).toEqual([{ status: "uncertain" }]);
    expect(await summary()).toMatchObject({
      successful_orders: 0,
      attributed_orders: 0,
      landing_revenue: [],
    });
  });
  it("includes untracked successful orders in the ledger but never invents GA identity or purchase events", async () => {
    const { id } = await create(null);
    await payment(id, "paid");
    await status(id, "confirmed");
    await status(id, "processing");
    await status(id, "shipped");
    await status(id, "completed");
    expect(await claim()).toEqual([]);
    expect(await summary()).toMatchObject({
      successful_orders: 1,
      attributed_orders: 0,
      landing_revenue: [],
    });
    await expect(
      role("authenticated", customer, (tx) =>
        tx.query(
          "select public.traffic_order_summary(current_date,current_date)",
        ),
      ),
    ).rejects.toThrow("FORBIDDEN");
  });
  it("retries an expired lease but expires provider events older than its real backdate window", async () => {
    const { id } = await create();
    await payment(id, "paid");
    await status(id, "confirmed");
    await status(id, "processing");
    await status(id, "shipped");
    await status(id, "completed");
    await claim();
    await db.exec(
      "update public.order_analytics_events set lease_until=now()-interval '1 second'",
    );
    expect(await claim()).toMatchObject([{ order_id: id, event: "purchase" }]);
    await db.exec(
      "update public.order_analytics_events set occurred_at=now()-interval '73 hours',lease_until=now()-interval '1 second'",
    );
    expect(await claim()).toEqual([]);
    expect(
      (
        await db.query(
          "select status,attempts from public.order_analytics_events",
        )
      ).rows,
    ).toEqual([{ status: "expired", attempts: 2 }]);
  });
});
