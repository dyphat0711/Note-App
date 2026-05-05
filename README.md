# NoteFlow — Note Management Web App

A full-stack note management application with a Laravel API backend and a React frontend. Inspired by modern note-taking apps with a polished dark-mode 3-column interface.

---

## 📋 Features

- ✅ **Authentication** — Register, login, logout, email verification, password reset (link or OTP)
- ✅ **Profile & Avatar** — Edit display name, upload/delete avatar, change password
- ✅ **Preferences** — Theme (light/dark/system), font size, default note color, default view
- ✅ **Note CRUD** — Create, edit (with 300 ms debounced auto-save), delete
- ✅ **Labels** — Create, rename, delete; multi-select label filtering
- ✅ **Search** — Server-side debounced search across title and content
- ✅ **Pinning** — Pin important notes to the top
- ✅ **Password Protection** — Per-note lock (set / change / disable) with current-password gate
- ✅ **Sharing** — Share with another registered user (read or edit) + email & in-app notification
- ✅ **Real-time collaboration** — Laravel Reverb (WebSockets) + Echo + presence channel
- ✅ **PWA / offline** — Workbox service worker, IndexedDB cache, mutation queue, offline badge
- ✅ **Grid/List Views, Dark theme, Mobile responsive**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | PHP 8.3+, Laravel 11+, MySQL 8.0, Sanctum, Reverb |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Zustand, Echo, Workbox |
| **Auth** | Laravel Sanctum (token-based) |
| **Tests** | PHPUnit (64 feature tests), Vitest (13 unit), Playwright (E2E) |

---

## 📁 Project Structure

```text
NoteFlow/
├── backend/                  # Laravel API (Chứa toàn bộ mã nguồn Backend)
├── frontend/                 # React SPA (Chứa toàn bộ mã nguồn Frontend)
└── README.md                 # Hướng dẫn dự án
```

---

## 🚀 Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu hệ thống:
- **XAMPP** (hoặc môi trường chạy PHP 8.3+ & MySQL)
- **Node.js** (phiên bản 18+ trở lên)
- **Composer** (quản lý thư viện PHP)

### Bước 1: Cấu hình Backend (Laravel)

1. Mở terminal/command prompt và di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```

2. Cài đặt các thư viện PHP cần thiết thông qua Composer:
   ```bash
   composer install
   ```

3. Tạo file cấu hình môi trường bằng cách copy từ file mẫu:
   ```bash
   cp .env.example .env
   ```
   *(Trên Windows Command Prompt có thể dùng `copy .env.example .env`)*

4. Cấu hình kết nối Database:
   - Mở **XAMPP Control Panel**, Start module **Apache** và **MySQL**.
   - Truy cập vào [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
   - Tạo một cơ sở dữ liệu mới với tên `noteflow`.
   - Mở file `backend/.env` bằng trình chỉnh sửa code và đảm bảo các thông số sau chính xác:
     ```env
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=noteflow
     DB_USERNAME=root
     DB_PASSWORD=
     ```

5. Khởi tạo khóa bảo mật cho ứng dụng (Application Key):
   ```bash
   php artisan key:generate
   ```

6. Chạy migrations và seed dữ liệu mẫu:
   ```bash
   php artisan migrate:fresh --seed
   ```
   Tài khoản demo được tạo sẵn:
   - `alice@example.test` / `Password123!` (đã verify, có note pinned/locked/shared)
   - `bob@example.test`  / `Password123!` (recipient của note đã share)

7. Khởi động server backend:
   ```bash
   php artisan serve
   ```
   Backend sẽ chạy tại: **http://127.0.0.1:8000**

8. *(Tuỳ chọn — cho real-time collaboration)* Khởi động Reverb WebSocket server trong terminal riêng:
   ```bash
   php artisan reverb:start
   ```

---

### Bước 2: Cấu hình Frontend (React + Vite)

1. Mở một cửa sổ terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```

2. Cài đặt các thư viện Node.js cần thiết:
   ```bash
   npm install
   ```

3. Khởi động server frontend:
   ```bash
   npm run dev
   ```
   Frontend sẽ chạy tại: **http://localhost:3000**

---

### Bước 3: Sử dụng ứng dụng

Sau khi cả 2 server (Backend và Frontend) đều đang chạy, bạn hãy mở trình duyệt web và truy cập vào địa chỉ:
👉 **[http://localhost:3000](http://localhost:3000)**

Bây giờ bạn có thể đăng ký tài khoản mới và bắt đầu sử dụng ứng dụng NoteFlow!

---

## 🐳 Triển khai bằng Docker (one-shot)

```bash
cp .env.docker.example .env
docker compose up -d --build
docker compose exec php-fpm php artisan key:generate
docker compose exec php-fpm php artisan migrate:fresh --seed
docker compose exec php-fpm php artisan storage:link
# Build frontend assets and let Nginx serve them at http://localhost
cd frontend && npm install && npm run build
```

Các service được khởi tạo:

| Service | Container | Port |
|---------|-----------|------|
| `mysql` | `noteflow-mysql` | 3306 |
| `php-fpm` | `noteflow-php` | 9000 (internal) |
| `reverb` | `noteflow-reverb` | 8080 (WebSocket cho real-time) |
| `nginx` | `noteflow-nginx` | 80 (reverse proxy + serve SPA) |

Truy cập http://localhost — Nginx route:
- `/api/*` → Laravel
- `/storage/*` → ảnh upload
- `/app/*` → WebSocket → Reverb
- mọi đường dẫn còn lại → React SPA

---

## 🧪 Chạy bộ test

```bash
# Backend (PHPUnit, SQLite in-memory) — 64 tests
cd backend
php -d extension=pdo_sqlite -d extension=sqlite3 artisan test

# Frontend (Vitest unit) — 13 tests
cd frontend
npm test

# Frontend (Playwright E2E)
# Yêu cầu BE + FE đang chạy trên cổng 8000 + 5173
npm run test:e2e
```

Xem [Rubrik-checklist.md](Rubrik-checklist.md) để map chính xác từng mục rubric → demo flow → test.

---

## 🔐 API Endpoints chính

| Nhóm | Endpoints |
|------|-----------|
| Auth | `POST /api/register`, `POST /api/login`, `POST /api/logout`, `POST /api/email/resend`, `GET /api/email/verify/{id}/{hash}` |
| Password reset | `POST /api/forgot-password`, `POST /api/forgot-password-otp`, `POST /api/verify-otp`, `POST /api/reset-password{,-otp}` |
| Profile | `GET/PUT /api/user`, `POST/DELETE /api/user/avatar`, `POST /api/user/password` |
| Preferences | `GET/PUT/DELETE /api/preferences` |
| Notes | `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/{id}`, `PATCH /api/notes/{id}/pin`, `GET /api/notes/search?q=…` |
| Labels | `apiResource /api/labels` |
| Attachments | `GET/POST /api/notes/{id}/attachments`, `DELETE /api/notes/{id}/attachments/{att}` |
| Password lock | `PATCH /api/notes/{id}/password`, `POST /api/notes/{id}/unlock` |
| Sharing | `POST /api/notes/{id}/share`, `PATCH /api/notes/{id}/share/{shareId}`, `DELETE /api/notes/{id}/share/{shareId}`, `GET /api/notes/shared-with-me` |
| Real-time | `private-note.{id}` (broadcast `NoteUpdated`), `presence-note.{id}` (typing) |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` |

---

## 📄 License
MIT License
