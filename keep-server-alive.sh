#!/bin/bash
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ':3000 '; then
    cd /home/z/my-project/.next/standalone
    node server.js -p 3000 >> /home/z/my-project/dev.log 2>&1
    echo "=== SERVER DIED $(date), RESTARTING ===" >> /home/z/my-project/dev.log
    sleep 2
  fi
  sleep 3
done
