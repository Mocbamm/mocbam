export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  price: number;
  stock: number;
  image_url: string;
  description: string;
  featured: boolean;
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
  published: boolean;
  created_at: string;
};
export type SiteContent = { key: string; title: string; content: string };
export type SiteSettings = {
  shipping_fee: number;
  shop_email: string;
  shop_phone: string;
  shop_address: string;
  shop_hours: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
};
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";
export type OrderItem = {
  id: string;
  product_id: string;
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
  status: OrderStatus;
  payment_status: "awaiting_payment";
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
