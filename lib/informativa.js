// Informativa e lettera di incarico APE (replica di "Informativa APE.docx"): sempre due pagine A4.
// Le parti comuni (stile, testata, firme, tabella del compenso) sono usate anche dalla lettera per il catasto (lib/catasto.js).
// Committente e immobile vengono dalle rispettive sezioni, il compenso dalle prestazioni dell'incarico.
import { calcola, euro, BOLLO, datiStudio } from './proforma.js';

// corrispettivo dell'aggiornamento dell'APE entro un anno dalla presentazione
export const AGGIORNAMENTO = 70;
// prezzo proposto per la prestazione, secondo la tipologia della lettera di incarico
export const PREZZO_PROPOSTO = { primo: 180, aggiornamento: AGGIORNAMENTO };
export const TIPI_LETTERA = [['primo', 'Primo incarico'], ['aggiornamento', 'Aggiornamento APE']];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cb = (on) => `<span class="cb${on ? ' on' : ''}"></span>`;
export const val = (s) => (String(s ?? '').trim() ? `<span class="val">${esc(s)}</span>` : '');

export const MOTIVAZIONI = [
  ['nuova', 'nuova costruzione'],
  ['ristr1', 'ristrutturazione I livello'],
  ['ristr2', 'ristrutturazione II livello'],
  ['riqualificazione', 'riqualificazione energetica'],
  ['passaggio', 'passaggio di proprietà'],
  ['locazione', 'locazione'],
  ['altro', 'altro'],
];

export function formatData(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || '');
}

// "Via Pineda n. 26, Caorle (VE)"
export function sito(m = {}) {
  const via = [String(m.via || '').trim(), String(m.civ || '').trim() && `n. ${String(m.civ).trim()}`].filter(Boolean).join(' ');
  return [via, String(m.citta || '').trim()].filter(Boolean).join(', ');
}

// subalterni: quello dell'immobile e quelli delle prestazioni (più unità dello stesso immobile)
export function subalterni(d) {
  const tutti = (d?.proforma?.righe || []).map((r) => String(r.sub ?? '').trim() || String(d?.immobile?.sub || '').trim());
  if (!tutti.length) tutti.push(String(d?.immobile?.sub || '').trim());
  return [...new Set(tutti.filter(Boolean))].join(', ');
}

export function css(fonts) {
  return `
${fonts}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Roboto', sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pagina { width: 210mm; height: 297mm; position: relative; overflow: hidden; break-after: page; }
.pagina:last-child { break-after: auto; }
.testa { position: absolute; top: 0.35cm; left: 1.5cm; right: 1.5cm; text-align: center; color: #00B593; }
.testa .t { font-size: 16pt; font-weight: 700; line-height: 1.2; }
.testa .s { font-size: 12pt; line-height: 1.25; }
.corpo { position: absolute; top: 1.95cm; left: 1.5cm; right: 1.5cm; bottom: 3.15cm; font-size: var(--fs, 8pt); line-height: 1.22; overflow: hidden; }
.piede { position: absolute; left: 0; right: 0; bottom: 0.45cm; text-align: center; }
.piede .n { font-family: 'Roboto', sans-serif; font-size: 10pt; margin-bottom: 0.15cm; }
.piede img { width: 13.4cm; display: block; margin: 0 auto; }
p { margin: 0; text-align: justify; }
.gap { height: 1.1em; }
.gap-s { height: 0.55em; }
b { font-weight: 700; }
u { text-decoration: underline; }
a { color: #0563C1; text-decoration: underline; }
.val { color: #1F3864; }
.cb { display: inline-block; width: 0.82em; height: 0.82em; border: 0.5pt solid #000; margin-right: 0.25em; vertical-align: -0.08em; position: relative; overflow: hidden; }
.cb.on::before, .cb.on::after { content: ''; position: absolute; left: 50%; top: 50%; width: 141%; height: 0.6pt; background: #000; }
.cb.on::before { transform: translate(-50%, -50%) rotate(45deg); }
.cb.on::after { transform: translate(-50%, -50%) rotate(-45deg); }
.sito { width: 100%; border-collapse: collapse; margin-top: 0.9em; }
.sito td { padding: 0.25em 0.6em; vertical-align: top; }
.sito tr.r1 td { border-bottom: 0.5pt solid #000; }
.sito tr.r2 td { background: #EDEDED; border-bottom: 0.5pt solid #000; }
.motiv { display: grid; grid-template-columns: 32% 28% 14% 26%; row-gap: 0.45em; margin-top: 0.2em; }
.motiv .centro { grid-column: 2 / span 2; justify-self: center; }
.h { text-align: center; font-weight: 700; font-size: 1.25em; margin: 0.7em 0 0.15em; }
.h.big { font-size: 1.32em; margin-top: 1em; }
ul, ol { margin: 0; padding-left: 1.9em; }
li { text-align: justify; }
ul.punti { list-style: disc; }
ul.punti > li { margin-top: 0.15em; }
ol.num { list-style: decimal; padding-left: 2.1em; }
ol.alpha { list-style: lower-alpha; padding-left: 2em; }
.scelte { list-style: none; padding-left: 1.4em; }
.scelte li { margin: 0.25em 0; padding-left: 1.5em; text-indent: -1.5em; }
.opz { padding-left: 1.3em; margin: 0.15em 0; }
.firme { display: grid; grid-template-columns: 1fr 1fr; margin-top: 1.1em; padding-left: 0.6em; }
.firme .sx p, .firme .dx p { text-align: left; }
.firme .dx { text-align: center; padding-top: 2.6em; }
.firme .dx p { text-align: center; }
.firme .dx img { width: 5.4cm; display: block; margin: 0.1em auto 0; }
.firme .obbl { font-size: 0.8em; font-style: italic; }
.firme .linea { border-bottom: 0.5pt solid #000; width: 7.6cm; margin-left: -0.6em; margin-top: 4.2em; }
.compenso { width: 100%; border-collapse: collapse; margin-top: 1em; text-align: center; border: 0.5pt solid #A8D08D; }
.compenso td { padding: 0.12em 0.4em; }
.compenso .lab td { font-size: 0.88em; }
.compenso tr.tot td { background: #C5E0B3; font-weight: 700; border-top: 0.5pt solid #A8D08D; }
.compenso .grande { font-size: 1.5em; }
.note { margin-top: 1.3em; }
`;
}

export function testata(titolo = 'INFORMATIVA E LETTERA DI INCARICO', sottotitolo = '(Ai sensi del D.M. 26.06.2015 – attuazione del D.Lgs. n. 192/05, Allegato 1 punto 7.1.1.)') {
  return `<div class="testa"><div class="t">${titolo}</div>
<div class="s">${sottotitolo}</div></div>`;
}

// Tabella del compenso (uguale al proforma): prestazioni + bollo + 4% INARCASSA, più le eventuali spese non imponibili
export function tabellaCompenso(k) {
  const spese = k.spese?.length > 0;
  const cols = spese
    ? '<col style="width:22%"><col style="width:4%"><col style="width:17%"><col style="width:4%"><col style="width:26%"><col style="width:4%"><col style="width:23%">'
    : '<col style="width:33%"><col style="width:6%"><col style="width:22%"><col style="width:6%"><col style="width:33%">';
  return `<table class="compenso">
  <colgroup>${cols}</colgroup>
  <tr class="lab"><td>VALORE PRESTAZIONE</td><td></td><td>MARCA DA BOLLO</td><td></td><td>CONTRIBUTO INTEGRATIVO INARCASSA</td>${spese ? '<td></td><td>SPESE NON IMPONIBILI</td>' : ''}</tr>
  <tr><td>${k.totale ? euro(k.totale) : '&nbsp;'}</td><td>+</td><td>${k.bollo ? euro(BOLLO) : '-'}</td><td>+</td><td>4%</td>${spese ? `<td>+</td><td>${euro(k.totaleSpese)}</td>` : ''}</tr>
  <tr class="tot"><td${spese ? ' colspan="3"' : ''}>TOTALE COMPENSO PROFESSIONALE DA CORRISPONDERE</td><td>=</td><td colspan="3" class="grande">${k.totale ? euro(k.daPagare) : '&nbsp;'}</td></tr>
</table>`;
}

export function piede(n, footer) {
  return `<div class="piede"><div class="n">${n}</div>${footer ? `<img src="${footer}">` : ''}</div>`;
}

export function firme(d, timbro, ruolo = 'Il certificatore incaricato') {
  const inf = d?.informativa || {};
  // luogo della firma: il comune dell'immobile ("Caorle (VE)" → "Caorle")
  const luogo = String(d?.immobile?.citta || '').replace(/\s*\([A-Za-z]{2}\)\s*$/, '').trim();
  const luogoData = [luogo, formatData(inf.data)].filter(Boolean).join(', ');
  return `<div class="firme">
  <div class="sx">
    <p>In fede,</p>
    <div class="gap"></div>
    <p>Luogo e data: ${val(luogoData)}</p>
    <div class="gap"></div>
    <p>Per presa visione e accettazione, <b>il committente</b></p>
    <p class="obbl">(obbligatorio indicare il nome e cognome e firma leggibile)</p>
    <p style="padding-left:1.3em">Nome e cognome: ${val(d?.committente?.nome)}</p>
    <div class="linea"></div>
  </div>
  <div class="dx">
    <p><b>${ruolo}</b></p>
    <p>Dott.ssa Arch. Agnese Lorenzon</p>
    ${timbro ? `<img src="${timbro}">` : ''}
  </div>
</div>`;
}

// Parti sempre uguali in tutte le lettere: requisiti completi, metodo di calcolo da rilievo,
// nessuna prestazione supplementare o condizione particolare ("/"). La motivazione è il "Tipo di pratica" dell'immobile.
function pagina1(d, timbro, studio) {
  const S = datiStudio(studio);
  const m = d?.immobile || {};
  const pratica = Array.isArray(m.pratica) ? m.pratica : m.pratica ? [m.pratica] : [];
  const mot = (k, cls = '') => {
    const [, label] = MOTIVAZIONI.find(([key]) => key === k);
    const extra = k === 'altro' && pratica.includes('altro') && m.praticaAltro ? `: ${val(m.praticaAltro)}` : '';
    return `<span${cls ? ` class="${cls}"` : ''}>${cb(pratica.includes(k))}${label}${extra}</span>`;
  };
  return `
<p>La sottoscritta Dott.ssa Arch. Agnese Lorenzon,</p>
<p>nata a Motta di Livenza (TV) il 05/02/1995, C.F. ${esc(S.cf)}, P. IVA ${esc(S.piva.replace(/^IT/i, ''))}, con studio in ${esc(S.comune)}, ${esc(S.indirizzo)}, e-mail: <a>${esc(S.email)}</a>, P.E.C.: <a>${esc(S.pec)}</a></p>
<p>iscritta all’Ordine degli Architetti della Provincia di Venezia alla posizione n. 5160,</p>
<p>iscritta nell’Elenco dei Soggetti Certificatori energetici della Regione Friuli-Venezia Giulia al numero 9664 e della Regione Veneto,</p>
<div class="gap"></div>
<p>con il presente incarico di effettuare l’Attestato di Prestazione Energetica, ai sensi del DLgs. 192/2005 e s.m.i. e del DM 26.06.2015 L.N.G., relativo all’immobile/agli immobili:</p>
<table class="sito">
  <tr class="r1"><td colspan="3">sito/i in: ${val(sito(m))}</td></tr>
  <tr class="r2"><td style="width:38%">Foglio: ${val(m.fg)}</td><td style="width:38%">Mappale: ${val(m.mapp)}</td><td>Sub: ${val(subalterni(d))}</td></tr>
</table>
<div class="gap-s"></div>
<p>per la seguente motivazione:</p>
<div class="motiv">
  ${mot('nuova')}${mot('ristr1', 'centro')}${mot('ristr2')}
  ${mot('riqualificazione')}${mot('passaggio')}${mot('locazione')}${mot('altro')}
</div>
<div class="h big">dichiara</div>
<ul class="punti">
  <li>Di possedere i requisiti di abilitazione all’attestazione della prestazione energetica previsti dal DPR 75/2015
    <div class="opz">${cb(true)} in modo completo e quindi dichiara di certificare l’immobile in autonomia;</div>
    <div class="opz">${cb(false)} in modo parziale e dichiara di certificare l’immobile insieme al professionista: /</div>
    <div class="gap-s"></div>
  </li>
  <li>Che la procedura da rispettare per la valutazione della prestazione energetica e il rilascio del relativo attestato è la seguente:
    <ol class="num">
      <li>L’esecuzione di un rilievo in sito e, se del caso, di una verifica di progetto, finalizzati alla determinazione dell’indice di prestazione energetica dell’immobile e all’eventuale redazione di una diagnosi energetica, per l’individuazione degli interventi di riqualificazione energetica che risultano economicamente convenienti. Queste operazioni comprendono:
        <ol class="alpha">
          <li>il reperimento dei dati di ingresso, relativamente alle caratteristiche climatiche della località, alle caratteristiche dell’utenza, all’uso energetico dell’immobile e alle specifiche caratteristiche dell’edificio e degli impianti, avvalendosi, ove disponibile dell’attestato di qualificazione energetica</li>
          <li>l’individuazione del modello di calcolo, procedura e metodo, e la determinazione della prestazione energetica relativamente a tutti gli usi energetici pertinenti per l’edificio, espressi in base agli indici di prestazione energetica totale e parziali secondo il seguente metodo di calcolo:
            <ul class="scelte">
              <li>${cb(false)} metodo di calcolo di progetto (applicabile a tutte le tipologie edilizie, sia per gli edifici nuovi che per quelli esistenti, indipendentemente dalla loro dimensione);</li>
              <li>${cb(true)} metodo di calcolo da rilievo (applicabile a tutti gli edifici esistenti, indipendentemente dalla tipologia edilizia e dalla dimensione);</li>
              <li>${cb(false)} metodo di calcolo da rilievo semplificato (applicabile esclusivamente agli edifici o alle unità immobiliari residenziali esistenti, con superficie utile inferiore o uguale a 200 mq, fatta eccezione per i casi in cui si rediga l’APE in conseguenza di una ristrutturazione importante);</li>
            </ul>
          </li>
          <li>l’individuazione delle opportunità di intervento per il miglioramento della prestazione energetica in relazione alle soluzioni tecniche proponibili, ai rapporti costi-benefici e ai tempi di ritorno degli investimenti necessari a realizzarle</li>
        </ol>
      </li>
      <li>la classificazione dell’edificio in funzione degli indici di prestazione energetica e il suo confronto con i limiti di legge e le potenzialità di miglioramento in relazione agli interventi di riqualificazione individuati</li>
      <li>il deposito telematico dell’attestato di prestazione energetica presso il catasto energetico della Regione di competenza</li>
      <li>la consegna dell’attestato di prestazione energetica al committente entro quindici giorni dalla consegna alla Regione, unitamente alla ricevuta di avvenuto deposito presso il catasto energetico regionale.</li>
    </ol>
    <div class="gap-s"></div>
  </li>
  <li>di essere obbligato all’esecuzione di un sopralluogo durante il quale si verificheranno i dati relativi all’uso energetico dell’immobile e alle specifiche caratteristiche dell’edificio e degli impianti, anche attraverso rilievo fotografico.</li>
  <li>che le eventuali prestazioni supplementari per l’erogazione del servizio (quali, ad esempio, l’esecuzione di prove in situ) sono le seguenti:<br>descrizione: /</li>
  <li>che le condizioni di erogazione del servizio, compreso eventualmente l’elenco dei documenti da prodursi a cura del richiedente e le modalità attraverso cui comunicare al soggetto certificatore il nominativo del direttore dei lavori, garantire l’informazione delle diverse fasi di realizzazione dell’intervento edilizio e l’accesso al cantiere, sono le seguenti:<br>descrizione: /</li>
</ul>
${firme(d, timbro)}`;
}

function pagina2(d, timbro) {
  const k = calcola(d?.proforma || {});
  const inf = d?.informativa || {};
  const aggiornamento = inf.tipo === 'aggiornamento';
  // data della lettera di incarico originaria (aggiornamento): se manca, spazio da compilare a mano
  const dataPrecedente = formatData(inf.dataPrecedente) ? val(formatData(inf.dataPrecedente)) : '____/____/________';
  const importo = euro(AGGIORNAMENTO).replace(' €', '€');
  const note = String(d?.informativa?.note || '').trim();
  return `
<div class="h">Modalità operative e fasi di svolgimento della prestazione</div>
<p>Il Committente viene informato che l’attività professionale per la redazione dell’Attestato di Prestazione Energetica (APE) si articola nelle seguenti fasi operative:</p>
<div class="gap-s"></div>
<ul class="punti">
  <li>raccolta e analisi della documentazione tecnica ricevuta dal Committente;</li>
  <li>sopralluogo obbligatorio presso l’immobile, con rilievo visivo, strumentale e fotografico;</li>
  <li>redazione dell’Attestato di Prestazione Energetica secondo la normativa vigente;</li>
  <li>trasmissione dell’etichetta energetica al Committente;</li>
  <li>deposito telematico dell’APE nel portale regionale e successiva consegna al Committente dell’attestato completo (con annessa ricevuta di avvenuto deposito a seconda del portale regionale di riferimento).</li>
</ul>
<div class="gap-s"></div>
<p>Si specifica, quindi, che, una volta conclusa la redazione dell’APE, la Professionista provvederà a trasmettere al Committente <b>l’etichetta energetica</b>, quale attestazione dell’avvenuto completamento della prestazione tecnica.</p>
<p>Contestualmente all’invio dell’etichetta energetica verrà trasmessa al Committente la <b>nota proforma</b> relativa al compenso professionale concordato.</p>
<p>Il Committente prende atto e accetta che <b>il deposito dell’APE sul portale regionale e la consegna della relativa ricevuta di avvenuto caricamento avverranno esclusivamente a seguito della ricezione del pagamento</b> del compenso professionale dovuto di cui al paragrafo specifico.</p>
<div class="gap-s"></div>
<p>Restano escluse dall’incarico eventuali prestazioni non espressamente indicate, che dovranno essere oggetto di separato accordo e specificabili nella sezione “Note” a piè pagina.</p>
<div class="h">Obblighi del Committente – Documentazione</div>
<p>Il Committente si impegna a mettere a disposizione della Professionista <b>tutta la documentazione necessaria</b> ai fini della corretta redazione dell’Attestato di Prestazione Energetica.</p>
<div class="gap-s"></div>
<p>A titolo esemplificativo e non esaustivo, tale documentazione comprende:</p>
<div class="gap-s"></div>
<ul class="punti">
  <li><b>libretto di impianto</b>, completo di <b>codice chiave</b>;</li>
  <li>ultimo <b>Rapporto di Controllo di Efficienza Energetica (RCEE)</b>;</li>
  <li>Codici <b>POD</b> (energia elettrica) e <b>PDR</b> (gas);</li>
  <li>ogni ulteriore documentazione tecnica richiesta in relazione alle caratteristiche dell’immobile e degli impianti.</li>
</ul>
<div class="gap-s"></div>
<p>Il Committente prende atto che l’eventuale <b>mancata, incompleta o tardiva trasmissione</b> della documentazione richiesta potrà comportare <b>ritardi nell’esecuzione dell’incarico</b>, nonché nella <b>consegna dell’etichetta energetica e dell’Attestato di Prestazione Energetica</b>, senza che ciò possa comportare responsabilità in capo alla Professionista.</p>
<div class="h">Compenso professionale</div>
${aggiornamento
    ? `<p>In applicazione di quanto previsto e concordato nella precedente lettera di incarico, sottoscritta in data ${dataPrecedente}, il corrispettivo relativo al presente incarico di aggiornamento dell’APE, conferito entro 365 giorni dalla presentazione dell’attestato originario, è determinato nella misura di ${importo} dell’importo inizialmente pattuito, oltre al 4% di rivalsa previdenziale e alla marca da bollo. Il compenso per la presente prestazione ammonta pertanto a:</p>`
    : `<p>Il compenso professionale è determinato sulla base delle aliquote previste dalla tariffa professionale vigente e dalle sue successive modifiche ed integrazioni. L’onorario relativo alle prestazioni oggetto del presente incarico, così come descritte nel presente contratto redatto in conformità alla normativa tariffaria applicabile, è quantificato preventivamente in:</p>`}
${tabellaCompenso(k)}
<div class="gap"></div>
<p>Il pagamento del compenso professionale dovrà essere effettuato <b>entro 15 (quindici) giorni</b> dall’invio dell’etichetta energetica e della contestuale <b>nota proforma</b>, mediante <b>bonifico bancario</b> alle coordinate indicate nella stessa proforma.</p>
<div class="gap-s"></div>
${aggiornamento
    ? `<p>Qualora si rendessero necessari ulteriori aggiornamenti dell’APE e il relativo incarico venisse nuovamente conferito al sottoscritto professionista entro un anno dalla presentazione dell’APE di cui questa lettera di incarico, il corrispettivo per tale aggiornamento sarà determinato nella misura di ${importo} dell’importo inizialmente pattuito nella lettera di incarico sottoscritta in data ${dataPrecedente}, oltre al 4% di rivalsa previdenziale.</p>`
    : `<p>Nel caso in cui si determini la necessità di un aggiornamento dell’APE presentata — incluse, a titolo esemplificativo, variazioni dell’involucro edilizio e/o degli impianti che incidano sulle prestazioni energetiche dell’immobile realizzate in un momento successivo all’erogazione del Certificato Energetico — qualora l’incarico venga nuovamente conferito al Sottoscritto professionista entro un anno (365 giorni) dalla data di presentazione dell’APE oggetto di questa lettera di incarico, <u>la nuova prestazione di aggiornamento avrà un corrispettivo pari a ${euro(AGGIORNAMENTO)}, oltre al 4% di rivalsa previdenziale e alla marca da bollo</u>. Decorso un anno, l’eventuale nuovo incarico per la redazione dell’aggiornamento dell’APE sarà considerato come una prestazione autonoma e comporterà l’applicazione di un onorario standard.</p>`}
${firme(d, timbro)}
<p class="note">Note: ${note ? val(note).replace(/\n/g, '<br>') : ''}</p>`;
}

// Se un testo inserito è lungo, il carattere della pagina si riduce finché tutto sta nelle due pagine
export const ADATTA_SCRIPT = `
for (const c of document.querySelectorAll('.corpo')) {
  let fs = 8;
  while (c.scrollHeight > c.clientHeight + 1 && fs > 6.2) {
    fs -= 0.1;
    c.style.setProperty('--fs', fs.toFixed(2) + 'pt');
  }
}`;

export function renderInformativa(d, { fontsCss = '', timbro = '', footer = '', studio } = {}) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css(fontsCss)}</style></head><body>
<section class="pagina">${testata()}<div class="corpo">${pagina1(d, timbro, studio)}</div>${piede(1, footer)}</section>
<section class="pagina">${testata()}<div class="corpo">${pagina2(d, timbro)}</div>${piede(2, footer)}</section>
</body></html>`;
}
