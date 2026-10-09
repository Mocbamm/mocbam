import type { Inquiry, Order } from "./types";

export type CustomerProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export type CustomerOrder = Pick<
  Order,
  | "id"
  | "reference"
  | "user_id"
  | "customer_name"
  | "email"
  | "phone"
  | "total"
  | "status"
  | "created_at"
>;

export type CustomerContact = Pick<
  Inquiry,
  "id" | "name" | "email" | "phone" | "created_at"
>;

export type CustomerSummary = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  last_activity_at: string;
  last_order_at: string | null;
  order_count: number;
  active_order_count: number;
  order_value: number;
  inquiry_count: number;
  orders: Pick<
    CustomerOrder,
    "id" | "reference" | "status" | "total" | "created_at"
  >[];
};

export function normalizedCustomerEmail(value: string) {
  return value.trim().toLowerCase();
}

/** Contact matching groups guests only when an email points to one account. */
export function consolidateCustomers(
  profiles: CustomerProfile[],
  orders: CustomerOrder[],
  inquiries: CustomerContact[],
): CustomerSummary[] {
  const customers = new Map<string, CustomerSummary>();
  const accountEmails = new Map<string, Set<string>>();
  const registerEmail = (email: string, userId: string) => {
    const normalized = normalizedCustomerEmail(email);
    if (!normalized) return;
    const owners = accountEmails.get(normalized) ?? new Set<string>();
    owners.add(userId);
    accountEmails.set(normalized, owners);
  };
  profiles.forEach((profile) => registerEmail(profile.email, profile.id));
  orders.forEach((order) => {
    if (order.user_id) registerEmail(order.email, order.user_id);
  });

  function key(email: string, userId: string | null, fallback: string) {
    if (userId) return `account:${userId}`;
    const normalized = normalizedCustomerEmail(email);
    const owners = accountEmails.get(normalized);
    if (owners?.size === 1) return `account:${[...owners][0]}`;
    return normalized ? `guest:${normalized}` : fallback;
  }
  function ensure(id: string, userId: string | null, created: string) {
    let customer = customers.get(id);
    if (!customer) {
      customer = {
        id,
        user_id: userId ?? (id.startsWith("account:") ? id.slice(8) : null),
        name: "",
        email: "",
        phone: "",
        created_at: created,
        last_activity_at: created,
        last_order_at: null,
        order_count: 0,
        active_order_count: 0,
        order_value: 0,
        inquiry_count: 0,
        orders: [],
      };
      customers.set(id, customer);
    }
    if (created < customer.created_at) customer.created_at = created;
    if (created > customer.last_activity_at)
      customer.last_activity_at = created;
    return customer;
  }

  for (const profile of profiles) {
    const customer = ensure(
      `account:${profile.id}`,
      profile.id,
      profile.created_at,
    );
    customer.name = profile.full_name.trim();
    customer.email = normalizedCustomerEmail(profile.email);
    customer.phone = profile.phone.trim();
    if (profile.updated_at > customer.last_activity_at)
      customer.last_activity_at = profile.updated_at;
  }
  for (const order of [...orders].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )) {
    const customer = ensure(
      key(order.email, order.user_id, `order:${order.id}`),
      order.user_id,
      order.created_at,
    );
    customer.name ||= order.customer_name.trim();
    customer.email ||= normalizedCustomerEmail(order.email);
    customer.phone ||= order.phone.trim();
    customer.order_count++;
    if (!["cancelled", "returned"].includes(order.status)) {
      customer.active_order_count++;
      customer.order_value += Number(order.total);
    }
    customer.last_order_at ??= order.created_at;
    customer.orders.push({
      id: order.id,
      reference: order.reference,
      status: order.status,
      total: Number(order.total),
      created_at: order.created_at,
    });
  }
  for (const inquiry of [...inquiries].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )) {
    const customer = ensure(
      key(inquiry.email, null, `inquiry:${inquiry.id}`),
      null,
      inquiry.created_at,
    );
    customer.name ||= inquiry.name.trim();
    customer.email ||= normalizedCustomerEmail(inquiry.email);
    customer.phone ||= inquiry.phone.trim();
    customer.inquiry_count++;
  }
  return [...customers.values()].sort(
    (a, b) =>
      b.last_activity_at.localeCompare(a.last_activity_at) ||
      a.id.localeCompare(b.id),
  );
}
