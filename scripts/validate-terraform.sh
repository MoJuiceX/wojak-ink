#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform"

if [[ ! -d "$TF_DIR" ]]; then
  echo "[terraform-validate] terraform directory not found" >&2
  exit 1
fi

run_terraform() {
  if command -v terraform >/dev/null 2>&1; then
    terraform -chdir="$TF_DIR" "$@"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker run --rm -v "$ROOT":/work -w /work/terraform hashicorp/terraform:1.11.4 "$@"
    return
  fi

  local os arch version cache_dir bin zip url
  version="1.11.4"
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="amd64" ;;
    *) echo "[terraform-validate] unsupported arch: $arch" >&2; exit 2 ;;
  esac
  cache_dir="$ROOT/.tmp/tools/terraform/$version/$os-$arch"
  bin="$cache_dir/terraform"
  if [[ ! -x "$bin" ]]; then
    mkdir -p "$cache_dir"
    zip="$cache_dir/terraform.zip"
    url="https://releases.hashicorp.com/terraform/${version}/terraform_${version}_${os}_${arch}.zip"
    echo "[terraform-validate] downloading terraform ${version} (${os}/${arch})"
    curl -fsSL "$url" -o "$zip"
    unzip -oq "$zip" -d "$cache_dir"
    chmod +x "$bin"
  fi
  "$bin" -chdir="$TF_DIR" "$@"
}

run_terraform fmt -check -recursive
run_terraform init -backend=false -input=false
run_terraform validate

echo "[terraform-validate] PASS"
