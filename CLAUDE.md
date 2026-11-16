# Note per Claude (contesto del progetto)

App web statica (GitHub Pages, ramo `main`, cartella radice) per lo studio della Dott.ssa Arch. Agnese Lorenzon.
Interfaccia e testi **in italiano**; commenti nel codice in italiano. L'utente non è una programmatrice: spiegazioni semplici.

## Vincoli dell'utente
- **Tutto gratuito**: niente servizi a pagamento, niente IA a pagamento (la nota tecnica si scrive incollando un prompt in una chat gratuita: `lib/prompt.js`).
- Dati e documenti **nel suo Google Drive**. Cartella principale "ALA" (link incollato al primo avvio, salvato in localStorage `gs.radice`).
- Schema cartelle: APE → `00_APE/VENETO` o `00_APE/FRIULI VENEZIA GIULIA`, catasto → `00_CATASTO`, entrambi con nome
  `PAESE VIA CIVICO RIF COGNOME` (`nomeCartella` in `lib/nomi.js`); pratiche edilizie → nella principale come
  `NN_Cognome_Descrizione` con NN = massimo esistente + 1 (`nomeCartellaNumerata` in `app.js`).
- Stile grafico "Intelly": fondo crema, barra nera, card pastello (#F5B8DB rosa proforma/fatture, #9AAB63 verde catasto,
  #B6CAEB azzurro pratiche, #F5D867 giallo APE), icone in `assets/forme` (maschere colorate via CSS).

## Architettura
- `index.html` carica `web/avvio.js`: accesso Google (GIS token client, `web/gdrive.js`), scelta cartella, poi `app.js`.
- `app.js` (interfaccia, la stessa della vecchia versione per PC) chiama `fetch('api/…')`: le richieste sono servite nel
  browser da `web/backend.js` (stesse rotte del vecchio `server.js` Express).
- `web/archivio.js`: archivio su Drive. Pratiche in `00_GESTIONALE/pratiche/<uid>.json`, registro proforma in
  `00_PROFORMA/registro/<id>.json` + `numerazione.json`; i riassunti per gli elenchi stanno nelle `appProperties` dei file.
- `web/pdf.js` + `web/documenti.js`: PDF nel browser. HTML dei modelli (`lib/*.js`) → impaginazione con Paged.js in un
  iframe nascosto → foto di ogni pagina (html-to-image, 250 dpi JPEG) → pdf-lib; piè di pagina vettoriale con pdf-lib.
- `lib/`: modelli e logica condivisi (proforma, informativa, catasto, offerta, nomi, importa, allegati, comuni…).
- OCR documenti d'identità/libretti: tesseract.js nel browser (motore e lingua scaricati da jsDelivr la prima volta).
- Google OAuth: client web del progetto Firebase della contabilità (`contabilita-4949c`), scope `drive`. Origine
  autorizzata: `https://contabilita-ala.github.io`.

## Prove
Con `window.DRIVE_FINTO = true` (impostato prima del caricamento, es. `page.addInitScript` di Playwright) l'app usa un
Drive simulato in memoria (`window.__driveFinto` = elenco file) e l'accesso Google è finto: si può provare tutto offline
servendo la cartella con `python3 -m http.server`.

## Versione
Etichetta in basso a sinistra in `index.html` (`v3.0 web`): aggiornarla a ogni modifica.
