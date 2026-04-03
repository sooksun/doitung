#!/bin/sh
set -e

echo "====================================="
echo "  DOITUNG - DE System Starting..."
echo "====================================="

# Wait for database to be ready
echo "[1/4] Waiting for database connection..."
MAX_RETRIES=30
RETRY=0
until echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Cannot connect to database after $MAX_RETRIES retries"
    exit 1
  fi
  echo "  Database not ready, retrying ($RETRY/$MAX_RETRIES)..."
  sleep 3
done

echo "[2/4] Running database migrations..."
npx prisma db push --accept-data-loss 2>&1 || echo "  Migration warning (continuing)"

echo "[3/4] Checking seed data..."
SEED_CHECK=$(echo "SELECT COUNT(*) FROM User" | npx prisma db execute --stdin 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
if [ -z "$SEED_CHECK" ] || [ "$SEED_CHECK" = "0" ]; then
  echo "  Seeding initial data..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    async function seed() {
      const hash = await bcrypt.hash('Admin123', 10);
      await prisma.user.upsert({
        where: { email: 'admin@local' },
        update: {},
        create: { email: 'admin@local', password: hash, name: 'Administrator', isActive: true }
      });
      console.log('Default admin created: admin@local / Admin123');
      await prisma.\$disconnect();
    }
    seed().catch(e => { console.error(e); process.exit(1); });
  " || echo "  Seed skipped"
else
  echo "  Data exists ($SEED_CHECK users), skipping seed"
fi

echo "[4/4] Starting Next.js application on port ${PORT:-9901}..."
echo "====================================="

exec node server.js
