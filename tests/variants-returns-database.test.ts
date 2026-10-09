import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { demoProducts } from "@/lib/demo-data";
import { digest } from "@/lib/supabase/receipts";

const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const productId = demoProducts[0].id;
const pink = {
  id: "11111111-1111-4111-8111-111111111113",
  name: "Chuỗi hồng",
  price: 120000,
  stock: 5,
  image_url: "",
  active: true,
};
const yellow = {
  id: "11111111-1111-4111-8111-111111111114",
  name: "Chuỗi vàng",
  price: 150000,
  stock: 3,
  image_url: "",
  active: true,
};
let db: PGlite;
async function role<T>(
  name: "anon" | "authenticated" | "service_role",
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
async function create(
  items: { product_id: string; variant_id?: string; quantity: number }[],
  code = "",
) {
  const key = randomUUID();
  return role(
    "service_role",
    null,
    async (tx) =>
      (
        await tx.query<{ result: { id: string; reference: string } }>(
          "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,null,'cod',$6) as result",
          [
            JSON.stringify(items),
            JSON.stringify({
              name: "Khách",
              email: "guest@example.com",
              phone: "0901234567",
              address: "12 Đường Mộc",
              city: "TP. Hồ Chí Minh",
              note: "",
            }),
            key,
            digest(key),
            digest(key),
            code,
          ],
        )
      ).rows[0].result,
  );
}
const status = (id: string, state: string, user = admin, restock = false) =>
  role("authenticated", user, (tx) =>
    tx.query(
      "select public.set_order_status($1::uuid,$2::public.order_status,$3)",
      [id, state, restock],
    ),
  );
const payment = (id: string, action: string) =>
  role("authenticated", admin, (tx) =>
    tx.query(
      "select public.record_order_payment($1::uuid,$2,'Đã đối soát thực tế')",
      [id, action],
    ),
  );
async function inventory() {
  return (
    await db.query<{ stock: number; variants: (typeof pink)[] }>(
      "select stock,variants from public.products where id=$1",
      [productId],
    )
  ).rows[0];
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant select on storage.objects to anon,authenticated; grant insert on storage.objects to authenticated; grant all on storage.objects to service_role;
    insert into auth.users values ('${owner}'),('${admin}');
  `);
  for (const file of [
    "202610030001_initial.sql",
    "202610030002_manual_payments.sql",
    "202610050003_store_features.sql",
    "202610090005_returned_status.sql",
    "202610090006_product_variants_returns.sql",
    "202610090007_promotion_scope.sql",
    "202610090010_costs.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.admin_members values ($1)", [admin]);
}, 60000);
beforeEach(async () => {
  await db.exec("truncate public.orders cascade; truncate public.discounts");
  await db.query(
    "update public.products set variants=$1::jsonb,cost_price=null where id=$2",
    [JSON.stringify([pink, yellow]), productId],
  );
});
afterAll(async () => {
  await db?.close();
});

describe("variant inventory and physical returns", () => {
  it("prices each chosen color, decrements its stock, and snapshots its name", async () => {
    const receipt = await create([
      { product_id: productId, variant_id: pink.id, quantity: 2 },
      { product_id: productId, variant_id: yellow.id, quantity: 1 },
    ]);
    expect(receipt.reference).toMatch(/^MB/);
    const order = (
      await db.query<{ subtotal: number }>(
        "select subtotal from public.orders where id=$1",
        [receipt.id],
      )
    ).rows[0];
    expect(Number(order.subtotal)).toBe(390000);
    expect(await inventory()).toMatchObject({
      stock: 5,
      variants: [
        { ...pink, stock: 3 },
        { ...yellow, stock: 2 },
      ],
    });
    expect(
      (
        await db.query(
          "select variant_id,variant_name,price,quantity from public.order_items where order_id=$1 order by variant_id",
          [receipt.id],
        )
      ).rows,
    ).toEqual([
      {
        variant_id: pink.id,
        variant_name: pink.name,
        price: 120000,
        quantity: 2,
      },
      {
        variant_id: yellow.id,
        variant_name: yellow.name,
        price: 150000,
        quantity: 1,
      },
    ]);
  });
  it("rejects missing/unknown variants and overselling atomically", async () => {
    for (const variant_id of [undefined, randomUUID()])
      await expect(
        create([{ product_id: productId, variant_id, quantity: 1 }]),
      ).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await expect(
      create([
        { product_id: productId, variant_id: pink.id, quantity: 1 },
        { product_id: productId, variant_id: yellow.id, quantity: 4 },
      ]),
    ).rejects.toThrow("STOCK_UNAVAILABLE");
    expect(await inventory()).toMatchObject({
      stock: 8,
      variants: [pink, yellow],
    });
    expect((await db.query("select id from public.orders")).rows).toHaveLength(
      0,
    );
  });
  it("restores returned colors once and records a full refund separately from fulfillment", async () => {
    const receipt = await create([
      { product_id: productId, variant_id: pink.id, quantity: 2 },
    ]);
    await payment(receipt.id, "paid");
    await status(receipt.id, "completed");
    await status(receipt.id, "returned", admin, true);
    await status(receipt.id, "returned", admin, true);
    expect(await inventory()).toMatchObject({
      stock: 8,
      variants: [pink, yellow],
    });
    expect(
      (
        await db.query(
          "select status,payment_status from public.orders where id=$1",
          [receipt.id],
        )
      ).rows[0],
    ).toEqual({ status: "returned", payment_status: "paid" });
    await payment(receipt.id, "refunded");
    await payment(receipt.id, "refunded");
    expect(
      (
        await db.query(
          "select event,amount from public.order_payment_events where order_id=$1 order by event",
          [receipt.id],
        )
      ).rows,
    ).toEqual([
      { event: "paid", amount: 240000 },
      { event: "refunded", amount: 240000 },
    ]);
    await expect(status(receipt.id, "completed")).rejects.toThrow(
      "ORDER_FINAL",
    );
  });
  it("requires physical return after shipping and preserves variant IDs used in order history", async () => {
    const receipt = await create([
      { product_id: productId, variant_id: pink.id, quantity: 1 },
    ]);
    await expect(status(receipt.id, "returned")).rejects.toThrow(
      "RETURN_NOT_ALLOWED",
    );
    await expect(status(receipt.id, "returned", owner)).rejects.toThrow(
      "Admin required",
    );
    await status(receipt.id, "shipped");
    await expect(status(receipt.id, "cancelled")).rejects.toThrow(
      "ORDER_FINAL",
    );
    await expect(status(receipt.id, "processing")).rejects.toThrow(
      "ORDER_FINAL",
    );
    await expect(
      db.query("update public.products set variants=$1::jsonb where id=$2", [
        JSON.stringify([yellow]),
        productId,
      ]),
    ).rejects.toThrow("VARIANT_IN_USE");
    await db.query(
      "update public.products set variants=$1::jsonb where id=$2",
      [
        JSON.stringify([{ ...pink, active: false, stock: 4 }, yellow]),
        productId,
      ],
    );
    await status(receipt.id, "returned", admin, true);
    expect((await inventory()).variants[0].stock).toBe(5);
  });
  it("rejects a stale inventory edit after checkout advances the product revision", async () => {
    const before = (
      await db.query<{ revision: number }>(
        "select revision from public.products where id=$1",
        [productId],
      )
    ).rows[0].revision;
    await create([{ product_id: productId, variant_id: pink.id, quantity: 1 }]);
    const stale = await role("authenticated", admin, (tx) =>
      tx.query(
        "update public.products set variants=$1::jsonb where id=$2 and revision=$3 returning id",
        [JSON.stringify([pink, yellow]), productId, before],
      ),
    );
    expect(stale.rows).toHaveLength(0);
    expect((await inventory()).variants[0].stock).toBe(4);
  });
  it("snapshots actual unit costs for new orders and preserves unknown legacy costs", async () => {
    const legacy = await create([
      { product_id: productId, variant_id: pink.id, quantity: 1 },
    ]);
    await db.query("update public.products set cost_price=45000 where id=$1", [
      productId,
    ]);
    const current = await create([
      { product_id: productId, variant_id: pink.id, quantity: 2 },
    ]);
    await db.query("update public.products set cost_price=80000 where id=$1", [
      productId,
    ]);
    expect(
      (
        await db.query<{ unit_cost: number | null }>(
          "select unit_cost from public.order_items where order_id=$1",
          [legacy.id],
        )
      ).rows[0].unit_cost,
    ).toBeNull();
    const snapshot = (
      await db.query<{ id: string; unit_cost: number }>(
        "select id,unit_cost from public.order_items where order_id=$1",
        [current.id],
      )
    ).rows[0];
    expect(snapshot.unit_cost).toBe(45000);
    await expect(
      db.query("update public.order_items set unit_cost=80000 where id=$1", [
        snapshot.id,
      ]),
    ).rejects.toThrow("COST_SNAPSHOT_IMMUTABLE");
    const adminCosts = await role("authenticated", admin, (tx) =>
      tx.query<{ id: string; unit_cost: number | null }>(
        "select * from public.get_admin_order_item_costs()",
      ),
    );
    expect(
      adminCosts.rows.find((row) => row.id === snapshot.id)?.unit_cost,
    ).toBe(45000);
  });
  it("keeps catalog and order cost columns private while permitting administrator RPCs", async () => {
    await db.query("update public.products set cost_price=45000 where id=$1", [
      productId,
    ]);
    for (const name of ["anon", "authenticated"] as const) {
      await expect(
        role(name, owner, (tx) =>
          tx.query("select cost_price from public.products"),
        ),
      ).rejects.toThrow("permission denied");
      expect(
        (
          await role(name, owner, (tx) =>
            tx.query("select name,price from public.products"),
          )
        ).rows.length,
      ).toBeGreaterThan(0);
    }
    await expect(
      role("authenticated", owner, (tx) =>
        tx.query("select unit_cost from public.order_items"),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      role("authenticated", owner, (tx) =>
        tx.query("select * from public.get_admin_products()"),
      ),
    ).rejects.toThrow("Admin required");
    await expect(
      role("authenticated", owner, (tx) =>
        tx.query("select * from public.get_admin_order_item_costs()"),
      ),
    ).rejects.toThrow("Admin required");
    const products = await role("authenticated", admin, (tx) =>
      tx.query<{ id: string; cost_price: number | null }>(
        "select id,cost_price from public.get_admin_products()",
      ),
    );
    expect(products.rows.find((row) => row.id === productId)?.cost_price).toBe(
      45000,
    );
  });
  it("accepts damaged returns and refunds without replenishing stock by default", async () => {
    const receipt = await create([
      { product_id: productId, variant_id: pink.id, quantity: 2 },
    ]);
    await payment(receipt.id, "paid");
    await status(receipt.id, "shipped");
    await status(receipt.id, "returned");
    await status(receipt.id, "returned", admin, true);
    expect((await inventory()).variants[0].stock).toBe(3);
    const order = (
      await db.query<{ return_restocked: boolean; returned_at: string | null }>(
        "select return_restocked,returned_at from public.orders where id=$1",
        [receipt.id],
      )
    ).rows[0];
    expect(order.return_restocked).toBe(false);
    expect(order.returned_at).toBeTruthy();
    await payment(receipt.id, "refunded");
    expect((await inventory()).variants[0].stock).toBe(3);
  });
  it("allocates fixed product vouchers only to eligible lines with exact rounding", async () => {
    await db.query(
      "insert into public.discounts(code,title,kind,value,active,scope,product_ids) values ('COLORS','Ưu đãi màu','fixed',5,true,'product',$1::uuid[])",
      [[productId]],
    );
    const receipt = await create(
      [
        { product_id: productId, variant_id: pink.id, quantity: 1 },
        { product_id: productId, variant_id: yellow.id, quantity: 1 },
        { product_id: demoProducts[1].id, quantity: 1 },
      ],
      "COLORS",
    );
    const items = (
      await db.query<{
        product_id: string;
        variant_id: string | null;
        line_discount: number;
      }>(
        "select product_id,variant_id,line_discount from public.order_items where order_id=$1 order by product_id,variant_id",
        [receipt.id],
      )
    ).rows;
    expect(
      items.find((item) => item.variant_id === pink.id)?.line_discount,
    ).toBe(2);
    expect(
      items.find((item) => item.variant_id === yellow.id)?.line_discount,
    ).toBe(3);
    expect(
      items.find((item) => item.product_id === demoProducts[1].id)
        ?.line_discount,
    ).toBe(0);
    expect(
      items.reduce((sum, item) => sum + Number(item.line_discount), 0),
    ).toBe(5);
    await expect(
      db.query(
        "update public.order_items set line_discount=0 where order_id=$1 and line_discount>0",
        [receipt.id],
      ),
    ).rejects.toThrow("LINE_DISCOUNT_SNAPSHOT_IMMUTABLE");
  });
  it("caps rounding remainder at each eligible line so even near-full discounts never make a line negative", async () => {
    const tiny = {
      ...yellow,
      id: "11111111-1111-4111-8111-111111111115",
      name: "Nhỏ",
      price: 1,
    };
    await db.query(
      "update public.products set variants=$1::jsonb where id=$2",
      [
        JSON.stringify([
          { ...pink, price: 100 },
          { ...yellow, price: 1 },
          tiny,
        ]),
        productId,
      ],
    );
    await db.query(
      "insert into public.discounts(code,title,kind,value,active,scope,product_ids) values ('ROUND','Làm tròn','fixed',100,true,'product',$1::uuid[])",
      [[productId]],
    );
    const receipt = await create(
      [
        { product_id: productId, variant_id: pink.id, quantity: 1 },
        { product_id: productId, variant_id: yellow.id, quantity: 1 },
        { product_id: productId, variant_id: tiny.id, quantity: 1 },
      ],
      "ROUND",
    );
    expect(
      (
        await db.query(
          "select price,line_discount from public.order_items where order_id=$1 order by variant_id",
          [receipt.id],
        )
      ).rows,
    ).toEqual([
      { price: 100, line_discount: 98 },
      { price: 1, line_discount: 1 },
      { price: 1, line_discount: 1 },
    ]);
  });
});
