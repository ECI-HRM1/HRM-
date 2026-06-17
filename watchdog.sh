#!/bin/bash
# Watchdog: keeps the Next.js dev server running
cd /home/z/my-project
while true; do
  # Check if port 3000 is already in use
  if ss -tlnp | grep -q ':3000 '; then
    sleep 3
    continue
  fi
  echo "[$(date)] Starting dev server..." >> /home/z/my-project/dev.log
  bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done