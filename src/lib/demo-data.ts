import { contentSections } from "./site-content";
import type {
  BlogPost,
  Category,
  Product,
  SiteContent,
  SiteSettings,
} from "./types";

const created_at = "2026-10-03T00:00:00.000Z";
export const demoCategories: Category[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "nhan-vat",
    name: "Nhân vật gỗ",
    description: "Những người bạn nhỏ, được làm bằng tay từ gỗ tự nhiên.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "chuoi",
    name: "Chuỗi & phụ kiện",
    description: "Một chút mộc mạc để mang theo mỗi ngày.",
  },
];

export const demoProducts: Product[] = [
  {
    id: "33333333-3333-4333-8333-333333333331",
    slug: "meo-moc",
    name: "Mèo Mộc",
    category_id: demoCategories[0].id,
    price: 189000,
    stock: 24,
    image_url: "/images/product-01.svg",
    description:
      "Một chú mèo nhỏ với đôi tai tinh nghịch. Được chà nhám và hoàn thiện thủ công từ gỗ tự nhiên; mỗi vân gỗ là một nét riêng. Phù hợp đặt trên bàn làm việc hoặc làm món quà nhỏ. Kích thước khoảng 7 × 5 cm.",
    featured: true,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333332",
    slug: "tho-moc",
    name: "Thỏ Mộc",
    category_id: demoCategories[0].id,
    price: 179000,
    stock: 18,
    image_url: "/images/product-02.svg",
    description:
      "Người bạn tai dài mang vẻ dịu dàng của gỗ. Sản phẩm được tạo hình, chà nhám và hoàn thiện bằng tay. Vân gỗ và sắc độ có thể khác nhau nhẹ giữa từng chiếc. Kích thước khoảng 8 × 4 cm.",
    featured: true,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "gau-moc",
    name: "Gấu Mộc",
    category_id: demoCategories[0].id,
    price: 219000,
    stock: 12,
    image_url: "/images/product-03.svg",
    description:
      "Một chú gấu tròn trịa cho góc bàn thêm ấm áp. Làm từ gỗ tự nhiên, hoàn thiện thủ công và đóng gói trong hộp giấy. Kích thước khoảng 7 × 6 cm. Tránh để sản phẩm ngâm nước hoặc dưới ánh nắng trực tiếp lâu ngày.",
    featured: true,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333334",
    slug: "voi-moc",
    name: "Voi Mộc",
    category_id: demoCategories[0].id,
    price: 229000,
    stock: 16,
    image_url: "/images/product-04.svg",
    description:
      "Chú voi hiền lành với chiếc vòi nhỏ, được tạo hình từ gỗ. Một món quà để nhắc nhau chậm lại và tận hưởng những điều giản dị. Hoàn thiện thủ công. Kích thước khoảng 6 × 8 cm.",
    featured: false,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333335",
    slug: "chuoi-vong-moc",
    name: "Chuỗi Vòng Mộc",
    category_id: demoCategories[1].id,
    price: 159000,
    stock: 30,
    image_url: "/images/product-05.svg",
    description:
      "Chuỗi hạt gỗ mộc mạc, dễ kết hợp trong ngày thường. Hạt gỗ được chà nhám cẩn thận và xâu thủ công. Sắc độ và vân gỗ khác nhau tự nhiên. Giữ khô ráo và lau bằng khăn mềm.",
    featured: true,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333336",
    slug: "chuoi-hat-an-yen",
    name: "Chuỗi Hạt An Yên",
    category_id: demoCategories[1].id,
    price: 199000,
    stock: 20,
    image_url: "/images/product-06.svg",
    description:
      "Chuỗi hạt gỗ với sắc nâu ấm, được xâu bằng tay. Một phụ kiện nhỏ cho nhịp sống nhẹ nhàng. Sản phẩm đi kèm túi giấy và thẻ hướng dẫn bảo quản. Tránh nước hoa và chất tẩy rửa.",
    featured: false,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333337",
    slug: "moc-khoa-nha-go",
    name: "Móc Khóa Nhà Gỗ",
    category_id: demoCategories[1].id,
    price: 99000,
    stock: 40,
    image_url: "/images/product-07.svg",
    description:
      "Một ngôi nhà nhỏ mang theo trong chùm chìa khóa. Được cắt và hoàn thiện từ gỗ tự nhiên, kết hợp khoen kim loại. Kích thước phần gỗ khoảng 4 × 4 cm. Mỗi sản phẩm có vân gỗ riêng.",
    featured: false,
    active: true,
    created_at,
  },
  {
    id: "33333333-3333-4333-8333-333333333338",
    slug: "chuoi-may-nho",
    name: "Chuỗi Mây Nhỏ",
    category_id: demoCategories[1].id,
    price: 139000,
    stock: 22,
    image_url: "/images/product-08.svg",
    description:
      "Chuỗi phụ kiện với hình mây nhỏ, kết hợp hạt gỗ tự nhiên. Được lắp ráp và hoàn thiện thủ công, phù hợp trang trí túi hoặc góc nhỏ trong nhà. Giữ sản phẩm khô ráo và lau nhẹ bằng khăn mềm.",
    featured: false,
    active: true,
    created_at,
  },
];

export const demoPosts: BlogPost[] = [
  {
    id: "44444444-4444-4444-8444-444444444441",
    slug: "tu-mot-manh-go-nho",
    title: "Từ một mảnh gỗ nhỏ",
    excerpt:
      "Một món đồ nhỏ bắt đầu bằng nhiều lần thử, một đôi tay kiên nhẫn và tình yêu với chất liệu tự nhiên.",
    content:
      "Ở Mộc Bàm, mỗi sản phẩm bắt đầu từ một mảnh gỗ và một ý tưởng giản dị. Chúng mình phác thảo, tạo hình, rồi chà nhám từng bề mặt bằng tay.\n\nGỗ không có hai mảnh giống hệt nhau. Vân gỗ, sắc độ và những dấu nét tự nhiên làm nên cá tính của từng người bạn nhỏ. Chúng mình giữ lại sự khác biệt ấy thay vì che đi.\n\nKhi món đồ được đóng gói, chúng mình mong nó sẽ mang một chút ấm áp tới góc bàn, chiếc túi hay căn phòng của bạn.",
    image_url: "/images/blog-01.svg",
    published: true,
    created_at,
  },
  {
    id: "44444444-4444-4444-8444-444444444442",
    slug: "giu-do-go-luon-am-ap",
    title: "Giữ đồ gỗ luôn ấm áp",
    excerpt: "Vài thói quen nhỏ để những món đồ gỗ của bạn đi cùng năm tháng.",
    content:
      "Đồ gỗ thích một góc khô ráo, thoáng mát. Tránh ngâm nước, độ ẩm cao và ánh nắng trực tiếp kéo dài.\n\nĐể làm sạch, dùng khăn mềm khô hoặc hơi ẩm rồi lau lại ngay. Không dùng chất tẩy rửa mạnh, nước hoa hoặc dung môi trên bề mặt gỗ.\n\nNếu bạn cần hỗ trợ chăm sóc một sản phẩm Mộc Bàm, hãy gửi tin nhắn qua trang liên hệ. Chúng mình sẽ hướng dẫn theo tình trạng cụ thể của món đồ.",
    image_url: "/images/blog-02.svg",
    published: true,
    created_at,
  },
];

export const demoContent: SiteContent[] = contentSections.map(({ key, title, content }) => ({ key, title, content }));

export const demoSettings: SiteSettings = {
  shipping_fee: 0,
  shop_email: "hello@mocbam.vn",
  shop_phone: "090 000 0000",
  shop_address: "TP. Hồ Chí Minh, Việt Nam",
  shop_hours: "Thứ 2 – Thứ 7 · 09:00 – 18:00",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  zalo_url: "",
  shopee_url: "",
  bank_transfer_enabled: false,
  bank_bin: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
};
