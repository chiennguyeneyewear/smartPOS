import type { FastifyInstance } from "fastify";
import {
  PERMISSIONS,
  PRODUCT_IMAGE_LIMITS,
  productSchema,
  productCreateSchema,
  categorySchema,
  unitSchema,
  productImportInputSchema,
} from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { importProducts } from "./products.service.js";
import { generateProductCode } from "../../lib/codes.js";
import { createStockMovement } from "../inventory/inventory.service.js";

const PAGE_SIZE_DEFAULT = 24;

const imageSelect = { id: true, mimeType: true } satisfies Prisma.ProductImageSelect;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Decimal columns arrive as Decimal objects (strings in JSON); the app works in numbers.
function toNumbers<T extends { costPrice: unknown; sellPrice: unknown; reorderThreshold: unknown; maxStock: unknown }>(p: T) {
  return {
    ...p,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
    reorderThreshold: p.reorderThreshold === null ? null : Number(p.reorderThreshold),
    maxStock: p.maxStock === null ? null : Number(p.maxStock),
  };
}

export function registerProductRoutes(app: FastifyInstance) {
  // Used by the POS product grid (search F3 + barcode scan) and the back-office product list.
  app.get("/products", { preHandler: authenticate }, async (request) => {
    const query = request.query as {
      search?: string;
      categoryId?: string;
      barcode?: string;
      branchId?: string;
      sellable?: string;
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? PAGE_SIZE_DEFAULT)));

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      // categoryId may be a comma-separated list (multi-select filter on the product list).
      ...(query.categoryId ? { categoryId: { in: query.categoryId.split(",").filter(Boolean) } } : {}),
      // POS only offers products marked "Bán trực tiếp"; the back-office list shows everything.
      ...(query.sellable === "true" ? { sellDirectly: true } : {}),
      ...(query.barcode ? { barcode: query.barcode } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { sku: { contains: query.search, mode: "insensitive" } },
              { barcode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // The 3 branches share a single physical warehouse, so tồn kho is the SUM
    // of a product's StockItem rows across every branch, not just whichever
    // branch the requesting user is currently on.
    const [data, total, stockValueRows] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          unit: true,
          stockItems: true,
          images: { select: imageSelect, orderBy: { createdAt: "asc" }, take: PRODUCT_IMAGE_LIMITS.maxPerProduct },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
      query.branchId
        ? prisma.stockItem.findMany({
            where: { product: where },
            select: { quantity: true, product: { select: { costPrice: true } } },
          })
        : Promise.resolve(null),
    ]);

    const totalStockValue = stockValueRows
      ? stockValueRows.reduce((sum, s) => sum + Number(s.quantity) * Number(s.product.costPrice), 0)
      : undefined;

    return {
      data: data.map(({ stockItems, ...p }) => ({
        ...toNumbers(p),
        stockQuantity: query.branchId
          ? stockItems.reduce((sum, s) => sum + Number(s.quantity), 0)
          : undefined,
      })),
      meta: { total, page, pageSize, totalStockValue },
    };
  });

  app.post(
    "/products",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const { initialStock, branchId, ...input } = productCreateSchema.parse(request.body);

      // A blank code is generated; retry a couple of times in case two creates race for the same one.
      for (let attempt = 0; attempt < 3; attempt++) {
        const sku = input.sku ?? (await generateProductCode());
        try {
          const product = await prisma.product.create({
            data: { ...input, sku, barcode: input.barcode || null },
            include: { unit: true, images: { select: imageSelect } },
          });
          if (initialStock && initialStock > 0 && branchId) {
            await createStockMovement(
              {
                type: "IMPORT",
                branchId,
                note: "Tồn kho ban đầu",
                lines: [{ productId: product.id, quantity: initialStock, unitCost: input.costPrice }],
              },
              request.authUser!.id,
            );
          }
          return reply.code(201).send({ ...toNumbers(product), stockQuantity: initialStock ?? 0 });
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          if (input.sku) return reply.code(409).send({ message: "Mã hàng đã tồn tại" });
        }
      }
      return reply.code(409).send({ message: "Không tạo được mã hàng tự động, vui lòng thử lại" });
    },
  );

  app.patch(
    "/products/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = productSchema.partial().parse(request.body);
      try {
        const product = await prisma.product.update({
          where: { id },
          data: input,
          include: { unit: true, images: { select: imageSelect } },
        });
        return toNumbers(product);
      } catch (error) {
        if (isUniqueViolation(error)) return reply.code(409).send({ message: "Mã hàng đã tồn tại" });
        throw error;
      }
    },
  );

  app.delete(
    "/products/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
      return { success: true };
    },
  );

  app.post(
    "/products/import",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request) => {
      const input = productImportInputSchema.parse(request.body);
      return importProducts(input.rows, input.branchId);
    },
  );

  // Product photos: raw-body upload like task attachments, small and capped (4 per product, 2 MB).
  app.post(
    "/products/:id/images",
    {
      preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)],
      bodyLimit: PRODUCT_IMAGE_LIMITS.maxBytes + 1024,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { filename } = request.query as { filename?: string };
      const mimeType = (request.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
      const data = request.body as Buffer;

      if (
        !(PRODUCT_IMAGE_LIMITS.allowedMimeTypes as readonly string[]).includes(mimeType) ||
        !Buffer.isBuffer(data) ||
        data.length === 0
      ) {
        return reply.code(415).send({ message: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP" });
      }
      if (data.length > PRODUCT_IMAGE_LIMITS.maxBytes) {
        return reply.code(413).send({ message: "Mỗi ảnh không quá 2 MB" });
      }
      const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!product) return reply.code(404).send({ message: "Không tìm thấy sản phẩm" });
      if ((await prisma.productImage.count({ where: { productId: id } })) >= PRODUCT_IMAGE_LIMITS.maxPerProduct) {
        return reply.code(400).send({ message: `Mỗi sản phẩm tối đa ${PRODUCT_IMAGE_LIMITS.maxPerProduct} ảnh` });
      }
      const image = await prisma.productImage.create({
        data: { productId: id, fileName: (filename || "anh").slice(0, 200), mimeType, size: data.length, data },
        select: imageSelect,
      });
      return reply.code(201).send(image);
    },
  );

  app.get("/product-images/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) return reply.code(404).send({ message: "Không tìm thấy ảnh" });
    return reply
      .header("Content-Type", image.mimeType)
      .header("Content-Length", image.size)
      .header("Cache-Control", "private, max-age=86400")
      .send(Buffer.from(image.data));
  });

  app.delete(
    "/product-images/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.productImage.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return reply.code(404).send({ message: "Không tìm thấy ảnh" });
      await prisma.productImage.delete({ where: { id } });
      return { success: true };
    },
  );

  app.get("/categories", { preHandler: authenticate }, async () => {
    const rows = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { deletedAt: null, isActive: true } } } } },
    });
    return { data: rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })) };
  });

  app.post(
    "/categories",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const input = categorySchema.parse(request.body);
      const category = await prisma.category.create({ data: input });
      return reply.code(201).send(category);
    },
  );

  app.get("/units", { preHandler: authenticate }, async () => {
    const data = await prisma.unit.findMany({ orderBy: { name: "asc" } });
    return { data };
  });

  app.post(
    "/units",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const input = unitSchema.parse(request.body);
      const unit = await prisma.unit.create({ data: input });
      return reply.code(201).send(unit);
    },
  );
}
