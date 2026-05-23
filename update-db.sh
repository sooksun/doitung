#!/usr/bin/env bash
# =============================================================
#  update-db.sh — DOITUNG DE: one-shot production DB updater
#
#  Run ON THE SERVER from /DATA/AppData/www/doitung AFTER `eqap_app` is
#  up with the new image (i.e. after `bash deploy.sh`). It orchestrates
#  the containers via `docker exec` because schema.prisma + scripts are
#  baked into the eqap_app image, not mounted from the host.
#
#  Unlike docker-entrypoint.sh (which swallows db-push/seed errors with
#  `|| echo warning`), this script is fail-loud: any real error aborts.
#
#  Steps:  0) backup  1) prisma db push (schema)  2) seed THAI_P1_3  3) verify
#  One-off data migrations (split-section / teacher-pair) are OPT-IN.
#
#  Usage:
#    bash update-db.sh                       # backup + db push + seed + verify
#    SKIP_BACKUP=1 bash update-db.sh         # skip the mariadb-dump step
#    RUN_THAI_MIGRATION=1 bash update-db.sh  # also run one-off data migrations
#
#  Overridable env: APP_CONTAINER, DB_CONTAINER, DB_NAME, DB_USER, DB_PASS
# =============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

APP="${APP_CONTAINER:-eqap_app}"
DB="${DB_CONTAINER:-eqap_db}"
DB_NAME="${DB_NAME:-okrsdoitung}"
DB_USER="${DB_USER:-doitung_user}"
DB_PASS="${DB_PASS:-doitung_pass}"
SCHEMA="/app/schema.prisma"

dbq() { docker exec "$DB" mariadb -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" "$@"; }

echo "=== DOITUNG DB update ==="
echo "  app=$APP  db=$DB  database=$DB_NAME"

# ── pre-flight: both containers must be running ─────────────
for c in "$APP" "$DB"; do
  if ! docker ps --format '{{.Names}}' | grep -qx "$c"; then
    echo "ERROR: container '$c' is not running. Deploy first (bash deploy.sh)." >&2
    exit 1
  fi
done

# ── 0) backup (consistent InnoDB snapshot, no LOCK TABLES needed) ──
if [ "${SKIP_BACKUP:-0}" = "1" ]; then
  echo "[0/4] Backup skipped (SKIP_BACKUP=1)"
else
  echo "[0/4] Backing up '$DB_NAME' ..."
  mkdir -p backup
  BACKUP="backup/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
  docker exec "$DB" sh -c "mariadb-dump --single-transaction -u$DB_USER -p$DB_PASS $DB_NAME" > "$BACKUP"
  if [ ! -s "$BACKUP" ]; then
    echo "ERROR: backup file is empty: $BACKUP" >&2
    exit 1
  fi
  echo "  saved: $BACKUP ($(du -h "$BACKUP" | cut -f1))"
fi

# ── 1) schema push (additive only) ──────────────────────────
echo "[1/4] prisma db push — adds evaluatorKind / reflection / Evidence.sectionId ..."
docker exec "$APP" npx prisma db push --schema "$SCHEMA" --accept-data-loss

# ── 2) seed THAI_P1_3 (idempotent) ──────────────────────────
echo "[2/4] Seeding THAI_P1_3 (idempotent) ..."
docker exec "$APP" node /app/scripts/seed-production.js

# ── 3) verify ───────────────────────────────────────────────
echo "[3/4] Verifying ..."
FAIL=0
check_col() {
  local table="$1" col="$2" out
  out="$(dbq -N -e "SHOW COLUMNS FROM \`$table\` LIKE '$col';" 2>/dev/null || true)"
  if [ -z "$out" ]; then echo "  MISSING  $table.$col"; FAIL=1; else echo "  OK       $table.$col"; fi
}
check_col EvaluationSession evaluatorKind
check_col EvaluationSession reflection
check_col Evidence sectionId

echo "  THAI_P1_3 (expect sections=5 / indicators=50):"
dbq -t -e "
  SELECT COUNT(DISTINCT s.id) AS sections, COUNT(ind.id) AS indicators
  FROM Instrument i
  LEFT JOIN InstrumentSection s ON s.instrumentId = i.id
  LEFT JOIN Indicator ind        ON ind.sectionId  = s.id
  WHERE i.type = 'THAI_P1_3';" 2>/dev/null || echo "  (verify query failed — check manually)"

# ── 4) one-off data migrations (OPT-IN) ─────────────────────
if [ "${RUN_THAI_MIGRATION:-0}" = "1" ]; then
  echo "[4/4] Running one-off THAI data migrations ..."
  docker exec "$APP" node /app/scripts/migrate-thai-split-section.js
  docker exec "$APP" node /app/scripts/migrate-thai-teacher-pairs.js
else
  echo "[4/4] One-off data migrations skipped (set RUN_THAI_MIGRATION=1 to run)."
  echo "      Only needed if prod already had THAI sessions BEFORE this release."
fi

if [ "$FAIL" = "1" ]; then
  echo "=== DONE WITH ERRORS: a column is missing — review the db-push output above ===" >&2
  exit 1
fi
echo "=== DB update complete ==="
