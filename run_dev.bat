@echo off
echo Starting ACIRA-X Backend...
start cmd /k "cd acira-x-backend && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo Starting ACIRA-X Frontend...
start cmd /k "cd acira-x-frontend && npm run dev"

echo Both servers are starting up!
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:8000
