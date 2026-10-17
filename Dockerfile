# ==============================================================================
# Stage 1: Build the React + Vite Frontend
# ==============================================================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Install Node Dependencies for Gemini Live Avatar Proxy
# ==============================================================================
FROM node:20-slim AS avatar-backend-builder
WORKDIR /app/avatar-backend

COPY ["Gemini AI avatar module/backend/package*.json", "./"]
RUN npm install --omit=dev --no-audit --no-fund

# ==============================================================================
# Stage 3: Production Runtime (FastAPI + Node Proxy + Nginx + Supervisor)
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Install system dependencies: Nginx, Node.js 20, Curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nginx \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy FastAPI backend code
COPY backend /app/backend

# Copy Avatar Proxy backend code and its installed node_modules from Stage 2
COPY ["Gemini AI avatar module/backend", "/app/avatar-backend"]
COPY --from=avatar-backend-builder /app/avatar-backend/node_modules /app/avatar-backend/node_modules

# Copy built frontend assets from Stage 1 into Nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx template and entrypoint script
COPY docker/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Remove default nginx site config if exists
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

# Expose Cloud Run default port
EXPOSE 8080

# Cloud Run Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
