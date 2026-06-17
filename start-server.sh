#!/bin/bash
# ECI HRM Performance Appraisal System - Server Startup Script
#
# This script automatically selects the best server mode:
#   1. Static mode (Python): For preview/sandbox environments
#      - Serves pre-built UI with mock data fallbacks
#      - Ultra-lightweight, survives alongside Chrome
#      - API routes return 503 (frontend uses mock data)
#
#   2. Full mode (Node.js): For production/internal server deployment
#      - Serves complete app with all API routes and database
#      - Requires: bun run build && bun start
#
# Usage:
#   ./start-server.sh              # Auto-detect: static if Chrome running, full otherwise
#   ./start-server.sh static       # Force static mode
#   ./start-server.sh full         # Force full Node.js mode

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/server.log"
MODE="${1:-auto}"

cd "$PROJECT_DIR"

# Ensure production build exists
if [ ! -f ".next/standalone/.next/server/app/index.html" ]; then
  echo "Production build not found. Building..."
  NODE_OPTIONS="--max-old-space-size=1024" bun run build
  if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
  fi
fi

start_static() {
  echo "Starting ECI HRM in STATIC mode (Python)..."
  rm -f "$LOG_FILE"
  python3 static-server.py >> "$LOG_FILE" 2>&1 &
  echo $! > "$PROJECT_DIR/server.pid"
  
  # Wait for ready
  for i in $(seq 1 15); do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
      echo "Static server ready on port 3000 (PID: $(cat server.pid))"
      return 0
    fi
  done
  echo "Failed to start static server"
  return 1
}

start_full() {
  echo "Starting ECI HRM in FULL mode (Node.js)..."
  rm -f "$LOG_FILE"
  NODE_OPTIONS="--max-old-space-size=512" node .next/standalone/server.js -p 3000 >> "$LOG_FILE" 2>&1 &
  echo $! > "$PROJECT_DIR/server.pid"
  
  # Wait for ready
  for i in $(seq 1 30); do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
      echo "Full server ready on port 3000 (PID: $(cat server.pid))"
      return 0
    fi
  done
  echo "Failed to start full server"
  return 1
}

# Auto-detect mode
if [ "$MODE" = "auto" ]; then
  # If Chrome is running, use static mode (avoids memory conflicts in sandbox)
  if pgrep -x chrome > /dev/null 2>&1 || pgrep -f "chrome.*agent-browser" > /dev/null 2>&1; then
    MODE="static"
  else
    MODE="full"
  fi
  echo "Auto-detected mode: $MODE"
fi

if [ "$MODE" = "static" ]; then
  start_static
else
  start_full
fi