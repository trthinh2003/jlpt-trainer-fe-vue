# JLPT Trainer Frontend

[English](README.md) | [日本語](README.ja.md) | **Tiếng Việt**

Frontend Vue 3 (Composition API), TypeScript và Vite cho JLPT Trainer. Ứng dụng kết nối với [backend ASP.NET Core](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md).

## Chạy local

Yêu cầu Node.js 20.19+ hoặc 22.12+ và .NET SDK phù hợp với dự án API.

1. Từ thư mục frontend, mở một terminal cho API. Thiết lập PostgreSQL, JWT và áp migration, sau đó chạy profile HTTPS ở cổng `7017`. Lệnh `cd` bên dưới giả định backend ở `Project3/backend` và repo Vue ở `Project3/frontend/jlpt-trainer-fe-vue`. [Hướng dẫn chạy backend](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md#chạy-local).

   ```powershell
   cd ..\..\backend
   dotnet run --project src\JlptTrainer.Api --launch-profile https
   ```

2. Ở thư mục frontend:

   ```powershell
   npm ci
   npm run dev
   ```

Mở `http://localhost:5173`. Vite proxy các request `/api` tới `https://localhost:7017`, nên không cần sửa CORS trong API khi phát triển local.

## Lệnh

- `npm run dev`: chạy development server.
- `npm run typecheck`: kiểm tra TypeScript và Vue SFC.
- `npm test` chạy test hồi quy cho HTTP client.
- `npm run build`: kiểm tra kiểu và tạo `dist/`.
- `npm run preview`: xem bản build local.

## Cấu trúc `src`

```text
src/
  app/              App và router
  features/
    auth/            API, phiên đăng nhập, trang đăng nhập/đăng ký
    vocab/           API, kiểu dữ liệu, trang quản lý từ vựng
    catalog/         Duyệt Kanji, Ngữ pháp và import Excel dùng chung
    review/          API thẻ ôn và trang ôn các thẻ đến hạn
    dashboard/       Tiến độ, lịch ôn và điểm bài luyện
    mock-test/       Bài luyện có giờ, lịch sử và xem lại đáp án
  shared/
    api/             HTTP client và xử lý lỗi chung
    types/           Kiểu dữ liệu dùng chung, enum backend
  styles/            CSS toàn ứng dụng
```

Các feature khác có thể bổ sung theo cùng mẫu `features/<tên>/api`, `pages`, `types.ts`.

## Ôn tập

Đăng nhập, chọn **Thêm vào bộ ôn** ở một mục từ vựng, Kanji hoặc ngữ pháp rồi mở **Ôn tập**. Bấm **Hiện đáp án** hoặc phím Space để lật thẻ, sau đó chọn mức nhớ bằng nút trên màn hình hoặc phím 1 đến 4. Mỗi lượt có tối đa 20 thẻ đến hạn, thanh tiến độ và tổng kết số thẻ đã lưu theo từng mức cùng số thẻ đã bỏ qua. Server tính lịch ôn tiếp theo.

Trang từ vựng lấy quyền quản lý kho qua `GET /api/auth/me`. Nút **Thêm từ** và **Xóa** dành cho tài khoản quản lý kho. [Cấp quyền quản lý kho](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md#quản-lý-kho-học-liệu).

Trong kho Từ vựng, Kanji hoặc Ngữ pháp, bấm **Chọn nhiều** để chọn tối đa 20 mục cùng loại qua nhiều trang. Khi thêm vào bộ ôn, màn hình báo số mục đã thêm, đã có trong bộ ôn hoặc không còn trong kho.

Trong **Ôn tập**, chọn **Loại thẻ** hoặc **Cấp JLPT** rồi bấm **Tải thẻ đến hạn** để bắt đầu lượt theo bộ lọc. Hai bộ lọc mặc định là **Tất cả**.

Mở **Ôn tập → Bộ ôn cá nhân** để tìm thẻ đã lưu và xem lịch ôn tiếp theo. Có thể lọc theo loại thẻ, cấp JLPT hoặc trạng thái đến hạn. **Gỡ thẻ** bỏ thẻ khỏi bộ ôn và giữ lịch sử đã ôn.

Ảnh minh họa từ vựng xuất hiện sau khi lật thẻ. Khi ảnh tải lỗi, chọn **Tải lại ảnh** hoặc tiếp tục chấm thẻ. Quản lý kho có thể tải hoặc gỡ ảnh trong phần sửa từ.

Mở **Bài học video** từ thanh điều hướng kho, chọn cấp JLPT và bấm xem để phát hoặc tua MP4. Quản lý kho dùng **Đăng video** để xuất bản và **Gỡ bài** để gỡ khỏi danh sách.

Mở **Học qua audio** để nghe, đọc lời Nhật theo thời gian phát hoặc bấm vào câu để tua. Khi nghe xong, các từ được chọn cho bài nghe hiện lần lượt và có thể thêm vào bộ ôn.

Mở **Kanji → Vẽ Kanji** và viết một chữ bằng chuột hoặc cảm ứng. Gợi ý tự hiện khi bạn dừng vẽ. Chọn một chữ để mở học liệu trong kho. Trình duyệt so nét với 640 mẫu N5–N3. [Ghi công KanjiVG](src/features/kanji-drawing/data/NOTICE.md)

Chọn **Luyện viết** trên thẻ Kanji. Đặt bút ở chấm xanh và đi theo nét tô đậm. Trình duyệt kiểm tra sau mỗi lần nhấc bút. Bạn có thể thử lại nét hiện tại, lùi một nét hoặc viết lại cả chữ.

Trong **Ôn tập**, chọn **Viết từ trí nhớ** trên thẻ Kanji để xem nghĩa và viết trên ô trống. Bấm **Hiện gợi ý** để xem mẫu nét. Chế độ áp dụng cho các thẻ Kanji tiếp theo trong lượt ôn đến khi bạn đóng. Lật thẻ để luyện theo mẫu hoặc tự chấm mức độ ghi nhớ.

## Nhập học liệu từ Excel

Tài khoản quản lý kho mở **Nhập Excel** tại trang **Từ vựng**, **Kanji** hoặc **Ngữ pháp**. Tải mẫu của nhóm đã chọn, điền trang tính đầu và chọn file `.xlsx` tối đa 5 MB. Bấm **Xem trước** để kiểm tra số dòng sẵn sàng, dòng trùng và lỗi theo số dòng Excel. Bấm **Xác nhận nhập** để ghi các dòng mới hợp lệ và xem số dòng thực tế đã nhập. Người học có thể duyệt và thêm mục vào bộ ôn cá nhân.

## Đổi mật khẩu

Chọn **Đổi mật khẩu** ở đầu trang kho từ vựng. Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận. Sau khi lưu, đăng nhập lại bằng mật khẩu mới. Các phiên cũ sẽ bị từ chối ở lần gọi API tiếp theo.

Nếu chưa đăng nhập, chọn **Quên mật khẩu?** trên trang đăng nhập. Backend gửi link tới email đã đăng ký khi Gmail SMTP đã được cấu hình. [Cấu hình Gmail và migration](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md#quên-mật-khẩu-qua-gmail).

## Cấu hình API

Mở **Bài luyện** để chọn cấp JLPT, làm bài từ vựng trong 15 phút, xem lại câu sai hoặc bỏ trống và tải PDF kết quả. Cập nhật migration backend để dùng bài luyện và nút **Thêm vào bộ ôn** trên các đề được cấp mới.

Mở **Tiến độ** từ trang từ vựng hoặc ôn tập để xem lịch ôn trong 84 ngày UTC, mức độ ghi nhớ theo loại thẻ và điểm bài luyện gần đây. Áp dụng migration `AddReviewEvents` ở backend và dùng HTTPS khi triển khai frontend để trình duyệt có thể tạo UUID cho lượt ôn.

`VITE_API_BASE_URL` mặc định là `/api`. Với bản triển khai, cấu hình reverse proxy cho `/api` hoặc đặt biến này thành URL API phù hợp trước khi build. Xem `.env.example` để biết định dạng cấu hình. Giữ token và secret ngoài các biến Vite.

Phiên đăng nhập giữ khóa localStorage `jlpt_token` và `jlpt_user` từ frontend cũ. Khi API trả 401 ở một request cần xác thực, ứng dụng xóa phiên và chuyển về trang đăng nhập.
