import { mkdtemp, rm } from "node:fs/promises";
import { connect } from "node:net";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "@elektro-brudi/storage";
import { describe, expect, it } from "vitest";
import { resolveRuntimeConfig } from "../src/paths.js";
import { buildServer } from "../src/server.js";

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== undefined && entry.family === "IPv4" && !entry.internal,
    )
    .map((entry) => entry.address);
}

function canConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: 1_000 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

describe("loopback binding", () => {
  it("listens only on 127.0.0.1", async () => {
    const directory = await mkdtemp(join(tmpdir(), "elektro-brudi-loopback-"));
    const config = resolveRuntimeConfig(
      {
        ELEKTROBRUDI_APP_SUPPORT_DIR: join(directory, "support"),
        ELEKTROBRUDI_LOG_DIR: join(directory, "logs"),
        ELEKTROBRUDI_WEB_DIST: join(directory, "missing"),
        ELEKTROBRUDI_PORT: "0",
      },
      directory,
    );
    const database = openDatabase(config.paths.databasePath);
    const app = buildServer({
      config,
      database,
      createSession: () => Promise.reject(new Error("not used")),
      describeBrowser: () => {
        throw new Error("not used");
      },
    });

    try {
      await app.listen({ host: config.host, port: config.port });
      const addresses = app.addresses();
      expect(addresses).toHaveLength(1);
      expect(addresses[0]?.address).toBe("127.0.0.1");
      const port = addresses[0]!.port;

      expect(await canConnect("127.0.0.1", port)).toBe(true);
      expect(await canConnect("::1", port)).toBe(false);
      for (const address of lanAddresses()) {
        expect(await canConnect(address, port)).toBe(false);
      }
    } finally {
      await app.close();
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("defaults to port 47831 on loopback", () => {
    const config = resolveRuntimeConfig({}, "/Users/proof");
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(47_831);
    expect(config.paths.databasePath).toBe(
      "/Users/proof/Library/Application Support/ElektroBrudi/data.sqlite",
    );
    expect(config.paths.snapshotsDir).toBe(
      "/Users/proof/Library/Application Support/ElektroBrudi/snapshots",
    );
    expect(config.paths.logFile).toBe(
      "/Users/proof/Library/Logs/ElektroBrudi/server.log",
    );
  });
});
