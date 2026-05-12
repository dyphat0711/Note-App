# NoteFlow — Your Digital Notebook

[![Laravel](https://img.shields.io/badge/Backend-Laravel%2013-red?style=flat-square&logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Build-Vite%205-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**NoteFlow** là ứng dụng ghi chú web full-stack hiện đại — hỗ trợ cộng tác thời gian thực, hoạt động offline và trải nghiệm UI/UX tinh tế trên mọi thiết bị.

---

## ✨ Tính năng

### 🔐 Tài khoản
- Đăng ký / Đăng nhập bảo mật với Laravel Sanctum
- Xác minh email, quên mật khẩu qua Link hoặc OTP
- Hồ sơ cá nhân, ảnh đại diện, đổi mật khẩu
- Tùy chỉnh giao diện: Dark / Light / System, cỡ chữ, màu ghi chú mặc định

### 📝 Ghi chú
- Soạn thảo rich-text (in đậm, in nghiêng, gạch chân, ảnh inline) bằng Tiptap
- **Auto-save thông minh** — gom title + content vào 1 API call, bỏ qua khi nội dung không đổi
- Ghim ghi chú quan trọng lên đầu danh sách
- Đặt màu nền riêng cho từng ghi chú
- Đính kèm hình ảnh (jpg, png, webp, gif — tối đa 5 MB/file)
- Xem theo **Grid** hoặc **List**, lưu tùy chọn vào localStorage
- Tìm kiếm full-text nhanh (FULLTEXT index trên MySQL)

### 🏷️ Nhãn (Labels)
- Tạo, sửa, xóa nhãn với màu tuỳ chọn
- Lọc ghi chú theo một hoặc nhiều nhãn

### 🔒 Bảo mật Ghi chú
- Khóa ghi chú bằng mật khẩu riêng
- Yêu cầu nhập lại mật khẩu hiện tại để đổi hoặc tắt khóa

### 🤝 Chia sẻ & Cộng tác
- Chia sẻ ghi chú với người dùng khác qua email
- Phân quyền: **Chỉ đọc** hoặc **Có thể chỉnh sửa**
- Cộng tác thời gian thực qua **WebSocket (Laravel Reverb)**: đồng bộ nội dung tức thì, hiển thị typing indicator và presence avatar
- Thông báo trong ứng dụng và qua email khi được chia sẻ ghi chú

### 📱 PWA & Offline
- Cài đặt như ứng dụng native trên Android/iOS/Desktop
- Xem và chỉnh sửa ghi chú khi mất mạng (Service Worker + IndexedDB)
- Tự động đồng bộ hàng đợi mutation khi có mạng trở lại

---

## 🛠 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | PHP 8.3+, Laravel 13, MySQL 8, Laravel Sanctum, Laravel Reverb |
| **Frontend** | React 18, Vite 5, Zustand, Tiptap, Laravel Echo, Pusher-js |
| **PWA** | vite-plugin-pwa, Workbox, LocalForage (IndexedDB) |
| **Styling** | Tailwind CSS, CSS Variables, Glassmorphism |

---

## 📁 Cấu trúc dự án

```
NoteFlow/
├── backend/              # Laravel API (PHP)
│   ├── app/
│   │   ├── Http/         # Controllers, Requests, Resources
│   │   ├── Models/       # Eloquent Models
│   │   ├── Services/     # Business Logic
│   │   └── Events/       # Broadcast Events (Reverb)
│   ├── database/
│   │   ├── migrations/   # Schema migrations
│   │   └── seeders/      # Demo data
│   └── routes/api.php    # API routes
├── frontend/             # React SPA
│   ├── src/
│   │   ├── api/          # Axios + service wrappers
│   │   ├── components/   # NoteEditor, NoteList, Sidebar, ...
│   │   ├── hooks/        # useOfflineSync, useDebounce, ...
│   │   ├── lib/          # echo.js, offlineStore.js
│   │   ├── pages/        # Dashboard, Login, Profile, ...
│   │   └── store/        # Zustand stores
│   └── vite.config.js
├── docker/               # Docker configs
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Cài đặt & Chạy (Local)

### Yêu cầu
- **PHP >= 8.3** & Composer
- **Node.js >= 18** & npm
- **MySQL 8** (hoặc XAMPP / Laragon)

### 1. Backend

```bash
cd backend

# Cài dependencies
composer install

# Cấu hình môi trường
cp .env.example .env
# → Mở .env, điền thông tin DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# Khởi tạo
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link

# Chạy server
php artisan serve                  # API: http://127.0.0.1:8000

# (Tuỳ chọn) WebSocket cho cộng tác thời gian thực
php artisan reverb:start
```

### 2. Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev                        # App: http://localhost:5173
```

---

## 🐳 Chạy với Docker

```bash
# 1. Cấu hình
cp .env.docker.example .env

# 2. Khởi động
docker compose up -d --build

# 3. Khởi tạo lần đầu
docker compose exec php-fpm php artisan key:generate
docker compose exec php-fpm php artisan migrate:fresh --seed
docker compose exec php-fpm php artisan storage:link
```

Truy cập: **http://localhost**

---

## 👤 Tài khoản Demo

Sau khi chạy `migrate:fresh --seed`:

| Tài khoản | Email | Mật khẩu | Ghi chú |
|-----------|-------|-----------|---------|
| Alice | `alice@example.test` | `Password123!` | Chủ ghi chú, đã xác minh, có dữ liệu mẫu |
| Bob | `bob@example.test` | `Password123!` | Người nhận chia sẻ |

---

## 📄 Giấy phép

Dự án phát hành theo giấy phép [MIT](LICENSE).
