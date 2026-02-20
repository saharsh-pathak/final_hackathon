@echo off
echo Starting Hyperlocal AQI Development Server...
cd /d "%~dp0"
npm run dev -- --host
pause
