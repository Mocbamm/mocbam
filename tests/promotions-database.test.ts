import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { demoProducts } from "@/lib/demo-data";
import { digest } from "@/lib/supabase/receipts";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customer = {
  name: "Khách",
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
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    return work(tx);
  });
}
async function order(
  code = "MOC10",
  user: string | null = owner,
  key = randomUUID(),
  hash = digest(`${code}:${user}`),
  items = [{ product_id: demoProducts[0].id, quantity: 1 }],
) {
  return asRole("service_role", null, async (tx) => {
    const { rows } = await tx.query<{ receipt: { id: string } }>(
      "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6::uuid,'cod',$7) as receipt",
      [
        JSON.stringify(items),
        JSON.stringify(customer),
        key,
        hash,
        digest(key),
        user,
        code,
      ],
    );
    return rows[0].receipt;
  });
}
async function discount(fields = "") {
  await db.exec(
    `insert into public.discounts(code,title,kind,value,active,public_campaign) values ('MOC10','Ưu đãi Mộc','percentage',10,true,true)`,
  );
  if (fields)
    await db.exec(`update public.discounts set ${fields} where code='MOC10'`);
}
async function readOrder(id: string) {
  return (
    await db.query<{
      subtotal: number;
      shipping_fee: number;
      total: number;
      discount_code: string;
      discount_amount: number;
    }>(
      "select subtotal,shipping_fee,total,discount_code,discount_amount from public.orders where id=$1",
      [id],
    )
  ).rows[0];
}
async function inventory() {
  return Number(
    (
      await db.query<{ stock: number }>(
        "select stock from public.products where id=$1",
        [demoProducts[0].id],
      )
    ).rows[0].stock,
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
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select on storage.objects to anon, authenticated;
    grant insert on storage.objects to authenticated;
    grant all on storage.objects to service_role;
    insert into auth.users values ('${owner}'),('${other}'),('${admin}');
  `);
  for (const file of [
    "202610030001_initial.sql",
    "202610030002_manual_payments.sql",
    "202610050003_store_features.sql",
    "202610090005_returned_status.sql",
    "202610090006_product_variants_returns.sql",
    "202610090007_promotion_scope.sql",
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
  await db.query("insert into public.admin_members(user_id) values ($1)", [
    admin,
  ]);
}, 60_000);
beforeEach(async () => {
  await db.exec(
    "truncate public.orders cascade; truncate public.discounts; truncate storage.objects; update public.site_settings set shipping_fee=30000 where id=true;",
  );
  await db.query(
    "update public.products set price=$1,stock=$2,active=true,image_urls='{}',video_url='' where id=$3",
    [demoProducts[0].price, demoProducts[0].stock, demoProducts[0].id],
  );
});
afterAll(async () => db?.close());

describe("transactional discount application", () => {
  it("discounts only selected products in a mixed basket and rejects unrelated carts atomically", async () => {
    await discount(
      `scope='product',product_ids=array['${demoProducts[1].id}']::uuid[],value=100`,
    );
    const originalStock = await inventory();
    await expect(order()).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    expect(await inventory()).toBe(originalStock);
    const receipt = await order(
      "MOC10",
      owner,
      randomUUID(),
      digest("mixed-products"),
      [
        { product_id: demoProducts[0].id, quantity: 1 },
        { product_id: demoProducts[1].id, quantity: 1 },
      ],
    );
    const snapshot = await readOrder(receipt.id);
    expect(snapshot.discount_amount).toBe(demoProducts[1].price);
    expect(snapshot.total).toBe(demoProducts[0].price + 30000);
  });
  it("permits every selected private recipient and never a guest or an unselected account", async () => {
    await discount(
      `scope='private',public_campaign=false,customer_user_ids=array['${owner}','${other}']::uuid[]`,
    );
    await expect(order("MOC10", null)).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    await expect(order("MOC10", admin)).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    expect(
      (await readOrder((await order("MOC10", owner)).id)).discount_amount,
    ).toBe(18900);
    expect(
      (await readOrder((await order("MOC10", other)).id)).discount_amount,
    ).toBe(18900);
  });
  it("rejects expired voucher creation and nonexistent scope targets in the database", async () => {
    await expect(
      db.exec(
        "insert into public.discounts(code,title,kind,value,ends_at) values ('OLD','Old','fixed',100,now()-interval '1 hour')",
      ),
    ).rejects.toThrow("DISCOUNT_EXPIRED");
    await expect(
      db.exec(
        "insert into public.discounts(code,title,kind,value,scope,product_ids) values ('UNKNOWN','Unknown','fixed',100,'product',array['dddddddd-dddd-4ddd-8ddd-dddddddddddd']::uuid[])",
      ),
    ).rejects.toThrow("INVALID_REQUEST");
  });

  it("calculates discounts from database prices and keeps shipping outside the reduction", async () => {
    await discount();
    const receipt = await order("moc10");
    expect(await readOrder(receipt.id)).toEqual({
      subtotal: 189000,
      shipping_fee: 30000,
      total: 200100,
      discount_code: "MOC10",
      discount_amount: 18900,
    });
    expect(
      (
        await db.query<{ used_count: number }>(
          "select used_count from public.discounts",
        )
      ).rows[0].used_count,
    ).toBe(1);
  });
  it("applies caps, integer rounding and fixed amounts without a negative total", async () => {
    await discount("max_discount=10000");
    expect((await readOrder((await order()).id)).discount_amount).toBe(10000);
    await db.exec(
      "update public.discounts set max_discount=null,kind='fixed',value=1000000",
    );
    expect(await readOrder((await order()).id)).toMatchObject({
      discount_amount: 189000,
      total: 30000,
    });
    await db.exec("update public.discounts set kind='percentage',value=33");
    await db.query("update public.products set price=101 where id=$1", [
      demoProducts[0].id,
    ]);
    expect((await readOrder((await order()).id)).discount_amount).toBe(33);
  });
  it("rolls inventory and redemption back for invalid minimum spend, inactive and out-of-window codes", async () => {
    await discount("min_subtotal=200000");
    await expect(order()).rejects.toThrow("DISCOUNT_MINIMUM");
    for (const fields of [
      "min_subtotal=0,active=false",
      "active=true,ends_at=now()-interval '1 second'",
      "ends_at=null,starts_at=now()+interval '1 hour'",
    ]) {
      await db.exec(`update public.discounts set ${fields}`);
      await expect(order()).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    }
    expect(await inventory()).toBe(demoProducts[0].stock);
    expect(
      (
        await db.query<{ used_count: number }>(
          "select used_count from public.discounts",
        )
      ).rows[0].used_count,
    ).toBe(0);
    expect((await db.query("select id from public.orders")).rows).toHaveLength(
      0,
    );
  });
  it("restricts a private code to its intended authenticated customer", async () => {
    await discount(
      `public_campaign=false,scope='private',customer_user_id='${owner}'`,
    );
    await expect(order("MOC10", null)).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    await expect(order("MOC10", other)).rejects.toThrow("DISCOUNT_UNAVAILABLE");
    expect((await readOrder((await order()).id)).discount_amount).toBe(18900);
    expect(await inventory()).toBe(demoProducts[0].stock - 1);
  });
  it("serializes competing redemptions for the final use", async () => {
    await discount("max_uses=1");
    const results = await Promise.allSettled([order(), order()]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await inventory()).toBe(demoProducts[0].stock - 1);
    expect(
      (
        await db.query<{ used_count: number }>(
          "select used_count from public.discounts",
        )
      ).rows[0].used_count,
    ).toBe(1);
  });
  it("replays the original snapshot without another use and rejects a changed code even with a reused hash", async () => {
    await discount();
    const key = randomUUID();
    const hash = digest("request");
    const receipt = await order("MOC10", owner, key, hash);
    await db.exec("update public.discounts set active=false,value=90");
    expect(await order("MOC10", owner, key, hash)).toEqual(receipt);
    await expect(order("", owner, key, hash)).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    );
    expect((await readOrder(receipt.id)).discount_amount).toBe(18900);
    expect(
      (
        await db.query<{ used_count: number }>(
          "select used_count from public.discounts",
        )
      ).rows[0].used_count,
    ).toBe(1);
    await expect(
      db.query(
        "update public.orders set discount_amount=1,total=subtotal+shipping_fee-1 where id=$1",
        [receipt.id],
      ),
    ).rejects.toThrow("DISCOUNT_SNAPSHOT_IMMUTABLE");
  });
  it("retains six/seven argument compatibility for undiscounted orders", async () => {
    const receipt = await asRole(
      "service_role",
      null,
      async (tx) =>
        (
          await tx.query<{ receipt: { id: string } }>(
            "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6::uuid) as receipt",
            [
              JSON.stringify([{ product_id: demoProducts[0].id, quantity: 1 }]),
              JSON.stringify(customer),
              randomUUID(),
              digest("old"),
              digest("token"),
              owner,
            ],
          )
        ).rows[0].receipt,
    );
    expect(await readOrder(receipt.id)).toMatchObject({
      total: 219000,
      discount_amount: 0,
      discount_code: "",
    });
    expect(await order("", null)).toHaveProperty("id");
  });
});

describe("discount and media access controls", () => {
  it("exposes public current campaigns and hides private, expired and exhausted codes from customers", async () => {
    await discount();
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select code from public.discounts"),
        )
      ).rows,
    ).toHaveLength(1);
    for (const fields of [
      `public_campaign=false,scope='private',customer_user_id='${owner}'`,
      "scope='shop',customer_user_id=null,public_campaign=true,ends_at=now()-interval '1 second'",
      "ends_at=null,max_uses=1,used_count=1",
    ]) {
      await db.exec(`update public.discounts set ${fields}`);
      expect(
        (
          await asRole("authenticated", owner, (tx) =>
            tx.query("select code from public.discounts"),
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await asRole("authenticated", admin, (tx) =>
            tx.query("select code from public.discounts"),
          )
        ).rows,
      ).toHaveLength(1);
    }
  });
  it("prevents customer discount writes and administrator counter tampering", async () => {
    await discount();
    const result = await asRole("authenticated", owner, (tx) =>
      tx.query("update public.discounts set value=99 returning id"),
    );
    expect(result.rows).toHaveLength(0);
    await expect(
      asRole("authenticated", admin, (tx) =>
        tx.query("update public.discounts set used_count=0"),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query(
          "insert into public.discounts(code,title,kind,value) values ('HACK','Hack','fixed',100)",
        ),
      ),
    ).rejects.toThrow("row-level security");
    await expect(
      asRole("authenticated", owner, (tx) =>
        tx.query(
          "select public.create_order('[]'::jsonb,'{}'::jsonb,$1::uuid,$2,$3,null,'cod','MOC10')",
          [randomUUID(), digest("x"), digest("y")],
        ),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("makes a gallery image and video readable only after an active product attaches them", async () => {
    const imageName = `${randomUUID()}.png`;
    const videoName = `${randomUUID()}.mp4`;
    await asRole("authenticated", admin, (tx) =>
      tx.query(
        "insert into storage.objects(bucket_id,name) values ('products',$1),('products',$2)",
        [imageName, videoName],
      ),
    );
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select name from storage.objects"),
        )
      ).rows,
    ).toHaveLength(0);
    await db.query(
      "update public.products set image_urls=array[$1],video_url=$2 where id=$3",
      [
        `/api/media/${imageName}`,
        `/api/media/${videoName}`,
        demoProducts[0].id,
      ],
    );
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select name from storage.objects"),
        )
      ).rows,
    ).toHaveLength(2);
    await db.query("update public.products set active=false where id=$1", [
      demoProducts[0].id,
    ]);
    expect(
      (
        await asRole("anon", null, (tx) =>
          tx.query("select name from storage.objects"),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asRole("authenticated", admin, (tx) =>
          tx.query("select name from storage.objects"),
        )
      ).rows,
    ).toHaveLength(2);
    expect(
      (
        await db.query(
          "select public,file_size_limit,allowed_mime_types from storage.buckets",
        )
      ).rows[0],
    ).toMatchObject({
      public: false,
      file_size_limit: 20000000,
      allowed_mime_types: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
      ],
    });
  });
});
