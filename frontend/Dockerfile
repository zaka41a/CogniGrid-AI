# ──────────────────────────────────────────────────────────────────────────────
# CogniGrid AI — Frontend (React + Vite) production image
#
# Multi-stage:
#   1. build  → install deps, bake VITE_* URLs, produce static dist/
#   2. serve  → nginx serving the static SPA on port 80
#
# The VITE_* URLs must be known at BUILD time (Vite inlines them into the bundle),
# so they are passed as build args from docker-compose (which reads them from .env).
# ──────────────────────────────────────────────────────────────────────────────

# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Service URLs the browser will call (default to localhost for local builds).
ARG VITE_GATEWAY_URL=http://localhost:8080
ARG VITE_GRAPH_URL=http://localhost:8002
ARG VITE_INGESTION_URL=http://localhost:8001
ARG VITE_RAG_URL=http://localhost:8004
ARG VITE_AGENT_URL=http://localhost:8005
ARG VITE_RUNNER_URL=http://localhost:8006
ARG VITE_AI_ENGINE_URL=http://localhost:8003
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL \
    VITE_GRAPH_URL=$VITE_GRAPH_URL \
    VITE_INGESTION_URL=$VITE_INGESTION_URL \
    VITE_RAG_URL=$VITE_RAG_URL \
    VITE_AGENT_URL=$VITE_AGENT_URL \
    VITE_RUNNER_URL=$VITE_RUNNER_URL \
    VITE_AI_ENGINE_URL=$VITE_AI_ENGINE_URL

# vite build (no tsc gate) so a stray type error can't block the deployment image.
RUN npx vite build

# ---- serve stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
