#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ $# -eq 0 ]]; then
  set -- \
    .github/workflows/infra-validate.yml \
    .github/workflows/terraform.yml \
    .github/workflows/canary-deploy.yml \
    .github/workflows/auto-rollback.yml
fi

if command -v actionlint >/dev/null 2>&1; then
  actionlint -color -oneline "$@"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker run --rm -v "$ROOT":/repo -w /repo rhysd/actionlint:1.7.4 -color -oneline "$@"
else
  VERSION="1.7.4"
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64|aarch64) ARCH="arm64" ;;
    x86_64|amd64) ARCH="amd64" ;;
    *) echo "[workflow-validate] unsupported arch: $ARCH" >&2; exit 2 ;;
  esac
  CACHE_DIR="$ROOT/.tmp/tools/actionlint/$VERSION/$OS-$ARCH"
  BIN="$CACHE_DIR/actionlint"
  if [[ ! -x "$BIN" ]]; then
    mkdir -p "$CACHE_DIR"
    ARCHIVE="$CACHE_DIR/actionlint.tar.gz"
    URL="https://github.com/rhysd/actionlint/releases/download/v${VERSION}/actionlint_${VERSION}_${OS}_${ARCH}.tar.gz"
    echo "[workflow-validate] downloading actionlint v${VERSION} (${OS}/${ARCH})"
    curl -fsSL "$URL" -o "$ARCHIVE"
    tar -xzf "$ARCHIVE" -C "$CACHE_DIR" actionlint
    chmod +x "$BIN"
  fi
  "$BIN" -color -oneline "$@"
fi
