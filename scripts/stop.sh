#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_PORTS=(3000 8000)

log() {
  printf '%s\n' "$*"
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tln | grep -q ":${port} "
    return $?
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "${port}" >/dev/null 2>&1
    return $?
  fi
  python3 -c "import socket; socket.create_connection(('127.0.0.1', ${port}), timeout=2).close()" >/dev/null 2>&1
}

free_port() {
  local port="$1"
  if ! port_in_use "${port}"; then
    return 0
  fi
  log "Freeing port ${port}..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
  elif command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti :"${port}" 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      # shellcheck disable=SC2086
      kill ${pids} 2>/dev/null || true
      sleep 1
      pids="$(lsof -ti :"${port}" 2>/dev/null || true)"
      if [[ -n "${pids}" ]]; then
        # shellcheck disable=SC2086
        kill -9 ${pids} 2>/dev/null || true
      fi
    fi
  fi
  sleep 1
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" stop
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${PROJECT_ROOT}/docker-compose.yml" stop
  else
    log "Warning: docker-compose not found; skipping container shutdown."
  fi
}

stop_matching() {
  local pattern="$1"
  local label="$2"
  local pids

  pids="$(pgrep -f "${pattern}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    log "Stopping ${label}..."
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
  fi
}

log "Stopping application processes..."

stop_matching "uvicorn app.main:app" "FastAPI (uvicorn)"
stop_matching "celery -A app.celery_app worker" "Celery worker"
stop_matching "next dev" "Next.js dev server"
stop_matching "next-server" "Next.js server"

sleep 1

for port in "${APP_PORTS[@]}"; do
  free_port "${port}"
done

log "Stopping Docker services..."
detect_compose

log "All services stopped."
