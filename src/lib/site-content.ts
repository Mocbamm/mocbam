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

// Owner feedback 26/11: every slide of the home banner has its own upright
// photo for phones, so swiping on a phone never shows a cropped wide banner.
function phoneBannerHint(slide: number) {
  return `Không bắt buộc. Ảnh dọc cho điện thoại của Banner trượt ${slide}. Kích thước chuẩn: 900 × 1200 px (tỉ lệ 3 : 4), tối đa 4 MB; chừa khoảng trống phía dưới bên trái cho 2 nút bấm. Nếu bỏ trống, điện thoại cắt phần giữa của Banner trượt ${slide}.`;
}

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
    hint:
      "Ảnh đầu tiên của banner trượt trên trang chủ. Kích thước chuẩn: 2400 × 1050 px (tỉ lệ 16 : 7); ảnh JPG, PNG hoặc WebP tối đa 4 MB, hoặc video MP4 cùng tỉ lệ tối đa 20 MB. Giữ chủ thể ở giữa, chừa góc dưới bên trái cho 2 nút bấm. Ảnh dọc riêng cho điện thoại đặt ở mục Banner trượt 1 trên điện thoại.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm",
    content: "/images/verdant/hero.webp",
  },
  {
    key: "home-hero-mobile-media",
    group: "home",
    label: "Banner trượt 1 trên điện thoại",
    kind: "media",
    title: "Không gian nhỏ xinh của Mộc Bàm trên điện thoại",
    content: "none",
    hint: phoneBannerHint(1),
    aspectRatio: "3 / 4",
  },
  {
    key: "home-hero-slide-2-media",
    group: "home",
    label: "Banner trượt 2",
    hint:
      "Không bắt buộc. Ảnh thứ hai của banner trượt, tự chuyển sau vài giây. Kích thước chuẩn: 2400 × 1050 px (tỉ lệ 16 : 7), tối đa 4 MB; chủ thể ở giữa. Chọn “Không dùng” để bỏ ảnh này.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Những người bạn gỗ nhỏ của Mộc Bàm",
    content: "/images/verdant/story.webp",
  },
  {
    key: "home-hero-slide-2-mobile-media",
    group: "home",
    label: "Banner trượt 2 trên điện thoại",
    kind: "media",
    title: "Những người bạn gỗ nhỏ của Mộc Bàm trên điện thoại",
    content: "none",
    hint: phoneBannerHint(2),
    aspectRatio: "3 / 4",
  },
  {
    key: "home-hero-slide-3-media",
    group: "home",
    label: "Banner trượt 3",
    hint:
      "Không bắt buộc. Ảnh thứ ba của banner trượt. Kích thước chuẩn: 2400 × 1050 px (tỉ lệ 16 : 7), tối đa 4 MB; chủ thể ở giữa.",
    aspectRatio: "16 / 7",
    kind: "media",
    title: "Góc nhỏ xinh của Mộc Bàm",
    content: "none",
  },
  {
    key: "home-hero-slide-3-mobile-media",
    group: "home",
    label: "Banner trượt 3 trên điện thoại",
    kind: "media",
    title: "Góc nhỏ xinh của Mộc Bàm trên điện thoại",
    content: "none",
    hint: phoneBannerHint(3),
    aspectRatio: "3 / 4",
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
    title: "Dòng Búp bê",
    content: "Bình an luôn đồng hành",
  },
  {
    key: "home-category-characters-media",
    group: "home",
    label: "Ảnh banner danh mục búp bê",
    hint:
      "Banner ảnh của danh mục, nằm dưới khối câu chuyện. Kích thước chuẩn: 1500 × 1000 px (tỉ lệ 3 : 2), tối đa 4 MB; chừa khoảng trống phía dưới bên trái cho chữ và nút.",
    aspectRatio: "3 / 2",
    kind: "media",
    title: "Dòng nhân vật",
    content: "/images/verdant/rabbit-photo.webp",
  },
  {
    key: "home-category-beads",
    group: "home",
    label: "Banner danh mục chuỗi (Tiêu đề và dòng chữ nhỏ)",
    title: "Dòng Chuỗi",
    content: "Bình an trong từng góc nhỏ",
  },
  {
    key: "home-category-beads-media",
    group: "home",
    label: "Ảnh banner danh mục chuỗi",
    hint:
      "Banner ảnh của danh mục, nằm dưới khối câu chuyện. Kích thước chuẩn: 1500 × 1000 px (tỉ lệ 3 : 2), tối đa 4 MB; chừa khoảng trống phía dưới bên trái cho chữ và nút.",
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
    label: "Khối câu chuyện (tiêu đề và dòng chữ nhỏ phía trên)",
    title: "Một tiếng động nhỏ,\nkhởi đầu cho một ý\u00a0nghĩa lớn",
    content: "Góc nhỏ Mộc Bàm",
  },
  {
    key: "home-intro-media",
    group: "home",
    label: "Ảnh / video khối câu chuyện (ngay dưới banner)",
    hint: "Khối câu chuyện màu xanh, ngay dưới banner trang chủ. Kích thước chuẩn: 1800 × 1200 px (ảnh ngang, tỉ lệ 3 : 2), JPG, PNG hoặc WebP tối đa 4 MB, hoặc video MP4 cùng tỉ lệ tối đa 20 MB. Ảnh đúng tỉ lệ này hiện trọn vẹn, không bị cắt.",
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
      "Một câu hỏi, một ý tưởng hay chỉ muốn chào nhau. Chúng mình luôn sẵn lòng nghe bạn.",
  },
  {
    key: "about",
    group: "about",
    label: "Câu chuyện Mộc Bàm",
    title: "MỘC BÀM – NÉT MỘC, TÂM AN",
    content:
      "> Từ những hạt mộc mạc, gửi trao những lời chúc bình an.\n\n## 1. Khởi nguồn từ một phát hiện thú vị\n\n> Mọi chuyện bắt đầu từ một lần tình cờ biết đến hạt bàm bàm.\n> Một người bạn của chúng mình tình cờ xem được video về loại hạt có hình dáng đặc biệt này trên mạng và chia sẻ lại với cả nhóm. Sự tò mò về một loại vật liệu mới đã thôi thúc chúng mình tìm hiểu và khám phá xem có thể sáng tạo điều gì từ những hạt nhỏ bé ấy.\n> Trong một lần cầm hạt bàm bàm lên và nhẹ nhàng lắc thử, chúng mình bất ngờ nghe thấy một âm thanh nhỏ phát ra từ bên trong. Điều gì đang ẩn giấu trong lớp vỏ mộc mạc ấy?\n> Từ sự tò mò đó, chúng mình bắt đầu tìm hiểu thêm trên Internet và biết được rằng bên trong hạt bàm bàm có một hạt đậu được gọi là đậu bình an. Cái tên ấy khiến chúng mình đặc biệt ấn tượng. Bởi giữa cuộc sống với nhiều bộn bề và lo toan, bình an đôi khi lại là điều giản dị mà ai cũng mong muốn: một ngày trôi qua nhẹ nhàng, một góc nhỏ để nghỉ ngơi hay đơn giản là những người mình yêu thương luôn được bình an.\n> Từ một tiếng động nhỏ bên trong hạt bàm bàm, chúng mình tìm thấy một ý nghĩa muốn gìn giữ và lan tỏa. Đó cũng là khởi đầu cho Mộc Bàm – thương hiệu sáng tạo những sản phẩm decor từ hạt bàm bàm, mang theo lời chúc bình an trong từng món đồ.\n\n## 2. Từ hạt bàm bàm đến những sản phẩm mang ý nghĩa riêng\n\n> Với Mộc Bàm, mỗi hạt bàm bàm không chỉ là một chất liệu sáng tạo mà còn là nơi khởi nguồn cho những ý tưởng độc đáo. Từ một loại hạt tự nhiên, chúng mình phát triển thành hai dòng sản phẩm chính: dòng Chuỗi và dòng Búp bê. Mỗi dòng mang một hình thức riêng, nhưng đều giữ lại điều đặc biệt bên trong hạt bàm bàm: hạt đậu bình an.\n\n## Dòng Chuỗi – Bình an trong từng góc nhỏ\n\n> Dòng Chuỗi tái hiện những phong cảnh thu nhỏ thông qua sự kết hợp giữa hạt bàm bàm, rêu khô, đất sét tạo hình và các chi tiết trang trí. Mỗi sản phẩm là một khung cảnh riêng, được tạo nên từ nhiều chi tiết nhỏ, mang đến điểm nhấn thú vị cho không gian sống. Đặt trên bàn làm việc, kệ sách hay góc nhỏ trong nhà, sản phẩm không chỉ làm đẹp không gian mà còn gợi nhắc chúng ta dành một chút thời gian để nghỉ ngơi và tận hưởng những khoảnh khắc bình yên. Đặc biệt, khi nhẹ nhàng cầm sản phẩm lên và lắc khẽ, bạn có thể cảm nhận tiếng hạt đậu nhỏ bên trong – âm thanh đặc trưng gắn liền với câu chuyện bình an của Mộc Bàm.\n\n## Dòng Búp bê – Bình an luôn đồng hành\n\n> Dòng Búp bê biến những hạt bàm bàm thành các nhân vật nhỏ nhắn với hình dáng và biểu cảm đáng yêu riêng. Thông qua cách tạo hình và trang trí, mỗi hạt được thổi vào một diện mạo mới, mang nét cá tính và câu chuyện riêng. Mỗi nhân vật có thể trở thành một người bạn nhỏ trên bàn học, bàn làm việc hay trong góc không gian cá nhân. Không chỉ mang đến sự dễ thương, mỗi sản phẩm còn chứa đựng ý nghĩa của hạt đậu bình an bên trong. Một cái lắc nhẹ, một tiếng hạt đậu khẽ vang lên cũng đủ nhắc chúng ta về thông điệp mà Mộc Bàm muốn gửi gắm: dù ở bất cứ đâu, ai cũng xứng đáng có được những khoảnh khắc bình an của riêng mình.\n> Nếu dòng Chuỗi mang đến một góc nhỏ bình yên cho không gian, thì dòng Búp bê lại là người bạn nhỏ mang theo lời chúc bình an bên cạnh mỗi người.\n\n## 3. Bình an – Giá trị Mộc Bàm muốn gửi trao\n\n> Mộc Bàm tin rằng bình an không nhất thiết phải đến từ những điều lớn lao. Đôi khi, đó chỉ là một góc nhỏ khiến ta cảm thấy dễ chịu, một vật nhỏ đồng hành mỗi ngày hay một món quà chứa đựng lời chúc chân thành. Đó có thể là món quà dành tặng người bạn vừa bắt đầu công việc mới, thay cho lời chúc mọi chuyện thuận lợi và luôn giữ được sự bình an trên hành trình phía trước. Hay một món quà dành cho người thân, bạn bè vào dịp sinh nhật, như một lời nhắn nhủ rằng dù cuộc sống có bận rộn đến đâu, chúng ta vẫn luôn mong những người mình yêu thương được bình an.\n> Với Mộc Bàm, hạt đậu bình an không phải là lời hứa về những điều kỳ diệu, mà là biểu tượng cho một mong muốn chân thành. Mỗi sản phẩm khi được trao đi đều có thể trở thành một lời chúc nhỏ, được gửi gắm bằng sự quan tâm và tình cảm của người tặng.\n> Chúng mình mong muốn mỗi khách hàng khi lựa chọn Mộc Bàm đều có thể tìm thấy một điều ý nghĩa cho riêng mình: một món đồ làm đẹp không gian, một người bạn nhỏ đồng hành hoặc một món quà thay lời muốn nói.\n> Đó cũng chính là niềm tin mà Mộc Bàm theo đuổi: Bình an có thể bắt đầu từ những điều nhỏ bé và được lan tỏa qua những điều giản dị nhất.\n\n## 4. Nét mộc – Tâm an: Tinh thần của Mộc Bàm\n\n> Đằng sau mỗi sản phẩm Mộc Bàm là quá trình sáng tạo thủ công, nơi những hạt bàm bàm được kết hợp cùng các vật liệu trang trí để tạo nên những phong cảnh và nhân vật mang hình hài riêng. Từng chi tiết được chăm chút để giữ lại nét đặc trưng của chất liệu, đồng thời tạo nên sự khác biệt trong mỗi sản phẩm.\n> Tên gọi Mộc Bàm cũng bắt nguồn từ chính tinh thần ấy.\n> “Mộc” đại diện cho vẻ đẹp giản dị, gần gũi của vật liệu tự nhiên và cảm hứng sáng tạo bắt đầu từ những điều bình thường.\n> “Bàm” gắn liền với hạt bàm bàm – nguồn cảm hứng khơi đầu hành trình sáng tạo và trở thành dấu ấn đặc trưng trong các dòng sản phẩm của thương hiệu.\n> Nếu nét mộc tạo nên hình hài của sản phẩm, thì tâm an chính là ý nghĩa được gửi gắm qua hạt đậu nhỏ bên trong.\n> Trong tương lai, Mộc Bàm mong muốn trở thành thương hiệu quà tặng và decor sáng tạo từ hạt bàm bàm, mang đến những sản phẩm có hình thức riêng và ý nghĩa tinh thần gần gũi. Chúng mình hy vọng có thể đưa những món quà nhỏ mang thông điệp bình an đến gần hơn với mọi người, để mỗi sản phẩm không chỉ làm đẹp một góc không gian mà còn trở thành một cách gửi trao yêu thương. Bởi đôi khi, bình an không cần bắt đầu từ những điều lớn lao. Nó có thể bắt đầu từ một hạt nhỏ, một tiếng động khẽ và một món quà được trao đi bằng cả tấm lòng.\n\n## MỘC BÀM – NÉT MỘC, TÂM AN.\n\n*Nét mộc từ tự nhiên, lời chúc bình an từ những điều giản dị.*",
  },
  {
    key: "about-media",
    group: "about",
    label: "Ảnh / video đầu trang Chúng tôi",
    hint:
      "Ảnh đầu trang Chúng tôi, cùng khổ với ảnh bìa bài Nhật ký và rộng bằng phần chữ bên dưới. Kích thước chuẩn: 1700 × 1000 px (tỉ lệ 1,7 : 1), JPG, PNG hoặc WebP tối đa 4 MB, hoặc video MP4 cùng tỉ lệ tối đa 20 MB. Giữ chủ thể ở giữa.",
    aspectRatio: "1.7",
    kind: "media",
    title: "Thế giới nhỏ của Mộc Bàm",
    content: "/images/verdant/story.webp",
  },
  {
    key: "about-natural",
    group: "about",
    label: "Giá trị: mộc mạc",
    title: "Mộc mạc",
    content: "Từ hạt bàm bàm giản dị, nơi mọi thứ bắt đầu",
  },
  {
    key: "about-craft",
    group: "about",
    label: "Giá trị: tỉ mỉ",
    title: "Tỉ mỉ",
    content: "Làm tay từng chi tiết, mỗi món một dáng riêng",
  },
  {
    key: "about-warmth",
    group: "about",
    label: "Giá trị: bình an",
    title: "Bình an",
    content: "Hạt đậu nhỏ bên trong, lời chúc gửi đến bạn",
  },
  {
    key: "about-invitation",
    group: "about",
    label: "Lời mời cuối trang",
    // First line is the heading; the next line shows as a smaller sentence.
    title:
      "Bạn sẽ gửi bình an này đến ai?\nĐặt ở một góc bàn của riêng bạn, hay trao cho người bạn thương? Mộc Bàm rất muốn nghe câu chuyện của bạn.",
    content: "Kể cho Mộc Bàm nghe",
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
// text; every other entry is just its image or video. The fixed wording lives
// in this file.
export function isEditableContent(section: ContentSection) {
  return (
    !section.hidden &&
    (section.kind === "media" ||
      section.key === "about" ||
      section.group === "policies")
  );
}

export function contentEntry(entries: SiteContent[], key: string): SiteContent {
  const fallback = contentSections.find((section) => section.key === key);
  const entry = entries.find((item) => item.key === key);
  // Wording admin no longer edits comes from here, so the owner's latest
  // brief applies even where an older saved row exists (19/11).
  if (fallback && fallback.kind !== "media" && !isEditableContent(fallback))
    return { key, title: fallback.title, content: fallback.content };
  if (entry)
    return fallback?.kind === "media"
      ? { ...entry, content: contentMediaSource(key, entry.content) }
      : entry;
  if (!fallback) throw new Error(`Unknown content section: ${key}`);
  return { key, title: fallback.title, content: fallback.content };
}
