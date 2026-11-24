@echo off
rem Jalankan OpenWA gateway otomatis (Windows Task Scheduler).
rem Kalau gateway berhenti, tunggu 15 detik lalu jalankan lagi.
setlocal
cd /d "%~dp0..\.."

set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
set "LOG=%~dp0..\..\logs\openwa.log"
if not exist "%~dp0..\..\logs" mkdir "%~dp0..\..\logs"

:loop
echo [%date% %time%] start openwa >> "%LOG%"
"%NODE%" "%~dp0..\openwa.mjs" >> "%LOG%" 2>&1
echo [%date% %time%] openwa berhenti (kode %ERRORLEVEL%), restart 15 detik >> "%LOG%"
timeout /t 15 /nobreak >nul
goto loop
