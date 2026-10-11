# Hướng dẫn quản trị Mộc Bàm

## Đăng nhập và cấp quyền

Trang quản trị nằm tại `/admin`. Đăng nhập Google qua trang **Tài khoản**. Chỉ tài khoản có `user_id` trong bảng Supabase `admin_members` được truy cập quản trị. Tài khoản khách hàng không tự có quyền này.

Google đã được cấu hình trên bản triển khai chính thức. Chủ cửa hàng `mocbamm@gmail.com` đã đăng nhập và được cấp quyền quản trị lâu dài; dữ liệu kiểm tra đã được dọn, tài khoản và quyền này được giữ lại.

Khi cần cấp quyền cho tài khoản quản trị mới, đăng nhập một lần để tạo tài khoản trong Supabase Authentication. Chủ dự án thêm UUID người dùng đó vào bảng `admin_members` bằng Supabase Dashboard/SQL Editor. Không cấp quyền bằng mã phía trình duyệt hoặc dùng khóa service role ở phía client.

Nếu chưa cấu hình Supabase, trang quản trị hiển thị hướng dẫn thiết lập. Nếu đã đăng nhập nhưng chưa được cấp quyền, trang hiển thị thông báo hạn chế truy cập. API quản trị cũng kiểm tra quyền trên máy chủ.

## Sản phẩm và bài viết

- **Sản phẩm:** chọn “Thêm sản phẩm”, nhập tên, đường dẫn không dấu dạng `ten-san-pham`, danh mục, giá VNĐ, tồn kho, ảnh và mô tả. “Hiển thị trên cửa hàng” cho phép ẩn sản phẩm; “Sản phẩm nổi bật” chọn sản phẩm cho trang chủ. Khi hết hàng, cập nhật tồn kho về 0.
- **Ảnh:** chọn **Tải ảnh lên** hoặc **Thay ảnh** để lấy ảnh từ máy tính/điện thoại, xem trước rồi **Lưu sản phẩm**. JPG/PNG/WebP tối đa 4 MB mỗi ảnh; gợi ý ảnh vuông rộng 1200 px. Ảnh bổ sung cho phép nhiều góc chụp; ảnh riêng của từng phân loại cũng có nút tải lên. Bỏ ảnh riêng để dùng ảnh chung. Trường đường dẫn nằm trong **Dùng đường dẫn có sẵn (nâng cao)** và không cần dùng khi tải tệp. Tệp được lưu trong Supabase Storage đã cấu hình theo README.
- **Bài viết:** nhập tiêu đề, đường dẫn, mô tả ngắn, ảnh và nội dung. Nội dung là văn bản thuần, ngăn các đoạn bằng một dòng trống. Bỏ chọn “Xuất bản trên cửa hàng” để giữ bản nháp hoặc ẩn bài viết.

## Xử lý đơn hàng

Tìm đơn bằng mã, tên khách hàng, email hoặc số điện thoại. Chọn “Chi tiết đơn hàng” để xem sản phẩm, thông tin giao hàng và ghi chú. Cập nhật trạng thái: **Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Hoàn tất**.

Chọn **Đã hủy** và xác nhận để hủy đơn. Máy chủ hoàn lại tồn kho một lần; đơn đã hủy không thể mở lại. Đơn đã hoàn tất cũng không thể đổi trạng thái. Không hủy đơn chỉ để thử giao diện trên dữ liệu thật.

Trạng thái xử lý đơn và thanh toán được hiển thị riêng. Khách có thể chọn **COD** hoặc **Chuyển khoản ngân hàng** nếu cửa hàng đã bật chuyển khoản. Đơn cũ trước khi bổ sung thanh toán giữ phương thức “Chưa chọn phương thức”. Cập nhật xử lý đơn không xác nhận tiền đã nhận.

### Nhận tiền và hoàn tiền

- **Nhận tiền:** mở chi tiết đơn, kiểm tra tài khoản nhận tiền hoặc khoản tiền mặt thực tế đã nhận đủ bằng tổng đơn. Với chuyển khoản, đối chiếu ngân hàng, số tài khoản và nội dung chuyển khoản của chính đơn đó. Nhập mã giao dịch hoặc ghi chú tiền mặt, chọn **Xác nhận đã nhận đủ tiền**, rồi đọc và xác nhận hộp thoại. Đơn chuyển sang **Đã thanh toán** và lưu thời điểm nhận tiền.
- **Hủy đơn đã nhận tiền:** hủy chỉ hoàn tồn kho. Thực hiện hoàn trả đủ tiền cho khách bên ngoài website, sau đó nhập mã giao dịch hoàn tiền hoặc ghi chú đối soát và chọn **Ghi nhận đã hoàn tiền**. Hộp thoại yêu cầu xác nhận khoản hoàn trả đã thực hiện; thao tác trên website không tự chuyển tiền cho khách.
- **Lịch sử đối soát:** mỗi lần ghi nhận lưu số tiền, ghi chú và thời điểm. Lịch sử này chỉ quản trị viên được xem. Không nhập số thẻ, PIN, mật khẩu ngân hàng hay OTP vào ghi chú.

Đơn đã hủy khi chưa nhận tiền không thể ghi nhận thanh toán. Chỉ đơn đã hủy và đã thanh toán mới có thao tác ghi nhận hoàn tiền. Đơn đã hoàn tiền không thể chuyển lại sang chờ thanh toán; giao diện không hỗ trợ thanh toán hoặc hoàn tiền từng phần. Các trạng thái này được kiểm tra lại trên máy chủ. Giá trị đơn hàng trên trang tổng quan gồm đơn chưa thanh toán và không thể dùng thay cho tổng tiền đã thu.

## Nội dung, liên hệ và cài đặt

- **Nội dung:** quản lý banner, ảnh danh mục, khối giới thiệu trang chủ, trang Chúng tôi và chính sách. Chọn nhóm và mục cần đổi; mỗi mục được lưu riêng. Nhãn **Chưa lưu** giúp nhận biết bản nháp, **Hủy thay đổi** khôi phục lần lưu gần nhất.

### Thay ảnh / video trang chủ (không cần lập trình)

1. Mở **Quản trị → Nội dung → Trang chủ**.
2. Chọn **Ảnh / video banner chính**, ảnh bộ sưu tập hoặc **Ảnh / video giới thiệu**. Trên điện thoại, dùng danh sách **Chọn nội dung**.
3. Chọn **Ảnh** hoặc **Video**, bấm **Thay ảnh / Tải ảnh lên** hay **Tải video lên**, rồi chọn tệp từ thiết bị. Không cần nhập URL. JPG/PNG/WebP tối đa 4 MB; MP4/WebM tối đa 20 MB.
4. Xem trước, nhập mô tả ngắn đúng nội dung ảnh và bấm **Lưu nội dung**. Chỉ tải tệp lên chưa cập nhật cửa hàng.
5. Bấm **Mở trang cửa hàng** để kiểm tra kết quả đã lưu. Mở cửa hàng ở cả máy tính và điện thoại.

**Banner trên điện thoại** cho phép ảnh/video riêng khi màn hình rộng tối đa 640 px. Gợi ý ảnh dọc 900 × 1200 px; banner chính dùng ảnh ngang 2400 × 1050 px. Đặt chủ thể gần giữa, chừa khoảng trống cho chữ. Nếu không chọn tệp riêng, điện thoại dùng banner chính; banner mẫu đi kèm ảnh dọc. Gỡ banner chính sẽ ẩn toàn bộ hình banner ở mọi thiết bị.

Ảnh danh mục nên dùng PNG/WebP trong suốt rộng ít nhất 600 px. Các vị trí đều có hướng dẫn ngay trong biểu mẫu. **Gỡ ảnh/video → Lưu nội dung** ẩn hình tại vị trí đó. **Dùng ảnh mẫu** khôi phục ảnh thiết kế ban đầu và cũng cần lưu. Ảnh/video bài viết nằm ở **Nhật ký**; ảnh, thư viện và video sản phẩm nằm ở **Sản phẩm**. Banner danh sách sản phẩm tự lấy ảnh từ sản phẩm của danh mục đang chọn.

Tài khoản đã được cấp quyền quản trị có thể tự thực hiện các thao tác này sau khi cửa hàng được kết nối và triển khai. Kết nối Supabase, chạy migration và cấp quyền quản trị là bước thiết lập ban đầu dành cho người vận hành kỹ thuật.

- **Liên hệ:** đọc lời nhắn, dùng email hoặc số điện thoại được khách cung cấp để phản hồi bên ngoài website, sau đó đánh dấu “Đã xử lý”. Có thể mở lại yêu cầu. Trang quản trị không tự gửi email.
- **Cài đặt:** cập nhật phí giao hàng cố định, thông tin liên lạc, giờ mở cửa và URL Facebook/Instagram/TikTok. Phí mới áp dụng cho đơn đặt sau khi lưu; đơn cũ giữ nguyên phí đã tính.
- **Chuyển khoản ngân hàng:** chọn ngân hàng trong danh sách, nhập số tài khoản và tên chủ tài khoản, kiểm tra đúng thông tin rồi bật **Cho phép khách hàng chọn chuyển khoản** và lưu. Mã BIN được điền theo ngân hàng đã chọn. Số tài khoản nhận tiền gồm 5–19 chữ cái hoặc chữ số; giữ nguyên số 0 ở đầu. Các thông tin này sẽ hiển thị cho khách, chỉ nhập thông tin nhận tiền và không cần PIN, mật khẩu hay OTP. Thay đổi áp dụng cho đơn mới; thông tin ngân hàng của đơn cũ giữ nguyên tại thời điểm đặt. Khi tắt chuyển khoản, khách đặt đơn mới vẫn dùng được COD.

## Analytics

Google Analytics đã được cấu hình và kiểm tra trên bản triển khai chính thức. Meta Pixel đang được hoãn theo lựa chọn của chủ dự án. Các mã tracking được cấu hình qua biến môi trường theo README; không nhập khóa bí mật vào các ô nội dung. Các trang `/admin` được loại khỏi tracking của cửa hàng. Khách hàng lựa chọn chấp thuận analytics trước khi công cụ theo dõi được kích hoạt.

## Kiểm tra sau khi cập nhật

Sau khi thấy thông báo lưu thành công, mở trang cửa hàng liên quan để kiểm tra nội dung. Nếu có lỗi, biểu mẫu giữ dữ liệu để chỉnh sửa và thử lại. Khi hết phiên đăng nhập hoặc mất quyền quản trị, đăng nhập lại hoặc nhờ chủ dự án kiểm tra quyền.
