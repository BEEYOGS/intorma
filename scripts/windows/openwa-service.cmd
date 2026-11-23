@echo off
rem Jalankan gateway OpenWA otomatis (dipakai oleh Windows Task Scheduler).
rem Kalau gateway berhenti, tunggu 15 detik lalu jalankan lagi.
setlocal
cd /d "%~dp0..\.."

set "NPM=C:\Program Files\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=npm"
set "LOG=%TEMP%\intorma-openwa.log"

:loop
echo [%date% %time%] start openwa >> "%LOG%"
"%NPM%" run openwa >> "%LOG%" 2>&1
echo [%date% %time%] openwa berhenti (kode %ERRORLEVEL%), restart 15 detik >> "%LOG%"
timeout /t 15 /nobreak >nul
goto loop
