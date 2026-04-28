# NoteFlow — Note Management Web App

A full-stack note management application with a Laravel API backend and a React frontend. Inspired by modern note-taking apps with a polished dark-mode 3-column interface.

---

## 📋 Features

- ✅ **Authentication** — Register, login, logout with Laravel Sanctum
- ✅ **Note CRUD** — Create, read, update, delete notes with auto-save
- ✅ **Labels & Folders** — Organize notes with tags and folders
- ✅ **Search** — Live debounced search (300ms) across titles and content
- ✅ **Pinning** — Pin important notes to the top
- ✅ **Password Protection** — Lock individual notes with a password
- ✅ **Sharing** — Share notes with other users (read/edit permissions)
- ✅ **Grid/List Views** — Toggle between card grid and compact list
- ✅ **Dark Theme** — Nowted-inspired polished dark UI
- ✅ **Responsive** — Works on mobile, tablet, and desktop

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | PHP 8.3+, Laravel 11+, MySQL 8.0 |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Zustand, React Query |
| **Auth** | Laravel Sanctum (token-based) |

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

6. Chạy migrations để tạo các bảng trong cơ sở dữ liệu:
   ```bash
   php artisan migrate
   ```

7. Khởi động server backend:
   ```bash
   php artisan serve
   ```
   Backend sẽ chạy tại: **http://127.0.0.1:8000**

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

## 🔐 API Endpoints cơ bản (Tham khảo)

- `POST /api/register` - Đăng ký
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/notes` - Lấy danh sách ghi chú
- `POST /api/notes` - Tạo ghi chú mới
- `PUT /api/notes/{id}` - Cập nhật ghi chú
- `DELETE /api/notes/{id}` - Xóa ghi chú

---

## 📄 License
MIT License
