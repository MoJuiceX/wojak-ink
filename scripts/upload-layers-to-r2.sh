#!/usr/bin/env bash
# Upload wojak layer assets to Cloudflare R2
#
# Prerequisites:
#   1. Install rclone: brew install rclone
#   2. Configure R2 remote (run: rclone config):
#      - Name: r2
#      - Type: s3
#      - Provider: Cloudflare
#      - Access Key ID: <from R2 API tokens>
#      - Secret Access Key: <from R2 API tokens>
#      - Endpoint: https://<account-id>.r2.cloudflarestorage.com
#      - ACL: leave blank (R2 doesn't use ACL)
#   3. Create bucket in Cloudflare dashboard: wojak-layers
#   4. Configure custom domain: layers.wojak.ink
#   5. Configure CORS policy (see Spec 1 in docs/plans/)
#   6. Add Transform Rule for Vary: Origin header
#   7. Add Transform Rule for Cache-Control: immutable
#
# Usage:
#   ./scripts/upload-layers-to-r2.sh          # Full upload
#   ./scripts/upload-layers-to-r2.sh --dry-run  # Preview only
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/public/assets/wojak-layers"
R2_BUCKET="r2:wojak-layers"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Source directory not found: $SOURCE_DIR"
  exit 1
fi

if ! command -v rclone &> /dev/null; then
  echo "ERROR: rclone not installed. Run: brew install rclone"
  exit 1
fi

# Check rclone has r2 remote configured
if ! rclone listremotes | grep -q "^r2:"; then
  echo "ERROR: rclone 'r2' remote not configured. Run: rclone config"
  exit 1
fi

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "=== DRY RUN — no files will be uploaded ==="
fi

echo "Uploading layers from: $SOURCE_DIR"
echo "Uploading to:          $R2_BUCKET"
echo ""

rclone copy "$SOURCE_DIR" "$R2_BUCKET/" \
  --header-upload='Cache-Control: public, max-age=31536000, immutable' \
  --transfers=16 \
  --checkers=8 \
  --progress \
  --stats-one-line \
  $DRY_RUN

echo ""
echo "=== Upload complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify CORS: curl -I -H 'Origin: https://wojak.ink' https://layers.wojak.ink/manifest.json"
echo "  2. Set VITE_LAYER_BASE_URL=https://layers.wojak.ink in Cloudflare Pages env vars"
echo "  3. Deploy frontend"
echo "  4. Test canvas export (toBlob/toDataURL) for CORS tainting"
echo "  5. Purge Cloudflare cache: layers.wojak.ink"
