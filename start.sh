#!/bin/bash

echo "========================================"
echo "ChudVault Quickstart"
echo "========================================"
echo ""
echo "Choose mode:"
echo "  1. Local-only (frontend only, no DB needed)"
echo "  2. Full-stack (frontend + backend + Docker)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "Starting local-only mode..."
        echo "No database needed - data saved to frontend/data/db.json"
        echo ""
        cd frontend && npm install && npm run dev &
        FRONTEND_PID=$!
        cd ..
        sleep 2
        echo ""
        echo "========================================"
        echo "Local mode started!"
        echo "Frontend: http://localhost:3039"
        echo "========================================"
        echo ""
        echo "Press Ctrl+C to stop..."
        trap "kill $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'; exit 0" SIGINT SIGTERM
        wait $FRONTEND_PID
        ;;
    2)
        echo ""
        echo "Starting full-stack mode with Docker..."
        echo "This will start PostgreSQL, backend, and frontend"
        echo ""
        docker compose up --build
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac
