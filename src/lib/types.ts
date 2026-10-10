export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
};
export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string;
  active: boolean;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  price: number;
  stock: number;
  image_url: string;
  image_urls?: string[];
  video_url?: string;
  variants?: ProductVariant[];
  revision?: number;
  cost_price?: number | null;
  description: string;
  featured: boolean;
  is_new?: boolean;
  active: boolean;
  created_at: string;
};
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  video_url?: string;
  published: boolean;
  created_at: string;
};
export type SiteContent = { key: string; title: string; content: string };
export type SiteSettings = {
  shipping_fee: number;
  shipping_zones?: import("./shipping").ShippingZone[];
  shipping_distance_enabled?: boolean;
  shipping_origin_address?: string;
  shipping_distance_bands?: import("./shipping").ShippingDistanceBand[];
  shop_email: string;
  shop_phone: string;
  shop_address: string;
  shop_hours: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  zalo_url?: string;
  shopee_url?: string;
  bank_transfer_enabled: boolean;
  bank_bin: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
};
export type PaymentMethod = "cod" | "bank_transfer" | "unconfigured";
export type PaymentStatus = "awaiting_payment" | "paid" | "refunded";
export type BankTransfer = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  reference: string;
  qrDataUrl: string;
};
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";
export type OrderItem = {
  id: string;
  product_id: string;
  variant_id?: string | null;
  variant_name?: string;
  unit_cost?: number | null;
  line_discount?: number | null;
  name: string;
  price: number;
  quantity: number;
};
export type Order = {
  id: string;
  reference: string;
  user_id: string | null;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  discount_code?: string;
  discount_amount?: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  refunded_at: string | null;
  return_restocked?: boolean;
  returned_at?: string | null;
  payment_bank_bin: string;
  payment_bank_name: string;
  payment_bank_account_number: string;
  payment_bank_account_name: string;
  created_at: string;
  items?: OrderItem[];
};
export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  resolved: boolean;
  created_at: string;
};

export type Discount = {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: "percentage" | "fixed";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  public_campaign: boolean;
  scope?: "shop" | "product" | "private";
  product_ids?: string[];
  customer_user_ids?: string[];
  customer_user_id: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};
