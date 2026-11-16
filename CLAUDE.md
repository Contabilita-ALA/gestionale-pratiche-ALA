# Note per Claude (contesto del progetto)

App web statica (GitHub Pages, ramo `main`, cartella radice) per lo studio della Dott.ssa Arch. Agnese Lorenzon.
Interfaccia e testi **in italiano**; commenti nel codice in italiano. L'utente non è una programmatrice: spiegazioni semplici.

## Vincoli dell'utente
- **Tutto gratuito**: niente servizi a pagamento, niente IA a pagamento (la nota tecnica si scrive incollando un prompt in una chat gratuita: `lib/prompt.js`).
- Dati e documenti **nel suo Google Drive**. Cartella principale "ALA" (link incollato al primo avvio, salvato in localStorage `gs.radice`).
- Schema cartelle: APE → `00_APE/VENETO` o `00_APE/FRIULI VENEZIA GIULIA`, catasto → `00_CATASTO`, entrambi con nome
  `PAESE VIA CIVICO RIF COGNOME` (`nomeCartella` in `lib/nomi.js`); pratiche edilizie → nella principale come
  `NN_Cognome_Descrizione` con NN = massimo esistente + 1 (`nomeCartellaNumerata` in `app.js`).
- Colore dello studio: **verde menta #75E0CC** (logo). Dalla v3.5 l'app usa toni freddi intorno al menta (fondo #F3F7F6,
  card #E4EDEA, accenti menta: voce attiva del menu, ricerca, pulsante indietro), barra nera, card pastello
  (#F5B8DB rosa proforma/fatture, #A8D5A2 verde salvia catasto, #B6CAEB azzurro pratiche, #F5D867 giallo APE),
  icone in `assets/forme` (maschere colorate via CSS). Niente beige: con il menta stona (anche nei PDF).

## Architettura
- `index.html` carica `web/avvio.js`: accesso Google (GIS token client, `web/gdrive.js`), scelta cartella, poi `app.js`.
- `app.js` (interfaccia, la stessa della vecchia versione per PC) chiama `fetch('api/…')`: le richieste sono servite nel
  browser da `web/backend.js` (stesse rotte del vecchio `server.js` Express).
- `web/archivio.js`: archivio su Drive. Pratiche in `00_GESTIONALE/pratiche/<uid>.json`, registro proforma in
  `00_PROFORMA/registro/<id>.json` + `numerazione.json`; i riassunti per gli elenchi stanno nelle `appProperties` dei file.
- `web/pdf.js` + `web/documenti.js`: PDF nel browser. HTML dei modelli (`lib/*.js`) → impaginazione con Paged.js in un
  iframe nascosto → foto di ogni pagina con html2canvas (200 dpi JPEG; le scritte verticali vengono ruotate a mano perché
  html2canvas non gestisce writing-mode) → pdf-lib. Sopra ogni foto il testo invisibile (Helvetica, opacità 0) nelle
  posizioni misurate nella pagina, così il PDF si può cercare e copiare. Piè di pagina vettoriale con pdf-lib.
  (html-to-image era stato scartato: nella foto non usava il font Roboto.)
- `lib/`: modelli e logica condivisi (proforma, informativa, catasto, offerta, nomi, importa, allegati, comuni…).
- OCR documenti d'identità/libretti: tesseract.js nel browser (motore e lingua scaricati da jsDelivr la prima volta).
- Google OAuth: client web del progetto Firebase della contabilità (`contabilita-4949c`), scope `drive`. Origine
  autorizzata: `https://contabilita-ala.github.io`.

## Prove
Con `window.DRIVE_FINTO = true` (impostato prima del caricamento, es. `page.addInitScript` di Playwright) l'app usa un
Drive simulato in memoria (`window.__driveFinto` = elenco file) e l'accesso Google è finto: si può provare tutto offline
servendo la cartella con `python3 -m http.server`.
`window.DRIVE_RITARDO = 400` aggiunge un'attesa (ms) a ogni richiesta del Drive finto, come la rete vera;
`window.__richiesteDrive` elenca le richieste fatte (per misurare la velocità).
Gli elenchi di pratiche e registro restano in memoria (`ricorda` in `web/archivio.js`): si mostrano subito e, se hanno più
di 30 s, si rileggono dietro le quinte; se cambiano parte l'evento `archivio-aggiornato` e `app.js` ridisegna la schermata.

## Interfaccia (v3.4)
- Obiettivo: ogni pagina su un solo schermo (prove a 1904×912). Home: gli elenchi in basso scorrono al loro interno.
- Pratica: niente pulsanti "sezione precedente/successiva"; nel menu a sinistra un indicatore di completamento per sezione
  (`completamento`/`spunta` in `app.js`: cerchio tratteggiato, anello parziale, spunta nera).
- `html { scrollbar-gutter: stable }` e menu sticky a `top: 90px`: niente spostamenti passando da una pagina all'altra.
- Documento di sopralluogo: in Stampa si sceglie la grafica "Classica" o "Nuova (prova)" (`opzioni.stile = 'nuovo'`,
  `cssNuovo()` in `lib/template.js`, font Figtree): cambia solo l'aspetto, le misure delle righe restano uguali.
  Fondo bianco, ogni blocco bordato (1,3 pt) nel suo colore, committente menta. Righe alternate: velo di menta (#EEFAF7)
  nelle pagine 1-2 (visita, elenco documenti), grigio chiaro (#F2F2F2) nelle schede dalla pagina 3.

## Versione
Etichetta in basso a sinistra in `index.html` (`v3.7 web`): aggiornarla a ogni modifica.
