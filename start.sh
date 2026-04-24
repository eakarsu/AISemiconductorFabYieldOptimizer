#!/usr/bin/env bash
#
# start.sh - AI Semiconductor Fab Yield Optimizer
# Starts the full development stack: PostgreSQL, backend API, and frontend UI.
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

BACKEND_PID=""
FRONTEND_PID=""

# ---------------------------------------------------------------------------
# Colors for output
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ---------------------------------------------------------------------------
# Cleanup on exit (SIGINT, SIGTERM, EXIT)
# ---------------------------------------------------------------------------
cleanup() {
    echo ""
    log_info "Shutting down services..."

    if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        wait "$BACKEND_PID" 2>/dev/null || true
        log_info "Backend stopped."
    fi

    if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        wait "$FRONTEND_PID" 2>/dev/null || true
        log_info "Frontend stopped."
    fi

    log_success "All services stopped. Goodbye."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ---------------------------------------------------------------------------
# 1. Kill existing processes on ports 3000 and 3001
# ---------------------------------------------------------------------------
kill_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$pid" ]]; then
        log_warn "Killing existing process(es) on port $port (PID: $pid)"
        echo "$pid" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

log_info "Checking for processes on ports 3000 and 3001..."
kill_port 3000
kill_port 3001
log_success "Ports 3000 and 3001 are free."

# ---------------------------------------------------------------------------
# 2. Load environment variables from .env
# ---------------------------------------------------------------------------
if [[ -f "$PROJECT_DIR/.env" ]]; then
    log_info "Loading environment variables from .env"
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
    set +a
    log_success "Environment variables loaded."
else
    log_error ".env file not found at $PROJECT_DIR/.env"
    exit 1
fi

# ---------------------------------------------------------------------------
# 3. Check / start PostgreSQL
# ---------------------------------------------------------------------------
log_info "Checking PostgreSQL status..."

if command -v pg_isready &>/dev/null; then
    if pg_isready -q 2>/dev/null; then
        log_success "PostgreSQL is running."
    else
        log_warn "PostgreSQL is not running. Attempting to start..."
        if command -v brew &>/dev/null; then
            brew services start postgresql@14 2>/dev/null \
                || brew services start postgresql 2>/dev/null \
                || {
                    log_error "Failed to start PostgreSQL via Homebrew. Please start it manually."
                    exit 1
                }
        elif command -v systemctl &>/dev/null; then
            sudo systemctl start postgresql
        elif command -v pg_ctl &>/dev/null; then
            pg_ctl -D /usr/local/var/postgres start
        else
            log_error "Cannot determine how to start PostgreSQL. Please start it manually."
            exit 1
        fi
        sleep 2
        if pg_isready -q 2>/dev/null; then
            log_success "PostgreSQL started successfully."
        else
            log_error "PostgreSQL failed to start. Please check your installation."
            exit 1
        fi
    fi
else
    log_warn "pg_isready not found. Assuming PostgreSQL is running."
fi

# ---------------------------------------------------------------------------
# 4. Create database if it doesn't exist
# ---------------------------------------------------------------------------
DB_NAME="semiconductor_fab"

log_info "Checking if database '$DB_NAME' exists..."

if command -v psql &>/dev/null; then
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_success "Database '$DB_NAME' already exists."
    else
        log_info "Creating database '$DB_NAME'..."
        createdb "$DB_NAME" 2>/dev/null \
            || createdb -U postgres "$DB_NAME" 2>/dev/null \
            || {
                log_warn "Could not create database automatically. It may already exist or require manual creation."
            }
        log_success "Database '$DB_NAME' created."
    fi
else
    log_warn "psql not found. Skipping database check."
fi

# ---------------------------------------------------------------------------
# 5. Install backend dependencies
# ---------------------------------------------------------------------------
log_info "Installing backend dependencies..."
if [[ -f "$BACKEND_DIR/package.json" ]]; then
    (cd "$BACKEND_DIR" && npm install --silent)
    log_success "Backend dependencies installed."
else
    log_warn "No package.json found in backend/. Skipping npm install."
fi

# ---------------------------------------------------------------------------
# 6. Install frontend dependencies
# ---------------------------------------------------------------------------
log_info "Installing frontend dependencies..."
if [[ -f "$FRONTEND_DIR/package.json" ]]; then
    (cd "$FRONTEND_DIR" && npm install --silent)
    log_success "Frontend dependencies installed."
else
    log_warn "No package.json found in frontend/. Skipping npm install."
fi

# ---------------------------------------------------------------------------
# 7. Seed the database (schema is created automatically by the seed script)
# ---------------------------------------------------------------------------
log_info "Seeding the database..."
if [[ -f "$BACKEND_DIR/package.json" ]]; then
    if (cd "$BACKEND_DIR" && npm run seed); then
        log_success "Database seeded successfully."
    else
        log_error "Database seeding failed. Check the output above."
        exit 1
    fi
else
    log_warn "Skipping seed (no backend package.json)."
fi

# ---------------------------------------------------------------------------
# 9. Start the backend (nodemon for hot reload)
# ---------------------------------------------------------------------------
log_info "Starting backend on port ${BACKEND_PORT:-3001}..."
(cd "$BACKEND_DIR" && npx nodemon server.js) &
BACKEND_PID=$!
log_success "Backend started (PID: $BACKEND_PID)."

# ---------------------------------------------------------------------------
# 10. Start the frontend (react-scripts)
# ---------------------------------------------------------------------------
log_info "Starting frontend on port ${FRONTEND_PORT:-3000}..."
(cd "$FRONTEND_DIR" && PORT=${FRONTEND_PORT:-3000} npx react-scripts start) &
FRONTEND_PID=$!
log_success "Frontend started (PID: $FRONTEND_PID)."

# ---------------------------------------------------------------------------
# 11. Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} AI Semiconductor Fab Yield Optimizer${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e " Frontend : ${CYAN}http://localhost:${FRONTEND_PORT:-3000}${NC}"
echo -e " Backend  : ${CYAN}http://localhost:${BACKEND_PORT:-3001}${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e " Press ${YELLOW}Ctrl+C${NC} to stop all services."
echo ""

# ---------------------------------------------------------------------------
# 12. Wait for both processes
# ---------------------------------------------------------------------------
wait "$BACKEND_PID" "$FRONTEND_PID"
