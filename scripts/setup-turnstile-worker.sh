#!/bin/bash

# Turnstile Worker Setup Script for Consuming Projects
# This script copies the necessary files from shared-utils to set up
# a deployable Turnstile worker in your project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(pwd)"
WORKER_DIR="$PROJECT_ROOT/workers/turnstile"
SHARED_UTILS_PATH=""

# Function to display usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Setup Turnstile Cloudflare Worker in your project using shared-utils"
  echo ""
  echo "Options:"
  echo "  -p, --path PATH     Path to shared-utils (default: node_modules/shared-utils)"
  echo "  -d, --dir DIR       Target directory for worker (default: workers/turnstile)"
  echo "  -n, --name NAME     Worker name for wrangler.toml (default: PROJECT_NAME-turnstile)"
  echo "  -o, --origins URLS  Comma-separated allowed origins"
  echo "  -h, --help         Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0                                           # Use defaults"
  echo "  $0 --name my-app-turnstile                  # Custom worker name"
  echo "  $0 --origins 'https://myapp.com,https://www.myapp.com'"
  echo "  $0 --path ../shared-utils                   # Local development"
}

# Parse command line arguments
WORKER_NAME=""
ALLOWED_ORIGINS=""

while [[ $# -gt 0 ]]; do
  case $1 in
  -p | --path)
    SHARED_UTILS_PATH="$2"
    shift 2
    ;;
  -d | --dir)
    WORKER_DIR="$2"
    shift 2
    ;;
  -n | --name)
    WORKER_NAME="$2"
    shift 2
    ;;
  -o | --origins)
    ALLOWED_ORIGINS="$2"
    shift 2
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    echo "❌ Unknown option: $1"
    usage
    exit 1
    ;;
  esac
done

# Default shared-utils path
if [[ -z "$SHARED_UTILS_PATH" ]]; then
  if [[ -d "$PROJECT_ROOT/node_modules/@user27828/shared-utils" ]]; then
    SHARED_UTILS_PATH="$PROJECT_ROOT/node_modules/@user27828/shared-utils"
  elif [[ -d "$PROJECT_ROOT/node_modules/shared-utils" ]]; then
    SHARED_UTILS_PATH="$PROJECT_ROOT/node_modules/shared-utils"
  elif [[ -d "$PROJECT_ROOT/node_modules/@shared-utils/server" ]]; then
    SHARED_UTILS_PATH="$PROJECT_ROOT/node_modules/@shared-utils"
  else
    echo "❌ Could not find shared-utils. Please specify path with --path"
    echo "💡 Make sure shared-utils is installed:"
    echo "   yarn add @user27828/shared-utils@https://github.com/user27828/shared-utils.git#master"
    echo "   # or"
    echo "   npm install @user27828/shared-utils@https://github.com/user27828/shared-utils.git#master"
    exit 1
  fi
fi

# Determine server path
if [[ -d "$SHARED_UTILS_PATH/server" ]]; then
  SERVER_PATH="$SHARED_UTILS_PATH/server"
elif [[ -d "$SHARED_UTILS_PATH" ]] && [[ -f "$SHARED_UTILS_PATH/turnstile-worker.ts" ]]; then
  SERVER_PATH="$SHARED_UTILS_PATH"
else
  echo "❌ Could not find server directory in $SHARED_UTILS_PATH"
  exit 1
fi

# Default worker name from package.json
if [[ -z "$WORKER_NAME" ]]; then
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    PACKAGE_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
    WORKER_NAME="${PACKAGE_NAME}-turnstile"
  else
    WORKER_NAME="turnstile-verifier"
  fi
fi

echo "🚀 Setting up Turnstile Worker..."
echo "📂 Source: $SERVER_PATH"
echo "📂 Target: $WORKER_DIR"
echo "🏷️  Worker Name: $WORKER_NAME"

# Create worker directory
mkdir -p "$WORKER_DIR"

# Copy worker files
echo "📋 Copying worker files..."
cp "$SERVER_PATH/turnstile-worker.ts" "$WORKER_DIR/"
cp "$SERVER_PATH/deploy-turnstile-worker.sh" "$WORKER_DIR/"
cp -r "$SERVER_PATH/src" "$WORKER_DIR/"

# Make deployment script executable
chmod +x "$WORKER_DIR/deploy-turnstile-worker.sh"

# Create customized wrangler.toml
echo "⚙️  Creating wrangler.toml..."
cat >"$WORKER_DIR/wrangler.toml" <<EOF
name = "$WORKER_NAME"
main = "turnstile-worker.ts"
compatibility_date = "2024-12-01"

# Environment variables (configure these for your app)
[vars]
EOF

if [[ -n "$ALLOWED_ORIGINS" ]]; then
  echo "ALLOWED_ORIGINS = \"$ALLOWED_ORIGINS\"" >>"$WORKER_DIR/wrangler.toml"
else
  echo "# ALLOWED_ORIGINS = \"https://yourdomain.com,https://www.yourdomain.com\"" >>"$WORKER_DIR/wrangler.toml"
fi

cat >>"$WORKER_DIR/wrangler.toml" <<EOF

# Secrets (set these via \`wrangler secret put TURNSTILE_SECRET_KEY\`)
# TURNSTILE_SECRET_KEY = "your-turnstile-secret-key"

# Environment-specific configurations
[env.staging.vars]
# ALLOWED_ORIGINS = "https://staging.yourdomain.com"

[env.development.vars]
# ALLOWED_ORIGINS = "*"

# Route configuration (uncomment and modify for custom domain)
# [[routes]]
# pattern = "yourdomain.com/api/turnstile/*"
# zone_name = "yourdomain.com"
EOF

# Create package.json scripts helper
PACKAGE_JSON_SCRIPTS=""
if [[ -f "$PROJECT_ROOT/package.json" ]]; then
  echo "📝 Suggested package.json scripts:"
  cat <<EOF

Add these scripts to your package.json:

{
  "scripts": {
    "cf:setup-turnstile": "bash scripts/setup-turnstile-worker.sh",
    "cf:deploy-turnstile": "cd workers/turnstile && ./deploy-turnstile-worker.sh",
    "cf:deploy-turnstile:dev": "cd workers/turnstile && ./deploy-turnstile-worker.sh dev",
    "cf:deploy-turnstile:staging": "cd workers/turnstile && ./deploy-turnstile-worker.sh staging",
    "cf:deploy-turnstile:production": "cd workers/turnstile && ./deploy-turnstile-worker.sh production"
  }
}
EOF
fi

# Create README for the worker
echo "📖 Creating worker README..."
cat >"$WORKER_DIR/README.md" <<EOF
# Turnstile Worker

This Cloudflare Worker handles Turnstile token verification for your application.

## Setup

1. **Configure your worker name and origins** in \`wrangler.toml\`

2. **Set your Turnstile secret key**:
   \`\`\`bash
   wrangler secret put TURNSTILE_SECRET_KEY
   \`\`\`

3. **Deploy the worker**:
   \`\`\`bash
   ./deploy-turnstile-worker.sh production
   \`\`\`

## Environment-Specific Deployment

\`\`\`bash
./deploy-turnstile-worker.sh dev        # Development
./deploy-turnstile-worker.sh staging    # Staging
./deploy-turnstile-worker.sh production # Production
\`\`\`

## Configuration

Edit \`wrangler.toml\` to customize:
- Worker name
- Allowed origins
- Environment-specific settings
- Custom domain routing (optional)

## Development

Test locally with:
\`\`\`bash
wrangler dev
\`\`\`

## Usage

Once deployed, use the worker URL for server-side Turnstile verification:

\`\`\`javascript
const response = await fetch('https://your-worker.your-subdomain.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: turnstileToken,
    remoteip: clientIP
  })
});

const result = await response.json();
if (result.success) {
  // Token verified successfully
}
\`\`\`
EOF

echo ""
echo "✅ Turnstile Worker setup complete!"
echo ""
echo "📂 Files created in: $WORKER_DIR"
echo "   ├── turnstile-worker.ts"
echo "   ├── wrangler.toml"
echo "   ├── deploy-turnstile-worker.sh"
echo "   ├── src/"
echo "   └── README.md"
echo ""
echo "🔧 Next steps:"
echo "   1. Review and customize $WORKER_DIR/wrangler.toml"
echo "   2. Set your Turnstile secret: cd $WORKER_DIR && wrangler secret put TURNSTILE_SECRET_KEY"
echo "   3. Deploy: cd $WORKER_DIR && ./deploy-turnstile-worker.sh production"
echo ""
echo "📖 See $WORKER_DIR/README.md for detailed instructions"
