import { buildApp } from "./app.js";
import { config } from "./lib/config.js";
import { initSessionState } from "./lib/session-state.js";

const app = buildApp();

const INIT_TIMEOUT_MS = 20_000;
const INIT_RETRY_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Records this deploy's version so sessions from the previous deploy stop being accepted. Retries until
// the database answers; a database that hangs must never keep the whole server from listening (a silent
// hang here once left the API unreachable with no log line explaining why).
async function recordDeployVersion(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await withTimeout(initSessionState(), INIT_TIMEOUT_MS, "initSessionState (database)");
      app.log.info(`Session state ready (attempt ${attempt})`);
      return;
    } catch (error) {
      app.log.error({ err: error, attempt }, "Database not ready, will retry");
      await new Promise((resolve) => setTimeout(resolve, INIT_RETRY_MS));
    }
  }
}

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`SmartPOS API listening on port ${config.port}`);
    return recordDeployVersion();
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
