# Hướng dẫn quản trị Mộc Bàm

## Đăng nhập và cấp quyền

Trang quản trị nằm tại `/admin`. Đăng nhập Google qua trang **Tài khoản**. Chỉ tài khoản có `user_id` trong bảng Supabase `admin_members` được truy cập quản trị. Tài khoản khách hàng không tự có quyền này.

Sau khi cấu hình Supabase và chạy migration theo README, đăng nhập một lần để tạo tài khoản trong Supabase Authentication. Chủ dự án thêm UUID người dùng đó vào bảng `admin_members` bằng Supabase Dashboard/SQL Editor. Không cấp quyền bằng mã phía trình duyệt hoặc dùng khóa service role ở phía client.

Nếu chưa cấu hình Supabase, trang quản trị hiển thị hướng dẫn thiết lập. Nếu đã đăng nhập nhưng chưa được cấp quyền, trang hiển thị thông báo hạn chế truy cập. API quản trị cũng kiểm tra quyền trên máy chủ.

## Sản phẩm và bài viết

- **Sản phẩm:** chọn “Thêm sản phẩm”, nhập tên, đường dẫn không dấu dạng `ten-san-pham`, danh mục, giá VNĐ, tồn kho, ảnh và mô tả. “Hiển thị trên cửa hàng” cho phép ẩn sản phẩm; “Sản phẩm nổi bật” chọn sản phẩm cho trang chủ. Khi hết hàng, cập nhật tồn kho về 0.
- **Ảnh:** nhập URL HTTPS hoặc tải ảnh JPG/PNG/WebP tối đa 4 MB. Tệp tải lên được lưu trong Supabase Storage đã cấu hình theo README.
- **Bài viết:** nhập tiêu đề, đường dẫn, mô tả ngắn, ảnh và nội dung. Nội dung là văn bản thuần, ngăn các đoạn bằng một dòng trống. Bỏ chọn “Xuất bản trên cửa hàng” để giữ bản nháp hoặc ẩn bài viết.

## Xử lý đơn hàng

Tìm đơn bằng mã, tên khách hàng, email hoặc số điện thoại. Chọn “Chi tiết đơn hàng” để xem sản phẩm, thông tin giao hàng và ghi chú. Cập nhật trạng thái: **Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Hoàn tất**.

Chọn **Đã hủy** và xác nhận để hủy đơn. Máy chủ hoàn lại tồn kho một lần; đơn đã hủy không thể mở lại. Đơn đã hoàn tất cũng không thể đổi trạng thái. Không hủy đơn chỉ để thử giao diện trên dữ liệu thật.

Trạng thái thanh toán **Chờ thanh toán** được hiển thị riêng, chỉ đọc. Phiên bản đồ án không có chức năng đánh dấu đã thanh toán hoặc kết nối xác nhận giao dịch tự động. Việc cập nhật trạng thái xử lý đơn không xác nhận thanh toán.

## Nội dung, liên hệ và cài đặt

- **Nội dung:** chỉnh sửa giới thiệu trang chủ, Về Mộc Bàm, chính sách giao hàng/đổi trả/bảo mật và điều khoản. Nhập văn bản thuần rồi lưu từng mục.
- **Liên hệ:** đọc lời nhắn, dùng email hoặc số điện thoại được khách cung cấp để phản hồi bên ngoài website, sau đó đánh dấu “Đã xử lý”. Có thể mở lại yêu cầu. Trang quản trị không tự gửi email.
- **Cài đặt:** cập nhật phí giao hàng cố định, thông tin liên lạc, giờ mở cửa và URL Facebook/Instagram/TikTok. Phí mới áp dụng cho đơn đặt sau khi lưu; đơn cũ giữ nguyên phí đã tính.

## Analytics

Google Analytics và Meta Pixel được cấu hình qua biến môi trường theo README; không nhập khóa bí mật vào các ô nội dung. Các trang `/admin` được loại khỏi tracking của cửa hàng. Khách hàng lựa chọn chấp thuận analytics trước khi công cụ theo dõi được kích hoạt.

## Kiểm tra sau khi cập nhật

Sau khi thấy thông báo lưu thành công, mở trang cửa hàng liên quan để kiểm tra nội dung. Nếu có lỗi, biểu mẫu giữ dữ liệu để chỉnh sửa và thử lại. Khi hết phiên đăng nhập hoặc mất quyền quản trị, đăng nhập lại hoặc nhờ chủ dự án kiểm tra quyền.
