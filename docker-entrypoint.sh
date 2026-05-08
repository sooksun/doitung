#!/bin/sh
set -e

echo "====================================="
echo "  DOITUNG - DE System Starting..."
echo "====================================="

# Wait for database TCP port to be ready
echo "[1/4] Waiting for database connection (eqap_db:3306)..."
MAX_RETRIES=40
RETRY=0
until node -e "
  const net = require('net');
  const c = new net.Socket();
  c.setTimeout(2000);
  c.connect(3306, 'eqap_db', () => { c.destroy(); process.exit(0); });
  c.on('error', () => { c.destroy(); process.exit(1); });
  c.on('timeout', () => { c.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Cannot connect to eqap_db:3306 after $MAX_RETRIES retries"
    exit 1
  fi
  echo "  Waiting for DB... ($RETRY/$MAX_RETRIES)"
  sleep 2
done
echo "  Database is reachable!"

echo "[2/5] Deduping legacy StickyBoard rows (must run before db push)..."
# StickyBoard gained a @@unique([contextType, contextId]) constraint. Any
# duplicates left over from the earlier non-unique implementation would make
# the next `prisma db push` fail. The script is idempotent — it exits in a
# few ms when there are no duplicates.
node /app/scripts/dedupe-sticky-boards.js || echo "  Dedupe warning (continuing — db push will surface any remaining issue)"

echo "[3/6] Running database migrations..."
npx prisma db push --schema /app/schema.prisma --accept-data-loss 2>&1 || echo "  Migration warning (continuing)"

echo "[4/6] Converging Q-Model instrument set..."
# Idempotent. Collapses legacy Q_MODEL + duplicate Q-MODEL-2568 rows into a
# single canonical instrument so the seed step below can predictably create
# the 4 sections + 47 indicators (with rubrics) on it. See the script header
# for the full history this fixes.
node /app/scripts/migrate-q-model-instrument.js || echo "  Q-Model migration warning (continuing — seed will surface remaining issues)"

echo "[5/6] Seeding initial data..."
node /app/scripts/seed-production.js || echo "  Seed warning (continuing)"

echo "[6/6] Starting Next.js on port ${PORT:-9901}..."
echo "====================================="

exec node server.js
