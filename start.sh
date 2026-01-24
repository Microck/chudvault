#!/bin/bash

echo "Starting ChudVault..."
echo ""

if [ ! -f "backend/.env" ]; then
    echo "Creating backend .env file..."
    cat > backend/.env <<EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=chudvault
SERVER_PORT=8080
EOF
    echo "Created backend/.env"
    echo ""
fi

echo "Starting frontend on http://localhost:3039..."
cd frontend && npm install && npm run dev &
FRONTEND_PID=$!
cd ..

sleep 3

echo "Starting backend on http://localhost:8080..."
cd backend && go mod tidy && go run cmd/server/main.go &
BACKEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "ChudVault started!"
echo "Frontend: http://localhost:3039"
echo "Backend:  http://localhost:8080"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services..."

cleanup() {
    echo ""
    echo "Stopping services..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    echo "Done."
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
