#!/bin/sh
# Docker script to generate env vars for the client bundle
outFile="/app/client/dist/env.js"
echo "window.__ENV__ = {" > "$outFile"
echo "  VITE_CLIENT_PORT: '${VITE_CLIENT_PORT}'," >> "$outFile"
echo "  VITE_HOST_API_URI: '${VITE_HOST_API_URI}'," >> "$outFile"
echo "  VITE_HOST_API_PORT: '${VITE_HOST_API_PORT}'," >> "$outFile"
echo "  VITE_HOST_API_URL: '${VITE_HOST_API_URL}'," >> "$outFile"
echo "  ANALYTICS_URI: '${ANALYTICS_URI}'," >> "$outFile"
echo "  ANALYTICS_URI_CLIENT: '${ANALYTICS_URI_CLIENT}'" >> "$outFile"
echo "};" >> "$outFile"

echo "Environment variables injected into env.js:"
cat "$outFile"

exec "$@"
