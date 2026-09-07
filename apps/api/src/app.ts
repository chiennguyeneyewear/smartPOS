import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { config } from "./lib/config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerBranchRoutes } from "./modules/branches/branches.routes.js";
import { registerCustomerRoutes } from "./modules/customers/customers.routes.js";
import { registerInventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { registerProductRoutes } from "./modules/products/products.routes.js";
import { registerReportRoutes } from "./modules/reports/reports.routes.js";
import { registerSalesRoutes } from "./modules/sales/sales.routes.js";
import { registerSupplierRoutes } from "./modules/suppliers/suppliers.routes.js";
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
    origin: config.corsOrigin,
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
      registerAuthRoutes(api);
      registerBranchRoutes(api);
      registerUserRoutes(api);
      registerProductRoutes(api);
      registerInventoryRoutes(api);
      registerCustomerRoutes(api);
      registerSupplierRoutes(api);
      registerSalesRoutes(api);
      registerReportRoutes(api);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
