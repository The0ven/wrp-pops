import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database.mjs";
const url = createTestDatabase(`.test-data/browser-${randomUUID()}.db`);
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url,
      NEXT_DIST_DIR: ".next-test",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
