#!/bin/bash
# Keep the Next.js dev server running permanently
# Usage: Run in background with a long sleep to prevent shell cleanup
cd /home/z/my-project

while true; do
  # Check if port 3000 is already in use
  if ss -tlnp | grep -q ':3000 '; then
    sleep 5
    continue
  fi

  echo "[$(date)] Restarting dev server..." >> /home/z/my-project/dev.log
  bun run dev >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done