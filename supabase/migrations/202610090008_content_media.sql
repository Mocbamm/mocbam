begin;

alter table public.posts add column if not exists video_url text not null default ''
  check (length(video_url) <= 500 and (video_url = '' or video_url ~ '^/api/media/[a-f0-9-]{36}\.(mp4|webm)$'));
alter table public.posts alter column image_url set default '';

-- Keep existing marketing edits and supply editable defaults for new sections.
insert into public.site_content(key,title,content) values
('home-hero','Một chút mộc.
Một chút thương.','Những người bạn nhỏ từ gỗ, mang theo câu chuyện riêng và niềm vui giản dị. Để mỗi ngày của bạn thêm một chút đáng yêu.'),
('home-hero-media','Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm','/images/story.svg'),
('home-hero-note','Một món quà, một câu chuyện','Dành cho bạn, và người bạn thương.'),
('home-category-characters','Dòng nhân vật','Những người bạn nhỏ'),
('home-category-characters-media','Dòng nhân vật','/images/product-02.svg'),
('home-category-beads','Dòng chuỗi','Giản dị theo cách riêng'),
('home-category-beads-media','Dòng chuỗi','/images/product-06.svg'),
('home-featured','Nhỏ xinh, đủ thương.','Mộc chọn cho bạn'),
('home-intro','Những điều nhỏ, làm nên bình yên','Nhân vật gỗ và phụ kiện thủ công, mang một chút mộc mạc và ấm áp vào mỗi ngày.'),
('home-intro-media','Một người bạn gỗ, được Mộc nâng niu','/images/product-03.svg'),
('home-journal','Nhật ký Mộc Bàm','Chuyện nhỏ bên hiên'),
('home-contact','Gửi Mộc một lời nhắn.','Một câu hỏi, một ý tưởng, hay chỉ muốn chào nhau. Chúng mình luôn sẵn lòng nghe bạn.'),
('about','Nhỏ thôi, nhưng có câu chuyện','Mộc Bàm bắt đầu từ tình yêu với những món đồ nhỏ được làm bằng tay. Chúng mình tạo nên nhân vật gỗ và phụ kiện từ chất liệu tự nhiên, với mong muốn mang chút mộc mạc, ấm áp vào cuộc sống hằng ngày.

Mỗi sản phẩm có vân gỗ và sắc độ riêng. Đó là nét đặc biệt của đồ thủ công và cũng là câu chuyện bạn mang về.'),
('about-media','Thế giới nhỏ của Mộc Bàm','/images/story.svg'),
('about-natural','Tự nhiên','Để những đường vân riêng kể câu chuyện của gỗ.'),
('about-craft','Tỉ mỉ','Trân trọng từng chi tiết, từ tạo hình đến đóng gói.'),
('about-warmth','Ấm áp','Những món đồ nhỏ, dành cho bạn và người bạn thương.'),
('about-invitation','Bạn là một phần câu chuyện của Mộc.','Kể chúng mình nghe')
on conflict (key) do nothing;

-- Apply the reviewed purchase, delivery, returns, privacy and terms copy.
insert into public.site_content(key,title,content) values
('shopping-guide','Hướng dẫn mua hàng','## 1. Tìm một điều nhỏ xinh

Duyệt danh mục hoặc dùng ô tìm kiếm để chọn sản phẩm. Mở trang chi tiết để xem hình ảnh, mô tả, giá và tình trạng còn hàng.

## 2. Chọn sản phẩm

Chọn số lượng, thêm vào giỏ để mua tiếp hoặc chọn Mua ngay để đến bước thanh toán.

## 3. Kiểm tra thông tin nhận hàng

Kiểm tra sản phẩm trong giỏ. Điền họ tên, số điện thoại, email, địa chỉ và ghi chú nếu cần. Phí giao hàng và tổng tiền hiển thị trước khi gửi đơn.

## 4. Thanh toán và gửi đơn

Chọn thanh toán khi nhận hàng (COD) hoặc chuyển khoản nếu cửa hàng đã bật phương thức này. Với chuyển khoản, dùng đúng tài khoản, số tiền và nội dung hiển thị trên đơn. Mộc xác nhận thanh toán sau khi kiểm tra giao dịch.

## 5. Theo dõi đơn

Lưu mã đơn và liên kết xác nhận để theo dõi. Nếu đặt hàng khi đã đăng nhập, bạn cũng có thể xem đơn trong Tài khoản. Liên hệ Mộc khi cần chỉnh sửa thông tin hoặc hỗ trợ.'),
('shipping','Giao hàng','## Phạm vi và thời gian dự kiến

Mộc Bàm giao hàng trên toàn Việt Nam. Thời gian dự kiến kể từ khi đơn được xác nhận và bàn giao cho đơn vị vận chuyển:

- Nội thành TP. Hồ Chí Minh và Hà Nội: 1–3 ngày làm việc.
- Các khu vực khác: 3–5 ngày làm việc.

Thời gian có thể thay đổi theo địa chỉ, điều kiện vận chuyển hoặc dịp cao điểm. Mộc sẽ trao đổi nếu đơn cần thêm thời gian chuẩn bị.

## Phí giao hàng

Phí giao hàng được hiển thị trong bước thanh toán trước khi bạn gửi đơn. Mộc sẽ liên hệ để thống nhất nếu có yêu cầu giao nhận đặc biệt.

## Nhận hàng

Vui lòng kiểm tra thông tin người nhận và giữ điện thoại liên lạc. Khi nhận hàng, kiểm tra tình trạng đóng gói và sản phẩm; ảnh hoặc video mở kiện sẽ giúp Mộc hỗ trợ nhanh hơn nếu có vấn đề.'),
('payment','Phương thức thanh toán','## Thanh toán khi nhận hàng (COD)

Bạn thanh toán cho đơn vị vận chuyển khi nhận hàng theo tổng tiền trên đơn đã xác nhận. Kiểm tra số tiền và thông tin người nhận trước khi gửi đơn.

## Chuyển khoản ngân hàng

Phương thức chuyển khoản chỉ xuất hiện khi cửa hàng đã cấu hình và bật tài khoản nhận tiền. Sau khi gửi đơn, dùng tài khoản, số tiền và nội dung chuyển khoản hiển thị trên trang xác nhận đơn. Mã QR, nếu có, giúp bạn điền thông tin giao dịch; hãy kiểm tra lại trước khi xác nhận trên ứng dụng ngân hàng.

Gửi đơn hoặc mở mã QR chưa đồng nghĩa đã thanh toán. Mộc xác nhận trạng thái thanh toán sau khi kiểm tra giao dịch nhận tiền. Không chuyển tiền theo tài khoản được gửi từ nguồn không xác minh.

## Cần hỗ trợ giao dịch?

Liên hệ Mộc kèm mã đơn nếu chuyển sai nội dung, số tiền hoặc cần kiểm tra thanh toán. Website không tự động trích tiền hay hoàn tiền; các yêu cầu hoàn tiền được cửa hàng trao đổi và xác nhận riêng.'),
('returns','Đổi trả & chăm sóc','## Hỗ trợ đổi trả trong 7 ngày

Liên hệ Mộc trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị lỗi kỹ thuật, hư hỏng khi vận chuyển hoặc giao sai so với đơn đã xác nhận. Vui lòng cung cấp mã đơn và mô tả tình trạng; ảnh hoặc video mở kiện được khuyến khích để kiểm tra thuận tiện, không phải điều kiện bắt buộc để tiếp nhận hỗ trợ.

Sản phẩm đổi trả cần chưa qua sử dụng và không phát sinh hư hỏng do người dùng. Giữ bao bì, phụ kiện nếu có. Mộc sẽ kiểm tra và thống nhất cách đổi, trả hoặc hoàn tiền, cùng việc nhận lại sản phẩm và chi phí vận chuyển theo nguyên nhân thực tế.

## Lưu ý với chất liệu gỗ

Vân gỗ, màu sắc tự nhiên có thể khác nhẹ giữa các sản phẩm và hình ảnh trên màn hình. Đây là đặc trưng của chất liệu, không mặc nhiên là lỗi sản phẩm. Nếu bạn chưa chắc về tình trạng món đồ, hãy liên hệ để Mộc cùng kiểm tra và hướng dẫn.'),
('warranty','Bảo hành & chăm sóc','## Bảo hành lỗi kỹ thuật 12 tháng

Mộc hỗ trợ bảo hành lỗi kỹ thuật do sản xuất trong 12 tháng kể từ khi nhận hàng. Gửi mã đơn, mô tả tình trạng và hình ảnh để chúng mình kiểm tra, tư vấn cách xử lý phù hợp và thống nhất việc nhận lại sản phẩm nếu cần.

## Phạm vi loại trừ

Bảo hành không áp dụng cho hư hỏng do rơi vỡ, trầy xước trong sử dụng, ngâm nước, ẩm mốc, phơi nắng hoặc nhiệt độ khắc nghiệt, hay tự ý sửa đổi kết cấu sản phẩm. Vân gỗ và sắc độ khác nhau nhẹ là đặc trưng tự nhiên của chất liệu.

## Tư vấn chăm sóc trọn đời

Mộc luôn sẵn lòng hướng dẫn chăm sóc trong suốt thời gian bạn sử dụng sản phẩm. Đặt đồ gỗ ở nơi khô thoáng, tránh nước và ánh nắng trực tiếp kéo dài. Dùng khăn mềm khô hoặc hơi ẩm rồi lau lại ngay; tránh chất tẩy mạnh, nước hoa và dung môi trên bề mặt gỗ.

Nếu sản phẩm cần sửa chữa ngoài phạm vi bảo hành, Mộc sẽ trao đổi khả năng hỗ trợ và chi phí thực tế trước khi thực hiện.'),
('privacy','Quyền riêng tư','## Thông tin Mộc sử dụng

Tên, email, số điện thoại, địa chỉ giao hàng và thông tin đơn được sử dụng để tiếp nhận, xác nhận, giao hàng và giải quyết yêu cầu hỗ trợ. Thông tin tài khoản được dùng để đăng nhập và tra cứu đơn của bạn. Nội dung lời nhắn liên hệ và tin nhắn bạn gửi trong mục hỗ trợ được nhân viên cửa hàng xem để trả lời và xử lý yêu cầu.

## Chia sẻ cần thiết

Mộc không bán thông tin cá nhân. Một số thông tin cần được xử lý bởi nhà cung cấp dịch vụ lưu trữ, xác thực và đơn vị vận chuyển để vận hành cửa hàng, bảo vệ tài khoản và giao đơn. Chúng mình chỉ sử dụng thông tin phù hợp với mục đích cung cấp dịch vụ.

## Lựa chọn của bạn

Bạn có thể đồng ý hoặc từ chối công cụ phân tích và quảng cáo trong lựa chọn cookie. Mộc không đưa tên, email, số điện thoại hoặc địa chỉ vào sự kiện phân tích website.

## Kiểm tra, chỉnh sửa và xóa dữ liệu

Liên hệ Mộc để yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân. Chúng mình sẽ xác minh yêu cầu và trao đổi về dữ liệu cần lưu lại để xử lý đơn hàng, tranh chấp hoặc nghĩa vụ áp dụng.'),
('terms','Điều khoản sử dụng','## Thông tin sản phẩm và đặt hàng

Vui lòng cung cấp thông tin liên hệ, giao hàng chính xác và kiểm tra đơn trước khi gửi. Giá, ưu đãi và tồn kho được kiểm tra lại tại bước gửi đơn. Mộc xác nhận thông tin cần thiết trước khi thực hiện đơn hàng.

Gỗ tự nhiên có vân và sắc độ riêng; màu hiển thị cũng phụ thuộc màn hình và ánh sáng. Những khác biệt nhẹ này không đồng nghĩa sản phẩm có lỗi.

## Thanh toán, hủy đơn và hoàn tiền

Bạn có thể chọn COD hoặc chuyển khoản khi phương thức này được cửa hàng bật. Gửi đơn không đồng nghĩa đã thanh toán; chuyển khoản được Mộc xác nhận sau khi kiểm tra tiền nhận. Website không tự động thu tiền hoặc hoàn tiền.

Nếu cần đổi thông tin hoặc hủy đơn, liên hệ Mộc sớm kèm mã đơn. Với đơn đã thanh toán, việc hủy đơn và hoàn tiền được cửa hàng trao đổi, xử lý và xác nhận riêng.

## Sử dụng nội dung

Tên thương hiệu và nội dung do Mộc Bàm tạo thuộc quyền sử dụng của Mộc Bàm. Vui lòng liên hệ trước khi sử dụng lại cho mục đích thương mại. Các tài nguyên của bên thứ ba và phần mềm mã nguồn mở tuân theo quyền và giấy phép tương ứng.

## Hỗ trợ và cập nhật

Các chính sách mua hàng, giao hàng, đổi trả và quyền riêng tư là một phần thông tin sử dụng website. Mộc có thể cập nhật nội dung cho phù hợp với hoạt động cửa hàng; hãy xem thông tin hiển thị trước khi đặt hàng hoặc liên hệ khi cần làm rõ.')
on conflict (key) do update set title = excluded.title, content = excluded.content;

-- Files are readable only when used by a public product, published post or site content.
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'products' and (
    public.is_admin()
    or exists(select 1 from public.products where active and (
      image_url = '/api/media/' || storage.objects.name
      or '/api/media/' || storage.objects.name = any(image_urls)
      or video_url = '/api/media/' || storage.objects.name
      or variants @> jsonb_build_array(jsonb_build_object('image_url', '/api/media/' || storage.objects.name, 'active', true))))
    or exists(select 1 from public.posts where published and (
      image_url = '/api/media/' || storage.objects.name
      or video_url = '/api/media/' || storage.objects.name
      or strpos(content, '](/api/media/' || storage.objects.name || ')') > 0))
    or exists(select 1 from public.site_content where (
      content = '/api/media/' || storage.objects.name
      or strpos(content, '](/api/media/' || storage.objects.name || ')') > 0))
  )
);

commit;
