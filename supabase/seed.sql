-- Demo catalog and editable content. Re-running preserves admin changes and orders.
begin;

insert into public.categories(id,slug,name,description) values
('11111111-1111-4111-8111-111111111111','nhan-vat','Nhân vật gỗ','Những người bạn nhỏ, được làm bằng tay từ gỗ tự nhiên.'),
('22222222-2222-4222-8222-222222222222','chuoi','Chuỗi & phụ kiện','Một chút mộc mạc để mang theo mỗi ngày.')
on conflict (id) do nothing;

insert into public.products(id,slug,name,category_id,price,stock,image_url,description,featured,active,created_at) values
('33333333-3333-4333-8333-333333333331','meo-moc','Mèo Mộc','11111111-1111-4111-8111-111111111111',189000,24,'/images/product-01.svg','Một chú mèo nhỏ với đôi tai tinh nghịch. Được chà nhám và hoàn thiện thủ công từ gỗ tự nhiên; mỗi vân gỗ là một nét riêng. Phù hợp đặt trên bàn làm việc hoặc làm món quà nhỏ. Kích thước khoảng 7 × 5 cm.',true,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333332','tho-moc','Thỏ Mộc','11111111-1111-4111-8111-111111111111',179000,18,'/images/product-02.svg','Người bạn tai dài mang vẻ dịu dàng của gỗ. Sản phẩm được tạo hình, chà nhám và hoàn thiện bằng tay. Vân gỗ và sắc độ có thể khác nhau nhẹ giữa từng chiếc. Kích thước khoảng 8 × 4 cm.',true,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333333','gau-moc','Gấu Mộc','11111111-1111-4111-8111-111111111111',219000,12,'/images/product-03.svg','Một chú gấu tròn trịa cho góc bàn thêm ấm áp. Làm từ gỗ tự nhiên, hoàn thiện thủ công và đóng gói trong hộp giấy. Kích thước khoảng 7 × 6 cm. Tránh để sản phẩm ngâm nước hoặc dưới ánh nắng trực tiếp lâu ngày.',true,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333334','voi-moc','Voi Mộc','11111111-1111-4111-8111-111111111111',229000,16,'/images/product-04.svg','Chú voi hiền lành với chiếc vòi nhỏ, được tạo hình từ gỗ. Một món quà để nhắc nhau chậm lại và tận hưởng những điều giản dị. Hoàn thiện thủ công. Kích thước khoảng 6 × 8 cm.',false,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333335','chuoi-vong-moc','Chuỗi Vòng Mộc','22222222-2222-4222-8222-222222222222',159000,30,'/images/product-05.svg','Chuỗi hạt gỗ mộc mạc, dễ kết hợp trong ngày thường. Hạt gỗ được chà nhám cẩn thận và xâu thủ công. Sắc độ và vân gỗ khác nhau tự nhiên. Giữ khô ráo và lau bằng khăn mềm.',true,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333336','chuoi-hat-an-yen','Chuỗi Hạt An Yên','22222222-2222-4222-8222-222222222222',199000,20,'/images/product-06.svg','Chuỗi hạt gỗ với sắc nâu ấm, được xâu bằng tay. Một phụ kiện nhỏ cho nhịp sống nhẹ nhàng. Sản phẩm đi kèm túi giấy và thẻ hướng dẫn bảo quản. Tránh nước hoa và chất tẩy rửa.',false,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333337','moc-khoa-nha-go','Móc Khóa Nhà Gỗ','22222222-2222-4222-8222-222222222222',99000,40,'/images/product-07.svg','Một ngôi nhà nhỏ mang theo trong chùm chìa khóa. Được cắt và hoàn thiện từ gỗ tự nhiên, kết hợp khoen kim loại. Kích thước phần gỗ khoảng 4 × 4 cm. Mỗi sản phẩm có vân gỗ riêng.',false,true,'2026-10-03T00:00:00.000Z'),
('33333333-3333-4333-8333-333333333338','chuoi-may-nho','Chuỗi Mây Nhỏ','22222222-2222-4222-8222-222222222222',139000,22,'/images/product-08.svg','Chuỗi phụ kiện với hình mây nhỏ, kết hợp hạt gỗ tự nhiên. Được lắp ráp và hoàn thiện thủ công, phù hợp trang trí túi hoặc góc nhỏ trong nhà. Giữ sản phẩm khô ráo và lau nhẹ bằng khăn mềm.',false,true,'2026-10-03T00:00:00.000Z')
on conflict (id) do nothing;

insert into public.posts(id,slug,title,excerpt,content,image_url,published,created_at) values
('44444444-4444-4444-8444-444444444441','tu-mot-manh-go-nho','Từ một mảnh gỗ nhỏ','Một món đồ nhỏ bắt đầu bằng nhiều lần thử, một đôi tay kiên nhẫn và tình yêu với chất liệu tự nhiên.','Ở Mộc Bàm, mỗi sản phẩm bắt đầu từ một mảnh gỗ và một ý tưởng giản dị. Chúng mình phác thảo, tạo hình, rồi chà nhám từng bề mặt bằng tay.

Gỗ không có hai mảnh giống hệt nhau. Vân gỗ, sắc độ và những dấu nét tự nhiên làm nên cá tính của từng người bạn nhỏ. Chúng mình giữ lại sự khác biệt ấy thay vì che đi.

Khi món đồ được đóng gói, chúng mình mong nó sẽ mang một chút ấm áp tới góc bàn, chiếc túi hay căn phòng của bạn.','/images/blog-01.svg',true,'2026-10-03T00:00:00.000Z'),
('44444444-4444-4444-8444-444444444442','giu-do-go-luon-am-ap','Giữ đồ gỗ luôn ấm áp','Vài thói quen nhỏ để những món đồ gỗ của bạn đi cùng năm tháng.','Đồ gỗ thích một góc khô ráo, thoáng mát. Tránh ngâm nước, độ ẩm cao và ánh nắng trực tiếp kéo dài.

Để làm sạch, dùng khăn mềm khô hoặc hơi ẩm rồi lau lại ngay. Không dùng chất tẩy rửa mạnh, nước hoa hoặc dung môi trên bề mặt gỗ.

Nếu bạn cần hỗ trợ chăm sóc một sản phẩm Mộc Bàm, hãy gửi tin nhắn qua trang liên hệ. Chúng mình sẽ hướng dẫn theo tình trạng cụ thể của món đồ.','/images/blog-02.svg',true,'2026-10-03T00:00:00.000Z')
on conflict (id) do nothing;

insert into public.site_content(key,title,content) values
('home-intro','Những điều nhỏ, làm nên bình yên','Nhân vật gỗ và phụ kiện thủ công, mang một chút mộc mạc và ấm áp vào mỗi ngày.'),
('about','Nhỏ thôi, nhưng có câu chuyện','Mộc Bàm bắt đầu từ tình yêu với những món đồ nhỏ được làm bằng tay. Chúng mình tạo nên nhân vật gỗ và phụ kiện từ chất liệu tự nhiên, với mong muốn mang chút mộc mạc, ấm áp vào cuộc sống hằng ngày.

Mỗi sản phẩm có vân gỗ và sắc độ riêng. Đó là nét đặc biệt của đồ thủ công và cũng là câu chuyện bạn mang về.'),
('shipping','Giao hàng','Cửa hàng tiếp nhận đơn hàng trên toàn Việt Nam. Phí giao hàng được cấu hình trong trang quản trị; cấu hình ban đầu của đồ án là 0đ. Thông tin và thời gian giao hàng thực tế sẽ được xác nhận sau khi chúng mình liên hệ kiểm tra đơn.

Đây là website đồ án. Thanh toán trực tuyến chưa được kích hoạt; gửi đơn không đồng nghĩa với đã thanh toán.'),
('returns','Đổi trả & chăm sóc','Nếu sản phẩm bị hư hỏng khi nhận hoặc khác với đơn đã xác nhận, vui lòng liên hệ cửa hàng kèm mã đơn và hình ảnh để được hỗ trợ. Điều kiện đổi trả cụ thể được xác nhận trực tiếp cho từng đơn.

Vân gỗ và sắc độ khác nhau nhẹ là đặc trưng của chất liệu tự nhiên. Giữ sản phẩm khô ráo, tránh chất tẩy mạnh và ánh nắng kéo dài.'),
('privacy','Quyền riêng tư','Thông tin tên, email, số điện thoại và địa chỉ được sử dụng để tiếp nhận, xác nhận và xử lý đơn hàng hoặc yêu cầu hỗ trợ. Chúng mình không đưa thông tin nhận diện cá nhân vào sự kiện phân tích website.

Bạn có thể lựa chọn cho phép hoặc từ chối công cụ phân tích và quảng cáo. Liên hệ cửa hàng nếu cần kiểm tra hoặc xóa dữ liệu của mình. Đây là nội dung mẫu cho đồ án; chính sách thực tế cần được cập nhật trước khi kinh doanh.'),
('terms','Điều khoản sử dụng','Website Mộc Bàm là sản phẩm đồ án tốt nghiệp. Danh mục và hình minh họa ban đầu là dữ liệu mẫu. Đơn được tiếp nhận ở trạng thái chờ thanh toán; chưa có cổng thanh toán hoặc thu tiền trên website.

Giá và tồn kho được kiểm tra lại khi gửi đơn. Cửa hàng cần xác nhận các thông tin giao hàng trước khi thực hiện đơn.')
on conflict (key) do nothing;

insert into public.site_settings(id,shipping_fee,shop_email,shop_phone,shop_address,shop_hours,facebook_url,instagram_url,tiktok_url) values
(true,0,'hello@mocbam.vn','090 000 0000','TP. Hồ Chí Minh, Việt Nam','Thứ 2 – Thứ 7 · 09:00 – 18:00','','','')
on conflict (id) do nothing;

commit;
