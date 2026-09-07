import { buildApp } from "./app.js";
import { config } from "./lib/config.js";

const app = buildApp();

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`SmartPOS API listening on port ${config.port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
