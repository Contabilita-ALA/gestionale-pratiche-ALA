#!/bin/bash
# Gestionale Studio - versione locale per Mac: doppio clic per aprirlo nel browser.
cd "$(dirname "$0")"
# Node.js installato con l'installer di nodejs.org o con Homebrew
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js non è installato" message "Scaricalo gratis da nodejs.org (versione LTS), installalo e poi riapri il Gestionale."' >/dev/null 2>&1
  open "https://nodejs.org"
  exit 1
fi
echo "Gestionale Studio: si apre nel browser. Lascia aperta questa finestra mentre lavori (puoi ridurla a icona)."
node server.cjs
