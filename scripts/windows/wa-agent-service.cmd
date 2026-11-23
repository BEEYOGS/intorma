@echo off
rem Kirim antrean wa_outbox otomatis (dipakai oleh Windows Task Scheduler).
rem Kalau worker berhenti, tunggu 15 detik lalu jalankan lagi.
setlocal
cd /d "%~dp0..\.."

set "NPM=C:\Program Files\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=npm"
set "LOG=%TEMP%\intorma-wa-agent.log"

:loop
echo [%date% %time%] start wa:agent >> "%LOG%"
"%NPM%" run wa:agent >> "%LOG%" 2>&1
echo [%date% %time%] wa:agent berhenti (kode %ERRORLEVEL%), restart 15 detik >> "%LOG%"
timeout /t 15 /nobreak >nul
goto loop
