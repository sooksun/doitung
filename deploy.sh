#!/bin/bash
# =============================================================
#  deploy.sh — DOITUNG DE System Deployment Script
#  Server: /DATA/AppData/www/doitung
#  URL:    https://doitung.cnppai.com | http://203.172.184.47:9901
# =============================================================
set -e

APP_DIR="/DATA/AppData/www/doitung"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DOITUNG — DE System Deployment         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Go to app directory ──────────────────────────────────────
cd "$APP_DIR"

# ── Pull latest code from GitHub ────────────────────────────
echo "[1/5] Pulling latest code from GitHub..."
if [ -d ".git" ]; then
  git pull origin main
else
  echo "  Not a git repo — cloning fresh..."
  cd /DATA/AppData/www
  git clone https://github.com/sooksun/doitung.git doitung
  cd doitung
fi

# ── Stop old containers (keep DB running) ───────────────────
echo "[2/5] Stopping app container..."
docker compose -f "$COMPOSE_FILE" stop app 2>/dev/null || true
docker rm -f eqap_app 2>/dev/null || true

# ── Remove old image to force rebuild ───────────────────────
echo "[3/5] Removing old image..."
docker rmi doitung-app 2>/dev/null || true

# ── Build new image ──────────────────────────────────────────
echo "[4/5] Building new Docker image (this may take a few minutes)..."
docker compose -f "$COMPOSE_FILE" build --no-cache app

# ── Start all services ───────────────────────────────────────
echo "[5/5] Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# ── Health check ─────────────────────────────────────────────
echo ""
echo "Waiting for app to start (30s)..."
sleep 30

STATUS=$(docker inspect --format='{{.State.Health.Status}}' eqap_app 2>/dev/null || echo "unknown")
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Deployment Complete!           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Container status : $STATUS"
echo "  Local URL        : http://localhost:9901"
echo "  Public URL       : https://doitung.cnppai.com"
echo "  Alt URL          : http://203.172.184.47:9901"
echo ""
echo "  Logs: docker logs -f eqap_app"
echo ""
