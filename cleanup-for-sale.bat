@echo off
echo ========================================
echo  AI Phone Agents Dashboard
echo  Cleanup Script for Whop Distribution
echo ========================================
echo.

echo [1/7] Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo    DONE - node_modules deleted
) else (
    echo    SKIP - node_modules not found
)

echo.
echo [2/7] Removing .next build folder...
if exist .next (
    rmdir /s /q .next
    echo    DONE - .next deleted
) else (
    echo    SKIP - .next not found
)

echo.
echo [3/7] Removing .env.local (your secrets)...
if exist .env.local (
    del .env.local
    echo    DONE - .env.local deleted
) else (
    echo    SKIP - .env.local not found
)

echo.
echo [4/7] Removing test page...
if exist app\test\page.tsx (
    del app\test\page.tsx
    echo    DONE - test page deleted
) else (
    echo    SKIP - test page not found
)

echo.
echo [5/7] Removing unused SVG files...
cd public
if exist file.svg del file.svg
if exist globe.svg del globe.svg
if exist next.svg del next.svg
if exist vercel.svg del vercel.svg
if exist window.svg del window.svg
cd ..
echo    DONE - unused SVGs deleted

echo.
echo [6/7] Removing package-lock.json (optional)...
if exist package-lock.json (
    del package-lock.json
    echo    DONE - package-lock.json deleted
) else (
    echo    SKIP - package-lock.json not found
)

echo.
echo [7/7] Removing .git folder (optional)...
set /p remove_git="Remove Git history? This can't be undone! (y/N): "
if /i "%remove_git%"=="y" (
    if exist .git (
        rmdir /s /q .git
        echo    DONE - .git deleted
    ) else (
        echo    SKIP - .git not found
    )
) else (
    echo    SKIP - Git history kept
)

echo.
echo ========================================
echo  Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo  1. Verify START_HERE.md exists
echo  2. Verify LICENSE.txt exists
echo  3. Verify .env.example exists
echo  4. Create ZIP file of entire folder
echo  5. Upload to Whop
echo.
echo Your ZIP file should be 500KB - 2MB
echo If larger, you forgot to delete something!
echo.
pause
