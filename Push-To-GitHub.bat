@echo off
title Push SocialSentry to GitHub
cd /d "%~dp0"

echo ========================================================================
echo              SOCIALSENTRY: 1-CLICK GITHUB UPLOADER
echo ========================================================================
echo.
echo Your code has already been packaged and committed!
echo.
echo 1. Open https://github.com/new and create a new repository called 'socialsentry'.
echo 2. Copy the repository link (e.g., https://github.com/2511cs040051-sai/socialsentry.git).
echo.
set /p REPO_URL="Paste your GitHub repository URL here: "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Exiting.
    pause
    exit /b 1
)

echo.
echo [*] Linking repository to: %REPO_URL%...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo [*] Pushing SocialSentry to GitHub...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================================
    echo  [SUCCESS] Code is live on GitHub!
    echo  Now go to https://render.com and connect your repository to deploy for FREE.
    echo ========================================================================
) else (
    echo.
    echo [!] Push incomplete. If prompted, please log into GitHub in the pop-up window.
)

pause
