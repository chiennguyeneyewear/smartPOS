# SmartPOS — Quản lý bán hàng &amp; tồn kho

Hệ thống quản lý bán hàng (POS) và tồn kho đa chi nhánh, lấy cảm hứng từ KiotViet. Xây dựng bằng Node.js (Fastify + Prisma + PostgreSQL) và React (Vite + TypeScript + Tailwind + shadcn-style UI).

## Tính năng v1

- **Bán hàng (POS)**: nhiều hóa đơn mở song song, tìm/quét mã vạch sản phẩm, tìm & tạo nhanh khách hàng, giảm giá, thanh toán đa phương thức (tiền mặt / chuyển khoản / thẻ / ghi nợ), 3 chế độ bán (nhanh / thường / giao hàng).
- **Quản lý tồn kho**: sản phẩm, danh mục, đơn vị tính, phiếu nhập/xuất/chuyển/kiểm kho, cảnh báo sắp hết hàng.
- **Khách hàng & Nhà cung cấp**: quản lý thông tin, công nợ, lịch sử.
- **Báo cáo & Đa chi nhánh**: doanh thu, lợi nhuận, top sản phẩm, giá trị tồn kho, so sánh chi nhánh.
- **Phân quyền**: Admin / Quản lý / Thu ngân / Thủ kho, giới hạn dữ liệu theo chi nhánh.

## Kiến trúc

Monorepo dùng npm workspaces:

```
apps/api/       Backend Node.js (Fastify + TypeScript + Prisma ORM)
apps/web/       Frontend React (Vite + TypeScript + Tailwind CSS)
packages/shared/ Zod schema + type dùng chung giữa backend & frontend
```

## Yêu cầu môi trường

- Node.js >= 20
- PostgreSQL 14+ (xem 3 cách bên dưới)

## 1. Cài đặt PostgreSQL (chọn 1 trong 3 cách)

### Cách A — Neon (cloud, miễn phí, không cần cài gì) — khuyến nghị để bắt đầu nhanh

1. Tạo tài khoản miễn phí tại https://neon.tech
2. Tạo project mới, copy connection string (dạng `postgresql://user:pass@host/dbname?sslmode=require`)
3. Dán vào `DATABASE_URL` trong file `.env` (xem bước 2 bên dưới)

### Cách B — Docker (nếu đã cài Docker Desktop)

```bash
docker compose up -d
```

Postgres sẽ chạy tại `localhost:5432` với thông tin đã cấu hình sẵn trong `docker-compose.yml` (user/pass/db: `smartpos`).

### Cách C — Cài PostgreSQL trực tiếp trên máy

Tải và cài từ https://www.postgresql.org/download/, sau đó tạo database `smartpos` và cập nhật `DATABASE_URL` trong `.env` cho khớp thông tin đăng nhập của bạn.

## 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở `.env` và cập nhật `DATABASE_URL` theo cách bạn chọn ở bước 1. Các biến `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` nên đổi thành chuỗi ngẫu nhiên khi triển khai thật.

## 3. Cài đặt & khởi tạo dữ liệu

```bash
npm install
npm run build --workspace=packages/shared
npm run prisma:migrate
npm run prisma:seed
```

Lệnh `prisma:migrate` sẽ tạo toàn bộ bảng theo `apps/api/prisma/schema.prisma`. Lệnh `prisma:seed` tạo dữ liệu mẫu: 2 chi nhánh, ~30 sản phẩm, khách hàng/nhà cung cấp mẫu, và 2 tài khoản đăng nhập:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | admin@smartpos.vn | Admin@123 |
| Thu ngân | cashier@smartpos.vn | Cashier@123 |

## 4. Chạy ứng dụng

```bash
npm run dev
```

- Backend API: http://localhost:4000 (health check tại `/health`)
- Frontend: http://localhost:5173

Hoặc chạy riêng từng phần: `npm run dev:api` / `npm run dev:web`.

## Lệnh hữu ích

```bash
npm run typecheck        # kiểm tra kiểu dữ liệu toàn repo
npm run prisma:studio    # xem/sửa dữ liệu qua giao diện Prisma Studio
npm run build             # build production cho cả 2 app
```

**Lưu ý**: sau khi sửa file trong `packages/shared/src`, chạy `npm run build --workspace=packages/shared` để backend/frontend nhận thay đổi mới (do package này được build sang `dist/` trước khi các app khác import).

## Đưa lên GitHub

```bash
git remote add origin <URL_REPO_CUA_BAN>
git push -u origin main
```
