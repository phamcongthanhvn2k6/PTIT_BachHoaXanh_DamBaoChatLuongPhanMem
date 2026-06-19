# Bản đồ Tính năng Dự án Lotte Mart (Feature Map - Updated)

Bản đồ tính năng này mô tả chi tiết trạng thái thực tế của toàn bộ hệ thống Web & Backend Lotte Mart hiện tại, đối chiếu trực tiếp giữa mã nguồn và kế hoạch Trello.

## 1. Ký hiệu Trạng thái (Status Legend)
*   ✅ **Implemented:** Đã hoàn thành cả giao diện Frontend, logic Backend và đồng bộ dữ liệu vào Database.
*   ⚠️ **Gaps / Partially Implemented:** Đã có giao diện hoặc API nhưng còn lỗi kỹ thuật, thiếu một số trường dữ liệu hoặc đang sử dụng dữ liệu tĩnh (mock).
*   ❌ **Missing / Backlog:** Tính năng chưa được triển khai hoặc thiếu sự kết nối giữa FE và BE.

---

## 2. Tính năng phía Khách hàng (User Features)

| Tính năng | Trạng thái | Mô tả thực tế trong mã nguồn |
| :--- | :---: | :--- |
| **Duyệt & Tìm kiếm Sản phẩm** | ⚠️ **Gaps** | Trang chủ, danh mục và chi tiết sản phẩm hoạt động tốt. Tuy nhiên trang tìm kiếm (`SearchResults.tsx`) vẫn tự lọc ở Client-side, chưa gọi API tìm kiếm thật ở Backend. |
| **So sánh Sản phẩm bằng AI** | ✅ **Implemented** | Cho phép so sánh 2 sản phẩm tương đương. Sử dụng Gemini AI API để tóm tắt phân tích ưu/nhược điểm hiển thị trực quan ở trang `Compare.tsx`. |
| **Giỏ hàng theo Chi nhánh** | ✅ **Implemented** | Giỏ hàng được chia tách độc lập theo từng chi nhánh siêu thị. Đồng bộ giữa LocalStorage và MongoDB. |
| **Giỏ hàng Gia đình (Shared Cart)** | ✅ **Implemented** | Chia sẻ giỏ hàng chung giữa các thành viên gia đình qua mã phòng, tự động cập nhật sản phẩm thời gian thực (Real-time) qua Socket.IO. |
| **Smart Shopping Mode** | ✅ **Implemented** | Cung cấp luồng dữ liệu cá nhân hóa (Sản phẩm gợi ý, Mua lại, Sản phẩm xu hướng) dựa trên lịch sử mua sắm. |
| **Theo dõi biến động Giá (Price Watch)** | ✅ **Implemented** | Người dùng bấm biểu tượng chuông 🔔 để theo dõi sản phẩm, lưu trữ danh sách theo dõi và hiển thị banner cảnh báo khi sản phẩm giảm giá. |
| **Gợi ý Công thức Nấu ăn (AI Recipe)** | ✅ **Implemented** | Người dùng nhập tên món ăn, khẩu phần $\rightarrow$ Gemini AI tạo công thức chi tiết. Tích hợp nút **"Mua tất cả"** tự động tìm sản phẩm tương ứng trong siêu thị bỏ vào giỏ hàng. Có cache DB. |
| **Thanh toán & Hóa đơn (Checkout)** | ⚠️ **Gaps** | Đã tích hợp luồng thanh toán mô phỏng (VNPAY/QR). Tuy nhiên, logic kiểm tra/xác thực thanh toán trong `Payment.tsx` đang bị comment, và mẫu Order có một số trường phẳng chưa lưu vào Schema DB. |
| **Tích điểm thành viên L.Point** | ⚠️ **Gaps** | Đã có trường điểm trong tài khoản User, nhưng tên trường chưa đồng bộ (`loyalty_points` ở FE và `lotte_points` ở Schema DB). |
| **Quản lý tài khoản (Account Area)** | ✅ **Implemented** | Đầy đủ giao diện quản lý hồ sơ, lịch sử đơn hàng, danh sách địa chỉ nhận hàng, ví mã giảm giá và cài đặt bảo mật. |
| **Trò chơi tích điểm (Gamification)** | ✅ **Implemented** | Khu vui chơi **Lotte Fun Zone** gồm Vòng quay may mắn (Lucky Spin) và Điểm danh hàng ngày (Daily Check-in) được validate chặt chẽ ở Backend. |
| **Đa ngôn ngữ (i18n)** | ⚠️ **Gaps** | Frontend đã có `react-i18next` dịch nhãn tĩnh. Backend đã có middleware ngôn ngữ, tuy nhiên dữ liệu sản phẩm đa ngôn ngữ chưa được khai báo đầy đủ trong Schema DB. |
| **Hệ thống Thông báo (Notifications)** | ❌ **Backlog** | Trang `Notifications.tsx` hiện tại là file trống, chưa kết nối API đẩy thông báo đơn hàng hay thông báo khuyến mãi. |
| **Trang Liên hệ (Contact Page)** | ❌ **Backlog** | File `Contact.tsx` rỗng và chưa được cấu hình định tuyến trong ứng dụng. |

---

## 3. Tính năng phía Quản trị viên (Admin Panel)

| Tính năng | Trạng thái | Mô tả thực tế trong mã nguồn |
| :--- | :---: | :--- |
| **Dashboard Analytics** | ✅ **Implemented** | Hiển thị biểu đồ thống kê doanh thu theo thời gian, trạng thái đơn hàng và các mặt hàng bán chạy sử dụng thư viện Recharts. |
| **Bản đồ Chi nhánh (Branch Locations)** | ✅ **Implemented** | Tích hợp bản đồ Leaflet cho phép Admin ghim chi nhánh siêu thị mới, vẽ bán kính giao hàng trực quan. |
| **Quản lý Sản phẩm & Danh mục** | ✅ **Implemented** | CRUD danh mục và sản phẩm. Có tích hợp tải ảnh sản phẩm lên hệ thống GridFS của MongoDB. |
| **Quản lý Đơn hàng & Đánh giá** | ✅ **Implemented** | Xem danh sách đơn hàng, cập nhật trạng thái đơn, kiểm duyệt đánh giá và trả lời câu hỏi của khách hàng. |
| **Phân quyền người dùng (RBAC)** | ✅ **Implemented** | Hệ thống quản lý Vai trò (Roles) và Quyền hạn (Permissions). Bảo vệ các route admin thông qua `AdminPermissionGuard`. |
| **Quản lý Nhà cung cấp & Đơn nhập** | ✅ **Implemented** | Quản lý thông tin nhà cung cấp, lập đơn đặt hàng nhập kho (Import Orders) và lập phiếu nhập kho (Import Receipts). |
| **Quản lý Lô hàng (Inventory Batches)** | ✅ **Implemented** | Theo dõi hạn sử dụng và số lượng tồn kho của từng lô sản phẩm cụ thể theo nguyên tắc nhập trước xuất trước (FIFO). |
| **Nhật ký di chuyển kho (Movements)** | ⚠️ **Gaps** | Đã hiển thị lịch sử xuất/nhập/điều chuyển kho, tuy nhiên Model `StockMovement` đang bị định nghĩa trùng lặp trong Misc.js gây rủi ro dữ liệu. |
| **Kiểm kê & Yêu cầu nội bộ (Stock Takes)** | ⚠️ **Gaps** | Giao diện đã có, nhưng API backend mới chỉ là mock data trả về tĩnh (stub), chưa lưu trữ dữ liệu kiểm kê thật vào MongoDB. |
| **Cài đặt Hệ thống (System Settings)** | ✅ **Implemented** | Cấu hình thông tin siêu thị, thiết lập mẫu email thông báo và cài đặt các cổng thanh toán. |

---

## 4. Hệ thống Xác thực & Bảo mật (Auth & Security)

| Tính năng | Trạng thái | Mô tả thực tế trong mã nguồn |
| :--- | :---: | :--- |
| **Đăng nhập Email/Mật khẩu** | ✅ **Implemented** | Đăng ký, đăng nhập xác thực bằng JWT (Access Token & Refresh Token). Mật khẩu được mã hóa bằng `bcryptjs`. |
| **Xác thực Email OTP** | ✅ **Implemented** | Gửi mã OTP xác thực đăng ký tài khoản qua Nodemailer và hàng đợi BullMQ. |
| **OAuth Mạng xã hội** | ✅ **Implemented** | Hỗ trợ đăng nhập nhanh bằng tài khoản Google và Facebook. |
| **Đăng nhập Phone OTP** | ❌ **Backlog** | Frontend có giao diện và gọi endpoint gửi OTP qua SĐT, nhưng Backend hoàn toàn thiếu các route xử lý này. |
| **Khôi phục mật khẩu (Forgot Password)** | ❌ **Backlog** | Backend đã viết route đổi mật khẩu, nhưng Frontend chưa làm giao diện (hiện tại service đang báo NOT_IMPLEMENTED). |
| **Cơ chế kiểm soát truy cập (CORS)** | ✅ **Implemented** | Đã cấu hình CORS động thích ứng với domain chạy thực tế của Vercel bao gồm cả các bản build preview. |

---

## 5. Tổng kết khoảng cách kỹ thuật cần xử lý ưu tiên
1.  **Backend Auth:** Viết thêm API cho Đăng nhập bằng Số điện thoại (Phone OTP) và kết nối giao diện Quên/Khôi phục mật khẩu.
2.  **Schema Database:** Bổ sung các trường thông tin chi tiết của `BranchProduct` và `Order` vào Schema DB để tránh mất mát dữ liệu mẫu của Frontend.
3.  **Dọn dẹp code:** Xóa bỏ model trùng lặp `StockMovement` và chuẩn hóa trường tích điểm thành viên `lotte_points`.
4.  **Hoàn thiện tính năng trống:** Viết giao diện/API cho Hệ thống Thông báo (Notifications), trang Liên hệ (Contact) và trang Khuyến mãi hot (HotDeals).
