import { buildApp } from "./app.js";
import { config } from "./lib/config.js";
import { initSessionState } from "./lib/session-state.js";

const app = buildApp();

// Records this deploy's version first, so sessions from the previous deploy stop being accepted.
initSessionState()
  .then(() => app.listen({ port: config.port, host: "0.0.0.0" }))
  .then(() => {
    app.log.info(`SmartPOS API listening on port ${config.port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
