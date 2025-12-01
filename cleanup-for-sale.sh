#!/bin/bash

echo "========================================"
echo " AI Phone Agents Dashboard"
echo " Cleanup Script for Whop Distribution"
echo "========================================"
echo ""

echo "[1/7] Removing node_modules..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "   ✓ DONE - node_modules deleted"
else
    echo "   ⊘ SKIP - node_modules not found"
fi

echo ""
echo "[2/7] Removing .next build folder..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "   ✓ DONE - .next deleted"
else
    echo "   ⊘ SKIP - .next not found"
fi

echo ""
echo "[3/7] Removing .env.local (your secrets)..."
if [ -f ".env.local" ]; then
    rm .env.local
    echo "   ✓ DONE - .env.local deleted"
else
    echo "   ⊘ SKIP - .env.local not found"
fi

echo ""
echo "[4/7] Removing test page..."
if [ -f "app/test/page.tsx" ]; then
    rm app/test/page.tsx
    echo "   ✓ DONE - test page deleted"
else
    echo "   ⊘ SKIP - test page not found"
fi

echo ""
echo "[5/7] Removing unused SVG files..."
cd public
rm -f file.svg globe.svg next.svg vercel.svg window.svg 2>/dev/null
cd ..
echo "   ✓ DONE - unused SVGs deleted"

echo ""
echo "[6/7] Removing package-lock.json (optional)..."
if [ -f "package-lock.json" ]; then
    rm package-lock.json
    echo "   ✓ DONE - package-lock.json deleted"
else
    echo "   ⊘ SKIP - package-lock.json not found"
fi

echo ""
echo "[7/7] Removing .git folder (optional)..."
read -p "Remove Git history? This can't be undone! (y/N): " remove_git
if [[ "$remove_git" =~ ^[Yy]$ ]]; then
    if [ -d ".git" ]; then
        rm -rf .git
        echo "   ✓ DONE - .git deleted"
    else
        echo "   ⊘ SKIP - .git not found"
    fi
else
    echo "   ⊘ SKIP - Git history kept"
fi

echo ""
echo "========================================"
echo " Cleanup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo " 1. Verify START_HERE.md exists"
echo " 2. Verify LICENSE.txt exists"
echo " 3. Verify .env.example exists"
echo " 4. Create ZIP file of entire folder"
echo " 5. Upload to Whop"
echo ""
echo "Your ZIP file should be 500KB - 2MB"
echo "If larger, you forgot to delete something!"
echo ""
