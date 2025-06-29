#!/bin/bash

# Script to rebuild and repackage shared-utils for local development
# This solves the Yarn "Couldn't allocate enough memory" issue when using file:// dependencies

set -e

cd "$(dirname "$0")/.."

echo "🔨 Building shared-utils..."
yarn build

echo "📝 Copying TypeScript declaration files..."
# Ensure dist directories exist
mkdir -p dist/client
mkdir -p dist/utils
mkdir -p dist/server

# Fix the client index.d.ts file to include all exports (TypeScript compiler issue workaround)
echo "🔧 Fixing client index.d.ts to include all exports..."
cat >dist/client/index.d.ts <<'EOF'
/**
 * TypeScript declarations for client components and utilities
 */

// Components
export * from "./src/components/wysiwyg/TinyMceBundle";
export * from "./src/components/wysiwyg/TinyMceEditor";
export {
  default as CountrySelect,
  type CountrySelectProps,
} from "./src/components/form/CountrySelect";
export {
  default as LanguageSelect,
  type LanguageSelectProps,
} from "./src/components/form/LanguageSelect";

// Helpers
export * from "./src/helpers/functions";
export * from "./src/helpers/countries";
export * from "./src/helpers/languages";
export * from "./src/helpers/csv";
export {
  formatDate,
  parseDate,
  addToDate,
  dateDifference,
  isValidDate,
  getRelativeTime,
  getTimezoneInfo,
  getTimezoneOffset,
  isLeapYear,
  getDaysInMonth,
} from "./src/helpers/date-utils";

// Data
export * from "./src/data/countries";
export * from "./src/data/languages";
export * from "./src/data/demographic-options";
EOF

# Copy .d.ts files from source to dist
if [ -f "client/index.d.ts" ]; then
  cp client/index.d.ts dist/client/index.d.ts.backup
fi
if [ -d "client/src" ]; then
  find client/src -name "*.d.ts" -exec cp --parents {} dist/ \;
fi

if [ -f "utils/index.d.ts" ]; then
  cp utils/index.d.ts dist/utils/
fi
if [ -d "utils/src" ]; then
  find utils/src -name "*.d.ts" -exec cp --parents {} dist/ \;
fi

if [ -f "server/index.d.ts" ]; then
  cp server/index.d.ts dist/server/
fi
if [ -d "server/src" ]; then
  find server/src -name "*.d.ts" -exec cp --parents {} dist/ \;
fi

echo "📦 Creating package tarball..."
# Create packages directory if it doesn't exist
mkdir -p test-consumer/packages

# Clean old packages and create new one
rm -f test-consumer/packages/user27828-shared-utils-*.tgz
npm pack --pack-destination test-consumer/packages

echo "🔄 Updating test-consumer dependency..."
TARBALL=$(ls test-consumer/packages/user27828-shared-utils-*.tgz | head -1)
if [ -z "$TARBALL" ]; then
  echo "❌ Error: No tarball found"
  exit 1
fi

# Extract just the filename for package.json reference
TARBALL_NAME=$(basename "$TARBALL")

# Update package.json in test-consumer
cd test-consumer/react-app
yarn remove @user27828/shared-utils 2>/dev/null || true
yarn add "@user27828/shared-utils@file:../packages/$TARBALL_NAME"

echo "🔄 Installing dependencies..."
yarn install

echo "📋 Manually copying TypeScript declaration files..."
# Extract and copy .d.ts files from the tarball to ensure they're available
cd /tmp
rm -rf shared-utils-extract
mkdir shared-utils-extract
cd shared-utils-extract
tar -xzf "/home/marc314/work/misc/shared-utils/test-consumer/packages/$TARBALL_NAME"

# Copy .d.ts files to the installed package
TARGET_DIR="/home/marc314/work/misc/shared-utils/test-consumer/react-app/node_modules/@user27828/shared-utils"
if [ -d "$TARGET_DIR" ]; then
  cp -r package/dist/* "$TARGET_DIR/dist/"
  echo "✅ TypeScript declaration files copied successfully"
else
  echo "❌ Target directory not found: $TARGET_DIR"
fi

# Clean up
cd /tmp
rm -rf shared-utils-extract

echo "✅ Package updated successfully!"
echo "📁 Tarball: $TARBALL_NAME"
echo "� Ready to run: From test-consumer dir: yarn dev, from root shared-utils dir: yarn test:consumer"
