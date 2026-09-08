import {
  closeAllBrowserSessions,
  createBrowserSession,
  describeBrowser,
} from "@elektro-brudi/browser";
import { openDatabase } from "@elektro-brudi/storage";
import { ensureRuntimeDirectories, resolveRuntimeConfig } from "./paths.ts";
import { buildServer } from "./server.ts";
import { createRequestPolicy } from "./url-policy.ts";

const config = resolveRuntimeConfig();
ensureRuntimeDirectories(config.paths);
const database = openDatabase(config.paths.databasePath);
const app = buildServer({
  config,
  database,
  createSession: (target) =>
    createBrowserSession({
      allowRequest: createRequestPolicy(),
      // Pin the validated navigation target to the address that passed the
      // policy; Chromium then cannot be rebound to another address for it.
      hostResolverRules: target.addresses[0]
        ? [`MAP ${target.url.hostname} ${target.addresses[0]}`]
        : [],
      blockLocalNetworkAccess: true,
    }),
  describeBrowser,
  logger: { level: "info", file: config.paths.logFile },
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, "server shutting down");
  // Hard deadline: the launcher force-kills after 20 s; leave a margin.
  const deadline = setTimeout(() => process.exit(0), 10_000);
  deadline.unref();
  try {
    await closeAllBrowserSessions();
    await app.close();
  } catch (error) {
    app.log.error({ err: error }, "shutdown step failed");
  }
  database.close();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  const address = await app.listen({ host: config.host, port: config.port });
  app.log.info({ address, pid: process.pid }, "server listening");
  process.stdout.write(`ElektroBrudi server listening on ${address}\n`);
} catch (error) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "EADDRINUSE") {
    const message = `Port ${config.port} on ${config.host} is already in use. Stop the other process; ElektroBrudi does not use another port.`;
    app.log.error(message);
    process.stderr.write(`${message}\n`);
    database.close();
    process.exit(2);
  }
  app.log.error({ err: error }, "server failed to start");
  process.stderr.write(
    `ElektroBrudi server failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  database.close();
  process.exit(1);
}
