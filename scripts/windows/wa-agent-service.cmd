@echo off
rem Kirim antrean wa_outbox + terima webhook balasan status (Windows Task Scheduler).
rem Kalau worker berhenti, tunggu 15 detik lalu jalankan lagi.
setlocal
cd /d "%~dp0..\.."

set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
set "LOG=%~dp0..\..\logs\wa-agent.log"
if not exist "%~dp0..\..\logs" mkdir "%~dp0..\..\logs"

:loop
echo [%date% %time%] start wa-agent >> "%LOG%"
"%NODE%" "%~dp0..\wa-agent.mjs" >> "%LOG%" 2>&1
echo [%date% %time%] wa-agent berhenti (kode %ERRORLEVEL%), restart 15 detik >> "%LOG%"
timeout /t 15 /nobreak >nul
goto loop
