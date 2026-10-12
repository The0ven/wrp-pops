#!/usr/bin/env bash
# Apply pending Prisma migrations to $DATABASE_URL. The checked-in schema points at
# prisma/dev.db for local use, so a temporary copy points Prisma at the server database.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${DATABASE_URL:-}" ] || { echo "DATABASE_URL is not set" >&2; exit 1; }
tmp=prisma/schema.deploy.prisma
trap 'rm -f "$tmp"' EXIT
sed 's#url *= *"file:./dev.db"#url = env("DATABASE_URL")#' prisma/schema.prisma > "$tmp"
grep -q 'env("DATABASE_URL")' "$tmp" || { echo "Could not rewrite datasource url" >&2; exit 1; }
pnpm exec prisma migrate deploy --schema "$tmp"
