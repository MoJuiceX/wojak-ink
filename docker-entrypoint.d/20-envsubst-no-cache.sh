#!/bin/sh
set -e

# Enable no-cache headers if ENABLE_NO_CACHE is set to "true"
if [ "$ENABLE_NO_CACHE" = "true" ]; then
    CONFIG_FILE="/etc/nginx/conf.d/default.conf"
    
    # Uncomment all no-cache headers (works for both location blocks)
    sed -i 's|^        # add_header Cache-Control "no-cache, no-store, must-revalidate" always;|        add_header Cache-Control "no-cache, no-store, must-revalidate" always;|g' "$CONFIG_FILE"
    sed -i 's|^        # add_header Pragma "no-cache" always;|        add_header Pragma "no-cache" always;|g' "$CONFIG_FILE"
    sed -i 's|^        # add_header Expires "0" always;|        add_header Expires "0" always;|g' "$CONFIG_FILE"
    
    # Comment out default caching headers for static assets
    sed -i 's|^        expires 1y;|        # expires 1y;|' "$CONFIG_FILE"
    sed -i 's|^        add_header Cache-Control "public, immutable";|        # add_header Cache-Control "public, immutable";|' "$CONFIG_FILE"
fi
