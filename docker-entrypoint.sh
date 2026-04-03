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

echo "[2/4] Running database migrations..."
npx prisma db push --schema /app/schema.prisma --accept-data-loss 2>&1 || echo "  Migration warning (continuing)"

echo "[3/4] Seeding initial data..."
node /app/scripts/seed-production.js || echo "  Seed warning (continuing)"

echo "[4/4] Starting Next.js on port ${PORT:-9901}..."
echo "====================================="

exec node server.js
