@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it, then run this file again.
  pause
  exit /b 1
)
start "Portfolio preview" cmd /k node serve.mjs
start "" http://localhost:8080
