#!/usr/bin/env bash
# Usage: deploy/backup.sh [label]. Writes a verified copy and prunes old ones.
set -euo pipefail
DB="${DATABASE_URL#file:}"
DIR="${BACKUP_DIR:-/var/lib/wrp-pops/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
[ -f "$DB" ] || { echo "Database not found: $DB" >&2; exit 1; }
mkdir -p "$DIR"
out="$DIR/tracker-$(date +%Y%m%d-%H%M%S)${1:+-$1}.db"
/usr/local/bin/node --no-warnings "$(dirname "$0")/backup-db.mjs" "$DB" "$out"
find "$DIR" -name 'tracker-*.db' -mtime +"$KEEP_DAYS" -delete
echo "$out"
