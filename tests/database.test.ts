import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { demoProducts } from "@/lib/demo-data";
import { digest } from "@/lib/supabase/receipts";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const stranger = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customer = {
  name: "Khách Mẫu",
  email: "customer@example.com",
  phone: "0901234567",
  address: "12 Đường Mộc",
  city: "TP. Hồ Chí Minh",
  note: "",
};
let db: PGlite;

async function asRole<T>(
  role: "anon" | "authenticated" | "service_role",
  user: string | null,
  work: (tx: Transaction) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role};`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
      user || "",
    ]);
    return work(tx);
  });
}
async function createOrder(
  items = [{ product_id: demoProducts[0].id, quantity: 2 }],
  key = randomUUID(),
  user: string | null = owner,
  payload = digest(JSON.stringify(items)),
) {
  return asRole("service_role", null, async (tx) => {
    const result = await tx.query<{
      receipt: { id: string; reference: string };
    }>(
      "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6::uuid) as receipt",
      [
        JSON.stringify(items),
        JSON.stringify(customer),
        key,
        payload,
        digest(key),
        user,
      ],
    );
    return result.rows[0].receipt;
  });
}
async function stock(id = demoProducts[0].id) {
  return Number(
    (
      await db.query<{ stock: number }>(
        "select stock from public.products where id = $1",
        [id],
      )
    ).rows[0].stock,
  );
}
async function cancel(id: string) {
  return asRole("authenticated", admin, (tx) =>
    tx.query("select public.set_order_status($1::uuid,'cancelled')", [id]),
  );
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema extensions;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select on storage.objects to anon, authenticated;
    grant insert on storage.objects to authenticated;
    grant all on storage.objects to service_role;
    insert into auth.users values ('${owner}'),('${stranger}'),('${admin}');
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610030001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.admin_members(user_id) values ($1)", [
    admin,
  ]);
}, 60_000);
beforeEach(async () => {
  await db.exec(
    "truncate public.orders cascade; truncate public.inquiries; truncate storage.objects;",
  );
  for (const product of demoProducts)
    await db.query(
      "update public.products set stock=$1,active=true where id=$2",
      [product.stock, product.id],
    );
});
afterAll(async () => {
  await db?.close();
});

describe("real PostgreSQL order transactions", () => {
  it("runs migration and seed, calculates database prices and stores awaiting-payment snapshots", async () => {
    const receipt = await createOrder();
    const { rows } = await db.query<{
      subtotal: number;
      shipping_fee: number;
      total: number;
      payment_status: string;
    }>(
      "select subtotal,shipping_fee,total,payment_status from public.orders where id=$1",
      [receipt.id],
    );
    expect(Number(rows[0].subtotal)).toBe(demoProducts[0].price * 2);
    expect(Number(rows[0].shipping_fee)).toBe(0);
    expect(Number(rows[0].total)).toBe(demoProducts[0].price * 2);
    expect(rows[0].payment_status).toBe("awaiting_payment");
    expect(receipt.reference).toMatch(/^MB-\d+$/);
    expect(await stock()).toBe(demoProducts[0].stock - 2);
  });
  it("retries the same key without creating another order or decrementing stock twice", async () => {
    const key = randomUUID();
    const [first, second] = await Promise.all([
      createOrder(undefined, key),
      createOrder(undefined, key),
    ]);
    expect(first).toEqual(second);
    expect(await stock()).toBe(demoProducts[0].stock - 2);
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.orders",
        )
      ).rows[0].count,
    ).toBe(1);
    await expect(
      createOrder(undefined, key, owner, digest("changed")),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    await expect(createOrder(undefined, key, stranger)).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    );
  });
  it("rolls back every stock change when a later product lacks stock", async () => {
    await db.query("update public.products set stock=0 where id=$1", [
      demoProducts[1].id,
    ]);
    await expect(
      createOrder([
        { product_id: demoProducts[0].id, quantity: 2 },
        { product_id: demoProducts[1].id, quantity: 1 },
      ]),
    ).rejects.toThrow("STOCK_UNAVAILABLE");
    expect(await stock()).toBe(demoProducts[0].stock);
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.orders",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it("does not oversell when separate order requests compete for the last item", async () => {
    await db.query("update public.products set stock=1 where id=$1", [
      demoProducts[0].id,
    ]);
    const items = [{ product_id: demoProducts[0].id, quantity: 1 }];
    const results = await Promise.allSettled([
      createOrder(items),
      createOrder(items),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await stock()).toBe(0);
  });
  it("rejects inactive products and duplicate line items", async () => {
    await db.query("update public.products set active=false where id=$1", [
      demoProducts[0].id,
    ]);
    await expect(createOrder()).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await expect(
      createOrder([
        { product_id: demoProducts[1].id, quantity: 1 },
        { product_id: demoProducts[1].id, quantity: 1 },
      ]),
    ).rejects.toThrow("INVALID_REQUEST");
  });
  it("restores stock once on cancellation and prevents reopening cancelled orders", async () => {
    const receipt = await createOrder();
    await Promise.all([cancel(receipt.id), cancel(receipt.id)]);
    expect(await stock()).toBe(demoProducts[0].stock);
    await expect(
      asRole("authenticated", admin, (tx) =>
        tx.query("select public.set_order_status($1::uuid,'pending')", [
          receipt.id,
        ]),
      ),
    ).rejects.toThrow("ORDER_FINAL");
    expect(await stock()).toBe(demoProducts[0].stock);
  });
});

describe("database access policies", () => {
  it("allows only the owner or an administrator to read an order and its items", async () => {
    const receipt = await createOrder();
    for (const [user, count] of [
      [owner, 1],
      [stranger, 0],
      [admin, 1],
    ] as const) {
      const rows = await asRole("authenticated", user, (tx) =>
        tx.query("select id,customer_name from public.orders where id=$1", [
          receipt.id,
        ]),
      );
      const items = await asRole("authenticated", user, (tx) =>
        tx.query("select id,name from public.order_items where order_id=$1", [
          receipt.id,
        ]),
      );
      expect(rows.rows).toHaveLength(count);
      expect(items.rows).toHaveLength(count);
    }
    await expect(
      asRole("anon", null, (tx) => tx.query("select id from public.orders")),
    ).rejects.toThrow("permission denied");
  });
  it("does not expose receipt hashes, allow self-escalation, direct orders, or customer status updates", async () => {
    const receipt = await createOrder();
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query("select guest_access_hash from public.orders"),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query("insert into public.admin_members(user_id) values ($1)", [
          owner,
        ]),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      asRole("anon", null, (tx) =>
        tx.query(
          "select public.create_order('[]'::jsonb,'{}'::jsonb,$1::uuid,$2,$3,null)",
          [randomUUID(), digest("x"), digest("y")],
        ),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query("update public.orders set status='cancelled' where id=$1", [
          receipt.id,
        ]),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query("select public.set_order_status($1::uuid,'cancelled')", [
          receipt.id,
        ]),
      ),
    ).rejects.toThrow("Admin required");
    await expect(
      db.query("update public.orders set payment_status='paid' where id=$1", [
        receipt.id,
      ]),
    ).rejects.toThrow("check constraint");
  });
  it("restricts unpublished images and all uploads to administrators", async () => {
    const name = `${randomUUID()}.png`;
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query(
          "insert into storage.objects(bucket_id,name) values ('products',$1)",
          [name],
        ),
      ),
    ).rejects.toThrow("row-level security");
    await asRole("authenticated", admin, (tx) =>
      tx.query(
        "insert into storage.objects(bucket_id,name) values ('products',$1)",
        [name],
      ),
    );
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select id from storage.objects"),
        )
      ).rows,
    ).toHaveLength(0);
    await db.query("update public.products set image_url=$1 where id=$2", [
      `/api/media/${name}`,
      demoProducts[0].id,
    ]);
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select id from storage.objects"),
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("limits repeated inquiries while allowing different customer requests", async () => {
    for (let i = 0; i < 3; i++)
      await asRole("service_role", null, (tx) =>
        tx.query(
          "select public.submit_inquiry('A','a@example.com','','Hello')",
        ),
      );
    await expect(
      asRole("service_role", null, (tx) =>
        tx.query(
          "select public.submit_inquiry('A','a@example.com','','Hello')",
        ),
      ),
    ).rejects.toThrow("TOO_MANY_REQUESTS");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query("select id from public.inquiries"),
      ),
    ).resolves.toMatchObject({ rows: [] });
  });
});
