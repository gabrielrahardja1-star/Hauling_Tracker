@echo off
REM Capture from the scale on Windows.
REM   1) Run list-ports.bat to find the adapter's COM port (e.g. COM3).
REM   2) Run:  capture.bat COM3
REM      ...and it auto-detects the baud rate, shows data, and logs to logs\.
REM Pass extra options after the port, e.g.:
REM   capture.bat COM3 --baud=9600 --databits=8 --parity=none --stopbits=1
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: capture.bat COM3  [--baud=9600 --databits=8 --parity=none --stopbits=1]
  echo First find the port with list-ports.bat
  echo.
  pause
  exit /b 1
)

set PORT=%~1
shift
set EXTRA=
:collect
if "%~1"=="" goto run
set EXTRA=%EXTRA% %~1
shift
goto collect

:run
if exist "%~dp0node.exe" (
  "%~dp0node.exe" src\capture.js --port=%PORT%%EXTRA%
) else (
  node src\capture.js --port=%PORT%%EXTRA%
)
echo.
pause
