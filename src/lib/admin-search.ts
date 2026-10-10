import type { Order, OrderStatus } from "./types";

export function normalizeAdminSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export function filterOverviewOrders<
  T extends Pick<
    Order,
    "reference" | "customer_name" | "email" | "phone" | "status"
  >,
>(orders: T[], query: string, status: OrderStatus | "all") {
  const search = normalizeAdminSearch(query);
  return orders.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (!search ||
        normalizeAdminSearch(
          `${order.reference} ${order.customer_name} ${order.email} ${order.phone}`,
        ).includes(search)),
  );
}

export const adminSettingsSections = [
  {
    id: "settings-shipping",
    title: "Giao hàng",
    description:
      "Phí vận chuyển, tỉnh thành, phường xã, khoảng cách kilomet km đường bộ, Google Routes, địa chỉ gửi hàng, mốc km, phí mặc định, khu vực giao hàng",
  },
  {
    id: "settings-payments",
    title: "Chuyển khoản ngân hàng",
    description:
      "Thanh toán COD, tên ngân hàng, mã BIN, số tài khoản, chủ tài khoản, mã QR",
  },
  {
    id: "settings-contact",
    title: "Thông tin liên hệ",
    description: "Email cửa hàng, số điện thoại, địa chỉ, giờ mở cửa",
  },
  {
    id: "settings-social",
    title: "Mạng xã hội",
    description: "Facebook, Instagram, TikTok, Zalo, Shopee",
  },
] as const;

export function searchSettingsSections(query: string) {
  const search = normalizeAdminSearch(query);
  return adminSettingsSections.filter(
    (section) =>
      !search ||
      normalizeAdminSearch(`${section.title} ${section.description}`).includes(
        search,
      ),
  );
}
