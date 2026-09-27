import type { FastifyInstance } from "fastify";
import { ROLES } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PER_DAY_PER_USER = 10;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDay = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const meta = {
  id: true,
  date: true,
  fileName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  uploadedByName: true,
  createdAt: true,
} as const;

// Scans/photos of the paper thu-chi sheet, one or more per day. Staff see and manage only their own files;
// the admin sees everyone's.
export function registerCashSheetRoutes(app: FastifyInstance) {
  app.get("/cash-sheets", { preHandler: authenticate }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    if (!isDate(date)) return reply.code(400).send({ message: "Thiếu ngày (YYYY-MM-DD)" });
    const user = request.authUser!;
    const data = await prisma.cashSheet.findMany({
      where: { date, ...(user.role === ROLES.ADMIN ? {} : { uploadedById: user.id }) },
      select: meta,
      orderBy: { createdAt: "asc" },
    });
    return { data };
  });

  app.post("/cash-sheets", { preHandler: authenticate, bodyLimit: MAX_BYTES }, async (request, reply) => {
    const { date, filename } = request.query as { date?: string; filename?: string };
    if (!isDate(date)) return reply.code(400).send({ message: "Thiếu ngày (YYYY-MM-DD)" });
    const mimeType = (request.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
    const data = request.body as Buffer;
    if (!ALLOWED_MIME.has(mimeType) || !Buffer.isBuffer(data) || data.length === 0) {
      return reply.code(415).send({ message: "Chỉ hỗ trợ file PDF hoặc ảnh (JPG, PNG, WebP)" });
    }
    if (data.length > MAX_BYTES) {
      return reply.code(413).send({ message: `File vượt quá ${MAX_BYTES / 1024 / 1024} MB` });
    }
    const user = request.authUser!;
    const count = await prisma.cashSheet.count({ where: { date, uploadedById: user.id } });
    if (count >= MAX_PER_DAY_PER_USER) {
      return reply.code(400).send({ message: `Mỗi ngày tối đa ${MAX_PER_DAY_PER_USER} file` });
    }
    const created = await prisma.cashSheet.create({
      data: {
        date,
        uploadedById: user.id,
        uploadedByName: user.username,
        fileName: (filename || "to-thu-chi").slice(0, 200),
        mimeType,
        size: data.length,
        data,
      },
      select: meta,
    });
    return reply.code(201).send(created);
  });

  app.get("/cash-sheets/:id/file", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sheet = await prisma.cashSheet.findUnique({ where: { id } });
    if (!sheet) return reply.code(404).send({ message: "Không tìm thấy file" });
    const user = request.authUser!;
    if (user.role !== ROLES.ADMIN && sheet.uploadedById !== user.id) {
      return reply.code(403).send({ message: "Bạn không có quyền xem file này" });
    }
    return reply
      .header("Content-Type", sheet.mimeType)
      .header("Content-Length", sheet.size)
      .header("Cache-Control", "private, max-age=3600")
      .send(Buffer.from(sheet.data));
  });

  // The uploader can remove a file on the day it was added; after that only the admin can.
  app.delete("/cash-sheets/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sheet = await prisma.cashSheet.findUnique({ where: { id }, select: { uploadedById: true, createdAt: true } });
    if (!sheet) return reply.code(404).send({ message: "Không tìm thấy file" });
    const user = request.authUser!;
    const own = sheet.uploadedById === user.id && vnDay(sheet.createdAt) === vnDay(new Date());
    if (user.role !== ROLES.ADMIN && !own) {
      return reply.code(403).send({ message: "Chỉ admin được xóa file của ngày trước" });
    }
    await prisma.cashSheet.delete({ where: { id } });
    return { success: true };
  });
}
