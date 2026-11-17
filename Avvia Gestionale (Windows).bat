@echo off
rem Gestionale Studio - versione locale per Windows: doppio clic per aprirlo nel browser.
rem Attenzione: niente parentesi nei messaggi, Windows le confonde con i blocchi del file.
title Gestionale Studio
cd /d "%~dp0"
where node >NUL 2>NUL
if errorlevel 1 goto senzanode
echo Gestionale Studio: si apre nel browser.
echo Lascia aperta questa finestra mentre lavori, puoi ridurla a icona. Chiudendola il gestionale si spegne.
echo.
node server.cjs
echo.
echo Il Gestionale si e' fermato. Se qui sopra c'e' un messaggio di errore, fanne uno screenshot.
pause
exit /b

:senzanode
echo Node.js non e' installato su questo computer.
echo Scaricalo gratis da https://nodejs.org - versione LTS - installalo e poi riprova.
start "" https://nodejs.org
pause
