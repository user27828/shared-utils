#!/bin/bash

# update-source-data.sh
# Script to download and update source data files for countries and languages
# Usage: ./update-source-data.sh
#
# This script downloads source data from official sources and saves them
# to the data/source directory for processing into our application data.

# Don't exit on errors for individual downloads
# set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/data/source"

# Ensure source directory exists
mkdir -p "$SOURCE_DIR"

echo -e "${BLUE}🌍 Updating source data files...${NC}"
echo "Project root: $PROJECT_ROOT"
echo "Source directory: $SOURCE_DIR"
echo ""

# Data source configuration
# Format: "URL|destination_filename|description"
declare -a DATA_SOURCES=(
  "https://www.loc.gov/standards/iso639-2/ISO-639-2_utf-8.txt|languages.txt|ISO 639-2 Language Codes from Library of Congress"
  "https://datahub.io/core/country-codes/r/country-codes.csv|countries.csv|Country Codes from DataHub.io"
)

# Function to download a file with progress and validation
download_file() {
  local url="$1"
  local dest_file="$2"
  local description="$3"
  local dest_path="$SOURCE_DIR/$dest_file"

  echo -e "${YELLOW}📥 Downloading: $description${NC}"
  echo "   URL: $url"
  echo "   Destination: $dest_path"

  # Create backup if file exists (single .bak.gz file with max compression)
  if [[ -f "$dest_path" ]]; then
    echo -e "   ${BLUE}ℹ️  Creating compressed backup of existing file...${NC}"
    # Remove old backup files if they exist
    rm -f "$dest_path.bak.gz" "$dest_path.bak"
    # Use gzip with maximum compression level (-9)
    gzip -9c "$dest_path" >"$dest_path.bak.gz"
    echo -e "   ${BLUE}ℹ️  Backup compressed to $(basename "$dest_path").bak.gz${NC}"
  fi

  # Download with curl, following redirects and showing progress
  if curl -L --fail --show-error --progress-bar -o "$dest_path.tmp" "$url"; then
    # Verify the file is not empty
    if [[ -s "$dest_path.tmp" ]]; then
      mv "$dest_path.tmp" "$dest_path"
      echo -e "   ${GREEN}✅ Successfully downloaded $dest_file${NC}"

      # Show file info
      local file_size=$(du -h "$dest_path" | cut -f1)
      local line_count=$(wc -l <"$dest_path" 2>/dev/null || echo "N/A")
      echo -e "   ${BLUE}ℹ️  File size: $file_size, Lines: $line_count${NC}"
    else
      rm -f "$dest_path.tmp"
      echo -e "   ${RED}❌ Downloaded file is empty: $dest_file${NC}"
      return 1
    fi
  else
    rm -f "$dest_path.tmp"
    echo -e "   ${RED}❌ Failed to download: $dest_file${NC}"
    return 1
  fi

  echo ""
}

# Main download loop
success_count=0
total_count=${#DATA_SOURCES[@]}

for source in "${DATA_SOURCES[@]}"; do
  IFS='|' read -r url dest_file description <<<"$source"

  if download_file "$url" "$dest_file" "$description"; then
    ((success_count++))
  else
    echo -e "${RED}⚠️  Warning: Failed to download $dest_file${NC}"
    echo ""
  fi
done

# Summary
echo -e "${BLUE}📊 Download Summary:${NC}"
echo "   Successfully downloaded: $success_count/$total_count files"

if [[ $success_count -eq $total_count ]]; then
  echo -e "${GREEN}🎉 All source data files updated successfully!${NC}"
  echo ""
  echo -e "${BLUE}📁 Downloaded files:${NC}"
  ls -la "$SOURCE_DIR"
  echo ""
  echo -e "${YELLOW}💡 Next steps:${NC}"
  echo "   - Review the downloaded files for any changes"
  echo "   - Update the data processing scripts if needed"
  echo "   - Regenerate application data files from these sources"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some downloads failed. Check the output above for details.${NC}"
  exit 1
fi
