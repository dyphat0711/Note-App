# 📝 NoteFlow - Notebook Web App

[![Laravel](https://img.shields.io/badge/Backend-Laravel%2013-red?style=flat-square&logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Build-Vite%205-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**NoteFlow** là ứng dụng ghi chú full-stack với rich-text editor, chia sẻ ghi chú, cộng tác thời gian thực, PWA/offline sync và giao diện responsive cho desktop, tablet, mobile.

## ✨ Tính Năng

### 🔐 Tài Khoản

- Đăng ký, đăng nhập bằng Laravel Sanctum.
- Xác minh email, quên mật khẩu bằng link hoặc OTP.
- Hồ sơ cá nhân, ảnh đại diện, đổi mật khẩu.
- Tùy chỉnh giao diện, cỡ chữ, màu ghi chú mặc định và chế độ hiển thị.

### 📝 Ghi Chú

- Soạn thảo rich-text bằng Tiptap: bold, italic, underline, ảnh inline.
- Auto-save thông minh, gom title và content vào một lần gọi API khi có thể.
- Ghim ghi chú quan trọng lên đầu danh sách.
- Màu nền riêng cho từng ghi chú.
- Đính kèm hình ảnh.
- Xem dạng grid hoặc list.
- Tìm kiếm full-text với MySQL FULLTEXT index.

### 🏷️ Labels

- Tạo, sửa, xóa label với màu tùy chọn.
- Lọc ghi chú theo một hoặc nhiều label.

### 🔒 Bảo Mật Ghi Chú

- Khóa ghi chú bằng mật khẩu riêng.
- Yêu cầu mật khẩu hiện tại khi đổi hoặc tắt khóa.

### 🤝 Chia Sẻ Và Realtime

- Chia sẻ ghi chú qua email.
- Phân quyền read-only hoặc edit.
- Cộng tác thời gian thực bằng Laravel Reverb: đồng bộ nội dung, typing indicator và presence avatar.

### 📱 PWA, Offline Và Responsive

- Thiết kế responsive cho desktop, tablet và mobile.
- Hỗ trợ đọc và chỉnh sửa ghi chú khi offline.
- Tự động đồng bộ các thay đổi trong hàng đợi khi kết nối được khôi phục.

## 🛠️ Tech Stack

| Layer    | Công nghệ                                                      |
| -------- | -------------------------------------------------------------- |
| Backend  | PHP 8.4+, Laravel 13, MySQL 8, Laravel Sanctum, Laravel Reverb |
| Frontend | React 18, Vite 5, Zustand, Tiptap, Laravel Echo, Pusher-js     |
| PWA      | vite-plugin-pwa, Workbox, LocalForage                          |
| Styling  | Tailwind CSS, CSS variables                                    |
| Docker   | Docker Compose, Nginx, PHP-FPM, MySQL, Redis                   |

## 📁 Cấu Trúc Dự Án

```text
Note-Flow/
├── backend/              # Laravel API
│   ├── app/
│   ├── database/
│   ├── routes/
│   └── .env.example
├── frontend/             # React SPA
│   ├── src/
│   └── vite.config.js
├── docker/               # Nginx, PHP-FPM, MySQL config
├── docker-compose.yml
├── .env.example          # Local non-Docker template
├── .env.docker.example   # Docker Compose template
├── setup.bat             # Docker setup for Windows
└── setup.sh              # Docker setup for Linux/macOS
```

## 🐳 Chạy Bằng Docker Compose

### ✅ Yêu Cầu

- Docker Desktop hoặc Docker Engine.
- Port `80`, `3306`, `6379`, `8080` đang rảnh, hoặc chỉnh trong `.env`.

### 🪟 Windows

```cmd
setup.bat
```

Script sẽ:

- Tạo `.env` từ `.env.docker.example` nếu chưa có.
- Tạo `backend/.env` từ `backend/.env.example` nếu chưa có.
- Start MySQL, Redis, PHP-FPM.
- Cài Composer dependencies vào Docker volume.
- Chạy `key:generate`, migrate/seed database và chuẩn bị storage.
- Build frontend bằng container Node.
- Start queue worker, Reverb và Nginx.

Sau khi xong, mở:

```text
http://localhost
```

### 🐧 Linux/macOS

```bash
chmod +x setup.sh
./setup.sh
```

### ⚙️ Các Lệnh Docker Hay Dùng

```bash
docker compose ps
docker compose logs -f nginx php-fpm reverb
docker compose restart php-fpm queue-worker reverb nginx
docker compose --profile tools run --rm frontend-builder
```

Chạy lại sau khi setup xong:

```bash
docker compose up -d
```

Nếu đổi code frontend:

```bash
docker compose --profile tools run --rm frontend-builder
docker compose restart nginx
```

Nếu muốn reset dữ liệu demo:

```bash
docker compose exec php-fpm php artisan migrate:fresh --seed --force
```

## 💻 Chạy Local

### ✅ Yêu Cầu

- PHP >= 8.4 và Composer.
- Node.js >= 18 và npm.
- MySQL 8, XAMPP hoặc Laragon.
- Redis nếu muốn chạy queue/cache giống production.

### 🧩 Backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan config:clear
php artisan serve
```

API chạy tại:

```text
http://127.0.0.1:8000
```

Realtime:

```bash
php artisan reverb:start
```

### 🎨 Frontend

```bash
cd frontend
npm install
npm run dev
```

App chạy tại:

```text
http://localhost:5173
```

Vite dev server proxy `/api`, `/sanctum`, `/storage` và `/broadcasting` sang backend local.

## 🔧 Cấu Hình Env

Các file `.env` thật không được commit:

- `.env`
- `backend/.env`
- `frontend/.env`

Các file example được commit:

- `.env.example`: dùng cho local non-Docker.
- `.env.docker.example`: dùng cho Docker Compose.
- `backend/.env.example`: template riêng cho Laravel backend.

### 📧 SMTP Email

Mặc định example dùng:

```env
MAIL_MAILER=log
```

Nếu muốn gửi email thật bằng Gmail, chỉ cấu hình trong `backend/.env` hoặc `.env` local của bạn:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="${APP_NAME}"
```

Không đưa `MAIL_PASSWORD` thật vào file example hoặc commit Git.

## 👤 Tài Khoản Demo

Sau khi chạy seed:

| Người dùng | Email                | Mật khẩu       | Ghi chú                     |
| ---------- | -------------------- | -------------- | --------------------------- |
| Alice      | `alice@example.test` | `Password123!` | Chủ ghi chú, có dữ liệu mẫu |
| Bob        | `bob@example.test`   | `Password123!` | Người nhận note được share  |

## 📄 License

Dự án phát hành theo giấy phép [MIT](LICENSE).
