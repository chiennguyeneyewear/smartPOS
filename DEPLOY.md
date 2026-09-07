# Triển khai SmartPOS lên Internet (truy cập từ bất kỳ đâu)

Hướng dẫn này giúp bạn đưa SmartPOS lên mạng để truy cập từ mọi máy tính/điện thoại, không cần máy dev bật 24/7.

Kiến trúc triển khai:
- **Database**: Neon (đã có sẵn từ bước trước)
- **Backend (API)**: Render.com — có gói miễn phí
- **Frontend (giao diện)**: Vercel — có gói miễn phí, tốc độ nhanh

## Bước 1 — Triển khai Backend lên Render

1. Vào **https://render.com**, đăng ký tài khoản miễn phí (dùng GitHub để đăng nhập nhanh)
2. Bấm **New +** → **Web Service**
3. Chọn **Build and deploy from a Git repository**, kết nối GitHub và chọn repo `smartPOS`
4. Render sẽ tự phát hiện file `render.yaml` ở thư mục gốc repo — bấm **Apply** để dùng cấu hình có sẵn. Nếu không tự nhận, điền thủ công:
   - **Root Directory**: để trống (thư mục gốc)
   - **Build Command**:
     ```
     npm install && npm run build --workspace=packages/shared && npm run prisma:generate --workspace=apps/api && npm run build --workspace=apps/api && npm run prisma:deploy --workspace=apps/api
     ```
   - **Start Command**: `node apps/api/dist/server.js`
5. Ở mục **Environment Variables**, thêm các biến sau (copy từ file `.env` của bạn):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | connection string Neon của bạn |
   | `JWT_ACCESS_SECRET` | chuỗi ngẫu nhiên (giữ nguyên như đang dùng) |
   | `JWT_REFRESH_SECRET` | chuỗi ngẫu nhiên (giữ nguyên như đang dùng) |
   | `CORS_ORIGIN` | tạm thời để `http://localhost:5173`, sẽ cập nhật ở Bước 3 |
6. Bấm **Create Web Service**. Đợi vài phút để build & deploy xong. Render sẽ cấp cho bạn 1 URL dạng `https://smartpos-api-xxxx.onrender.com`
7. Kiểm tra bằng cách mở `https://smartpos-api-xxxx.onrender.com/health` trên trình duyệt — thấy `{"status":"ok"}` là thành công

**Lưu ý gói miễn phí**: server sẽ "ngủ" sau 15 phút không có request, lần truy cập đầu tiên sau đó sẽ chậm (~30-50 giây để khởi động lại). Nếu cần chạy 24/7 không delay, cần nâng cấp gói trả phí của Render.

## Bước 2 — Triển khai Frontend lên Vercel

1. Vào **https://vercel.com**, đăng ký tài khoản miễn phí (dùng GitHub để đăng nhập nhanh)
2. Bấm **Add New** → **Project**, chọn repo `smartPOS` từ GitHub
3. Ở màn hình cấu hình:
   - **Root Directory**: bấm **Edit**, chọn thư mục `apps/web`
   - **Framework Preset**: Vite (Vercel tự nhận diện)
   - Bật toggle **Include files outside the root directory** (quan trọng — để Vercel build được `packages/shared`)
4. Ở mục **Environment Variables**, thêm:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://smartpos-api-xxxx.onrender.com/api/v1` (URL backend từ Bước 1) |
5. Bấm **Deploy**. Sau khi xong, Vercel cấp cho bạn URL dạng `https://smart-pos-xxxx.vercel.app`

## Bước 3 — Cho phép frontend gọi backend (cập nhật CORS)

1. Quay lại Render → project `smartpos-api` → **Environment**
2. Sửa biến `CORS_ORIGIN` thành URL Vercel vừa nhận được, ví dụ:
   ```
   https://smart-pos-xxxx.vercel.app
   ```
   (Có thể để nhiều origin cách nhau bởi dấu phẩy, ví dụ: `https://smart-pos-xxxx.vercel.app,http://localhost:5173`)
3. Lưu lại — Render sẽ tự động deploy lại backend với cấu hình mới

## Bước 4 — Truy cập thử

Mở URL Vercel (`https://smart-pos-xxxx.vercel.app`) trên bất kỳ máy nào có Internet, đăng nhập bằng tài khoản demo (hoặc tài khoản bạn đã tạo).

## Từ giờ về sau

Mỗi khi bạn (hoặc tôi) push code mới lên nhánh `main` trên GitHub, cả Render và Vercel sẽ **tự động build & deploy lại** — không cần làm lại các bước trên.
