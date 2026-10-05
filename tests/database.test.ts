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
const secondAdmin = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const customer = {
  name: "Khách Mẫu",
  email: "customer@example.com",
  phone: "0901234567",
  address: "12 Đường Mộc",
  city: "TP. Hồ Chí Minh",
  note: "",
};
let db: PGlite;
let legacyPaymentSnapshot: Record<string, unknown>;
let legacyReplayPreserved = false;
const bankFixture = {
  bank_bin: "970000",
  bank_name: "Ngân hàng kiểm thử",
  bank_account_number: "TEST12345",
  bank_account_name: "Người dùng kiểm thử",
};

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
  payload?: string,
  paymentMethod: string = "cod",
) {
  return asRole("service_role", null, async (tx) => {
    const result = await tx.query<{
      receipt: { id: string; reference: string };
    }>(
      "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6::uuid,$7::text) as receipt",
      [
        JSON.stringify(items),
        JSON.stringify(customer),
        key,
        payload ||
          digest(JSON.stringify({ items, payment_method: paymentMethod })),
        digest(key),
        user,
        paymentMethod,
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
async function recordPayment(
  id: string,
  action = "paid",
  note = "Đã kiểm tra khoản tiền thực nhận",
  actor = admin,
) {
  return asRole("authenticated", actor, async (tx) => {
    const result = await tx.query<{
      payment: {
        id: string;
        status: string;
        payment_status: string;
        paid_at: string | null;
        refunded_at: string | null;
      };
    }>(
      "select public.record_order_payment($1::uuid,$2::text,$3::text) as payment",
      [id, action, note],
    );
    return result.rows[0].payment;
  });
}
async function configureBank() {
  await db.query(
    "update public.site_settings set bank_transfer_enabled=true,bank_bin=$1,bank_name=$2,bank_account_number=$3,bank_account_name=$4 where id=true",
    Object.values(bankFixture),
  );
}
async function paymentEvents(id: string) {
  return (
    await db.query<{
      event: "paid" | "refunded";
      amount: number;
      actor_id: string;
      note: string;
      created_at: Date;
    }>(
      "select event,amount,actor_id,note,created_at from public.order_payment_events where order_id=$1 order by event",
      [id],
    )
  ).rows;
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
    insert into auth.users values ('${owner}'),('${stranger}'),('${admin}'),('${secondAdmin}');
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
    `insert into public.orders(id,user_id,customer_name,email,phone,address,city,subtotal,shipping_fee,total,idempotency_key,payload_hash,guest_access_hash)
    values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${owner}','Legacy migration test','legacy@example.com','0900000000','Test address','Test city',0,0,0,'ffffffff-ffff-4fff-8fff-ffffffffffff','${digest("legacy")}', '${digest("legacy-receipt")}');`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610030002_manual_payments.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610050003_store_features.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  legacyPaymentSnapshot = (
    await db.query<Record<string, unknown>>(
      "select payment_method,payment_status,paid_at,refunded_at,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name from public.orders where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'",
    )
  ).rows[0];
  legacyReplayPreserved =
    (
      await asRole("service_role", null, (tx) =>
        tx.query<{ receipt: { id: string } }>(
          "select public.create_order('[]'::jsonb,'{}'::jsonb,'ffffffff-ffff-4fff-8fff-ffffffffffff',$1,$2,$3::uuid) as receipt",
          [digest("legacy"), digest("legacy-receipt"), owner],
        ),
      )
    ).rows[0].receipt.id === "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.admin_members(user_id) values ($1),($2)", [
    admin,
    secondAdmin,
  ]);
}, 60_000);
beforeEach(async () => {
  await db.exec(
    "truncate public.orders cascade; truncate public.inquiries; truncate storage.objects;",
  );
  await db.exec(
    "update public.site_settings set shipping_fee=0,bank_transfer_enabled=false,bank_bin='',bank_name='',bank_account_number='',bank_account_name='' where id=true;",
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

describe("manual payment migration and order instructions", () => {
  it("preserves legacy unconfigured orders and their six-argument idempotent replay", async () => {
    expect(legacyPaymentSnapshot).toEqual({
      payment_method: "unconfigured",
      payment_status: "awaiting_payment",
      paid_at: null,
      refunded_at: null,
      payment_bank_bin: "",
      payment_bank_name: "",
      payment_bank_account_number: "",
      payment_bank_account_name: "",
    });
    expect(legacyReplayPreserved).toBe(true);
    const result = await asRole("service_role", null, (tx) =>
      tx.query<{ receipt: { id: string } }>(
        "select public.create_order($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6::uuid) as receipt",
        [
          JSON.stringify([{ product_id: demoProducts[0].id, quantity: 1 }]),
          JSON.stringify(customer),
          randomUUID(),
          digest("legacy-client-cod"),
          digest("receipt"),
          owner,
        ],
      ),
    );
    expect(
      (
        await db.query<{ payment_method: string }>(
          "select payment_method from public.orders where id=$1",
          [result.rows[0].receipt.id],
        )
      ).rows[0].payment_method,
    ).toBe("cod");
  });
  it("rejects disabled transfers and incomplete or malformed settings without reserving stock", async () => {
    await expect(
      createOrder(undefined, randomUUID(), owner, undefined, "bank_transfer"),
    ).rejects.toThrow("BANK_TRANSFER_UNAVAILABLE");
    for (const query of [
      "update public.site_settings set bank_transfer_enabled=true where id=true",
      "update public.site_settings set bank_bin='ABCDEF' where id=true",
      "update public.site_settings set bank_account_number='1234' where id=true",
      "update public.site_settings set bank_name='   ' where id=true",
      "update public.site_settings set bank_account_name=repeat('A',101) where id=true",
    ])
      await expect(db.exec(query)).rejects.toThrow("check constraint");
    await expect(
      createOrder(undefined, randomUUID(), owner, undefined, "unconfigured"),
    ).rejects.toThrow("INVALID_REQUEST");
    expect(await stock()).toBe(demoProducts[0].stock);
    expect((await db.query("select id from public.orders")).rows).toHaveLength(
      0,
    );
  });
  it("keeps receiving instructions immutable and retries against their original snapshot after settings changes", async () => {
    await configureBank();
    const key = randomUUID();
    const receipt = await createOrder(
      undefined,
      key,
      owner,
      undefined,
      "bank_transfer",
    );
    const readSnapshot = () =>
      db.query(
        "select payment_method,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name,total from public.orders where id=$1",
        [receipt.id],
      );
    const first = (await readSnapshot()).rows[0];
    expect(first).toMatchObject({
      payment_method: "bank_transfer",
      payment_bank_bin: bankFixture.bank_bin,
      payment_bank_name: bankFixture.bank_name,
      payment_bank_account_number: bankFixture.bank_account_number,
      payment_bank_account_name: bankFixture.bank_account_name,
    });
    await db.exec(
      "update public.site_settings set bank_transfer_enabled=false,bank_bin='970001',bank_name='Ngân hàng mới',bank_account_number='OTHER54321',bank_account_name='Người khác',shipping_fee=12345 where id=true",
    );
    expect(
      await createOrder(undefined, key, owner, undefined, "bank_transfer"),
    ).toEqual(receipt);
    expect((await readSnapshot()).rows[0]).toEqual(first);
    expect(await stock()).toBe(demoProducts[0].stock - 2);
    await expect(
      db.query(
        "update public.orders set payment_bank_account_number='OTHER54321' where id=$1",
        [receipt.id],
      ),
    ).rejects.toThrow("PAYMENT_SNAPSHOT_IMMUTABLE");
    await expect(
      db.query("update public.orders set payment_method='cod' where id=$1", [
        receipt.id,
      ]),
    ).rejects.toThrow("PAYMENT_SNAPSHOT_IMMUTABLE");
  });
  it("rejects changed payment methods for the same request even when the caller reuses its old hash", async () => {
    const key = randomUUID();
    const payload = digest("same-payload");
    await createOrder(undefined, key, owner, payload, "cod");
    await expect(
      createOrder(undefined, key, owner, payload, "bank_transfer"),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    expect(await stock()).toBe(demoProducts[0].stock - 2);
    expect((await db.query("select id from public.orders")).rows).toHaveLength(
      1,
    );
  });
  it("stores empty bank instructions for COD even while bank transfers are enabled", async () => {
    await configureBank();
    const receipt = await createOrder();
    expect(
      (
        await db.query(
          "select payment_method,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name from public.orders where id=$1",
          [receipt.id],
        )
      ).rows[0],
    ).toEqual({
      payment_method: "cod",
      payment_bank_bin: "",
      payment_bank_name: "",
      payment_bank_account_number: "",
      payment_bank_account_name: "",
    });
  });
});

describe("manual full-payment audit and fulfillment independence", () => {
  it("records one full payment and preserves its actor, note, timestamp and stock across repeated requests", async () => {
    const receipt = await createOrder();
    const beforeStock = await stock();
    const first = await recordPayment(
      receipt.id,
      "paid",
      "  Tiền COD đã thực nhận  ",
    );
    expect(first).toMatchObject({
      status: "pending",
      payment_status: "paid",
      refunded_at: null,
    });
    expect(first.paid_at).toBeTruthy();
    const audit = await paymentEvents(receipt.id);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      event: "paid",
      amount: demoProducts[0].price * 2,
      actor_id: admin,
      note: "Tiền COD đã thực nhận",
    });
    expect(
      await recordPayment(receipt.id, "paid", "Ghi chú khác", secondAdmin),
    ).toEqual(first);
    expect(await paymentEvents(receipt.id)).toEqual(audit);
    expect(await stock()).toBe(beforeStock);
  });
  it("retains a paid state through cancellation, restores stock once, then audits a full refund without changing stock", async () => {
    const receipt = await createOrder();
    const paid = await recordPayment(receipt.id);
    await expect(
      recordPayment(receipt.id, "refunded", "Chưa hủy đơn"),
    ).rejects.toThrow("PAYMENT_TRANSITION_CONFLICT");
    const cancelled = await asRole("authenticated", admin, (tx) =>
      tx.query<{ result: { payment_status: string } }>(
        "select public.set_order_status($1::uuid,'cancelled') as result",
        [receipt.id],
      ),
    );
    expect(cancelled.rows[0].result.payment_status).toBe("paid");
    await cancel(receipt.id);
    expect(await stock()).toBe(demoProducts[0].stock);
    const refunded = await recordPayment(
      receipt.id,
      "refunded",
      "Đã hoàn đủ tiền",
      secondAdmin,
    );
    expect(refunded).toMatchObject({
      status: "cancelled",
      payment_status: "refunded",
      paid_at: paid.paid_at,
    });
    expect(refunded.refunded_at).toBeTruthy();
    expect(
      await recordPayment(receipt.id, "refunded", "Thử lại", admin),
    ).toEqual(refunded);
    expect(
      await recordPayment(receipt.id, "paid", "Lặp yêu cầu cũ", admin),
    ).toEqual(refunded);
    const events = await paymentEvents(receipt.id);
    expect(events).toHaveLength(2);
    expect(events.find((row) => row.event === "refunded")).toMatchObject({
      amount: demoProducts[0].price * 2,
      actor_id: secondAdmin,
      note: "Đã hoàn đủ tiền",
    });
    expect(await stock()).toBe(demoProducts[0].stock);
  });
  it("rejects refund before payment, paid-after-cancellation, unknown actions and missing audit notes atomically", async () => {
    const receipt = await createOrder();
    await expect(recordPayment(receipt.id, "refunded")).rejects.toThrow(
      "PAYMENT_TRANSITION_CONFLICT",
    );
    await expect(recordPayment(receipt.id, "pending")).rejects.toThrow(
      "INVALID_REQUEST",
    );
    for (const note of ["", "   ", "\n\t", "A".repeat(201)])
      await expect(recordPayment(receipt.id, "paid", note)).rejects.toThrow(
        "INVALID_PAYMENT_NOTE",
      );
    await expect(recordPayment(randomUUID())).rejects.toThrow(
      "ORDER_NOT_FOUND",
    );
    expect(await paymentEvents(receipt.id)).toHaveLength(0);
    expect(await stock()).toBe(demoProducts[0].stock - 2);
    await cancel(receipt.id);
    await expect(recordPayment(receipt.id, "paid")).rejects.toThrow(
      "PAYMENT_TRANSITION_CONFLICT",
    );
    expect(await paymentEvents(receipt.id)).toHaveLength(0);
    expect(await stock()).toBe(demoProducts[0].stock);
  });
  it("can record cash collected after fulfillment without rewriting the completed order state", async () => {
    const receipt = await createOrder();
    await asRole("authenticated", admin, (tx) =>
      tx.query("select public.set_order_status($1::uuid,'completed')", [
        receipt.id,
      ]),
    );
    expect(await recordPayment(receipt.id)).toMatchObject({
      status: "completed",
      payment_status: "paid",
    });
    const replay = await asRole("authenticated", admin, (tx) =>
      tx.query<{ result: { payment_status: string } }>(
        "select public.set_order_status($1::uuid,'completed') as result",
        [receipt.id],
      ),
    );
    expect(replay.rows[0].result.payment_status).toBe("paid");
    expect(await stock()).toBe(demoProducts[0].stock - 2);
  });
});

describe("manual payment privileges and audit visibility", () => {
  it("denies anonymous/customer/server payment RPC calls and every application role's direct order update", async () => {
    const receipt = await createOrder();
    for (const role of ["anon", "service_role"] as const)
      await expect(
        asRole(role, null, (tx) =>
          tx.query(
            "select public.record_order_payment($1::uuid,'paid','Verified')",
            [receipt.id],
          ),
        ),
      ).rejects.toThrow("permission denied");
    await expect(
      recordPayment(receipt.id, "paid", "Customer claim", owner),
    ).rejects.toThrow("Admin required");
    for (const [role, user] of [
      ["authenticated", owner],
      ["authenticated", admin],
      ["service_role", null],
    ] as const)
      await expect(
        asRole(role, user, (tx) =>
          tx.query(
            "update public.orders set payment_status='paid',paid_at=now() where id=$1",
            [receipt.id],
          ),
        ),
      ).rejects.toThrow("permission denied");
    expect(await paymentEvents(receipt.id)).toHaveLength(0);
  });
  it("shows audit events only to admins and rejects direct insert/update/delete even by admin or service role", async () => {
    const receipt = await createOrder();
    await recordPayment(receipt.id);
    await expect(
      asRole("anon", null, (tx) =>
        tx.query("select id from public.order_payment_events"),
      ),
    ).rejects.toThrow("permission denied");
    expect(
      (
        await asRole("authenticated", owner, (tx) =>
          tx.query("select id from public.order_payment_events"),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asRole("authenticated", admin, (tx) =>
          tx.query("select event,amount,note from public.order_payment_events"),
        )
      ).rows,
    ).toHaveLength(1);
    for (const [role, user] of [
      ["authenticated", owner],
      ["authenticated", admin],
      ["service_role", null],
    ] as const) {
      for (const query of [
        "update public.order_payment_events set note='Tampered' where order_id=$1",
        "delete from public.order_payment_events where order_id=$1",
        `insert into public.order_payment_events(order_id,event,amount,actor_id,note) values ($1,'refunded',1,'${admin}','False refund')`,
      ])
        await expect(
          asRole(role, user, (tx) => tx.query(query, [receipt.id])),
        ).rejects.toThrow("permission denied");
    }
    expect(await paymentEvents(receipt.id)).toHaveLength(1);
    await asRole("service_role", null, (tx) =>
      tx.query("delete from public.orders where id=$1", [receipt.id]),
    );
    expect(await paymentEvents(receipt.id)).toHaveLength(0);
  });
  it("applies existing owner/admin order RLS to receiving snapshots and payment timestamps", async () => {
    await configureBank();
    const receipt = await createOrder(
      undefined,
      randomUUID(),
      owner,
      undefined,
      "bank_transfer",
    );
    await recordPayment(receipt.id);
    for (const [user, count] of [
      [owner, 1],
      [stranger, 0],
      [admin, 1],
    ] as const) {
      const result = await asRole("authenticated", user, (tx) =>
        tx.query(
          "select payment_method,payment_bank_account_number,paid_at,refunded_at from public.orders where id=$1",
          [receipt.id],
        ),
      );
      expect(result.rows).toHaveLength(count);
      if (count)
        expect(result.rows[0]).toMatchObject({
          payment_method: "bank_transfer",
          payment_bank_account_number: bankFixture.bank_account_number,
          refunded_at: null,
        });
    }
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
