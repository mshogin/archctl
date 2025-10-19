#!/bin/bash

#
# DocHub Validator CLI - Docker Wrapper Script
# Convenient wrapper for running DocHub validator in Docker
#
# Copyright (C) 2024
# Licensed under the Apache License, Version 2.0
#

set -e

# Configuration
IMAGE_NAME="dochub-validator-cli:latest"
WORKSPACE_DIR="${WORKSPACE_DIR:-$(pwd)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Help message
show_help() {
    cat << EOF
DocHub Validator CLI - Docker Wrapper

Usage: $0 [OPTIONS] [-- VALIDATOR_OPTIONS]

Options:
  -h, --help              Show this help message
  -w, --workspace DIR     Workspace directory (default: current directory)
  -b, --build             Build Docker image before running
  -i, --image NAME        Docker image name (default: $IMAGE_NAME)
  --pull                  Pull latest DocHub before building

Examples:
  # Validate current directory
  $0

  # Validate specific directory
  $0 --workspace /path/to/manifests

  # Build image and validate
  $0 --build

  # Pass custom options to validator
  $0 -- --format json --output /workspace/report.json

  # Validate with verbose output
  $0 -- --verbose

  # Generate JSON report
  $0 -- --format json --pretty

Exit codes:
  0 - Validation passed
  1 - Validation failed (architecture issues)
  2 - Loading/parsing errors

For more information: https://dochub.info
EOF
}

# Parse arguments
BUILD=false
PULL=false
VALIDATOR_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -w|--workspace)
            WORKSPACE_DIR="$2"
            shift 2
            ;;
        -b|--build)
            BUILD=true
            shift
            ;;
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --pull)
            PULL=true
            shift
            ;;
        --)
            shift
            VALIDATOR_ARGS=("$@")
            break
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}" >&2
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Resolve workspace directory
WORKSPACE_DIR=$(cd "$WORKSPACE_DIR" && pwd)

# Check if workspace exists
if [ ! -d "$WORKSPACE_DIR" ]; then
    echo -e "${RED}Error: Workspace directory not found: $WORKSPACE_DIR${NC}" >&2
    exit 1
fi

# Build image if requested
if [ "$BUILD" = true ]; then
    echo -e "${YELLOW}Building Docker image: $IMAGE_NAME${NC}"

    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Pull latest DocHub if requested
    if [ "$PULL" = true ]; then
        echo -e "${YELLOW}Pulling latest DocHub...${NC}"
        cd "$SCRIPT_DIR"
        if [ -d "dochub" ]; then
            cd dochub && git pull && cd ..
        fi
    fi

    # Build image
    cd "$SCRIPT_DIR"
    docker build -t "$IMAGE_NAME" .

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Docker image built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build Docker image${NC}" >&2
        exit 1
    fi
fi

# Check if image exists
if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Docker image not found: $IMAGE_NAME${NC}"
    echo -e "${YELLOW}Building image now...${NC}"

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    docker build -t "$IMAGE_NAME" .

    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to build Docker image${NC}" >&2
        exit 1
    fi
fi

# Run validator
echo -e "${GREEN}Running DocHub validator...${NC}"
echo -e "${YELLOW}Workspace: $WORKSPACE_DIR${NC}"

# Prepare docker run command
DOCKER_CMD=(
    docker run
    --rm
    -v "$WORKSPACE_DIR:/workspace:ro"
)

# Pass through environment variables
if [ ! -z "$VUE_APP_DOCHUB_ROOT_MANIFEST" ]; then
    DOCKER_CMD+=(-e "VUE_APP_DOCHUB_ROOT_MANIFEST=$VUE_APP_DOCHUB_ROOT_MANIFEST")
fi

if [ ! -z "$VUE_APP_DOCHUB_METAMODEL" ]; then
    DOCKER_CMD+=(-e "VUE_APP_DOCHUB_METAMODEL=$VUE_APP_DOCHUB_METAMODEL")
fi

if [ ! -z "$VUE_APP_DOCHUB_ROLES_MODEL" ]; then
    DOCKER_CMD+=(-e "VUE_APP_DOCHUB_ROLES_MODEL=$VUE_APP_DOCHUB_ROLES_MODEL")
fi

if [ ! -z "$VUE_APP_DOCHUB_ROLES" ]; then
    DOCKER_CMD+=(-e "VUE_APP_DOCHUB_ROLES=$VUE_APP_DOCHUB_ROLES")
fi

# Add image name
DOCKER_CMD+=("$IMAGE_NAME")

# Add validator arguments
if [ ${#VALIDATOR_ARGS[@]} -gt 0 ]; then
    DOCKER_CMD+=("${VALIDATOR_ARGS[@]}")
else
    DOCKER_CMD+=(--workspace /workspace)
fi

# Execute
"${DOCKER_CMD[@]}"
EXIT_CODE=$?

# Show result
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Validation completed successfully${NC}"
else
    echo -e "${RED}✗ Validation failed (exit code: $EXIT_CODE)${NC}"
fi

exit $EXIT_CODE
