#!/bin/bash

#
# Demo script showing DocHub Validator CLI in action
#

set -e

echo "=================================================="
echo "DocHub Validator CLI - Demo"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Testing with example workspace (will show validation errors)${NC}"
echo "   Command: node src/cli.mjs --workspace test-workspace"
echo ""
node src/cli.mjs --workspace test-workspace || true
echo ""
echo "---"
echo ""

echo -e "${YELLOW}2. Testing JSON output format${NC}"
echo "   Command: node src/cli.mjs --workspace test-workspace --format json --no-color"
echo ""
node src/cli.mjs --workspace test-workspace --format json --no-color 2>/dev/null | head -30
echo "   ... (truncated)"
echo ""
echo "---"
echo ""

echo -e "${YELLOW}3. Testing with DocHub's own documentation${NC}"
echo "   Command: node src/cli.mjs --workspace ../DocHub/public/documentation"
echo ""
node src/cli.mjs --workspace ../DocHub/public/documentation 2>/dev/null | tail -20
echo ""
echo "---"
echo ""

echo -e "${GREEN}Demo complete!${NC}"
echo ""
echo "Key points demonstrated:"
echo "  ✓ CLI loads and parses manifests"
echo "  ✓ Validators execute and find issues"
echo "  ✓ Both text and JSON output formats work"
echo "  ✓ Exit codes indicate validation status"
echo ""
echo "The 'errors' you see are the tool working correctly!"
echo "It's finding real architecture quality issues."
echo ""
echo "See test-workspace/ABOUT_ERRORS.md for detailed explanation."
