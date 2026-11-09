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
    title: "Một chút mộc\nMột chút thương",
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
    label: "Ảnh banner danh mục búp bê",
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
    content: "Mộc Bàm chọn cho bạn",
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
    label: "Ảnh / video khối giới thiệu (Góc nhỏ Mộc Bàm)",
    hint: "Khối giới thiệu màu xanh trên trang chủ. Ảnh ngang đúng tỉ lệ 3 : 2, kích thước 1800 × 1200 px (tối thiểu 1200 × 800 px). Ảnh đúng tỉ lệ này hiện trọn vẹn, không bị cắt; ảnh khác tỉ lệ sẽ bị cắt bớt hai bên hoặc trên dưới.",
    aspectRatio: "3 / 2",
    kind: "media",
    title: "Một người bạn gỗ, được Mộc Bàm nâng niu",
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
    title: "Gửi Mộc Bàm một lời nhắn",
    content:
      "Một câu hỏi, một ý tưởng, hay chỉ muốn chào nhau. Chúng mình luôn sẵn lòng nghe bạn.",
  },
  {
    key: "about",
    group: "about",
    label: "Câu chuyện Mộc Bàm",
    title: "Nhỏ thôi, nhưng có câu chuyện",
    content:
      "> Đôi khi, một ý tưởng bắt đầu từ sự tò mò rất đỗi giản dị.\n> Với Mộc Bàm, đó là lần chúng mình biết đến hạt bàm bàm qua sự chia sẻ tình cờ của một người bạn. Hình dáng đặc biệt của loại hạt này gợi lên sự thích thú và thôi thúc chúng mình thử khám phá những điều có thể tạo nên từ nó. Từ cảm hứng ban đầu ấy, Mộc Bàm dần hình thành với mong muốn biến hạt bàm bàm thành những sản phẩm decor mang hình hài và nét đáng yêu riêng.\n> Mộc Bàm có hai dòng sản phẩm chính, mỗi dòng là một cách kể chuyện khác nhau. Dòng Chuỗi kết nối những hạt bàm bàm thành các phong cảnh được trang trí tỉ mỉ, gợi mở những khung cảnh để ngắm nhìn và tưởng tượng. Trong khi đó, dòng Búp bê mang đến những nhân vật được tạo hình từ hạt bàm bàm, mỗi sản phẩm có một dáng vẻ riêng để bạn yêu thích và lựa chọn.\n> Một bên là phong cảnh, một bên là nhân vật. Dù khác nhau về hình thức, cả hai đều bắt đầu từ niềm yêu thích hạt bàm bàm và mong muốn sáng tạo từ những vật liệu gần gũi.\n> Tên gọi Mộc Bàm gửi gắm tinh thần ấy: từ những vật liệu mộc mạc, tạo nên những góc nhỏ có câu chuyện. “Mộc” gợi nét giản dị, gần gũi; “Bàm” nhắc đến loại hạt đã khơi nguồn cảm hứng cho thương hiệu.\n> Với slogan “Gom nét mộc, tạo góc xinh”, Mộc Bàm mong muốn mang đến những sản phẩm decor có dấu ấn riêng, góp thêm nét duyên cho không gian sống hoặc trở thành món quà được lựa chọn bằng sự quan tâm.\n> Từ hạt bàm bàm đến những phong cảnh và nhân vật mang hình hài riêng, Mộc Bàm vẫn đang tiếp tục hành trình khám phá và sáng tạo, gom góp những điều mộc mạc để tạo nên những góc xinh theo cách của riêng mình.",
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
    // First line is the heading; the next line shows as a smaller sentence.
    title:
      "Một góc xinh, một câu chuyện của riêng bạn\nBạn sẽ đặt Mộc Bàm ở góc nào, hay dành tặng ai? Chúng mình rất muốn được nghe câu chuyện ấy",
    content: "Chia sẻ cùng Mộc Bàm",
  },
  {
    key: "shopping-guide",
    group: "policies",
    label: "Hướng dẫn mua hàng",
    title: "HƯỚNG DẪN MUA HÀNG",
    content:
      "## Bước 1: Chọn sản phẩm yêu thích\n\nKhám phá các sản phẩm của Mộc Bàm và xem thông tin, hình ảnh, giá bán của từng mẫu. Khi tìm được sản phẩm phù hợp, bạn có thể thêm sản phẩm vào giỏ hàng để tiếp tục đặt hàng.\n\n## Bước 2: Kiểm tra giỏ hàng và điền thông tin\n\nKiểm tra lại sản phẩm, số lượng và tổng giá trị đơn hàng. Sau đó, điền đầy đủ thông tin nhận hàng theo hướng dẫn trên website, bao gồm họ tên, số điện thoại và địa chỉ giao hàng.\nVui lòng kiểm tra kỹ các thông tin trước khi hoàn tất đặt hàng để hạn chế sai sót trong quá trình giao nhận.\n\n## Bước 3: Chọn phương thức thanh toán\n\n**Thanh toán khi nhận hàng (COD)**\nBạn thanh toán cho đơn vị giao hàng khi nhận sản phẩm theo giá trị đơn hàng đã xác nhận.\n**Chuyển khoản ngân hàng**\nBạn chủ động chuyển khoản theo thông tin tài khoản và hướng dẫn thanh toán được hiển thị trên website. Vui lòng kiểm tra chính xác số tiền và nội dung chuyển khoản trước khi thực hiện. Đơn hàng thanh toán bằng chuyển khoản sẽ được tiếp tục xử lý sau khi Mộc Bàm kiểm tra và xác nhận đã nhận được khoản thanh toán.\n\n## Bước 4: Ghi nhận và xử lý đơn hàng\n\nSau khi bạn hoàn tất đặt hàng, thông tin đơn hàng sẽ được ghi nhận để Mộc Bàm kiểm tra và xử lý.\nVới đơn hàng COD, Mộc Bàm sẽ kiểm tra thông tin đơn trước khi tiến hành các bước tiếp theo.\nVới đơn hàng chuyển khoản, vui lòng hoàn tất thanh toán theo hướng dẫn trên website. Mộc Bàm sẽ kiểm tra giao dịch trước khi tiếp tục xử lý đơn hàng.\nNếu cần làm rõ thông tin, chúng mình sẽ liên hệ với bạn qua thông tin liên lạc đã cung cấp.\n\n## Bước 5: Chuẩn bị và giao hàng\n\nSau khi đơn hàng được kiểm tra và đáp ứng các điều kiện xử lý tương ứng với phương thức thanh toán, Mộc Bàm sẽ chuẩn bị sản phẩm và tiến hành giao hàng theo thông tin bạn đã cung cấp. \nThời gian chuẩn bị có thể khác nhau tùy tình trạng sản phẩm. Thời gian vận chuyển phụ thuộc vào khu vực nhận hàng và đơn vị giao hàng.\n\n## Một vài lưu ý nhỏ\n\nVui lòng cung cấp thông tin nhận hàng chính xác và giữ lại thông tin đơn hàng để thuận tiện khi cần hỗ trợ.\nDo đặc điểm thủ công, một số chi tiết về hình dáng hoặc cách sắp xếp có thể có khác biệt nhẹ giữa các sản phẩm.\nHiện tại, Mộc Bàm giới thiệu các mẫu sản phẩm trên website để bạn lựa chọn. Nếu bạn có ý tưởng riêng và mong muốn đặt mẫu theo yêu cầu, hãy liên hệ với chúng mình để trao đổi về khả năng thực hiện. Mỗi yêu cầu sẽ được xem xét tùy theo điều kiện thực tế.\n\nCảm ơn bạn đã lựa chọn Mộc Bàm. Chúng mình hy vọng món decor bạn chọn sẽ góp thêm một nét duyên riêng cho không gian của bạn!",
  },
  {
    key: "shipping",
    group: "policies",
    label: "Chính sách giao hàng",
    title: "CHÍNH SÁCH GIAO HÀNG",
    content:
      "## 1. Phạm vi giao hàng\n\nMộc Bàm hỗ trợ giao hàng trên toàn quốc, đến các tỉnh và thành phố tại Việt Nam.\nViệc giao hàng đến từng khu vực sẽ phụ thuộc vào phạm vi phục vụ của đơn vị vận chuyển.\n\n## 2. Đơn vị vận chuyển\n\nMộc Bàm chủ động liên hệ và sắp xếp đơn vị vận chuyển phù hợp để gửi sản phẩm đến địa chỉ bạn cung cấp. Sau khi đơn hàng được kiểm tra và chuẩn bị, Mộc Bàm sẽ tiến hành bàn giao sản phẩm cho đơn vị vận chuyển.\n\n## 3. Thời gian chuẩn bị và giao hàng\n\nThời gian chuẩn bị đơn hàng có thể thay đổi tùy theo tình trạng sản phẩm và số lượng đơn hàng tại từng thời điểm. Sau khi sản phẩm được bàn giao cho đơn vị vận chuyển, thời gian giao hàng sẽ phụ thuộc vào khu vực nhận hàng và quá trình vận chuyển thực tế.\nMộc Bàm sẽ cập nhật thông tin đơn hàng khi có thông tin vận chuyển để bạn tiện theo dõi.\n\n## 4. Phí giao hàng\n\nPhí giao hàng được tính theo khu vực nhận hàng:\n\n- Phường Tăng Nhơn Phú (TP. Hồ Chí Minh): miễn phí\n- Các phường khác tại TP. Hồ Chí Minh: 30.000 ₫\n- Các tỉnh, thành phố khác: 40.000 ₫\n\nĐơn hàng có giá trị sản phẩm từ 1.500.000 ₫ (tính trước khi áp mã ưu đãi) được miễn phí giao hàng trên toàn quốc.\nPhí giao hàng chính xác sẽ được hiển thị tại bước thanh toán trên website trước khi bạn hoàn tất đặt hàng. Bạn vui lòng kiểm tra phí vận chuyển cùng tổng giá trị đơn hàng trước khi xác nhận đặt mua.\n\n## 5. Theo dõi đơn hàng\n\nKhi đơn hàng được bàn giao cho đơn vị vận chuyển, bạn có thể sử dụng mã vận đơn để theo dõi tình trạng giao hàng theo hướng dẫn của đơn vị vận chuyển.\nNếu cần hỗ trợ thêm về tình trạng đơn hàng, bạn có thể liên hệ với Mộc Bàm qua các kênh liên hệ chính thức.\n\n## 6. Trường hợp hàng hóa bị hư hỏng hoặc thất lạc\n\nNếu sản phẩm có dấu hiệu hư hỏng hoặc đơn hàng có vấn đề thất lạc trong quá trình vận chuyển, bạn vui lòng liên hệ với Mộc Bàm để thông báo và được hỗ trợ kiểm tra.\nKhi liên hệ, bạn nên cung cấp thông tin đơn hàng và hình ảnh hoặc video liên quan (nếu có) để Mộc Bàm thuận tiện xem xét tình trạng thực tế. Mộc Bàm sẽ tiếp nhận thông tin, kiểm tra với các bên liên quan và trao đổi với bạn về hướng xử lý phù hợp.\n\nCảm ơn bạn đã tin tưởng và lựa chọn Mộc Bàm. Chúng mình hy vọng sản phẩm sẽ đến tay bạn thật trọn vẹn!",
  },
  {
    key: "payment",
    group: "policies",
    label: "Phương thức thanh toán",
    title: "PHƯƠNG THỨC THANH TOÁN",
    content:
      "## 1. Thanh toán khi nhận hàng (COD)\n\nVới hình thức COD, bạn thanh toán giá trị đơn hàng cho đơn vị giao hàng khi nhận được sản phẩm.\nTrước khi đơn hàng được gửi đi, Mộc Bàm sẽ kiểm tra thông tin đơn hàng để đảm bảo quá trình giao nhận diễn ra thuận tiện.\nBạn vui lòng chuẩn bị khoản thanh toán tương ứng với giá trị đơn hàng khi nhận hàng.\n\n## 2. Chuyển khoản ngân hàng\n\nNếu lựa chọn chuyển khoản, bạn vui lòng thực hiện thanh toán theo thông tin tài khoản và hướng dẫn được hiển thị trên website Mộc Bàm.\nKhi chuyển khoản, bạn cần lưu ý:\n- Kiểm tra chính xác thông tin tài khoản nhận tiền.\n- Chuyển đúng số tiền cần thanh toán theo đơn hàng.\n- Ghi nội dung chuyển khoản là [MÃ ĐƠN HÀNG] để Mộc Bàm thuận tiện đối chiếu.\n\nSau khi bạn hoàn tất chuyển khoản, Mộc Bàm sẽ kiểm tra và xác nhận giao dịch đã được ghi nhận trước khi tiếp tục xử lý đơn hàng.\n\n## 3. Một số lưu ý khi thanh toán\n\nVui lòng kiểm tra kỹ thông tin đơn hàng và tổng giá trị cần thanh toán trước khi hoàn tất đặt hàng.\nVới hình thức chuyển khoản, bạn nên lưu lại thông tin giao dịch để thuận tiện đối chiếu khi cần.\n\nMộc Bàm cảm ơn bạn đã tin tưởng và lựa chọn sản phẩm của chúng mình!",
  },
  {
    key: "returns",
    group: "policies",
    label: "Chính sách đổi trả và hỗ trợ sau mua",
    title: "CHÍNH SÁCH ĐỔI TRẢ VÀ HỖ TRỢ SAU MUA",
    content:
      "## 1. Các trường hợp được tiếp nhận đổi trả\n\nMộc Bàm tiếp nhận yêu cầu đổi trả trong những trường hợp sau:\n- Sản phẩm bị lỗi.\n- Sản phẩm bị hư hỏng trong quá trình vận chuyển.\n- Sản phẩm được giao không đúng mẫu khách hàng đã đặt.\nMộc Bàm không áp dụng đổi trả đối với trường hợp khách hàng thay đổi ý định hoặc không còn nhu cầu sử dụng sản phẩm.\n\n## 2. Thời hạn thông báo\n\nKhách hàng vui lòng thông báo cho Mộc Bàm **trong vòng 7 ngày kể từ ngày nhận hàng** nếu phát hiện sản phẩm bị lỗi, hư hỏng hoặc giao sai mẫu.\nSau thời hạn trên, yêu cầu đổi trả sẽ được Mộc Bàm xem xét tùy theo tình trạng thực tế và thông tin liên quan.\n\n## 3. Điều kiện tiếp nhận yêu cầu đổi trả\n\nĐể Mộc Bàm thuận tiện kiểm tra và xác minh, khách hàng vui lòng:\n- Cung cấp hình ảnh hoặc video thể hiện rõ tình trạng sản phẩm.\n- Cung cấp thông tin đơn hàng để Mộc Bàm đối chiếu.\n- Giữ nguyên sản phẩm, phụ kiện và bao bì (nếu có).\n- Không tự ý sửa chữa hoặc tác động làm thay đổi tình trạng sản phẩm trước khi Mộc Bàm kiểm tra.\nMộc Bàm sẽ tiếp nhận thông tin và xem xét tình trạng sản phẩm trước khi thống nhất phương án xử lý với khách hàng.\n\n## 4. Phương án xử lý đổi trả\n\nSau khi xác minh sản phẩm thuộc một trong các trường hợp được tiếp nhận đổi trả, Mộc Bàm sẽ ưu tiên:\n- Đổi sản phẩm đúng mẫu khách hàng đã đặt.\n- Đổi sang sản phẩm thay thế phù hợp nếu không thể cung cấp đúng mẫu ban đầu.\nTrong trường hợp không thể thực hiện việc đổi sản phẩm, Mộc Bàm sẽ trao đổi với khách hàng để thống nhất phương án xử lý khác phù hợp với tình trạng thực tế.\n\n## 5. Chi phí vận chuyển khi đổi trả\n\nĐối với trường hợp sản phẩm bị lỗi, hư hỏng hoặc giao sai mẫu được xác minh thuộc trách nhiệm của Mộc Bàm hoặc phát sinh trong quá trình vận chuyển, Mộc Bàm sẽ chịu chi phí vận chuyển liên quan đến việc đổi trả và gửi sản phẩm thay thế.\n\n## 6. Hỗ trợ sau mua\n\nNgoài việc tiếp nhận yêu cầu đổi trả, Mộc Bàm luôn sẵn sàng hỗ trợ khách hàng trong quá trình sử dụng sản phẩm, bao gồm:\n- Giải đáp thắc mắc liên quan đến sản phẩm.\n- Tư vấn cách sử dụng và bảo quản phù hợp.\n- Tiếp nhận các phản hồi hoặc vấn đề phát sinh sau khi khách hàng nhận hàng.\n\nĐể tìm hiểu cách chăm sóc sản phẩm handmade, bạn có thể tham khảo bài viết “Hướng dẫn bảo quản đồ decor handmade Mộc Bàm” trên website.\n\nCảm ơn bạn đã tin tưởng và lựa chọn Mộc Bàm. Sự hài lòng của bạn luôn là điều chúng mình trân trọng!",
  },
  {
    key: "privacy",
    group: "policies",
    label: "Quyền riêng tư",
    title: "QUYỀN RIÊNG TƯ",
    content:
      "## 1. Thông tin Mộc Bàm thu thập\n\nKhi đặt hàng trên website, khách hàng không cần đăng ký tài khoản hoặc đăng nhập mà chỉ cần cung cấp các thông tin theo biểu mẫu đặt hàng, bao gồm:\n- **Thông tin cá nhân:** Họ tên, số điện thoại, địa chỉ nhận hàng và email.\n- **Thông tin đơn hàng:** Sản phẩm đã đặt, số lượng, giá trị đơn hàng và mã ưu đãi (nếu có).\n- **Thông tin bổ sung:** Lời nhắn dành cho Mộc Bàm (nếu khách hàng có nhu cầu).\n- **Thông tin thanh toán:** Phương thức thanh toán được lựa chọn và thông tin giao dịch cần thiết để đối chiếu, xác nhận thanh toán.\n\n## 2. Mục đích sử dụng thông tin\n\nMộc Bàm sử dụng thông tin khách hàng cho các mục đích sau:\n- Tiếp nhận, kiểm tra và xử lý đơn hàng.\n- Liên hệ với khách hàng khi cần xác nhận hoặc làm rõ thông tin đặt hàng.\n- Đối chiếu và xác nhận giao dịch thanh toán.\n- Cung cấp thông tin cần thiết cho đơn vị vận chuyển để thực hiện giao hàng.\n- Hỗ trợ khách hàng khi có thắc mắc, yêu cầu đổi trả hoặc vấn đề phát sinh sau mua.\n- Gửi thông tin giới thiệu sản phẩm mới, chương trình ưu đãi và các hoạt động của Mộc Bàm.\n\n## 3. Chia sẻ thông tin với bên thứ ba\n\nMộc Bàm không chia sẻ thông tin khách hàng một cách tùy tiện.\nTrong quá trình giao hàng, Mộc Bàm chỉ cung cấp cho đơn vị vận chuyển những thông tin cần thiết để thực hiện việc giao nhận, bao gồm:\n- Họ tên người nhận.\n- Số điện thoại liên hệ.\n- Địa chỉ nhận hàng.\nNgoài mục đích phục vụ giao hàng, thông tin khách hàng không được chia sẻ cho các bên khác nếu không có căn cứ phù hợp.\n\n## 4. Thời gian lưu trữ thông tin\n\nThông tin khách hàng được Mộc Bàm lưu trữ trong khoảng **1 năm** nhằm phục vụ việc tra cứu đơn hàng, đối chiếu giao dịch và hỗ trợ sau mua.\nTrường hợp có yêu cầu lưu giữ lâu hơn để giải quyết vấn đề liên quan đến đơn hàng hoặc đáp ứng nghĩa vụ theo quy định, thời gian lưu trữ có thể được điều chỉnh phù hợp.\n\n## 5. Bảo vệ thông tin khách hàng\n\nMộc Bàm có trách nhiệm bảo vệ thông tin cá nhân mà khách hàng cung cấp, hạn chế việc truy cập, sử dụng hoặc tiết lộ thông tin không phù hợp.\nThông tin khách hàng chỉ được sử dụng trong phạm vi các mục đích đã nêu tại chính sách này. Mộc Bàm luôn hướng đến việc quản lý và bảo vệ dữ liệu một cách cẩn trọng trong quá trình vận hành website.\n\n## 6. Quyền của khách hàng đối với thông tin cá nhân\n\nKhách hàng có quyền yêu cầu Mộc Bàm:\n- Kiểm tra thông tin cá nhân đã cung cấp.\n- Chỉnh sửa thông tin nếu phát hiện sai sót.\n- Yêu cầu xóa thông tin cá nhân khi không còn nhu cầu lưu trữ.\nMộc Bàm sẽ tiếp nhận và xem xét các yêu cầu này. Một số thông tin có thể cần được tiếp tục lưu giữ để phục vụ việc xử lý đơn hàng hoặc đáp ứng nghĩa vụ theo quy định hiện hành.\n\nMộc Bàm trân trọng sự tin tưởng của bạn và luôn cố gắng bảo vệ thông tin cá nhân trong suốt quá trình bạn trải nghiệm và mua sắm tại website.",
  },
  {
    key: "terms",
    group: "policies",
    label: "Điều khoản sử dụng",
    title: "ĐIỀU KHOẢN SỬ DỤNG",
    content:
      "## 1. Quy định chung\n\nWebsite Mộc Bàm được xây dựng nhằm giới thiệu sản phẩm decor handmade và hỗ trợ khách hàng tìm hiểu, lựa chọn, đặt mua sản phẩm.\nKhi sử dụng website, khách hàng cần tuân thủ các quy định được nêu trong điều khoản này cũng như các chính sách liên quan được công bố trên website.\nMộc Bàm có quyền cập nhật hoặc điều chỉnh nội dung website và các điều khoản khi cần thiết để phù hợp với hoạt động kinh doanh và quy định hiện hành.\n\n## 2. Trách nhiệm của khách hàng\n\nKhi đặt hàng trên website, khách hàng có trách nhiệm:\n- Cung cấp đầy đủ và chính xác thông tin cá nhân, thông tin liên hệ và địa chỉ nhận hàng.\n- Kiểm tra kỹ sản phẩm, số lượng, giá bán và tổng giá trị đơn hàng trước khi xác nhận đặt mua.\n- Lựa chọn phương thức thanh toán phù hợp và thực hiện thanh toán theo hướng dẫn.\n- Phối hợp với Mộc Bàm khi cần xác nhận hoặc làm rõ thông tin liên quan đến đơn hàng.\nKhách hàng chịu trách nhiệm đối với tính chính xác của những thông tin mình cung cấp trong quá trình đặt hàng.\n\n## 3. Quy định về đơn hàng\n\nSau khi khách hàng hoàn tất đặt hàng, thông tin đơn hàng sẽ được ghi nhận để Mộc Bàm kiểm tra và xử lý.\nMộc Bàm có quyền từ chối hoặc hủy đơn hàng trong các trường hợp:\n- Không thể liên hệ với khách hàng để xác nhận những thông tin cần thiết.\n- Thông tin đặt hàng không chính xác hoặc không đầy đủ.\n- Sản phẩm đã hết hoặc không còn khả năng cung cấp.\nTrong trường hợp đơn hàng không thể tiếp tục xử lý hoặc cần điều chỉnh, Mộc Bàm sẽ thông báo và trao đổi với khách hàng về hướng giải quyết phù hợp.\n\n## 4. Thay đổi và hủy đơn hàng\n\nNếu muốn thay đổi thông tin hoặc hủy đơn hàng sau khi đặt mua, khách hàng vui lòng liên hệ Mộc Bàm trong thời gian sớm nhất.\nYêu cầu thay đổi hoặc hủy đơn sẽ được xem xét tùy theo tình trạng xử lý thực tế tại thời điểm tiếp nhận. Mộc Bàm sẽ trao đổi với khách hàng về khả năng thực hiện yêu cầu trước khi tiến hành điều chỉnh.\n\n## 5. Thông tin và hình ảnh sản phẩm\n\nMộc Bàm luôn cố gắng cung cấp hình ảnh và thông tin sản phẩm rõ ràng để khách hàng thuận tiện tham khảo và lựa chọn. Tuy nhiên, do đặc điểm của sản phẩm handmade, một số chi tiết về hình dáng, màu sắc hoặc cách sắp xếp có thể có khác biệt nhẹ giữa hình ảnh trên website và sản phẩm thực tế. Những khác biệt này xuất phát từ đặc trưng của quá trình thực hiện thủ công và không làm thay đổi mẫu sản phẩm mà khách hàng đã lựa chọn.\n\n## 6. Quyền sở hữu nội dung trên website\n\nHình ảnh sản phẩm, logo, bài viết, nội dung giới thiệu và các tài liệu được đăng tải trên website thuộc quyền quản lý hoặc quyền sử dụng hợp pháp của Mộc Bàm và các chủ thể có liên quan.\nMọi hành vi sao chép, sử dụng, chỉnh sửa hoặc đăng tải lại những nội dung này đều cần có sự đồng ý trước của Mộc Bàm hoặc chủ thể có quyền tương ứng.\nKhách hàng và các bên truy cập website không được tự ý sử dụng nội dung trên website cho mục đích cá nhân hoặc thương mại khi chưa được cho phép.\n\n## 7. Liên kết và các chính sách liên quan\n\nTrong quá trình sử dụng website, khách hàng có thể tham khảo thêm các chính sách được Mộc Bàm công bố, bao gồm:\n- Hướng dẫn mua hàng.\n- Chính sách giao hàng.\n- Phương thức thanh toán.\n- Chính sách đổi trả và hỗ trợ sau mua.\n- Quyền riêng tư.\n- Liên hệ\nCác chính sách này bổ sung thông tin và hướng dẫn cụ thể cho từng hoạt động mua sắm tại Mộc Bàm.\n\nMộc Bàm cảm ơn bạn đã dành thời gian tìm hiểu và tin tưởng lựa chọn chúng mình. Hy vọng bạn sẽ có trải nghiệm thật vui khi ghé thăm và mua sắm tại Mộc Bàm!",
  },
  // Formerly the warranty policy; the owner rewrote it as the contact page.
  {
    key: "warranty",
    group: "policies",
    label: "Liên hệ",
    title: "LIÊN HỆ",
    content:
      "Cảm ơn bạn đã ghé thăm Mộc Bàm!\n\nNếu bạn có thắc mắc về sản phẩm, cần hỗ trợ đặt hàng hoặc muốn chia sẻ điều gì với chúng mình, đừng ngần ngại liên hệ nhé. Mộc Bàm luôn vui khi được lắng nghe và kết nối với bạn.\n\n## Kết nối với Mộc Bàm\n\n- Email: mocbamm@gmail.com\n- Website: https://mocbam.com\n- Facebook: https://www.facebook.com/mocbamm\n- Instagram: https://www.instagram.com/mocbamm\n- TikTok: https://www.tiktok.com/@mocbamm\n- Threads: https://www.threads.com/@mocbamm\n\nMộc Bàm luôn sẵn sàng lắng nghe cho dù là câu hỏi về sản phẩm, đơn hàng hay một lời góp ý nhỏ, chúng mình đều trân trọng sự quan tâm của bạn.\n\nHẹn gặp bạn trên những góc nhỏ mang dấu ấn Mộc Bàm!",
  },
];

// Owner feedback 06/11: admin edits only the brand story and the policies as
// text; every other entry is just its image or video. Fixed wording stays as
// saved.
export function isEditableContent(section: ContentSection) {
  return (
    !section.hidden &&
    (section.kind === "media" ||
      section.key === "about" ||
      section.group === "policies")
  );
}

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
      content:
        replaced.content === undefined ? entry.content : fallback.content,
    };
  if (entry)
    return fallback?.kind === "media"
      ? { ...entry, content: contentMediaSource(key, entry.content) }
      : entry;
  if (!fallback) throw new Error(`Unknown content section: ${key}`);
  return { key, title: fallback.title, content: fallback.content };
}
