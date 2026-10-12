import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Refuse to initialize any path outside the disposable test directory.
export function createTestDatabase(filename) {
  const path = resolve(filename);
  const root = resolve(".test-data");
  if (!path.startsWith(root + "/") && !path.startsWith(root + "\\"))
    throw new Error("Tests must use .test-data");
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    for (const migration of readdirSync("prisma/migrations")
      .filter((name) => /^\d/.test(name))
      .sort()) {
      db.exec(
        readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    }
  } finally {
    db.close();
  }
  return `file:${path.replaceAll("\\", "/")}`;
}
