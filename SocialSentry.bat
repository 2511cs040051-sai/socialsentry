@echo off
title SocialSentry - Real-Time Cyberbullying Defense Platform
cd /d "%~dp0"

echo ========================================================================
echo              SOCIALSENTRY: CYBERBULLYING DEFENSE PLATFORM
echo          Real-Time Social Media Analytics & Automated Defense
echo                  Malla Reddy University - CSE Project
echo   Students: LB. Siddartha nayak (2511CS040028) ^& D. Sairam (2511CS040051)
echo ========================================================================
echo.

:: 1. Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.10+ from python.org and try again.
    pause
    exit /b 1
)

:: 2. Check if the server is already running on port 8000
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [*] SocialSentry backend is already active on port 8000.
) else (
    echo [*] Starting SocialSentry backend server...
    start "SocialSentry Backend" /min python run.py
    echo [*] Initializing pipeline, database and real-time streamer...
    timeout /t 3 /nobreak >nul
)

:: 3. Launch the web browser to the application
echo [*] Opening SocialSentry in your default web browser...
start http://127.0.0.1:8000/

echo.
echo ========================================================================
echo  [SUCCESS] SocialSentry is running!
echo  URL: http://127.0.0.1:8000/
echo.
echo  Keep this window open or minimized while using the app.
echo  To shut down the platform, press any key below.
echo ========================================================================
pause >nul

:: Clean shutdown on key press
echo [*] Stopping SocialSentry background processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [*] SocialSentry platform stopped safely.
timeout /t 2 /nobreak >nul
