import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { config } from "./lib/config.js";
import { registerPreorderRoutes } from "./modules/preorders/preorders.routes.js";
import { bumpChangeEpoch } from "./lib/session-state.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerBranchRoutes } from "./modules/branches/branches.routes.js";
import { registerCustomerRoutes } from "./modules/customers/customers.routes.js";
import { registerInventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { registerProductRoutes } from "./modules/products/products.routes.js";
import { registerReportRoutes } from "./modules/reports/reports.routes.js";
import { registerSalesRoutes } from "./modules/sales/sales.routes.js";
import { registerSupplierRoutes } from "./modules/suppliers/suppliers.routes.js";
import {
  registerEmployeeRoutes,
  registerTaskAttachmentRoutes,
  registerTaskBranchRoutes,
  registerTaskRoutes,
} from "./modules/tasks/tasks.routes.js";
import { registerUserRoutes } from "./modules/users/users.routes.js";

export function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty" } }
        : true,
  });

  app.register(helmet);
  app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });
  app.register(cookie);
  app.register(jwt, {
    secret: config.jwt.accessSecret,
  });
  app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(
    async (api) => {
      // Raw image/video bodies for the file upload endpoints (tasks, products).
      api.addContentTypeParser(/^(image|video)\//, { parseAs: "buffer", bodyLimit: 30 * 1024 * 1024 }, (_req, body, done) =>
        done(null, body),
      );
      // When an admin changes accounts, permissions or branches, every non-admin session is ended so
      // the new settings apply immediately (they must sign in again).
      api.addHook("onResponse", async (request, reply) => {
        if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
        if (reply.statusCode >= 400 || request.authUser?.role !== "admin") return;
        const path = request.url.split("?")[0] ?? "";
        if (path.startsWith("/api/v1/users") || path.startsWith("/api/v1/branches")) {
          await bumpChangeEpoch().catch((error) => request.log.error(error));
        }
      });
      registerAuthRoutes(api);
      registerBranchRoutes(api);
      registerUserRoutes(api);
      registerProductRoutes(api);
      registerInventoryRoutes(api);
      registerCustomerRoutes(api);
      registerSupplierRoutes(api);
      registerSalesRoutes(api);
      registerPreorderRoutes(api);
      registerReportRoutes(api);
      registerEmployeeRoutes(api);
      registerTaskBranchRoutes(api);
      registerTaskRoutes(api);
      registerTaskAttachmentRoutes(api);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
