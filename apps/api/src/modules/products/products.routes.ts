import type { FastifyInstance } from "fastify";
import { PERMISSIONS, productSchema, categorySchema, unitSchema, productImportInputSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { importProducts, purgeAllProducts } from "./products.service.js";

const PAGE_SIZE_DEFAULT = 24;

export function registerProductRoutes(app: FastifyInstance) {
  // Used by the POS product grid (search F3 + barcode scan) and the back-office product list.
  app.get("/products", { preHandler: authenticate }, async (request) => {
    const query = request.query as {
      search?: string;
      categoryId?: string;
      barcode?: string;
      branchId?: string;
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? PAGE_SIZE_DEFAULT)));

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          unit: true,
          stockItems: { where: { branchId: query.branchId ?? "" } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: data.map(({ stockItems, ...p }) => ({
        ...p,
        costPrice: Number(p.costPrice),
        sellPrice: Number(p.sellPrice),
        stockQuantity: query.branchId ? Number(stockItems?.[0]?.quantity ?? 0) : undefined,
      })),
      meta: { total, page, pageSize },
    };
  });

  app.post(
    "/products",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request, reply) => {
      const input = productSchema.parse(request.body);
      const product = await prisma.product.create({ data: input });
      return reply.code(201).send(product);
    },
  );

  app.patch(
    "/products/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = productSchema.partial().parse(request.body);
      return prisma.product.update({ where: { id }, data: input });
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

  // TEMPORARY: one-time cleanup before importing the user's real catalog.
  // Hard-deletes every product plus everything that references one
  // (invoices, payments, stock movements, stock items). Remove this route
  // once used — it is not meant to ship.
  app.post(
    "/products/purge-all",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)] },
    async (request) => {
      const body = request.body as { confirm?: string };
      if (body.confirm !== "XOA_HET_SAN_PHAM") {
        return { error: "Thiếu xác nhận" };
      }
      return purgeAllProducts();
    },
  );

  app.get("/categories", { preHandler: authenticate }, async () => {
    const data = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return { data };
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
