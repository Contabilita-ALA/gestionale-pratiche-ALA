@echo off
rem Gestionale Studio - versione locale per Windows: doppio clic per aprirlo nel browser.
title Gestionale Studio
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js non e' installato su questo computer.
  echo Scaricalo gratis da https://nodejs.org (versione LTS), installalo e poi riprova.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
echo Gestionale Studio: si apre nel browser. Lascia aperta questa finestra mentre lavori (puoi ridurla a icona).
node server.cjs
if errorlevel 1 pause
