@echo off
REM Ultra Connect platform launcher
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
echo Starting Ultra Connect at http://localhost:3000
start "" http://localhost:3000
node server.js
pause
