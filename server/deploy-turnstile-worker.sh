#!/bin/bash

# Cloudflare Worker deployment script for Turnstile verification
# Usage: ./deploy-turnstile-worker.sh [environment]
# Environment: dev (default) | staging | production

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying Turnstile Worker to $ENVIRONMENT environment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Change to server directory
cd "$SCRIPT_DIR"

# Check if wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo "❌ wrangler.toml not found. Please create it first."
    exit 1
fi

# Check if environment-specific config exists
ENV_CONFIG="wrangler.${ENVIRONMENT}.toml"
if [ -f "$ENV_CONFIG" ]; then
    echo "📝 Using environment-specific config: $ENV_CONFIG"
    cp "$ENV_CONFIG" "wrangler.toml"
fi

# Verify secret key is set
echo "🔑 Checking if TURNSTILE_SECRET_KEY is configured..."
if ! wrangler secret list | grep -q "TURNSTILE_SECRET_KEY"; then
    echo "⚠️  TURNSTILE_SECRET_KEY not found."
    echo "Please set it using: wrangler secret put TURNSTILE_SECRET_KEY"
    read -p "Do you want to set it now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put TURNSTILE_SECRET_KEY
    else
        echo "❌ Deployment cancelled. Secret key is required."
        exit 1
    fi
fi

# Deploy the worker
echo "📦 Deploying worker..."
DEPLOY_OUTPUT=$(wrangler deploy 2>&1)
echo "$DEPLOY_OUTPUT"

echo "✅ Deployment complete!"

# Extract worker URL from deploy output or construct it
WORKER_NAME=$(grep "name" wrangler.toml | cut -d'"' -f2)
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o "https://[^[:space:]]*\.workers\.dev" | head -1)

if [ -z "$WORKER_URL" ]; then
    # Fallback: try to get subdomain from wrangler whoami
    SUBDOMAIN=$(wrangler whoami 2>/dev/null | grep -o "[^[:space:]]*\.workers\.dev" | head -1 | cut -d'.' -f1)
    if [ ! -z "$SUBDOMAIN" ] && [ ! -z "$WORKER_NAME" ]; then
        WORKER_URL="https://${SUBDOMAIN}.workers.dev"
    fi
fi

if [ ! -z "$WORKER_URL" ]; then
    echo "🌐 Worker available at: $WORKER_URL"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test the worker with a POST request"
    echo "2. Update your application config to use this URL"
    echo "3. Configure ALLOWED_ORIGINS if needed"
else
    echo "⚠️  Could not determine worker URL. Check Cloudflare Dashboard."
fi

echo ""
echo "💡 Testing your worker:"
echo "curl -X POST https://your-worker.workers.dev \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"token\":\"test-token\"}'"
