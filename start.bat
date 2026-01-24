@echo off
echo Starting ChudVault...
echo.

REM Check if .env exists for backend
IF NOT EXIST "backend\.env" (
    echo Creating backend .env file...
    (
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres
        echo DB_NAME=chudvault
        echo SERVER_PORT=8080
    ) > backend\.env
    echo Created backend\.env
    echo.
)

REM Start frontend in new window
echo Starting frontend on http://localhost:3039...
start "ChudVault Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

REM Wait a bit for frontend to start
timeout /t 3 /nobreak > nul

REM Start backend in new window
echo Starting backend on http://localhost:8080...
start "ChudVault Backend" cmd /k "cd /d %~dp0backend && go mod tidy && go run cmd/server/main.go"

echo.
echo ========================================
echo ChudVault started!
echo Frontend: http://localhost:3039
echo Backend:  http://localhost:8080
echo ========================================
echo.
echo Press any key to stop all services...
pause > nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq ChudVault Frontend*" /T > nul 2>&1
taskkill /FI "WINDOWTITLE eq ChudVault Backend*" /T > nul 2>&1
echo Done.
