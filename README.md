# Gestionale Studio – versione web

Gestionale dello studio di architettura: **APE** (Veneto e FVG), **Catasto**, **Pratiche edilizie**, **Proforma** e **Fatture**.
Si usa dal browser, senza installare nulla: https://contabilita-ala.github.io/gestionale-pratiche-ALA/

- **Accesso**: con l'account Google dello studio. La prima volta Google chiede il permesso di usare il Drive.
- **Dove finiscono i dati**: tutto nel Google Drive, dentro la cartella principale dello studio (es. `ALA`):
  - `00_APE/VENETO/…` e `00_APE/FRIULI VENEZIA GIULIA/…` – cartelle delle APE (`PAESE VIA CIVICO RIF COGNOME`)
  - `00_CATASTO/…` – cartelle delle pratiche catastali (`PAESE VIA CIVICO RIF COGNOME`)
  - `48_Cognome_Descrizione` – pratiche edilizie, numerate in successione, direttamente nella cartella principale
  - `00_PROFORMA/<anno>/` – PDF dei proforma; `00_PROFORMA/registro/` – registro di proforma, fatture e numerazione
  - `00_GESTIONALE/` – schede delle pratiche e dati dello studio
- **Costi**: nessuno. GitHub Pages, accesso Google e Google Drive API sono gratuiti; i PDF si creano nel browser.
- **Aggiornamenti**: basta ricaricare la pagina.

Consigliato: Google Chrome (anche su Mac).
