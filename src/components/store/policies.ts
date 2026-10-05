export const policyLinks = [
  { id: "huong-dan", title: "Hướng dẫn mua hàng" },
  { id: "van-chuyen", title: "Giao hàng" },
  { id: "doi-tra", title: "Đổi trả & chăm sóc" },
  { id: "bao-mat", title: "Quyền riêng tư" },
  { id: "dieu-khoan", title: "Điều khoản sử dụng" },
];

export function policyHref(id: string) {
  return `/chinh-sach?muc=${encodeURIComponent(id)}#${encodeURIComponent(id)}`;
}
