#!/bin/bash
# Restart backend with proper env loading
pkill -f uvicorn
sleep 3

cd /root/beehive-agent

# More reliable env loading that handles multi-line .env files
set -a
source .env
set +a

nohup python3 -m uvicorn saas.api.main:app --host 0.0.0.0 --port 8000 > /var/log/beehive/app.log 2>&1 &
echo "Backend started with PID: $!"
