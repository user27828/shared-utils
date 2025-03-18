#!/bin/bash
set -e

# Load env variables from .env
echo "Loading environment variables from .env"
if [ -f ".env" ]; then
  while IFS= read -r line; do
    # trim whitespace and comments
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    if [[ "${line:0:1}" == "#" ]]; then
        continue # Skip lines starting with #
    fi
    # Split the line based on the first "=" ONLY IF not inside quotes
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      # Remove quotes
      if [[ "${value:0:1}" == "\"" && "${value: -1}" == "\"" ]]; then
        value="${value:1:-1}"
      fi
      # Trim key/value
      key=$(echo "$key" | tr -d '[:space:]')
      value=$(echo "$value" | tr -d '[:space:]')
      export "$key"="$value"
    fi

  done < .env
fi

# Build the Docker images using docker-compose, passing in environment variables
echo "Building Docker images using docker-compose"
echo "After completion, you can run: docker-compose up"
echo "Use --no-cache when appropriate"
docker-compose build "$@"