#!/usr/bin/env bash
# Restart the Vite dev server on port 5174

cd "$(dirname "$0")"

PORT=5174
echo "Stopping any process on port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true

sleep 1

echo "Starting dev server on http://localhost:$PORT ..."
npm run dev -- --port $PORT --host
