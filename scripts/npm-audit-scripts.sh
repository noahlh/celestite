#!/bin/bash
# Script to audit install scripts in npm packages
# Helps identify packages that want to run preinstall/postinstall scripts

set -e

echo "🔍 Auditing npm package install scripts..."
echo "=========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Run 'npm install' first."
    exit 1
fi

echo "Packages with install scripts:"
echo ""

# Find all package.json files and check for install-related scripts
find node_modules -name "package.json" -type f | while read -r pkg; do
    # Extract package name and scripts
    name=$(node -pe "try { JSON.parse(require('fs').readFileSync('$pkg', 'utf8')).name } catch(e) { '' }")

    if [ -n "$name" ]; then
        # Check for install-related scripts
        scripts=$(node -pe "
            try {
                const pkg = JSON.parse(require('fs').readFileSync('$pkg', 'utf8'));
                const installScripts = [];
                ['preinstall', 'install', 'postinstall', 'prepare'].forEach(hook => {
                    if (pkg.scripts && pkg.scripts[hook]) {
                        installScripts.push(hook + ': ' + pkg.scripts[hook]);
                    }
                });
                installScripts.join(' | ');
            } catch(e) { '' }
        ")

        if [ -n "$scripts" ]; then
            echo "📦 $name"
            echo "   $scripts"
            echo ""
        fi
    fi
done

echo ""
echo "=========================================="
echo "✅ Audit complete"
echo ""
echo "💡 Your .npmrc is configured with 'ignore-scripts=true'"
echo "   This prevents automatic execution of these scripts."
echo ""
echo "   To allow scripts for a specific package:"
echo "   npm rebuild <package-name> --ignore-scripts=false"
