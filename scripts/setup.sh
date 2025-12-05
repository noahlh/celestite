#!/bin/bash
set -e

echo "Setting up Celestite..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo ""
    echo "Bun is required but not installed."
    echo ""
    echo "Please install Bun using one of these methods:"
    echo ""
    echo "  macOS (Homebrew):"
    echo "    brew install oven-sh/bun/bun"
    echo ""
    echo "  Linux/macOS (curl):"
    echo "    curl -fsSL https://bun.sh/install | bash"
    echo ""
    echo "  Windows:"
    echo "    powershell -c \"irm bun.sh/install.ps1 | iex\""
    echo ""
    echo "After installing Bun, run 'shards install' again."
    exit 1
fi

echo "Bun found: $(bun --version)"

# Install JavaScript dependencies
echo "Installing JavaScript dependencies..."
bun install

echo ""
echo "Celestite setup complete!"