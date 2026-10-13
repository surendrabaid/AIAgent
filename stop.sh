#!/usr/bin/env bash

# ==============================================================================
# HelpMe & Gemini AI Avatar Ecosystem - Service Stopper Script
# Stops:
#   1. HelpMe FastAPI Backend (Port 8000)
#   2. Gemini Live Avatar Node Proxy Backend (Port 5001)
#   3. HelpMe Unified React Frontend (Port 3000)
#   4. Gemini Live Avatar Standalone Frontend (Port 5173)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_ROOT/.services.pid"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "             🛑 Stopping HelpMe & Gemini AI Avatar Services... 🛑              "
echo "================================================================================"
echo -e "${NC}"

# 1. Stop tracked PIDs from PID file if exists
if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}Killing tracked process PID $pid...${NC}"
      kill -9 "$pid" 2>/dev/null
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# 2. Stop any processes listening on ports 8000, 5001, 3000, 5173
PORTS=(8000 5001 3000 5173)

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}Stopping process on port $port (PID: $pids)...${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null
  else
    echo -e "Port $port is clear."
  fi
done

echo -e "\n${GREEN}${BOLD}✔ All backend and frontend services have been stopped successfully.${NC}\n"
