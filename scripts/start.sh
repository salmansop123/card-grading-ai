#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKEND_PID=""
CELERY_PID=""
FRONTEND_PID=""
COMPOSE_CMD=()
USE_EXTERNAL_INFRA=false
STARTED_COMPOSE=false
PG_HOST_PORT=5434
REDIS_HOST_PORT=6381

log() {
  printf '%s\n' "$*"
}

error() {
  printf 'Error: %s\n' "$*" >&2
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    error "Required tool '${cmd}' is not installed or not in PATH."
    exit 1
  fi
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    error "Required tool 'docker-compose' (or 'docker compose') is not available."
    exit 1
  fi
}

require_celery() {
  local celery_bin="${PROJECT_ROOT}/backend/venv/bin/celery"
  if command -v celery >/dev/null 2>&1; then
    return 0
  fi
  if [[ -x "${celery_bin}" ]]; then
    return 0
  fi
  error "Required tool 'celery' is not installed. Run pip install -r backend/requirements.txt in the backend venv."
  exit 1
}

celery_cmd() {
  local venv_celery="${PROJECT_ROOT}/backend/venv/bin/celery"
  if [[ -x "${venv_celery}" ]]; then
    printf '%s' "${venv_celery}"
  else
    command -v celery
  fi
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
  log "Port ${port} is in use — stopping stale process..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
  elif command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti :"${port}" 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      # shellcheck disable=SC2086
      kill ${pids} 2>/dev/null || true
    fi
  fi
  sleep 1
}

postgres_ready() {
  local port="${1:-5432}"
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h 127.0.0.1 -p "${port}" -U postgres -q >/dev/null 2>&1
    return $?
  fi
  port_in_use "${port}"
}

redis_ready() {
  local port="${1:-6379}"
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -h 127.0.0.1 -p "${port}" ping 2>/dev/null | grep -q PONG
    return $?
  fi
  port_in_use "${port}"
}

load_env_defaults() {
  local env_file="${BACKEND_DIR}/.env"
  local example_file="${BACKEND_DIR}/.env.example"
  local frontend_env="${PROJECT_ROOT}/frontend/.env.local"
  local frontend_example="${PROJECT_ROOT}/frontend/.env.local.example"

  if [[ ! -f "${env_file}" && -f "${example_file}" ]]; then
    log "Creating backend/.env from backend/.env.example..."
    cp "${example_file}" "${env_file}"
  fi

  if [[ ! -f "${frontend_env}" && -f "${frontend_example}" ]]; then
    log "Creating frontend/.env.local from frontend/.env.local.example..."
    cp "${frontend_example}" "${frontend_env}"
  fi
}

ensure_database_exists() {
  log "Ensuring application database exists..."
  local result
  result="$(BACKEND_DIR="${BACKEND_DIR}" python3 <<'PY'
import json
import os
import sys
from urllib.parse import urlparse

backend_dir = os.environ["BACKEND_DIR"]
env_file = os.path.join(backend_dir, ".env")
if os.path.isfile(env_file):
    for line in open(env_file, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())

database_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/card_market_db",
)
parsed = urlparse(database_url)
db_name = (parsed.path or "/card_market_db").lstrip("/") or "card_market_db"

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print(json.dumps({"ok": False, "error": "psycopg2 not installed"}))
    sys.exit(0)

try:
    conn = psycopg2.connect(
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 5432,
        user=parsed.username or "postgres",
        password=parsed.password or "",
        dbname="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cur.fetchone() is not None
    created = False
    if not exists:
        cur.execute(f'CREATE DATABASE "{db_name}"')
        created = True
    cur.close()
    conn.close()
    print(json.dumps({"ok": True, "db_name": db_name, "created": created, "existed": exists}))
except Exception as exc:
    print(json.dumps({"ok": False, "db_name": db_name, "error": str(exc)}))
PY
)"

  if ! printf '%s' "${result}" | python3 -c 'import json,sys; data=json.load(sys.stdin); sys.exit(0 if data.get("ok") else 1)'; then
    error "Failed to ensure database exists."
    error "$(printf '%s' "${result}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("error",""))')"
    exit 1
  fi

  if printf '%s' "${result}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("created", False))' | grep -q True; then
    log "Created database: $(printf '%s' "${result}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("db_name",""))')"
  fi
}

wait_for_postgres_host() {
  local port="${1:-5432}"
  local max_attempts=30
  local attempt=0
  while (( attempt < max_attempts )); do
    if postgres_ready "${port}"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  error "Timed out waiting for Postgres on 127.0.0.1:${port}."
  exit 1
}

wait_for_redis_host() {
  local port="${1:-6379}"
  local max_attempts=30
  local attempt=0
  while (( attempt < max_attempts )); do
    if redis_ready "${port}"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  error "Timed out waiting for Redis on 127.0.0.1:${port}."
  exit 1
}

wait_for_service_healthy() {
  local service="$1"
  local max_attempts=60
  local attempt=0
  local container_id health_status

  while (( attempt < max_attempts )); do
    container_id="$("${COMPOSE_CMD[@]}" -f "${PROJECT_ROOT}/docker-compose.yml" ps -q "${service}" 2>/dev/null || true)"
    if [[ -n "${container_id}" ]]; then
      health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${container_id}" 2>/dev/null || echo "unknown")"
      if [[ "${health_status}" == "healthy" ]]; then
        return 0
      fi
      if [[ "${health_status}" == "none" ]]; then
        if docker inspect --format '{{.State.Running}}' "${container_id}" 2>/dev/null | grep -q true; then
          return 0
        fi
      fi
    fi
    attempt=$((attempt + 1))
    sleep 2
  done

  error "Timed out waiting for '${service}' to become healthy."
  exit 1
}

find_available_port() {
  local port="$1"
  local max_port=$((port + 20))
  while (( port <= max_port )); do
    if ! port_in_use "${port}"; then
      printf '%s' "${port}"
      return 0
    fi
    port=$((port + 1))
  done
  error "No free port found in range starting at ${1}."
  exit 1
}

compose_container_running() {
  local service="$1"
  local container_id
  container_id="$("${COMPOSE_CMD[@]}" -f "${PROJECT_ROOT}/docker-compose.yml" ps -q "${service}" 2>/dev/null || true)"
  [[ -n "${container_id}" ]] && docker inspect --format '{{.State.Running}}' "${container_id}" 2>/dev/null | grep -q true
}

compose_container_port() {
  local service="$1"
  local internal_port="$2"
  local container_id mapped
  container_id="$("${COMPOSE_CMD[@]}" -f "${PROJECT_ROOT}/docker-compose.yml" ps -q "${service}" 2>/dev/null || true)"
  [[ -z "${container_id}" ]] && return 1
  mapped="$(docker port "${container_id}" "${internal_port}/tcp" 2>/dev/null | head -1 | cut -d: -f2)"
  [[ -n "${mapped}" ]] || return 1
  printf '%s' "${mapped}"
}

resolve_infra_ports() {
  local compose_file="${PROJECT_ROOT}/docker-compose.yml"

  if compose_container_running postgres; then
    PG_HOST_PORT="$(compose_container_port postgres 5432)"
  elif port_in_use "${PG_HOST_PORT}"; then
    log "Port ${PG_HOST_PORT} is in use by another service — selecting alternate Postgres port..."
    PG_HOST_PORT="$(find_available_port $((PG_HOST_PORT + 1)))"
  fi

  if compose_container_running redis; then
    REDIS_HOST_PORT="$(compose_container_port redis 6379)"
  elif port_in_use "${REDIS_HOST_PORT}"; then
    log "Port ${REDIS_HOST_PORT} is in use by another service — selecting alternate Redis port..."
    REDIS_HOST_PORT="$(find_available_port $((REDIS_HOST_PORT + 1)))"
  fi

  export POSTGRES_PORT="${PG_HOST_PORT}"
  export REDIS_PORT="${REDIS_HOST_PORT}"
}

remove_stopped_compose_containers() {
  local service="$1"
  local compose_file="${PROJECT_ROOT}/docker-compose.yml"
  local id running name

  while IFS= read -r id; do
    [[ -z "${id}" ]] && continue
    running="$(docker inspect --format '{{.State.Running}}' "${id}" 2>/dev/null || echo false)"
    name="$(docker inspect --format '{{.Name}}' "${id}" 2>/dev/null | sed 's#^/##')"
    if [[ "${running}" != "true" ]]; then
      log "Removing stopped container ${name}..."
      docker rm -f "${id}" >/dev/null 2>&1 || true
    fi
  done < <(docker ps -aq --filter "name=card-grading-ai_${service}" 2>/dev/null || true)

  "${COMPOSE_CMD[@]}" -f "${compose_file}" rm -f "${service}" >/dev/null 2>&1 || true
}

prepare_compose_services() {
  compose_container_running postgres || remove_stopped_compose_containers postgres
  compose_container_running redis || remove_stopped_compose_containers redis
}

ensure_docker_services() {
  local compose_file="${PROJECT_ROOT}/docker-compose.yml"
  local compose_output attempt

  resolve_infra_ports

  if compose_container_running postgres && compose_container_running redis; then
    STARTED_COMPOSE=true
    sync_compose_env
    log "Reusing running Docker services (Postgres:${PG_HOST_PORT}, Redis:${REDIS_HOST_PORT})."
    return 0
  fi

  prepare_compose_services

  for attempt in 1 2 3; do
    compose_output="$(
      POSTGRES_PORT="${PG_HOST_PORT}" REDIS_PORT="${REDIS_HOST_PORT}" \
        "${COMPOSE_CMD[@]}" -f "${compose_file}" up -d --no-recreate 2>&1
    )" && compose_succeeded=true || compose_succeeded=false

    if [[ "${compose_succeeded}" == "true" ]] || { compose_container_running postgres && compose_container_running redis; }; then
      STARTED_COMPOSE=true
      sync_compose_env
      log "${compose_output}"
      return 0
    fi

    if echo "${compose_output}" | grep -qiE "ContainerConfig|KeyError"; then
      log "Stale container metadata detected — cleaning up and retrying..."
      prepare_compose_services
      continue
    fi

    if echo "${compose_output}" | grep -qiE "port is already allocated|address already in use|Bind for .* failed"; then
      if echo "${compose_output}" | grep -qiE "postgres|card-grading-ai_postgres|:${PG_HOST_PORT}"; then
        log "Postgres port ${PG_HOST_PORT} conflict — trying next available port..."
        PG_HOST_PORT="$(find_available_port $((PG_HOST_PORT + 1)))"
        export POSTGRES_PORT="${PG_HOST_PORT}"
        "${COMPOSE_CMD[@]}" -f "${compose_file}" rm -f postgres >/dev/null 2>&1 || true
        continue
      fi
      if echo "${compose_output}" | grep -qiE "redis|card-grading-ai_redis|:${REDIS_HOST_PORT}"; then
        log "Redis port ${REDIS_HOST_PORT} conflict — trying next available port..."
        REDIS_HOST_PORT="$(find_available_port $((REDIS_HOST_PORT + 1)))"
        export REDIS_PORT="${REDIS_HOST_PORT}"
        "${COMPOSE_CMD[@]}" -f "${compose_file}" rm -f redis >/dev/null 2>&1 || true
        continue
      fi

      if postgres_ready "${PG_HOST_PORT}" && redis_ready "${REDIS_HOST_PORT}"; then
        USE_EXTERNAL_INFRA=true
        sync_compose_env
        log "Compose ports busy — reusing existing Postgres (${PG_HOST_PORT}) and Redis (${REDIS_HOST_PORT}) on host."
        return 0
      fi
    fi

    error "Failed to start Docker services."
    error "${compose_output}"
    exit 1
  done

  error "Failed to start Docker services after retrying with alternate ports."
  exit 1
}

sync_compose_env() {
  local env_file="${BACKEND_DIR}/.env"
  [[ -f "${env_file}" ]] || return 0

  python3 <<PY
import re
from pathlib import Path

env_path = Path("${env_file}")
text = env_path.read_text(encoding="utf-8")
pg_port = ${PG_HOST_PORT}
redis_port = ${REDIS_HOST_PORT}

replacements = {
    "DATABASE_URL": f"postgresql://postgres:password@localhost:{pg_port}/card_market_db",
    "REDIS_URL": f"redis://localhost:{redis_port}/0",
    "CELERY_BROKER_URL": f"redis://localhost:{redis_port}/1",
    "CELERY_RESULT_BACKEND": f"redis://localhost:{redis_port}/2",
}

for key, value in replacements.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        text = pattern.sub(f"{key}={value}", text)
    else:
        text += f"\n{key}={value}\n"

env_path.write_text(text, encoding="utf-8")
PY
}

cleanup() {
  log ""
  log "Shutting down services..."

  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  free_port 3000
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  free_port 8000
  if [[ -n "${CELERY_PID}" ]] && kill -0 "${CELERY_PID}" 2>/dev/null; then
    kill "${CELERY_PID}" 2>/dev/null || true
  fi

  wait "${FRONTEND_PID}" 2>/dev/null || true
  wait "${CELERY_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" 2>/dev/null || true

  if [[ "${STARTED_COMPOSE}" == "true" ]]; then
    "${COMPOSE_CMD[@]}" -f "${PROJECT_ROOT}/docker-compose.yml" stop >/dev/null 2>&1 || true
  fi

  log "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

log "Checking required tools..."
require_command docker
require_command python3
require_command node
require_command npm
detect_compose

# Move load_env_defaults before frontend start - also call early after mkdir logs
mkdir -p "${PROJECT_ROOT}/logs"

BACKEND_DIR="${PROJECT_ROOT}/backend"
load_env_defaults

log "Starting Docker services (postgres + redis)..."
ensure_docker_services

if [[ "${USE_EXTERNAL_INFRA}" == "true" ]]; then
  log "Waiting for postgres (existing instance on ${PG_HOST_PORT})..."
  wait_for_postgres_host "${PG_HOST_PORT}"
  log "Waiting for redis (existing instance on ${REDIS_HOST_PORT})..."
  wait_for_redis_host "${REDIS_HOST_PORT}"
else
  log "Waiting for postgres to be healthy (port ${PG_HOST_PORT})..."
  wait_for_service_healthy postgres
  wait_for_postgres_host "${PG_HOST_PORT}"
  log "Waiting for redis to be healthy (port ${REDIS_HOST_PORT})..."
  wait_for_service_healthy redis
  wait_for_redis_host "${REDIS_HOST_PORT}"
fi

BACKEND_DIR="${PROJECT_ROOT}/backend"
VENV_DIR="${BACKEND_DIR}/venv"

if [[ ! -d "${VENV_DIR}" ]]; then
  log "Creating Python virtual environment at backend/venv..."
  python3 -m venv "${VENV_DIR}"
fi

# shellcheck source=/dev/null
source "${VENV_DIR}/bin/activate"

log "Installing backend dependencies..."
pip install -r "${BACKEND_DIR}/requirements.txt" -q

require_celery

ensure_database_exists

log "Running database migrations..."
cd "${BACKEND_DIR}"
alembic upgrade head

log "Starting FastAPI backend..."
uvicorn app.main:app --reload --port 8000 > "${PROJECT_ROOT}/logs/backend.log" 2>&1 &
BACKEND_PID=$!

log "Starting Celery worker..."
"$(celery_cmd)" -A app.celery_app worker --loglevel=info > "${PROJECT_ROOT}/logs/celery.log" 2>&1 &
CELERY_PID=$!

FRONTEND_DIR="${PROJECT_ROOT}/frontend"
cd "${FRONTEND_DIR}"

if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
  log "Installing frontend dependencies..."
  npm install
fi

# Production `next build` artifacts conflict with `next dev` (stale chunk names → 404 on all routes).
free_port 3000
if [[ -d "${FRONTEND_DIR}/.next" ]]; then
  log "Clearing frontend .next cache for fresh dev server..."
  rm -rf "${FRONTEND_DIR}/.next"
fi
rm -rf "${FRONTEND_DIR}/node_modules/.cache"

log "Starting frontend dev server..."
npm run dev > "${PROJECT_ROOT}/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!

log "Waiting for frontend dev server to compile..."
FRONTEND_READY=false
for _ in $(seq 1 90); do
  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    log "Frontend dev server exited unexpectedly. Check logs/frontend.log"
    break
  fi
  main_status="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/_next/static/chunks/main-app.js" 2>/dev/null || echo "000")"
  css_status="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/_next/static/css/app/layout.css" 2>/dev/null || echo "000")"
  if [[ "${main_status}" == "200" && "${css_status}" == "200" ]]; then
    FRONTEND_READY=true
    log "Frontend dev server is ready."
    break
  fi
  sleep 1
done
if [[ "${FRONTEND_READY}" != "true" ]]; then
  log "Warning: Frontend may still be compiling. If you see 404s, wait a few seconds and hard-refresh."
fi

log ""
log "========================================"
log "  Card Market Intelligence Platform"
log "========================================"
log "  Backend API:  http://localhost:8000"
log "  API docs:     http://localhost:8000/docs"
log "  Frontend:     http://localhost:3000"
log "  Log files:    logs/"
log "========================================"
log ""
log "Press Ctrl+C to stop all services."

wait "${BACKEND_PID}" "${CELERY_PID}" "${FRONTEND_PID}"
