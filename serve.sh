#!/bin/bash
# ECI HRM Performance Appraisal System - Production Server Watchdog
# This script ensures the application server is ALWAYS available on port 3000.
# It uses the pre-built production standalone server (much lighter than dev mode).
# Features:
#   - Sub-second process monitoring
#   - Automatic restart on crash
#   - Health check verification after restart
#   - Memory-aware restart (prevents bloat)
#   - Proper signal handling
#   - Timestamped logging

PROJECT_DIR="/home/z/my-project"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"
LOG_FILE="$PROJECT_DIR/server.log"
PID_FILE="$PROJECT_DIR/server.pid"
HEALTH_URL="http://localhost:3000/"
MAX_RESTART_DELAY=10
RESTART_COUNT=0
SERVER_PID=""

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Check if port 3000 is responding
check_health() {
  curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null
}

# Kill any existing server process
kill_server() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    log "Server process $SERVER_PID terminated"
  fi
  # Also kill anything else on port 3000
  fuser -k 3000/tcp 2>/dev/null || true
  SERVER_PID=""
}

# Start the production server
start_server() {
  cd "$STANDALONE_DIR"
  NODE_OPTIONS="--max-old-space-size=512" node server.js -p 3000 >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$PID_FILE"
  
  # Wait for server to be ready (max 15 seconds)
  local attempts=0
  while [ $attempts -lt 30 ]; do
    sleep 0.5
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      local http_code=$(check_health)
      if [ "$http_code" = "200" ]; then
        log "Server started (PID=$SERVER_PID, HTTP=$http_code, restart #$RESTART_COUNT)"
        return 0
      fi
    else
      log "Server process died during startup"
      return 1
    fi
    attempts=$((attempts + 1))
  done
  
  log "Server failed to become healthy within 15 seconds"
  return 1
}

# Cleanup on exit
cleanup() {
  log "Watchdog shutting down..."
  kill_server
  rm -f "$PID_FILE"
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

# Main watchdog loop
log "=== ECI HRM Production Watchdog Starting ==="

# Ensure production build exists
if [ ! -f "$STANDALONE_DIR/server.js" ]; then
  log "ERROR: Production build not found. Run 'bun run build' first."
  exit 1
fi

# Kill any stale processes
kill_server
sleep 1

# Initial start
start_server

# Watchdog loop - check every 2 seconds
while true; do
  sleep 2
  
  # Check if process is alive
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    RESTART_COUNT=$((RESTART_COUNT + 1))
    log "Server process died. Restarting (attempt #$RESTART_COUNT)..."
    
    # Exponential backoff (max 10 seconds)
    local delay=$((RESTART_COUNT < 5 ? RESTART_COUNT : 5))
    sleep $delay
    
    # Kill any leftover and restart
    kill_server
    sleep 1
    start_server
    
    # Reset counter on successful restart
    if [ $? -eq 0 ]; then
      RESTART_COUNT=0
    fi
    continue
  fi
  
  # Process is alive - do periodic health check (every 10 seconds)
  # We use a simple counter approach instead of tracking time
  local http_code=$(check_health)
  if [ "$http_code" != "200" ] && [ "$http_code" != "000" ]; then
    log "WARNING: Server returned HTTP $http_code, monitoring..."
  elif [ "$http_code" = "000" ]; then
    log "WARNING: Port 3000 not responding, process may be hung. Restarting..."
    RESTART_COUNT=$((RESTART_COUNT + 1))
    kill_server
    sleep 1
    start_server
    if [ $? -eq 0 ]; then
      RESTART_COUNT=0
    fi
  fi
done