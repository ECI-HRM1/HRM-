@echo off
REM ═══════════════════════════════════════════════════════════════
REM ECI HRM — Daily Database Backup (Windows)
REM ═══════════════════════════════════════════════════════════════
REM Schedule: Task Scheduler → Create Basic Task → Daily 2:00 AM
REM   Program: C:\ECI-HRM\deploy\backup-db.bat
REM ═══════════════════════════════════════════════════════════════

set APP_DIR=C:\ECI-HRM
set BACKUP_DIR=C:\ECI-HRM\backups\db
set TIMESTAMP=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\eci_hrm_%TIMESTAMP%.sql.gz

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Read DB credentials from .env (simplified - adjust PGPASSWORD path)
REM For Windows, set PGPASSWORD environment variable or use pgpass.conf
set PGPASSWORD=CHANGE_ME_STRONG_PASSWORD

REM Perform backup
echo [%date% %time%] Starting database backup...
pg_dump -U hrm_user -d eci_hrm --clean --if-exists --no-owner --no-privileges 2>>"%BACKUP_DIR%\backup-errors.log" | gzip > "%BACKUP_FILE%"

if exist "%BACKUP_FILE%" (
    echo [%date% %time%] Backup successful: %BACKUP_FILE%
) else (
    echo [%date% %time%] ERROR: Backup failed!
)

REM Clean up backups older than 30 days
forfiles /p "%BACKUP_DIR%" /m eci_hrm_*.sql.gz /d -30 /c "cmd /c del @path" 2>nul
echo [%date% %time%] Backup complete.