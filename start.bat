@echo off
rem XtraEarn - start the server (http://localhost:3000)
where npm >nul 2>nul
if %errorlevel%==0 (
  npm start
) else (
  "C:\Program Files\nodejs\npm.cmd" start
)
