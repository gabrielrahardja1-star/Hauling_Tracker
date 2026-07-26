@echo off
REM Lists available serial ports (COM1, COM3, ...). Double-click to run.
REM Uses portable node.exe if it sits next to this file, else the system node.
setlocal
cd /d "%~dp0"
if exist "%~dp0node.exe" (
  "%~dp0node.exe" src\capture.js --list
) else (
  node src\capture.js --list
)
echo.
pause
