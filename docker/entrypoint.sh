#!/usr/bin/env bash
set -e

export PORT="${PORT:-8080}"
echo "================================================================================"
echo "          🚀 Starting MyTutor Cloud Run Unified Container on Port $PORT         "
echo "================================================================================"

# Replace ${PORT} placeholder in Nginx template
sed "s/\${PORT}/${PORT}/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Trap signals for graceful shutdown
cleanup() {
    echo "Shutting down MyTutor services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start Gemini Live Avatar Node.js Proxy on port 5001
echo "▶ [1/3] Starting Gemini Live Avatar Node.js Proxy on port 5001..."
cd /app/avatar-backend
export API_BACKEND_PORT=5001
export API_BACKEND_HOST=0.0.0.0
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-${GCP_PROJECT_ID:-project-9691fa52-ebb2-43ba-9de}}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-${GCP_LOCATION:-us-central1}}"
export PROXY_HEADER="${PROXY_HEADER:-OfUuo8fWvy9fauNWD0FePECzm9koL2g2}"
node server.js > /tmp/avatar.log 2>&1 &
NODE_PID=$!
echo "   ✔ Node.js Avatar Proxy launched (PID: $NODE_PID)"

# 2. Start FastAPI Python Backend on port 8000
echo "▶ [2/3] Starting FastAPI Backend on port 8000..."
cd /app/backend
export PYTHONPATH="/app/backend"
export PYTHONUNBUFFERED=1
python3 -u -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/fastapi.log 2>&1 &
FASTAPI_PID=$!
echo "   ✔ FastAPI Backend launched (PID: $FASTAPI_PID)"

# 3. Wait for FastAPI to become ready before opening Nginx ingress
echo "▶ [3/3] Waiting for backend services to become ready..."
FASTAPI_READY=false
for i in {1..25}; do
    if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
        echo "   ✔ FastAPI is UP and responsive on port 8000 (after ${i}s)!"
        FASTAPI_READY=true
        break
    fi
    sleep 1
done

if [ "$FASTAPI_READY" = false ]; then
    echo "❌ ERROR: FastAPI did not respond on port 8000. Dumping /tmp/fastapi.log:"
    cat /tmp/fastapi.log || true
fi

echo "▶ Node.js Avatar Proxy initial log output:"
cat /tmp/avatar.log || true

# 4. Start Nginx on $PORT (foreground process)
echo "▶ Starting Nginx on port $PORT (serving frontend and proxying API)..."
nginx -g "daemon off;"
