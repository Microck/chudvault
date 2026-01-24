@echo off
echo ========================================
echo ChudVault Quickstart
echo ========================================
echo.
echo Choose mode:
echo   1. Local-only (frontend only, no DB needed)
echo   2. Full-stack (frontend + backend + Docker)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto fullstack
echo Invalid choice. Exiting.
exit /b 1

:local
echo.
echo Starting local-only mode...
echo No database needed - data saved to frontend/data/db.json
echo.
start "ChudVault Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
timeout /t 2 /nobreak > nul
echo.
echo ========================================
echo Local mode started!
echo Frontend: http://localhost:3039
echo ========================================
echo.
echo Press any key to stop...
pause > nul
taskkill /FI "WINDOWTITLE eq ChudVault Frontend*" /T > nul 2>&1
goto end

:fullstack
echo.
echo Starting full-stack mode with Docker...
echo This will start PostgreSQL, backend, and frontend
echo.
docker compose up --build
goto end

:end
