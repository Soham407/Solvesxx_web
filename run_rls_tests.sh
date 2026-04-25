#!/usr/bin/env bash
# run_rls_tests.sh — RLS isolation smoke tests for all roles
# Usage:
#   ./run_rls_tests.sh              # run against http://localhost:3000 (must be running)
#   ./run_rls_tests.sh --start-dev  # also start `npm run dev` before running
#   ./run_rls_tests.sh --headed     # open browser (visible) mode

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Config ───────────────────────────────────────────────────────────────────
APP_URL="${NEXT_PUBLIC_APP_URL:-http://127.0.0.1:3000}"
SPEC="e2e/rls-isolation.spec.ts"
REPORT_DIR="test-results/rls-isolation"
START_DEV=0
HEADED=""
DEV_PID=""

for arg in "$@"; do
  case "$arg" in
    --start-dev) START_DEV=1 ;;
    --headed)    HEADED="--headed" ;;
  esac
done

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[RLS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[RLS]${NC} $*"; }
error()   { echo -e "${RED}[RLS]${NC} $*"; }

cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    warn "Stopping dev server (PID $DEV_PID)…"
    kill "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── 1. Optionally start dev server ────────────────────────────────────────────
if [[ "$START_DEV" -eq 1 ]]; then
  info "Starting Next.js dev server…"
  npm run dev &> /tmp/nextjs-dev.log &
  DEV_PID=$!
  info "Dev server PID: $DEV_PID — waiting for it to become ready…"

  MAX_WAIT=60
  ELAPSED=0
  until curl -sf "$APP_URL" > /dev/null 2>&1; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [[ "$ELAPSED" -ge "$MAX_WAIT" ]]; then
      error "Dev server did not start within ${MAX_WAIT}s. Check /tmp/nextjs-dev.log"
      exit 1
    fi
    echo -n "."
  done
  echo ""
  info "Dev server ready at $APP_URL"
else
  # Verify server is up
  if ! curl -sf "$APP_URL" > /dev/null 2>&1; then
    error "No server at $APP_URL. Start the app first (npm run dev) or pass --start-dev."
    exit 1
  fi
  info "Using existing server at $APP_URL"
fi

# ── 2. Provision test users ───────────────────────────────────────────────────
info "Provisioning role test users…"
node scripts/provision-role-test-users.cjs

# ── 3. Run Playwright spec ────────────────────────────────────────────────────
info "Running RLS isolation spec: $SPEC"
info "Roles tested: admin, society_manager, buyer, supplier, security_guard, resident, security_supervisor"
echo ""

PLAYWRIGHT_HTML_OUTPUT_DIR="$REPORT_DIR" \
NEXT_PUBLIC_APP_URL="$APP_URL" \
  npx playwright test "$SPEC" \
    --project="chromium" \
    --reporter=list \
    $HEADED \
    || EXIT_CODE=$?

EXIT_CODE="${EXIT_CODE:-0}"

# ── 4. Report ─────────────────────────────────────────────────────────────────
echo ""
if [[ "$EXIT_CODE" -eq 0 ]]; then
  info "All RLS isolation tests PASSED ✓"
  info "HTML report: $REPORT_DIR/index.html"
else
  error "Some tests FAILED (exit code $EXIT_CODE)"
  warn "Open report: npx playwright show-report $REPORT_DIR"
  warn "Or run headed: ./run_rls_tests.sh --headed"
fi

# Auto-open report if on macOS
if [[ "$EXIT_CODE" -ne 0 ]] && command -v open &>/dev/null; then
  open "$REPORT_DIR/index.html" 2>/dev/null || true
fi

exit "$EXIT_CODE"
