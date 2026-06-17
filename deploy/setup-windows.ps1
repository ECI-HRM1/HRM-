# ═══════════════════════════════════════════════════════════════
# ECI HRM — Windows Server Setup Script (PowerShell)
# ═══════════════════════════════════════════════════════════════
#
# Run as Administrator in PowerShell:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\deploy\setup-windows.ps1
#
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  ECI HRM - Production Server Setup (Windows)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$InstallDir = "C:\ECI-HRM"

# ── 1. Check/Install Node.js ──
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "   Downloading Node.js 22.x LTS installer..."
    $nodeUrl = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi"
    $nodeMsi = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn" -Wait
    Remove-Item $nodeMsi -Force
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "   Node.js: $(node --version)"
Write-Host "   npm:     $(npm --version)"

# ── 2. Check/Install PostgreSQL ──
Write-Host "[2/6] Checking PostgreSQL..." -ForegroundColor Yellow
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "   Downloading PostgreSQL 16 installer..."
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.9-1-windows-x64.exe"
    $pgExe = "$env:TEMP\postgresql-installer.exe"
    Invoke-WebRequest -Uri $pgUrl -OutFile $pgExe

    $dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object {[char]$_})
    $unattendedArgs = "--mode unattended", "--superpassword `"$dbPassword`"", "--servicepassword `"$dbPassword`"", "--serverport 5432", "--locale C"
    Start-Process $pgExe -ArgumentList $unattendedArgs -Wait
    Remove-Item $pgExe -Force

    $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
    Write-Host ""
    Write-Host "   !!! IMPORTANT: PostgreSQL superuser password: $dbPassword" -ForegroundColor Red
    Write-Host "   !!! Save this password! You need it to create the database." -ForegroundColor Red
} else {
    Write-Host "   PostgreSQL: $(psql --version)"
}

# ── 3. Check/Install Git ──
Write-Host "[3/6] Checking Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "   Downloading Git installer..."
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe"
    $gitExe = "$env:TEMP\git-installer.exe"
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitExe
    Start-Process $gitExe -ArgumentList "/VERYSILENT /NORESTART" -Wait
    Remove-Item $gitExe -Force
    $env:Path += ";C:\Program Files\Git\cmd"
}
Write-Host "   Git: $(git --version)"

# ── 4. Check/Install NSSM (Service Manager) ──
Write-Host "[4/6] Checking NSSM (Node.js Service Manager)..." -ForegroundColor Yellow
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    Write-Host "   Downloading NSSM..."
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = "$env:TEMP\nssm.zip"
    Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
    Expand-Archive $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
    Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" "C:\Windows\nssm.exe" -Force
    Remove-Item $nssmZip -Force
    Remove-Item "$env:TEMP\nssm" -Recurse -Force
}
Write-Host "   NSSM: Installed"

# ── 5. Create project directory ──
Write-Host "[5/6] Preparing project directory..." -ForegroundColor Yellow
if (-not (Test-Path $InstallDir)) {
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
    Write-Host "   Created: $InstallDir"
}

# ── 6. Create log directory ──
Write-Host "[6/6] Creating log directories..." -ForegroundColor Yellow
$logDir = "$InstallDir\logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Windows setup complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create PostgreSQL database:" -ForegroundColor White
Write-Host "     Open pgAdmin or psql and run:" -ForegroundColor Gray
Write-Host "       CREATE USER hrm_user WITH PASSWORD 'your_secure_password';" -ForegroundColor Cyan
Write-Host "       CREATE DATABASE eci_hrm OWNER hrm_user;" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Clone the repository:" -ForegroundColor White
Write-Host "       cd C:\ECI-HRM" -ForegroundColor Cyan
Write-Host "       git clone https://github.com/ECI-HRM/HRM.git ." -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Configure environment:" -ForegroundColor White
Write-Host "       copy .env.example .env" -ForegroundColor Cyan
Write-Host "       notepad .env  (edit DATABASE_URL and ADMIN settings)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Install and build:" -ForegroundColor White
Write-Host "       npm install" -ForegroundColor Cyan
Write-Host "       npx prisma generate" -ForegroundColor Cyan
Write-Host "       npx prisma db push" -ForegroundColor Cyan
Write-Host "       npm run build" -ForegroundColor Cyan
Write-Host ""
Write-Host "  5. Seed production data:" -ForegroundColor White
Write-Host "       Start server temporarily: node .next/standalone/server.js" -ForegroundColor Cyan
Write-Host "       In another terminal:" -ForegroundColor Gray
Write-Host "       Invoke-RestMethod -Method POST http://localhost:3000/api/seed?mode=production" -ForegroundColor Cyan
Write-Host ""
Write-Host "  6. Register as Windows Service:" -ForegroundColor White
Write-Host "       nssm install ECI-HRM ""C:\Program Files\nodejs\node.exe""" -ForegroundColor Cyan
Write-Host '       nssm set ECI-HRM AppParameters "C:\ECI-HRM\.next\standalone\server.js"' -ForegroundColor Cyan
Write-Host '       nssm set ECI-HRM AppDirectory "C:\ECI-HRM"' -ForegroundColor Cyan
Write-Host "       nssm set ECI-HRM DisplayName ""ECI HRM Performance Appraisal""" -ForegroundColor Cyan
Write-Host "       nssm set ECI-HRM Start SERVICE_AUTO_START" -ForegroundColor Cyan
Write-Host "       nssm set ECI-HRM ObjectName LocalSystem" -ForegroundColor Cyan
Write-Host "       nssm set ECI-HRM AppEnvironmentExtra DATABASE_URL=""your_connection_string""" -ForegroundColor Cyan
Write-Host "       nssm start ECI-HRM" -ForegroundColor Cyan
Write-Host ""
Write-Host "  7. Configure IIS reverse proxy (see deploy/iis-web.config)" -ForegroundColor White