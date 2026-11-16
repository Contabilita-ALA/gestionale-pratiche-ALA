# Gestionale Studio

Gestionale dello studio di architettura: **APE** (Veneto e FVG), **Catasto**, **Pratiche edilizie**, **Proforma** e **Fatture**.

## Versione locale (consigliata) – Windows e Mac

L'app si apre nel browser ma lavora **sul computer**, direttamente nella cartella `ALA` di **Google Drive per desktop**:
pagine e PDF sono istantanei e Google Drive sincronizza da solo con gli altri computer.

**Cosa serve (tutto gratuito)**
- **Google Drive per desktop** (la cartella ALA si vede in Esplora file / nel Finder).
- **Node.js**, versione LTS: https://nodejs.org (si installa una volta sola).

**Prima volta**
1. Scarica il programma: su https://github.com/Contabilita-ALA/gestionale-pratiche-ALA → pulsante verde **Code** → **Download ZIP**.
2. Estrai lo zip in una cartella a piacere (es. *Documenti → Gestionale Studio*).
3. Avvia con doppio clic:
   - **Windows**: `Avvia Gestionale (Windows).bat`
   - **Mac**: `Avvia Gestionale (Mac).command`. La prima volta il Mac può dire che proviene da uno sviluppatore non
     identificato: clic destro sul file → **Apri** → **Apri**. Se chiede di accedere ai file di Google Drive, **Consenti**.
4. Nel browser scegli la cartella `ALA` (di solito la trova da sola).

**Ogni giorno**: doppio clic sul file di avvio. Si apre una finestrina nera: lasciala aperta mentre lavori
(puoi ridurla a icona); chiudendola il gestionale si spegne.

**Aggiornamenti**: automatici. Il programma prende ogni volta l'ultima versione pubblicata (senza internet usa l'ultima
copia scaricata).

## Versione web

Resta disponibile, senza installare nulla, con l'accesso Google: https://contabilita-ala.github.io/gestionale-pratiche-ALA/
(più lenta, perché legge e scrive su Google Drive attraverso internet).

## Dove finiscono i dati

Nella cartella principale dello studio (`ALA`), uguale per le due versioni:
- `00_APE/VENETO/…` e `00_APE/FRIULI VENEZIA GIULIA/…` – cartelle delle APE (`PAESE VIA CIVICO RIF COGNOME`)
- `00_CATASTO/…` – cartelle delle pratiche catastali (`PAESE VIA CIVICO RIF COGNOME`)
- `48_Cognome_Descrizione` – pratiche edilizie, numerate in successione, direttamente nella cartella principale
- `00_PROFORMA/<anno>/` – PDF dei proforma; `00_PROFORMA/registro/` – registro di proforma, fatture e numerazione
- `00_GESTIONALE/` – schede delle pratiche e dati dello studio

Nella versione locale ogni cartella dell'archivio contiene anche un file nascosto `.gestionale.json` (i riassunti per
gli elenchi): non va cancellato, ma se manca l'app lo ricostruisce.
