#!/bin/bash
# ECI HRM Watchdog - Ensures port 3000 is always available
# Uses Python static server for preview, or Node.js standalone for full API

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/server.log"
SERVER_PID=""

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

check_health() {
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null
}

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  fuser -k 3000/tcp 2>/dev/null || true
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

log "=== ECI HRM Watchdog Starting ==="

# Kill stale processes
cleanup 2>/dev/null
sleep 1

# Start Python static server (lightweight, survives alongside Chrome)
cd "$PROJECT_DIR"
python3 static-server.py >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
log "Python static server started (PID=$SERVER_PID)"

# Wait for healthy
for i in $(seq 1 20); do
  sleep 1
  if [ "$(check_health)" = "200" ]; then
    log "Server healthy on port 3000"
    break
  fi
done

# Monitor loop
while true; do
  sleep 5
  
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log "Server died, restarting..."
    sleep 2
    cd "$PROJECT_DIR"
    python3 static-server.py >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    log "Restarted (PID=$SERVER_PID)"
    
    # Wait for healthy
    for i in $(seq 1 10); do
      sleep 1
      if [ "$(check_health)" = "200" ]; then
        log "Server recovered"
        break
      fi
    done
  fi
done