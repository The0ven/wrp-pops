#!/usr/bin/env bash
# Redeploy the tracker on the server: backup, pull, install, migrate, build, restart.
# Wrapped in main() so bash parses everything before git pull can rewrite this file.
set -euo pipefail
main() {
  cd "$(dirname "$0")/.."
  set -a
  . /etc/wrp-pops.env
  set +a
  systemctl stop wrp-pops.service || true
  trap 'systemctl start wrp-pops.service' EXIT
  deploy/backup.sh pre-update
  git pull --ff-only
  pnpm install --frozen-lockfile
  deploy/migrate.sh
  pnpm exec prisma generate
  pnpm build
}
main "$@"
