#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ECI HRM — Weekly Full Backup Script (Database + Files)
# ═══════════════════════════════════════════════════════════════
#
# Schedule with cron:
#   0 3 * * 0 /opt/eci-hrm/deploy/backup-full.sh   (every Sunday 3 AM)
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──
APP_DIR="/opt/eci-hrm"
BACKUP_DIR="/opt/eci-hrm/backups/full"
RETENTION_WEEKS=12

# ── Create backup directory ──
mkdir -p "$BACKUP_DIR"

# ── Timestamp ──
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
WEEKLY_DIR="$BACKUP_DIR/weekly_$TIMESTAMP"
mkdir -p "$WEEKLY_DIR"

echo "[$(date)] Starting full weekly backup..."

# ── 1. Database Backup ──
echo "[$(date)] Backing up database..."
if [ -f "$APP_DIR/.env" ]; then
    DB_PASS=$(grep DATABASE_URL "$APP_DIR/.env" | sed -n 's/.*:\([^:]*\)@.*/\1/p')
    DB_NAME="eci_hrm"
    DB_USER="hrm_user"

    PGPASSWORD="$DB_PASS" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean --if-exists --no-owner --no-privileges \
        2>>"$BACKUP_DIR/backup-errors.log" | gzip > "$WEEKLY_DIR/database.sql.gz"
    echo "[$(date)] Database backup complete."
else
    echo "[$(date)] WARNING: .env not found, skipping database backup."
fi

# ── 2. Application Files Backup ──
echo "[$(date)] Backing up application files..."
tar -czf "$WEEKLY_DIR/app-files.tar.gz" \
    --exclude="$APP_DIR/node_modules" \
    --exclude="$APP_DIR/.next/cache" \
    --exclude="$APP_DIR/backups" \
    -C "$(dirname $APP_DIR)" \
    "$(basename $APP_DIR)/.env" \
    "$(basename $APP_DIR)/prisma" \
    "$(basename $APP_DIR)/public" \
    2>>"$BACKUP_DIR/backup-errors.log"
echo "[$(date)] Application files backup complete."

# ── 3. Uploaded Documents (if any) ──
if [ -d "$APP_DIR/uploads" ]; then
    echo "[$(date)] Backing up uploaded documents..."
    tar -czf "$WEEKLY_DIR/uploads.tar.gz" -C "$APP_DIR" uploads/
    echo "[$(date)] Uploads backup complete."
fi

# ── Summary ──
TOTAL_SIZE=$(du -sh "$WEEKLY_DIR" | cut -f1)
echo "[$(date)] Full backup complete: $WEEKLY_DIR ($TOTAL_SIZE)"

# ── Rotate old weekly backups ──
find "$BACKUP_DIR" -maxdepth 1 -type d -name "weekly_*" -mtime +$((RETENTION_WEEKS * 7)) -exec rm -rf {} +
echo "[$(date)] Old weekly backups (>$RETENTION_WEEKS weeks) removed."