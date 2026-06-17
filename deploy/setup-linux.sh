#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ECI HRM — Linux Server Setup Script (Ubuntu 22.04/24.04)
# ═══════════════════════════════════════════════════════════════
#
# Run as root or with sudo:
#   sudo bash setup-linux.sh
#
# This script installs all dependencies and prepares the server.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ECI HRM — Production Server Setup (Linux)          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ── 1. System Update ──
echo "[1/8] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install Node.js 22.x LTS ──
echo "[2/8] Installing Node.js 22.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
echo "   Node.js: $(node --version)"
echo "   npm:     $(npm --version)"

# ── 3. Install PostgreSQL 16 ──
echo "[3/8] Installing PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    apt-get update -y
    apt-get install -y postgresql-16 postgresql-client-16
fi
echo "   PostgreSQL: $(psql --version)"

# ── 4. Configure PostgreSQL ──
echo "[4/8] Configuring PostgreSQL database and user..."
DB_PASSWORD="ECI_HRM_DB_$(openssl rand -hex 12)"
sudo -u postgres psql <<EOF
CREATE USER hrm_user WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE eci_hrm OWNER hrm_user;
GRANT ALL PRIVILEGES ON DATABASE eci_hrm TO hrm_user;
\c eci_hrm
GRANT ALL ON SCHEMA public TO hrm_user;
EOF
echo "   Database: eci_hrm"
echo "   User: hrm_user"
echo "   Password: ${DB_PASSWORD}"
echo "   IMPORTANT: Save this password! You will need it for .env"

# ── 5. Install Nginx ──
echo "[5/8] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi
echo "   Nginx: $(nginx -v 2>&1)"

# ── 6. Install PM2 ──
echo "[6/8] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "   PM2: $(pm2 --version)"

# ── 7. Install Git ──
echo "[7/8] Installing Git..."
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi
echo "   Git: $(git --version)"

# ── 8. Install useful tools ──
echo "[8/8] Installing backup tools..."
apt-get install -y gzip tar cron

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Server setup complete!                              ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  PostgreSQL Password: ${DB_PASSWORD}"
echo "║                                                       ║"
echo "║  Next steps:                                          ║"
echo "║  1. Clone repo: git clone https://github.com/ECI-HRM/HRM.git /opt/eci-hrm"
echo "║  2. cd /opt/eci-hrm && cp .env.example .env           ║"
echo "║  3. Edit .env with the DB password above              ║"
echo "║  4. npm install && npx prisma generate               ║"
echo "║  5. npx prisma db push                                ║"
echo "║  6. npm run build                                     ║"
echo "║  7. Run: curl -X POST http://localhost:3000/api/seed?mode=production"
echo "║  8. pm2 start ecosystem.config.json                   ║"
echo "║  9. Configure Nginx (copy deploy/nginx-eci-hrm.conf)  ║"
echo "╚═══════════════════════════════════════════════════════╝"