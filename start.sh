#!/usr/bin/env bash

# ==============================================================================
# HelpMe & Gemini AI Avatar Ecosystem - Unified Startup Script
# Starts:
#   1. HelpMe FastAPI Backend (Port 8000)
#   2. Gemini Live Avatar Node Proxy Backend (Port 5001)
#   3. HelpMe Unified React Frontend (Port 3000)
#   4. Gemini Live Avatar Standalone Frontend (Port 5173)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.services.pid"

mkdir -p "$LOG_DIR"
touch "$PID_FILE"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "          🚀 Starting HelpMe & Gemini AI Avatar Ecosystem Services 🚀           "
echo "================================================================================"
echo -e "${NC}"

# Detect Python command
if command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
  PYTHON_CMD="python"
else
  echo -e "${RED}Error: Neither python3 nor python was found in PATH.${NC}"
  exit 1
fi

SPAWNED_PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Shutting down services started by this script...${NC}"
  for pid in "${SPAWNED_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "Stopping PID $pid..."
      kill "$pid" 2>/dev/null
    fi
  done
  # Also remove tracked PIDs
  rm -f "$PID_FILE"
  echo -e "${GREEN}All services stopped cleanly.${NC}"
  exit 0
}

# Catch Ctrl+C and exit signals
trap cleanup INT TERM

check_port() {
  local port=$1
  lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

# ------------------------------------------------------------------------------
# 1. Start HelpMe FastAPI Backend (Port 8000)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [1/4] Checking HelpMe FastAPI Backend (Port 8000)...${NC}"
if check_port 8000; then
  FASTAPI_PID=$(lsof -ti:8000 | head -n 1)
  echo -e "   ${GREEN}✔ Already running${NC} on port 8000 (PID: $FASTAPI_PID)"
else
  echo -e "   Starting FastAPI server..."
  nohup bash -c "cd '$PROJECT_ROOT/backend' && exec '$PYTHON_CMD' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" </dev/null > "$LOG_DIR/fastapi.log" 2>&1 &
  FASTAPI_PID=$!
  SPAWNED_PIDS+=("$FASTAPI_PID")
  echo "$FASTAPI_PID" >> "$PID_FILE"
  echo -e "   ${GREEN}✔ Launched${NC} (PID: $FASTAPI_PID) -> Logs: logs/fastapi.log"
fi

# ------------------------------------------------------------------------------
# 2. Start Gemini Live Avatar Node Proxy Backend (Port 5001)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [2/4] Checking Gemini Live Avatar Node Proxy (Port 5001)...${NC}"
AVATAR_MODULE_DIR="$PROJECT_ROOT/Gemini AI avatar module"
if [ ! -d "$AVATAR_MODULE_DIR" ]; then
  AVATAR_MODULE_DIR="$PROJECT_ROOT/gemini-ai-avatar-module"
fi

if check_port 5001; then
  AVATAR_BACKEND_PID=$(lsof -ti:5001 | head -n 1)
  echo -e "   ${GREEN}✔ Already running${NC} on port 5001 (PID: $AVATAR_BACKEND_PID)"
else
  echo -e "   Starting Node.js proxy server..."
  nohup bash -c "cd '$AVATAR_MODULE_DIR/backend' && exec node --env-file=.env.local server.js" </dev/null > "$LOG_DIR/avatar-backend.log" 2>&1 &
  AVATAR_BACKEND_PID=$!
  SPAWNED_PIDS+=("$AVATAR_BACKEND_PID")
  echo "$AVATAR_BACKEND_PID" >> "$PID_FILE"
  echo -e "   ${GREEN}✔ Launched${NC} (PID: $AVATAR_BACKEND_PID) -> Logs: logs/avatar-backend.log"
fi

# ------------------------------------------------------------------------------
# 3. Start HelpMe Unified React Frontend (Port 3000)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [3/4] Checking HelpMe Unified Frontend (Port 3000)...${NC}"
if check_port 3000; then
  FRONTEND_PID=$(lsof -ti:3000 | head -n 1)
  echo -e "   ${GREEN}✔ Already running${NC} on port 3000 (PID: $FRONTEND_PID)"
else
  echo -e "   Starting HelpMe Frontend..."
  nohup bash -c "cd '$PROJECT_ROOT/frontend' && exec npm run dev" </dev/null > "$LOG_DIR/frontend-helpme.log" 2>&1 &
  FRONTEND_PID=$!
  SPAWNED_PIDS+=("$FRONTEND_PID")
  echo "$FRONTEND_PID" >> "$PID_FILE"
  echo -e "   ${GREEN}✔ Launched${NC} (PID: $FRONTEND_PID) -> Logs: logs/frontend-helpme.log"
fi

# ------------------------------------------------------------------------------
# 4. Start Gemini Live Avatar Standalone Frontend (Port 5173)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [4/4] Checking Gemini Live Avatar Standalone Frontend (Port 5173)...${NC}"
if check_port 5173; then
  AVATAR_FRONTEND_PID=$(lsof -ti:5173 | head -n 1)
  echo -e "   ${GREEN}✔ Already running${NC} on port 5173 (PID: $AVATAR_FRONTEND_PID)"
else
  echo -e "   Starting Standalone Avatar Frontend..."
  nohup bash -c "cd '$AVATAR_MODULE_DIR/frontend' && exec npm run dev" </dev/null > "$LOG_DIR/frontend-avatar.log" 2>&1 &
  AVATAR_FRONTEND_PID=$!
  SPAWNED_PIDS+=("$AVATAR_FRONTEND_PID")
  echo "$AVATAR_FRONTEND_PID" >> "$PID_FILE"
  echo -e "   ${GREEN}✔ Launched${NC} (PID: $AVATAR_FRONTEND_PID) -> Logs: logs/frontend-avatar.log"
fi

echo -e "\n${YELLOW}Waiting for services to become responsive...${NC}"
sleep 3

echo -e "\n${GREEN}${BOLD}"
echo "================================================================================"
echo "                     🎉 ALL SERVICES ARE UP & RUNNING! 🎉                      "
echo "================================================================================"
echo -e "${NC}"
echo -e "  ${BOLD}Platform & Services Dashboard:${NC}"
echo -e "  ------------------------------------------------------------------------------"
echo -e "  🌐 ${CYAN}HelpMe Main Web Platform${NC}     : ${BOLD}http://localhost:3000${NC}"
echo -e "  🤖 ${CYAN}FastAPI Python Backend Docs${NC}   : ${BOLD}http://localhost:8000/docs${NC}"
echo -e "  ⚡ ${CYAN}Gemini Live Avatar Proxy${NC}     : ${BOLD}http://localhost:5001${NC}"
echo -e "  🎭 ${CYAN}Avatar Standalone Frontend${NC}   : ${BOLD}http://localhost:5173${NC}"
echo -e "  ------------------------------------------------------------------------------"
echo -e "  📁 ${YELLOW}Log files saved in:${NC} $LOG_DIR/"
echo -e "  🛑 ${YELLOW}To stop all services:${NC} Press ${BOLD}[Ctrl + C]${NC} in this terminal"
echo -e "     or run: ${BOLD}./stop.sh${NC}"
echo -e "================================================================================\n"

# If running in daemon/background flag, disown all background processes so they persist
if [ "$1" == "--daemon" ] || [ "$1" == "-d" ]; then
  disown -a 2>/dev/null
  echo -e "${GREEN}Running in daemon mode. Services are detached and running in the background.${NC}"
  exit 0
fi

# Wait for background processes when in interactive foreground mode
wait
