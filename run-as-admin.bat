@echo off

cd /d "%~dp0"

fsutil dirty query %systemdrive% >nul 2>&1
if %errorLevel% neq 0 (
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":5180 .*LISTENING"') do (
  taskkill /F /T /PID %%p >nul 2>&1
)

call npm run dev
