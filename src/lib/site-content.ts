import type { SiteContent } from "./types";
import { contentMediaSource } from "./storefront-media";

export const contentGroups = [
  { id: "home", title: "Trang chủ" },
  { id: "about", title: "Chúng tôi" },
  { id: "policies", title: "Chính sách" },
] as const;

export type ContentGroup = (typeof contentGroups)[number]["id"];
type ContentSection = SiteContent & {
  group: ContentGroup;
  label: string;
  kind?: "media";
  hint?: string;
  aspectRatio?: string;
  fit?: "cover" | "contain";
  // Kept for saved rows but no longer shown on the storefront or in admin.
  hidden?: boolean;
};

export const contentSections: ContentSection[] = [
  {
    key: "home-hero",
    group: "home",
    hidden: true,
    label: "Lời chào đầu trang",
    title: "Một chút mộc.\nMột chút thương.",
    content:
      "Những người bạn nhỏ từ gỗ, mang theo câu chuyện riêng và niềm vui giản dị. Để mỗi ngày của bạn thêm một chút đáng yêu.",
  },
  {
    key: "home-hero-media",
    group: "home",
    label: "Banner trượt 1",
    hint: "Ảnh đầu tiên của banner trượt trên trang chủ. Gợi ý ảnh ngang 2400 × 1050 px, chủ thể ở giữa; góc dưới bên trái có 2 nút bấm. Có thể thêm ảnh dọc riêng ở mục Banner trên điện thoại.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm",
    content: "/images/verdant/hero.webp",
  },
  {
    key: "home-hero-mobile-media",
    group: "home",
    label: "Banner trên điện thoại",
    kind: "media",
    title: "Không gian nhỏ xinh của Mộc Bàm trên điện thoại",
    content: "none",
    hint: "Không bắt buộc. Gợi ý ảnh dọc 900 × 1200 px, chừa khoảng trống phía dưới bên trái cho chữ. Nếu không chọn tệp, điện thoại dùng banner chính; banner mẫu có sẵn ảnh dọc phù hợp. Banner chính phải được bật.",
    aspectRatio: "3 / 4",
  },
  {
    key: "home-hero-slide-2-media",
    group: "home",
    label: "Banner trượt 2",
    hint: "Không bắt buộc. Ảnh thứ hai của banner trượt, tự chuyển sau vài giây. Gợi ý ảnh ngang 2400 × 1050 px, chủ thể ở giữa. Chọn “Không dùng” để bỏ ảnh này.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Những người bạn gỗ nhỏ của Mộc Bàm",
    content: "/images/verdant/story.webp",
  },
  {
    key: "home-hero-slide-3-media",
    group: "home",
    label: "Banner trượt 3",
    hint: "Không bắt buộc. Ảnh thứ ba của banner trượt. Gợi ý ảnh ngang 2400 × 1050 px, chủ thể ở giữa.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Góc nhỏ xinh của Mộc Bàm",
    content: "none",
  },
  {
    key: "home-hero-note",
    group: "home",
    label: "Thông điệp đầu trang",
    title: "Một món quà, một câu chuyện",
    content: "Dành cho bạn, và người bạn thương.",
  },
  {
    key: "home-category-characters",
    group: "home",
    label: "Banner danh mục nhân vật (Tiêu đề và dòng chữ nhỏ)",
    title: "Dòng nhân vật",
    content: "Những người bạn nhỏ",
  },
  {
    key: "home-category-characters-media",
    group: "home",
    label: "Ảnh banner danh mục nhân vật",
    hint: "Banner ảnh của danh mục, nằm ngay dưới banner trượt. Gợi ý ảnh ngang 1500 × 1000 px; chừa khoảng trống phía dưới bên trái cho chữ và nút.",
    aspectRatio: "3 / 2",
    kind: "media",
    title: "Dòng nhân vật",
    content: "/images/verdant/rabbit-photo.webp",
  },
  {
    key: "home-category-beads",
    group: "home",
    label: "Banner danh mục chuỗi (Tiêu đề và dòng chữ nhỏ)",
    title: "Dòng chuỗi",
    content: "Giản dị theo cách riêng",
  },
  {
    key: "home-category-beads-media",
    group: "home",
    label: "Ảnh banner danh mục chuỗi",
    hint: "Banner ảnh của danh mục, nằm ngay dưới banner trượt. Gợi ý ảnh ngang 1500 × 1000 px; chừa khoảng trống phía dưới bên trái cho chữ và nút.",
    aspectRatio: "3 / 2",
    kind: "media",
    title: "Dòng chuỗi",
    content: "/images/verdant/bracelet-photo.webp",
  },
  {
    key: "home-featured",
    group: "home",
    label: "Tiêu đề sản phẩm nổi bật",
    title: "Sản phẩm nổi bật",
    content: "Mộc chọn cho bạn",
  },
  {
    key: "home-intro",
    group: "home",
    label: "Góc nhỏ Mộc Bàm (Tiêu đề và dòng chữ nhỏ phía trên)",
    title: "Mỗi món quà nhỏ, một câu chuyện riêng",
    content: "Góc nhỏ Mộc Bàm",
  },
  {
    key: "home-intro-media",
    group: "home",
    label: "Ảnh / video giới thiệu",
    hint: "Khối giới thiệu màu xanh trên trang chủ. Gợi ý ảnh gần vuông, rộng ít nhất 1200 px, chủ thể ở giữa.",
    aspectRatio: "6 / 5",
    kind: "media",
    title: "Một người bạn gỗ, được Mộc nâng niu",
    content: "/images/verdant/bear-photo.webp",
  },
  {
    key: "home-journal",
    group: "home",
    label: "Lời dẫn nhật ký",
    title: "Nhật ký Mộc Bàm",
    content: "Chuyện nhỏ bên hiên",
  },
  {
    key: "home-contact",
    group: "home",
    label: "Lời mời liên hệ",
    title: "Gửi Mộc một lời nhắn.",
    content:
      "Một câu hỏi, một ý tưởng, hay chỉ muốn chào nhau. Chúng mình luôn sẵn lòng nghe bạn.",
  },
  {
    key: "about",
    group: "about",
    label: "Câu chuyện thương hiệu",
    title: "Nhỏ thôi, nhưng có câu chuyện",
    content:
      "Mộc Bàm bắt đầu từ tình yêu với những món đồ nhỏ được làm bằng tay. Chúng mình tạo nên nhân vật gỗ và phụ kiện từ chất liệu tự nhiên, với mong muốn mang chút mộc mạc, ấm áp vào cuộc sống hằng ngày.\n\nMỗi sản phẩm có vân gỗ và sắc độ riêng. Đó là nét đặc biệt của đồ thủ công và cũng là câu chuyện bạn mang về.",
  },
  {
    key: "about-media",
    group: "about",
    label: "Ảnh / video câu chuyện",
    hint: "Ảnh mở đầu trang Chúng tôi. Gợi ý ảnh ngang 1200 × 1000 px, giữ chủ thể ở giữa.",
    aspectRatio: "6 / 5",
    kind: "media",
    title: "Thế giới nhỏ của Mộc Bàm",
    content: "/images/verdant/story.webp",
  },
  {
    key: "about-natural",
    group: "about",
    label: "Giá trị: tự nhiên",
    title: "Tự nhiên",
    content: "Để những đường vân riêng kể câu chuyện của gỗ.",
  },
  {
    key: "about-craft",
    group: "about",
    label: "Giá trị: tỉ mỉ",
    title: "Tỉ mỉ",
    content: "Trân trọng từng chi tiết, từ tạo hình đến đóng gói.",
  },
  {
    key: "about-warmth",
    group: "about",
    label: "Giá trị: ấm áp",
    title: "Ấm áp",
    content: "Những món đồ nhỏ, dành cho bạn và người bạn thương.",
  },
  {
    key: "about-invitation",
    group: "about",
    label: "Lời mời cuối trang",
    title: "Bạn là một phần câu chuyện của Mộc.",
    content: "Kể chúng mình nghe",
  },
  {
    key: "shopping-guide",
    group: "policies",
    label: "Hướng dẫn mua hàng",
    title: "Hướng dẫn mua hàng",
    content:
      "## Bước 1: Tìm kiếm sản phẩm\n\nKhách hàng truy cập vào website Mộc Bàm, duyệt qua các danh mục sản phẩm (hoặc sử dụng thanh tìm kiếm) để chọn mẫu sản phẩm ưng ý.\n\n## Bước 2: Xem chi tiết & Thêm vào giỏ hàng\n\nNhấp vào sản phẩm để xem các thông tin chi tiết và giá bán. Chọn số lượng cần mua, sau đó bấm “Bỏ giỏ” hoặc chọn “Mua ngay”.\n\n## Bước 3: Kiểm tra giỏ hàng & Nhập thông tin\n\nTại trang giỏ hàng, quý khách kiểm tra lại danh sách sản phẩm và tổng tiền. Nhấn “Tiếp tục đặt hàng” và điền đầy đủ các thông tin giao nhận bao gồm: Họ và tên, Số điện thoại, Email, Địa chỉ nhận hàng và Ghi chú riêng cho đơn hàng (nếu có).\n\n## Bước 4: Chọn phương thức thanh toán\n\nLựa chọn phương thức thanh toán phù hợp:\n\n- COD: Thanh toán khi nhận hàng\n- Chuyển khoản ngân hàng\n\n## Bước 5: Xác nhận đặt hàng\n\nBấm “Gửi đơn hàng”. Hệ thống sẽ hiển thị thông tin và trạng thái đơn hàng để quý khách tiện theo dõi trạng thái.",
  },
  {
    key: "shipping",
    group: "policies",
    label: "Giao hàng",
    title: "Giao hàng",
    content:
      "## Phạm vi vận chuyển\n\nMộc Bàm hỗ trợ giao hàng trên toàn quốc.\n\n## Thời gian giao hàng dự kiến\n\n- Khu vực nội thành (TP. Hồ Chí Minh/Hà Nội): Từ 1 – 3 ngày làm việc kể từ khi đơn hàng được xác nhận.\n- Khu vực ngoại thành và các tỉnh thành khác: Từ 3 – 5 ngày làm việc (tùy thuộc vào địa chỉ cụ thể và đơn vị vận chuyển).\n\n## Cước phí vận chuyển\n\nPhí vận chuyển được hệ thống tự động tính toán dựa trên trọng lượng, kích thước đóng gói của sản phẩm và khoảng cách địa lý. Mức phí cụ thể sẽ hiển thị công khai ở bước thanh toán để khách hàng nắm rõ trước khi xác nhận đặt đơn.\n\n## Quy trình nhận hàng\n\nQuý khách được quyền kiểm tra tình trạng bên ngoài của kiện hàng (độ nguyên vẹn của bao bì, không móp méo) trước khi ký nhận và thanh toán với nhân viên giao nhận.",
  },
  {
    key: "payment",
    group: "policies",
    label: "Phương thức thanh toán",
    title: "Phương thức thanh toán",
    content:
      "## Thanh toán khi nhận hàng (COD)\n\nKhách hàng thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng sau khi đã nhận và kiểm tra sơ bộ kiện hàng.\n\n## Thanh toán chuyển khoản ngân hàng\n\nQuý khách chuyển khoản trước qua số tài khoản hoặc quét mã QR chính thức của Mộc Bàm hiển thị ở bước thanh toán.\n\nSau khi nhận được thông tin chuyển khoản thành công, hệ thống hoặc nhân viên chăm sóc sẽ liên hệ xác nhận và tiến hành đóng gói, gửi hàng cho quý khách.",
  },
  {
    key: "returns",
    group: "policies",
    label: "Đổi trả & chăm sóc",
    title: "Đổi trả & chăm sóc",
    content:
      "## Thời gian hỗ trợ đổi trả\n\nTrong vòng 07 ngày kể từ ngày quý khách nhận được sản phẩm.\n\n## Điều kiện được chấp nhận đổi trả\n\n- Quý khách vui lòng quay video làm bằng chứng.\n- Sản phẩm bị lỗi kỹ thuật nặng, nứt gãy do vận chuyển hoặc giao sai mẫu mã/kích thước so với đơn đặt hàng.\n- Sản phẩm còn nguyên vẹn, chưa qua sử dụng, chưa bị tác dụng hóa chất hoặc chịu lực va đập mạnh từ phía người dùng.\n\n## Quy trình xử lý đổi trả\n\n1. Quý khách quay video quá trình mở hộp và chụp lại hình ảnh rõ nét phần lỗi sản phẩm (bắt buộc).\n2. Liên hệ ngay với Mộc Bàm qua kênh chat trên website, fanpage hoặc số hotline trong vòng 48h kể từ khi nhận hàng.\n3. Sau khi xác nhận thông tin, Mộc Bàm sẽ hướng dẫn gửi lại sản phẩm và tiến hành đổi mới sản phẩm tương đương hoặc hoàn tiền theo thỏa thuận.",
  },
  {
    key: "warranty",
    group: "policies",
    label: "Bảo hành & bảo dưỡng",
    title: "Bảo hành & bảo dưỡng",
    content:
      "## Thời gian bảo hành\n\nBảo hành các lỗi kỹ thuật do nhà sản xuất trong thời gian 12 tháng kể từ ngày mua.\n\n## Các trường hợp không nằm trong diện bảo hành\n\n- Sản phẩm bị hư hỏng do tác động vật lý ngoại lực mạnh (rơi vỡ, va đập, trầy xước sâu do vật nhọn).\n- Sản phẩm bị ngập nước, ẩm mốc kéo dài hoặc đặt trực tiếp dưới ánh nắng mặt trời gay gắt gây sốc nhiệt cho gỗ.\n- Sản phẩm đã qua tự ý sửa chữa hoặc can thiệp kết cấu bởi bên thứ ba không thuộc ủy quyền của Mộc Bàm.\n\n## Hỗ trợ bảo dưỡng trọn đời\n\nMộc Bàm luôn sẵn sàng tư vấn cách vệ sinh, đánh bóng lại bề mặt gỗ và hỗ trợ bảo dưỡng kỹ thuật trọn đời cho mọi sản phẩm của khách hàng.",
  },
  {
    key: "privacy",
    group: "policies",
    label: "Quyền riêng tư",
    title: "Quyền riêng tư",
    content:
      "## Cam kết bảo mật\n\nMộc Bàm cam kết không mua bán, trao đổi, chia sẻ hoặc tiết lộ thông tin cá nhân của khách hàng cho bất kỳ bên thứ ba nào khác, ngoại trừ đơn vị vận chuyển trực tiếp làm nhiệm vụ giao hàng.\n\n## Quyền của khách hàng\n\nKhách hàng có quyền yêu cầu Mộc Bàm kiểm tra, cập nhật, điều chỉnh hoặc xóa bỏ thông tin cá nhân của mình bất cứ lúc nào bằng cách liên hệ trực tiếp qua bộ phận hỗ trợ.",
  },
  {
    key: "terms",
    group: "policies",
    label: "Điều khoản sử dụng",
    title: "Điều khoản sử dụng",
    content:
      "## Chấp thuận điều khoản\n\nBằng việc truy cập và thực hiện mua sắm trên website Mộc Bàm, quý khách đồng ý tuân thủ toàn bộ các điều khoản và điều kiện sử dụng được niêm yết công khai.\n\n## Quyền sở hữu trí tuệ\n\nToàn bộ nội dung hiển thị trên website bao gồm thiết kế, logo, hình ảnh sản phẩm, bài viết, mã nguồn đều thuộc quyền sở hữu độc quyền của Mộc Bàm. Nghiêm cấm mọi hành vi sao chép, chỉnh sửa, tái sử dụng hoặc phát tán với mục đích thương mại khi chưa có sự đồng ý bằng văn bản từ chúng tôi.\n\n## Giới hạn trách nhiệm\n\nMộc Bàm luôn nỗ lực đảm bảo tính chính xác cao nhất về hình ảnh và thông tin mô tả sản phẩm. Tuy nhiên, màu sắc thực tế của sản phẩm gỗ tự nhiên có thể có sự chênh lệch nhẹ tùy thuộc vào màn hình thiết bị hiển thị hoặc từng lô vân mộc của gỗ.",
  },
];

// Earlier seed copy that the owner replaced in her 11/10 feedback. Saved rows
// still holding it show the current default instead.
const replacedSeedCopy: Record<string, { title: string; content?: string }> = {
  "home-featured": { title: "Nhỏ xinh, đủ thương." },
  "home-intro": {
    title: "Những điều nhỏ, làm nên bình yên",
    content:
      "Nhân vật gỗ và phụ kiện thủ công, mang một chút mộc mạc và ấm áp vào mỗi ngày.",
  },
};

export function contentEntry(entries: SiteContent[], key: string): SiteContent {
  const fallback = contentSections.find((section) => section.key === key);
  const entry = entries.find((item) => item.key === key);
  const replaced = replacedSeedCopy[key];
  if (
    entry &&
    fallback &&
    replaced &&
    entry.title === replaced.title &&
    (replaced.content === undefined || entry.content === replaced.content)
  )
    return {
      key,
      title: fallback.title,
      content: replaced.content === undefined ? entry.content : fallback.content,
    };
  if (entry)
    return fallback?.kind === "media"
      ? { ...entry, content: contentMediaSource(key, entry.content) }
      : entry;
  if (!fallback) throw new Error(`Unknown content section: ${key}`);
  return { key, title: fallback.title, content: fallback.content };
}
