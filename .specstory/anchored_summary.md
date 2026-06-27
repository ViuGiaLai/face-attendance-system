## Goal
- Hoàn thiện hệ thống điểm danh khuôn mặt: quản lý lớp/môn/TKB, nâng cấp user model, tích hợp class vào attendance, anti-spoofing nâng cao

## Constraints & Preferences
- Tiếng Việt xuyên suốt
- Dùng `py` thay `python` trên Windows
- Cấm SQLite local, chỉ dùng Supabase PostgreSQL qua pooler
- UI responsive + dark mode + đẹp

## Progress
### Done
- **Quản lý lớp/môn/TKB**:
  - Models: `Class`, `Subject`, `Schedule`, `ClassStudent` (SQLAlchemy)
  - Backend: Full CRUD `/api/classes`, `/api/subjects`, `/api/schedules` + `/classes/:id/students`
  - Frontend: `ClassManagement.jsx` (CRUD + student list), `SubjectManagement.jsx` (CRUD), `ScheduleManagement.jsx` (CRUD + filter by day)
  - Navbar: Thêm links Lớp/Môn học/TKB cho admin/teacher
  - App.jsx: Routes `/classes`, `/subjects`, `/schedules`
  - Seed: 5 lớp (CNTT46…), 5 môn (Python, CTDLGT…), 11 lịch học, ghi danh SV vào lớp
- **Nâng cấp User model**:
  - Thêm fields: `student_code` (UNIQUE), `phone`, `department`, `avatar_url`, `status` (active/inactive/graduated/suspended)
  - `migrate_schema.py`: ALTER TABLE users + attendance_logs
  - `routes/users.py`: Search (tên/email/mã/SĐT), filter role/department
  - `routes/auth.py`: Register nhận student_code/phone/department (optional)
  - Frontend `UserManagement.jsx`: Table 10 cột (thêm Mã số, SĐT, Khoa, Trạng thái), search bar, filter role, inline edit đầy đủ
  - Frontend `Register.jsx`: Thêm 3 field bổ sung (mã số, SĐT, khoa) + validation
  - Seed: 7 users mẫu (2 teacher: GV001/002, 5 student: 20210001-20210005)
- **Tích hợp Class vào Attendance**:
  - Backend `attendance.py`: Mọi endpoint nhận `class_id` + `/schedule` (lịch hôm nay + điểm danh count) + `/class-stats`
  - Backend `face_recog.py`: `recognize` + `recognize-multi` nhận `class_id`, ghi vào AttendanceLog
  - Attendance page: Dropdown chọn lớp ở recognize mode, gửi `class_id` kèm khi capture
  - History page: Filter theo lớp, cột Lớp, export CSV có thêm mã số + lớp
  - Dashboard: Hiển thị lịch học hôm nay (số đã điểm danh/tổng SV), stat cards mới
- **Anti-spoofing nâng cao**:
  - `utils/liveness.js`: `computeEAR()`, `estimateHeadPose()` (yaw/pitch/roll từ 68 landmarks), `detectBlink()`, `getHeadPoseLabel()`, `checkChallenge()`, `detectScreenSpoof()` (texture analysis via canvas)
  - CHALLENGES: center → left → right → center2 → blink (5 bước)
  - **Đã tích hợp vào `WebcamCapture.jsx`**: challenge flow bắt buộc trước khi chụp (register mode), head pose arrow trên canvas, progress dots, spoof detection khi capture, liveness reset giữa các lần chụp
- **Tái cấu trúc Navbar với dropdown**:
  - 3 mục chính trên desktop: Trang chủ + Điểm danh ▼ + Quản lý ▼ (admin/teacher)
  - Custom `Dropdown` component với click-outside-to-close
  - Mobile drawer: accordion-style expandable groups cho Điểm danh & Quản lý
  - Giảm từ 7 link xuống 2-3 nút bấm
- **Backend `/face/anti-spoof` endpoint**:
  - Server-side spoof detection qua OpenCV: Laplacian variance (blur), histogram std, Canny edge ratio, Sobel texture
  - Trả về `isReal`, `score`, các chỉ số chi tiết
- **Audit Log system**:
  - Model `AuditLog`: user_id, action, resource, resource_id, details, ip_address
  - CRUD routes `/api/audit` (admin-only, phân trang, filter)
  - Tích hợp log vào: register, login, update/delete user, face recognition attendance
- **Dọn dẹp kỹ thuật**:
  - Xoá file `attendance_log.py` (orphan, duplicate model)
  - Fix JWT secret key 32+ bytes (xoá InsecureKeyLengthWarning)

### In Progress
- *(none)*

### Blocked
- *(none)*

## Key Decisions
- Models định nghĩa trong `class_model.py` thay vì chung file để dễ maintain
- Không dùng migration tool (Alembic) – dùng `db.create_all()` + `migrate_schema.py` raw SQL cho existing tables
- Seed data dùng hàm `enroll_students()` riêng để chạy được nhiều lần không trùng
- Head pose estimation dùng tỷ lệ nose-to-eyes thay vì solvePnP (không cần camera matrix)
- Texture spoof check dùng Laplacian variation + edge ratio, chạy trong browser canvas
- Challenge flow: 5 bước tuần tự, mỗi bước phải pass mới sang bước tiếp theo, nếu spoof detect → từ chối capture
- Navbar dropdown: custom component với useClickOutside hook, mobile dùng accordion
- Audit log: ghi sync vào cùng DB, không async queue (đơn giản cho MVP)

## Next Steps
- Frontend Audit Log page (`/audit`) – tra cứu lịch sử hành động
- Thông báo Email khi sinh viên vắng
- Camera Management – chọn camera IP/USB, cấu hình resolution/FPS
- Hoàn thiện Register page: tích hợp liveness challenge + gọi batch register

## Critical Context
- Frontend: `http://localhost:5173`; Backend: `http://127.0.0.1:5000`
- Supabase pooler: `aws-1-ap-southeast-1.pooler.supabase.com:5432` – user `postgres.mpmjryvcfatbqilztoov`, pass `rmahviu@852005` (@ → %40)
- `face-api.js` models trong `public/models/` (tiny_face_detector, face_landmark_68, face_recognition_model)
- JWT secret key **đã fix** (32+ bytes)
- `attendance_log.py` **đã xoá** (không còn duplicate model)
- Audit logs ghi vào bảng `audit_logs` qua hàm `log_audit()`

## Relevant Files
### Frontend
- `components/Navbar.jsx`: **đã refactor** với dropdown + mobile accordion
- `components/WebcamCapture.jsx`: **đã tích hợp** liveness + challenge + spoof
- `utils/liveness.js`: head pose, blink, texture spoof detection
- `pages/ClassManagement.jsx`, `SubjectManagement.jsx`, `ScheduleManagement.jsx`, `UserManagement.jsx`, `Attendance.jsx`, `AttendanceHistory.jsx`, `Dashboard.jsx`, `Register.jsx`
### Backend
- `app/models/audit_log.py`: **mới** – AuditLog model
- `app/routes/audit.py`: **mới** – GET logs + filter + phân trang
- `app/routes/face_recog.py`: + anti-spoof endpoint, + audit logging
- `app/routes/auth.py`: + audit logging (register, login)
- `app/routes/users.py`: + audit logging (update, delete)
- `app/__init__.py`: đăng ký audit blueprint
- `config.py`: JWT key 32+ bytes
- `app/models/class_model.py`, `attendance.py`, `user.py`
- `app/routes/attendance.py`, `classes.py`, `subjects.py`, `schedules.py`
- `seed_data.py`, `migrate_schema.py`
