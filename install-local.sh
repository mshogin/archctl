#!/bin/bash

#
# Local Installation Script for archctl
# Creates a symlink to make arch-validate available globally
#
# This allows you to:
# - Use arch-validate from anywhere
# - Changes in this repo are immediately reflected
# - No need to reinstall after updates
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_FILE="$SCRIPT_DIR/bin/arch-validate"

# Detect installation directory
if command -v brew &> /dev/null; then
    # Homebrew installation
    INSTALL_DIR="$(brew --prefix)/bin"
elif [ -d "/usr/local/bin" ]; then
    # Standard Unix location
    INSTALL_DIR="/usr/local/bin"
else
    echo -e "${RED}Error: Could not find suitable installation directory${NC}"
    echo "Please manually create a symlink:"
    echo "  sudo ln -s $BIN_FILE /usr/local/bin/arch-validate"
    exit 1
fi

TARGET="$INSTALL_DIR/arch-validate"

# Check if arch-validate already exists
if [ -e "$TARGET" ]; then
    echo -e "${YELLOW}arch-validate already exists at: $TARGET${NC}"

    # Check if it's already pointing to our script
    if [ -L "$TARGET" ]; then
        CURRENT_TARGET=$(readlink "$TARGET")
        if [ "$CURRENT_TARGET" = "$BIN_FILE" ]; then
            echo -e "${GREEN}✓ Already correctly installed${NC}"
            exit 0
        fi
    fi

    read -p "Remove existing installation and install from this repo? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 1
    fi

    echo "Removing existing installation..."
    rm "$TARGET"
fi

# Create symlink
echo "Creating symlink: $TARGET -> $BIN_FILE"
ln -s "$BIN_FILE" "$TARGET"

# Verify installation
if [ -L "$TARGET" ] && [ -e "$TARGET" ]; then
    echo -e "${GREEN}✓ Successfully installed arch-validate${NC}"
    echo ""
    echo "You can now use 'arch-validate' from anywhere!"
    echo "Any changes to this repository will be immediately available."
    echo ""
    echo "Test it:"
    echo "  cd /path/to/your/architecture"
    echo "  arch-validate"
else
    echo -e "${RED}✗ Installation failed${NC}"
    exit 1
fi

# Show version
echo ""
echo "Installation details:"
echo "  Command: arch-validate"
echo "  Location: $TARGET"
echo "  Source: $BIN_FILE"
echo "  Version: $(cd "$SCRIPT_DIR" && node -p "require('./package.json').version")"
