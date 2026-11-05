// Titles and order follow the owner's brief (06/11). The contact page reuses
// the content row of the retired warranty policy, which the owner already
// rewrote as "Liên hệ".
export const policyLinks = [
  { id: "huong-dan", title: "Hướng dẫn mua hàng", key: "shopping-guide" },
  { id: "van-chuyen", title: "Chính sách giao hàng", key: "shipping" },
  { id: "thanh-toan", title: "Phương thức thanh toán", key: "payment" },
  {
    id: "doi-tra",
    title: "Chính sách đổi trả và hỗ trợ sau mua",
    key: "returns",
  },
  { id: "bao-mat", title: "Quyền riêng tư", key: "privacy" },
  { id: "dieu-khoan", title: "Điều khoản sử dụng", key: "terms" },
  { id: "lien-he", title: "Liên hệ", key: "warranty" },
];

// Links shared before the rename keep working.
const policyAliases: Record<string, string> = { "bao-hanh": "lien-he" };

export function findPolicy(id: string | undefined) {
  const resolved = id ? policyAliases[id] || id : undefined;
  return policyLinks.find((policy) => policy.id === resolved);
}

export function policyHref(id: string) {
  return `/chinh-sach?muc=${encodeURIComponent(id)}`;
}
