#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ECI HRM — Daily Database Backup Script
# ═══════════════════════════════════════════════════════════════
#
# Schedule with cron (Linux) or Task Scheduler (Windows):
#   Linux:   0 2 * * * /opt/eci-hrm/deploy/backup-db.sh
#   Windows: Create a Scheduled Task running this daily at 2:00 AM
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──
APP_DIR="/opt/eci-hrm"
BACKUP_DIR="/opt/eci-hrm/backups/db"
DB_NAME="eci_hrm"
DB_USER="hrm_user"
RETENTION_DAYS=30

# Read password from .env
if [ -f "$APP_DIR/.env" ]; then
    DB_PASS=$(grep DATABASE_URL "$APP_DIR/.env" | sed -n 's/.*:\([^:]*\)@.*/\1/p')
else
    echo "ERROR: .env file not found at $APP_DIR/.env"
    exit 1
fi

# ── Create backup directory ──
mkdir -p "$BACKUP_DIR"

# ── Generate filename with timestamp ──
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/eci_hrm_$TIMESTAMP.sql.gz"

# ── Perform backup ──
echo "[$(date)] Starting database backup..."

PGPASSWORD="$DB_PASS" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    2>>"$BACKUP_DIR/backup-errors.log" | gzip > "$BACKUP_FILE"

# ── Verify backup ──
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup successful: $BACKUP_FILE ($FILE_SIZE)"
else
    echo "[$(date)] ERROR: Backup file is empty or missing!"
    exit 1
fi

# ── Rotate old backups ──
find "$BACKUP_DIR" -name "eci_hrm_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups (>$RETENTION_DAYS days) removed."

echo "[$(date)] Database backup complete."