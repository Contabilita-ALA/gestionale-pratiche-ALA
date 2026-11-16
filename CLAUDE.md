# Note per Claude (contesto del progetto)

App web statica (GitHub Pages, ramo `main`, cartella radice) per lo studio della Dott.ssa Arch. Agnese Lorenzon.
Interfaccia e testi **in italiano**; commenti nel codice in italiano. L'utente non è una programmatrice: spiegazioni semplici.

## Vincoli dell'utente
- **Tutto gratuito**: niente servizi a pagamento, niente IA a pagamento (la nota tecnica si scrive incollando un prompt in una chat gratuita: `lib/prompt.js`).
- Dati e documenti **nel suo Google Drive**. Cartella principale "ALA" (link incollato al primo avvio, salvato in localStorage `gs.radice`).
- Schema cartelle: APE → `00_APE/VENETO` o `00_APE/FRIULI VENEZIA GIULIA`, catasto → `00_CATASTO`, entrambi con nome
  `PAESE VIA CIVICO RIF COGNOME` (`nomeCartella` in `lib/nomi.js`); pratiche edilizie → nella principale come
  `NN_Cognome_Descrizione` con NN = massimo esistente + 1 (`nomeCartellaNumerata` in `app.js`).
- Colore del logo: verde menta #75E0CC. Palette dell'app (v3.10, scelta dallo studio): **Mint Sorbet #B8D8C4,
  Caramel Clay #A86F46, Deep Juniper #355B56, Cream Linen #F3EBDD**. Mint Sorbet è il colore predominante (v3.11): barra laterale
  menta, riquadri/pannelli menta chiaro (`--sabbia` #D6E8DC); fondo crema; pulsanti, voce attiva e testi ginepro
  (`--nero` = #355B56, testo `--ink` #22302D); pallino del menu caramello, card dei moduli (v3.13, scelte dallo studio): APE Azure #B4CCCF,
  Catasto Orchid #F3A5BC, Pratiche Peach #FFC49B, Proforma/Fatture Pistachio #CBE6C7 (in `MODULI` di app.js e `:root` di tema.css).
  Icone in `assets/forme` (maschere colorate via CSS). Il PDF "nuovo" ha colori suoi (lib/template.js, `cssNuovo`).

## Architettura
- `index.html` carica `web/avvio.js`: accesso Google (GIS token client, `web/gdrive.js`), scelta cartella, poi `app.js`.
- `app.js` (interfaccia, la stessa della vecchia versione per PC) chiama `fetch('api/…')`: le richieste sono servite nel
  browser da `web/backend.js` (stesse rotte del vecchio `server.js` Express).
- `web/archivio.js`: archivio su Drive. Pratiche in `00_GESTIONALE/pratiche/<uid>.json`, registro proforma in
  `00_PROFORMA/registro/<id>.json` + `numerazione.json`; i riassunti per gli elenchi stanno nelle `appProperties` dei file.
- `web/pdf.js` + `web/documenti.js` + `web/vettoriale.js`: PDF **vettoriali** nel browser (dalla v3.8). HTML dei modelli
  (`lib/*.js`) → impaginazione con Paged.js in un iframe nascosto → `disegnaPagina` (vettoriale.js) ridisegna ogni pagina
  con pdf-lib leggendo dal DOM sfondi, bordi (anche arrotondati/tratteggiati, con ritaglio), testo parola per parola
  (posizione misurata con Range, linea di base dalle metriche del font), testo verticale, immagini, caselle `.cb.on`
  (X dei ::before/::after) e numeri degli elenchi (::marker). Font: le regole @font-face del documento; i .woff2 si
  incorporano dalla copia .ttf in `vendor/ttf` (pdf-lib/fontkit si bloccano con i woff2 in subset; i .ttf sono stati
  convertiti con fontTools). Riserva: se il vettoriale fallisce (o con `window.PDF_FOTO = true`) si usa la vecchia "foto"
  delle pagine con html2canvas + testo invisibile. Piè di pagina vettoriale con pdf-lib (documenti.js).
  Riquadri arrotondati con overflow nascosto: sfondo, poi contenuto ritagliato dentro il bordo (curva interna), poi il
  bordo sopra a tutto. Bordi diversi per lato con raggio: angoli disegnati come curve.
  Se un modello usa qualcosa di nuovo (gradienti, ombre, ::before con testo…) va aggiunto in vettoriale.js.
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
Etichetta in basso a sinistra in `index.html` (`v3.13 web`): aggiornarla a ogni modifica.
