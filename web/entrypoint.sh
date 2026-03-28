#!/bin/sh
set -e

# Replace build-time placeholders with runtime environment variables
for file in /usr/share/nginx/html/assets/*.js; do
  sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL:-http://localhost:8000}|g" "$file"
  sed -i "s|__VITE_AUDIUS_APP_KEY__|${VITE_AUDIUS_APP_KEY}|g" "$file"
done

exec "$@"
