// Online-safe SQLite copy: VACUUM INTO works while the tracker is running.
import { DatabaseSync } from "node:sqlite";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  console.error("usage: node backup-db.mjs <source.db> <destination.db>");
  process.exit(2);
}
const db = new DatabaseSync(source, { readOnly: true });
try {
  db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`);
} finally {
  db.close();
}
const copy = new DatabaseSync(destination, { readOnly: true });
const result = copy.prepare("pragma integrity_check").get();
copy.close();
if (result.integrity_check !== "ok") {
  console.error(`Backup failed integrity check: ${result.integrity_check}`);
  process.exit(1);
}
