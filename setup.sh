#!/usr/bin/env bash
# NexLearn — one-shot installer & runner.
# Works on Android/Termux, Linux, macOS, and Windows (Git Bash / WSL).
# Usage:  bash setup.sh          (clone, install, run both servers)
#         SKIP_RUN=1 bash setup.sh   (install only, don't start servers)

set -euo pipefail

REPO_URL="https://github.com/agastyatomar/NexLearn.git"
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$1"; }

step "NexLearn setup"

command -v curl >/dev/null 2>&1 || { echo "curl is required."; exit 1; }

# Termux: bootstrap git/curl via pkg when missing.
if ! command -v git >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then
    step "Installing git (Termux)"
    pkg install -y git
  else
    echo "git is required — install it first."; exit 1
  fi
fi

if ! command -v bun >/dev/null 2>&1; then
  step "Installing Bun runtime"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
command -v bun >/dev/null 2>&1 || { echo "Bun installation failed."; exit 1; }

# No Node? Let Bun stand in for `node` shebangs (Next.js bins).
command -v node >/dev/null 2>&1 || export BUN_BE_BUN=1

# Locate the app: already inside the repo, existing clone, or fresh clone.
if [ -f frontend/package.json ]; then
  APP_DIR="."
elif [ -d NexLearn/.git ]; then
  APP_DIR="NexLearn"
else
  step "Cloning NexLearn"
  git clone "$REPO_URL" NexLearn
  APP_DIR="NexLearn"
fi
cd "$APP_DIR"

step "Installing dependencies (frontend + backend)"
install_app() {
  (cd "$1" && bun install) && return 0
  # Android/Termux sometimes kills bun with a spurious SIGSYS after the
  # work is done — retry once, then verify node_modules is actually usable.
  warn "bun install exited non-zero for $1 — retrying + verifying"
  (cd "$1" && bun install) || true
  (cd "$1" && bun pm ls >/dev/null 2>&1)
}
install_app frontend || { echo "frontend dependency install failed"; exit 1; }
install_app backend  || { echo "backend dependency install failed"; exit 1; }

step "Preparing environment files"
if [ ! -f backend/.env ]; then
  SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  printf 'MONGODB_URI=mongodb://localhost:27017/nexlearn\nJWT_SECRET=%s\nPORT=4000\nFRONTEND_URL=http://localhost:3000\n' "$SECRET" > backend/.env
  echo "backend/.env created (random JWT_SECRET generated)."
fi
if [ ! -f frontend/.env.local ]; then
  if [ -f frontend/.env.example ]; then
    cp frontend/.env.example frontend/.env.local
  else
    printf 'NEXT_PUBLIC_SITE_URL=http://localhost:3000\nNEXT_PUBLIC_API_URL=http://localhost:4000\n' > frontend/.env.local
  fi
fi

if ! (echo > /dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  warn "MongoDB not detected on :27017 — server will run, but data routes return 503."
  warn "Install MongoDB locally or set MONGODB_URI in backend/.env"
fi

if [ "${SKIP_RUN:-0}" = "1" ]; then
  step "Install complete (SKIP_RUN=1 — servers not started)."
  exit 0
fi

step "Starting backend on http://localhost:4000"
(cd backend && bun dev) &
BE_PID=$!
trap 'kill "$BE_PID" 2>/dev/null || true' EXIT INT TERM

sleep 3
step "Starting frontend on http://localhost:3000  (Ctrl+C stops both)"
cd frontend
# Some Android/bun builds skip node_modules/.bin shims — invoke the
# local Next.js binary directly (node preferred, bun fallback).
if command -v node >/dev/null 2>&1; then NEXT=node; else NEXT=bun; fi
# Turbopack has no Android bindings — use webpack there; other
# platforms keep the default (Turbopack).
DEV_FLAGS=""
[ "$(uname -o 2>/dev/null)" = "Android" ] && DEV_FLAGS="--webpack"
$NEXT node_modules/next/dist/bin/next dev $DEV_FLAGS
