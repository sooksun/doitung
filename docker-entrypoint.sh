#!/bin/sh
set -e

echo "====================================="
echo "  DOITUNG - DE System Starting..."
echo "====================================="

# Wait for database to be ready
echo "[1/4] Waiting for database connection..."
MAX_RETRIES=30
RETRY=0
until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
  echo "  Database not ready, retrying ($RETRY/$MAX_RETRIES)..."
  sleep 2
  RETRY=$((RETRY + 1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "ERROR: Cannot connect to database after $MAX_RETRIES retries"
  exit 1
fi

echo "[2/4] Running database migrations..."
npx prisma db push --accept-data-loss || echo "  Migration warning (continuing)"

echo "[3/4] Checking seed data..."
SEED_CHECK=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM User" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
if [ "$SEED_CHECK" = "0" ] || [ -z "$SEED_CHECK" ]; then
  echo "  Seeding initial data..."
  npx ts-node --project tsconfig.json prisma/seed.ts 2>/dev/null || \
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
    }
    seed().then(() => prisma.\$disconnect()).catch(e => { console.error(e); prisma.\$disconnect(); });
  " || echo "  Seed skipped (tables may not exist yet)"
else
  echo "  Data already exists ($SEED_CHECK users found), skipping seed"
fi

echo "[4/4] Starting Next.js application..."
echo "  URL: http://0.0.0.0:${PORT:-9901}"
echo "====================================="

exec node server.js
