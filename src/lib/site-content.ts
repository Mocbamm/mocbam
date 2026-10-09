import type { SiteContent } from "./types";

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
};

export const contentSections: ContentSection[] = [
  {
    key: "home-hero",
    group: "home",
    label: "Lời chào đầu trang",
    title: "Một chút mộc.\nMột chút thương.",
    content:
      "Những người bạn nhỏ từ gỗ, mang theo câu chuyện riêng và niềm vui giản dị. Để mỗi ngày của bạn thêm một chút đáng yêu.",
  },
  {
    key: "home-hero-media",
    group: "home",
    label: "Ảnh / video đầu trang",
    kind: "media",
    title: "Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm",
    content: "/images/story.svg",
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
    label: "Bộ sưu tập nhân vật",
    title: "Dòng nhân vật",
    content: "Những người bạn nhỏ",
  },
  {
    key: "home-category-characters-media",
    group: "home",
    label: "Ảnh bộ sưu tập nhân vật",
    kind: "media",
    title: "Dòng nhân vật",
    content: "/images/product-02.svg",
  },
  {
    key: "home-category-beads",
    group: "home",
    label: "Bộ sưu tập chuỗi",
    title: "Dòng chuỗi",
    content: "Giản dị theo cách riêng",
  },
  {
    key: "home-category-beads-media",
    group: "home",
    label: "Ảnh bộ sưu tập chuỗi",
    kind: "media",
    title: "Dòng chuỗi",
    content: "/images/product-06.svg",
  },
  {
    key: "home-featured",
    group: "home",
    label: "Tiêu đề sản phẩm nổi bật",
    title: "Nhỏ xinh, đủ thương.",
    content: "Mộc chọn cho bạn",
  },
  {
    key: "home-intro",
    group: "home",
    label: "Giới thiệu Mộc",
    title: "Những điều nhỏ, làm nên bình yên",
    content:
      "Nhân vật gỗ và phụ kiện thủ công, mang một chút mộc mạc và ấm áp vào mỗi ngày.",
  },
  {
    key: "home-intro-media",
    group: "home",
    label: "Ảnh / video giới thiệu",
    kind: "media",
    title: "Một người bạn gỗ, được Mộc nâng niu",
    content: "/images/product-03.svg",
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
    kind: "media",
    title: "Thế giới nhỏ của Mộc Bàm",
    content: "/images/story.svg",
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
      "## 1. Tìm một điều nhỏ xinh\n\nDuyệt danh mục hoặc dùng ô tìm kiếm để chọn sản phẩm. Mở trang chi tiết để xem hình ảnh, mô tả, giá và tình trạng còn hàng.\n\n## 2. Chọn sản phẩm\n\nChọn số lượng, thêm vào giỏ để mua tiếp hoặc chọn Mua ngay để đến bước thanh toán.\n\n## 3. Kiểm tra thông tin nhận hàng\n\nKiểm tra sản phẩm trong giỏ. Điền họ tên, số điện thoại, email, địa chỉ và ghi chú nếu cần. Phí giao hàng và tổng tiền hiển thị trước khi gửi đơn.\n\n## 4. Thanh toán và gửi đơn\n\nChọn thanh toán khi nhận hàng (COD) hoặc chuyển khoản nếu cửa hàng đã bật phương thức này. Với chuyển khoản, dùng đúng tài khoản, số tiền và nội dung hiển thị trên đơn. Mộc xác nhận thanh toán sau khi kiểm tra giao dịch.\n\n## 5. Theo dõi đơn\n\nLưu mã đơn và liên kết xác nhận để theo dõi. Nếu đặt hàng khi đã đăng nhập, bạn cũng có thể xem đơn trong Tài khoản. Liên hệ Mộc khi cần chỉnh sửa thông tin hoặc hỗ trợ.",
  },
  {
    key: "shipping",
    group: "policies",
    label: "Giao hàng",
    title: "Giao hàng",
    content:
      "## Phạm vi và thời gian dự kiến\n\nMộc Bàm giao hàng trên toàn Việt Nam. Thời gian dự kiến kể từ khi đơn được xác nhận và bàn giao cho đơn vị vận chuyển:\n\n- Nội thành TP. Hồ Chí Minh và Hà Nội: 1–3 ngày làm việc.\n- Các khu vực khác: 3–5 ngày làm việc.\n\nThời gian có thể thay đổi theo địa chỉ, điều kiện vận chuyển hoặc dịp cao điểm. Mộc sẽ trao đổi nếu đơn cần thêm thời gian chuẩn bị.\n\n## Phí giao hàng\n\nPhí giao hàng được hiển thị trong bước thanh toán trước khi bạn gửi đơn. Mộc sẽ liên hệ để thống nhất nếu có yêu cầu giao nhận đặc biệt.\n\n## Nhận hàng\n\nVui lòng kiểm tra thông tin người nhận và giữ điện thoại liên lạc. Khi nhận hàng, kiểm tra tình trạng đóng gói và sản phẩm; ảnh hoặc video mở kiện sẽ giúp Mộc hỗ trợ nhanh hơn nếu có vấn đề.",
  },
  {
    key: "payment",
    group: "policies",
    label: "Phương thức thanh toán",
    title: "Phương thức thanh toán",
    content:
      "## Thanh toán khi nhận hàng (COD)\n\nBạn thanh toán cho đơn vị vận chuyển khi nhận hàng theo tổng tiền trên đơn đã xác nhận. Kiểm tra số tiền và thông tin người nhận trước khi gửi đơn.\n\n## Chuyển khoản ngân hàng\n\nPhương thức chuyển khoản chỉ xuất hiện khi cửa hàng đã cấu hình và bật tài khoản nhận tiền. Sau khi gửi đơn, dùng tài khoản, số tiền và nội dung chuyển khoản hiển thị trên trang xác nhận đơn. Mã QR, nếu có, giúp bạn điền thông tin giao dịch; hãy kiểm tra lại trước khi xác nhận trên ứng dụng ngân hàng.\n\nGửi đơn hoặc mở mã QR chưa đồng nghĩa đã thanh toán. Mộc xác nhận trạng thái thanh toán sau khi kiểm tra giao dịch nhận tiền. Không chuyển tiền theo tài khoản được gửi từ nguồn không xác minh.\n\n## Cần hỗ trợ giao dịch?\n\nLiên hệ Mộc kèm mã đơn nếu chuyển sai nội dung, số tiền hoặc cần kiểm tra thanh toán. Website không tự động trích tiền hay hoàn tiền; các yêu cầu hoàn tiền được cửa hàng trao đổi và xác nhận riêng.",
  },
  {
    key: "returns",
    group: "policies",
    label: "Đổi trả & chăm sóc",
    title: "Đổi trả & chăm sóc",
    content:
      "## Hỗ trợ đổi trả trong 7 ngày\n\nLiên hệ Mộc trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị lỗi kỹ thuật, hư hỏng khi vận chuyển hoặc giao sai so với đơn đã xác nhận. Vui lòng cung cấp mã đơn và mô tả tình trạng; ảnh hoặc video mở kiện được khuyến khích để kiểm tra thuận tiện, không phải điều kiện bắt buộc để tiếp nhận hỗ trợ.\n\nSản phẩm đổi trả cần chưa qua sử dụng và không phát sinh hư hỏng do người dùng. Giữ bao bì, phụ kiện nếu có. Mộc sẽ kiểm tra và thống nhất cách đổi, trả hoặc hoàn tiền, cùng việc nhận lại sản phẩm và chi phí vận chuyển theo nguyên nhân thực tế.\n\n## Lưu ý với chất liệu gỗ\n\nVân gỗ, màu sắc tự nhiên có thể khác nhẹ giữa các sản phẩm và hình ảnh trên màn hình. Đây là đặc trưng của chất liệu, không mặc nhiên là lỗi sản phẩm. Nếu bạn chưa chắc về tình trạng món đồ, hãy liên hệ để Mộc cùng kiểm tra và hướng dẫn.",
  },
  {
    key: "warranty",
    group: "policies",
    label: "Bảo hành & chăm sóc",
    title: "Bảo hành & chăm sóc",
    content:
      "## Bảo hành lỗi kỹ thuật 12 tháng\n\nMộc hỗ trợ bảo hành lỗi kỹ thuật do sản xuất trong 12 tháng kể từ khi nhận hàng. Gửi mã đơn, mô tả tình trạng và hình ảnh để chúng mình kiểm tra, tư vấn cách xử lý phù hợp và thống nhất việc nhận lại sản phẩm nếu cần.\n\n## Phạm vi loại trừ\n\nBảo hành không áp dụng cho hư hỏng do rơi vỡ, trầy xước trong sử dụng, ngâm nước, ẩm mốc, phơi nắng hoặc nhiệt độ khắc nghiệt, hay tự ý sửa đổi kết cấu sản phẩm. Vân gỗ và sắc độ khác nhau nhẹ là đặc trưng tự nhiên của chất liệu.\n\n## Tư vấn chăm sóc trọn đời\n\nMộc luôn sẵn lòng hướng dẫn chăm sóc trong suốt thời gian bạn sử dụng sản phẩm. Đặt đồ gỗ ở nơi khô thoáng, tránh nước và ánh nắng trực tiếp kéo dài. Dùng khăn mềm khô hoặc hơi ẩm rồi lau lại ngay; tránh chất tẩy mạnh, nước hoa và dung môi trên bề mặt gỗ.\n\nNếu sản phẩm cần sửa chữa ngoài phạm vi bảo hành, Mộc sẽ trao đổi khả năng hỗ trợ và chi phí thực tế trước khi thực hiện.",
  },
  {
    key: "privacy",
    group: "policies",
    label: "Quyền riêng tư",
    title: "Quyền riêng tư",
    content:
      "## Thông tin Mộc sử dụng\n\nTên, email, số điện thoại, địa chỉ giao hàng và thông tin đơn được sử dụng để tiếp nhận, xác nhận, giao hàng và giải quyết yêu cầu hỗ trợ. Thông tin tài khoản được dùng để đăng nhập và tra cứu đơn của bạn. Nội dung lời nhắn liên hệ và tin nhắn bạn gửi trong mục hỗ trợ được nhân viên cửa hàng xem để trả lời và xử lý yêu cầu.\n\n## Chia sẻ cần thiết\n\nMộc không bán thông tin cá nhân. Một số thông tin cần được xử lý bởi nhà cung cấp dịch vụ lưu trữ, xác thực và đơn vị vận chuyển để vận hành cửa hàng, bảo vệ tài khoản và giao đơn. Chúng mình chỉ sử dụng thông tin phù hợp với mục đích cung cấp dịch vụ.\n\n## Lựa chọn của bạn\n\nBạn có thể đồng ý hoặc từ chối công cụ phân tích và quảng cáo trong lựa chọn cookie. Mộc không đưa tên, email, số điện thoại hoặc địa chỉ vào sự kiện phân tích website.\n\n## Kiểm tra, chỉnh sửa và xóa dữ liệu\n\nLiên hệ Mộc để yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân. Chúng mình sẽ xác minh yêu cầu và trao đổi về dữ liệu cần lưu lại để xử lý đơn hàng, tranh chấp hoặc nghĩa vụ áp dụng.",
  },
  {
    key: "terms",
    group: "policies",
    label: "Điều khoản sử dụng",
    title: "Điều khoản sử dụng",
    content:
      "## Thông tin sản phẩm và đặt hàng\n\nVui lòng cung cấp thông tin liên hệ, giao hàng chính xác và kiểm tra đơn trước khi gửi. Giá, ưu đãi và tồn kho được kiểm tra lại tại bước gửi đơn. Mộc xác nhận thông tin cần thiết trước khi thực hiện đơn hàng.\n\nGỗ tự nhiên có vân và sắc độ riêng; màu hiển thị cũng phụ thuộc màn hình và ánh sáng. Những khác biệt nhẹ này không đồng nghĩa sản phẩm có lỗi.\n\n## Thanh toán, hủy đơn và hoàn tiền\n\nBạn có thể chọn COD hoặc chuyển khoản khi phương thức này được cửa hàng bật. Gửi đơn không đồng nghĩa đã thanh toán; chuyển khoản được Mộc xác nhận sau khi kiểm tra tiền nhận. Website không tự động thu tiền hoặc hoàn tiền.\n\nNếu cần đổi thông tin hoặc hủy đơn, liên hệ Mộc sớm kèm mã đơn. Với đơn đã thanh toán, việc hủy đơn và hoàn tiền được cửa hàng trao đổi, xử lý và xác nhận riêng.\n\n## Sử dụng nội dung\n\nTên thương hiệu và nội dung do Mộc Bàm tạo thuộc quyền sử dụng của Mộc Bàm. Vui lòng liên hệ trước khi sử dụng lại cho mục đích thương mại. Các tài nguyên của bên thứ ba và phần mềm mã nguồn mở tuân theo quyền và giấy phép tương ứng.\n\n## Hỗ trợ và cập nhật\n\nCác chính sách mua hàng, giao hàng, đổi trả và quyền riêng tư là một phần thông tin sử dụng website. Mộc có thể cập nhật nội dung cho phù hợp với hoạt động cửa hàng; hãy xem thông tin hiển thị trước khi đặt hàng hoặc liên hệ khi cần làm rõ.",
  },
];

export function contentEntry(entries: SiteContent[], key: string): SiteContent {
  const fallback = contentSections.find((section) => section.key === key);
  const entry = entries.find((item) => item.key === key);
  if (entry) return entry;
  if (!fallback) throw new Error(`Unknown content section: ${key}`);
  return { key, title: fallback.title, content: fallback.content };
}
