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
    review/          API thẻ ôn và trang ôn các thẻ đến hạn
  shared/
    api/             HTTP client và xử lý lỗi chung
    types/           Kiểu dữ liệu dùng chung, enum backend
  styles/            CSS toàn ứng dụng
```

Các feature khác có thể bổ sung theo cùng mẫu `features/<tên>/api`, `pages`, `types.ts`.

## Ôn từ vựng

Đăng nhập, chọn **Thêm vào bộ ôn** ở một từ vựng rồi mở **Ôn tập**. Chọn **Hiện đáp án** và chấm mức nhớ để server cập nhật lịch ôn. Trang tải theo lượt tối đa 20 thẻ và hiển thị các thẻ từ vựng, kanji hoặc ngữ pháp đã có trong bộ ôn.

Trang từ vựng lấy quyền quản lý kho qua `GET /api/auth/me`. Nút **Thêm từ** và **Xóa** dành cho tài khoản quản lý kho. [Cấp quyền quản lý kho](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md#quản-lý-kho-học-liệu).

## Đổi mật khẩu

Chọn **Đổi mật khẩu** ở đầu trang kho từ vựng. Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận. Sau khi lưu, đăng nhập lại bằng mật khẩu mới. Các phiên cũ sẽ bị từ chối ở lần gọi API tiếp theo.

Nếu chưa đăng nhập, chọn **Quên mật khẩu?** trên trang đăng nhập. Backend gửi link tới email đã đăng ký khi Gmail SMTP đã được cấu hình. [Cấu hình Gmail và migration](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.vi.md#quên-mật-khẩu-qua-gmail).

## Cấu hình API

`VITE_API_BASE_URL` mặc định là `/api`. Với bản triển khai, cấu hình reverse proxy cho `/api` hoặc đặt biến này thành URL API phù hợp trước khi build. Xem `.env.example` để biết định dạng cấu hình. Giữ token và secret ngoài các biến Vite.

Phiên đăng nhập giữ khóa localStorage `jlpt_token` và `jlpt_user` từ frontend cũ. Khi API trả 401 ở một request cần xác thực, ứng dụng xóa phiên và chuyển về trang đăng nhập.
