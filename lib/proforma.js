// Proforma della prestazione, APE o catasto (stessa struttura e calcoli del foglio "PROFORMA 2026.xlsx").
// Il modulo è usato dal server (PDF) e dal browser (anteprima di testo e totali nel form).
import { nomeProforma, moduloDi } from './nomi.js';

// Dati dello studio (valori iniziali): si modificano dall'app, in Opzioni → Dati dello studio e pagamento
export const STUDIO = {
  nome: 'AGNESE LORENZON',
  firma: 'Agnese Lorenzon',
  indirizzo: 'Viale Roma 67/4',
  cap: '30020',
  comune: 'Torre di Mosto (VE)',
  piva: 'IT04654240276',
  cf: 'LRNGNS95B45F770C',
  sdi: '3C984HL',
  email: 'agneselorenzonarch@gmail.com',
  pec: 'agneselorenzonarch@pec.it',
  pagamento: 'Bonifico',
  intestatario: 'Agnese Lorenzon',
  iban: 'IT88J0200836310000104080284',
};
// campi vuoti → valore iniziale, così il documento non resta mai senza dati dello studio
export const datiStudio = (s) => Object.fromEntries(Object.entries(STUDIO).map(([k, v]) => [k, String(s?.[k] ?? '').trim() || v]));

export const BOLLO = 2; // marca da bollo, addebitata al cliente
export const SOGLIA_BOLLO = 77.47; // il bollo è dovuto solo sopra questo importo (prestazioni + contributo, senza il bollo)
export const CONTRIBUTO = 0.04; // contributo integrativo INARCASSA, su prestazioni + bollo
export const GIORNI_PAGAMENTO = 15; // come nella lettera di incarico: entro 15 giorni dall'invio del proforma

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const arrotonda = (n) => Math.round(n * 100) / 100;
// useGrouping 'always': in italiano le migliaia a quattro cifre resterebbero senza punto (1500,00 invece di 1.500,00)
export const euro = (n) => `${arrotonda(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
const qt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dataIt = (d) => d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' });

// "Via Pineda" → "via Pineda"; "Pineda" → "via Pineda"
const TIPI_STRADA = /^(via|viale|piazza|piazzale|piazzetta|corso|largo|vicolo|strada|stradella|località|loc\.|contrada|borgo|frazione|salita|riviera|lungomare|calle|campo|fondamenta)\b/i;
function strada(via) {
  const v = String(via || '').trim();
  if (!v) return '';
  return TIPI_STRADA.test(v) ? v.charAt(0).toLowerCase() + v.slice(1) : `via ${v}`;
}

// Modulo della pratica ('ape', 'catasto', 'pratica'): cambia la lettera di incarico e la frase del proforma
export const tipoPratica = (d) => moduloDi(d);

// Spesa non imponibile proposta per le pratiche catastali (resta modificabile)
export const SPESA_SISTER = 'Rimborso spese diritti catastali e costi associati per variazione presso Agenzia delle Entrate (SISTER)';
export const IMPORTO_SISTER = 80;

// "2026-05-07" → "07/05/2026"
export const dataBreve = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || '').trim();
};

// Protocollo della variazione catastale: sigla della provincia (VE) seguita dal numero → "VE0098153"
export function protocollo(c = {}) {
  const numero = String(c.numero || '').replace(/\s+/g, '');
  if (!numero) return '';
  return `${String(c.sigla || 'VE').trim().toUpperCase()}${numero}`;
}

// Testo della prestazione ricavato dalle sezioni Immobile e Incarico; ogni riga può avere un suo subalterno.
// d: tutta la pratica (immobile, informativa con tipo di pratica e di lettera, dati catastali della variazione)
export function descrizione(d = {}, riga = {}) {
  if (riga.testoLibero || tipoPratica(d) === 'pratica') return riga.testo || '';
  const m = d.immobile || {};
  const citta = String(m.citta || '').trim();
  const comune = citta.replace(/\s*\([A-Za-z]{2}\)\s*$/, '');
  const sub = String(riga.sub ?? '').trim() || String(m.sub || '').trim();
  const civico = String(m.civ || '').trim();
  const indirizzo = [strada(m.via), civico && `n. ${civico}`].filter(Boolean).join(' ');
  const catasto = [m.fg && `Fg. ${m.fg}`, m.mapp && `Mapp. ${m.mapp}`, sub && `Sub. ${sub}`].filter(Boolean).join(', ');
  const unita = riga.tipo === 'non' ? 'non residenziale' : 'residenziale';
  if (tipoPratica(d) === 'catasto') {
    // "Pratica di variazione catastale VE0098153 del 07/05/2026 riferita ad un’unità residenziale sita in Caorle (VE),
    //  via Strada Nuova n. 60, identificata catastalmente al Fg. 42, Mapp. 84, Sub. 24"
    const c = d.catasto || {};
    const prot = protocollo(c);
    const data = dataBreve(c.data);
    return 'Pratica di variazione catastale'
      + (prot ? ` ${prot}` : '')
      + (data ? ` del ${data}` : '')
      + ` riferita ad un’unità ${unita}`
      + (citta ? ` sita in ${citta}` : '')
      + (indirizzo ? `, ${indirizzo}` : '')
      + (catasto ? `, identificata catastalmente al ${catasto}` : '');
  }
  const inizio = d.informativa?.tipo === 'aggiornamento' ? "Aggiornamento dell'Attestato di Prestazione Energetica (APE)" : 'Redazione di Attestato di Prestazione Energetica (APE)';
  return `${inizio} relativa a unità ${unita}`
    + (citta ? ` sita in ${citta}` : '')
    + (indirizzo ? `, ${indirizzo}` : '')
    + (comune || catasto ? `, identificata al NCEU${comune ? ` del Comune di ${comune}` : ''}${catasto ? ` al ${catasto}` : ''}` : '');
}

// Calcoli come nel foglio Excel: bollo e contributo INARCASSA solo sulle prestazioni.
// Le spese non imponibili (es. diritti catastali anticipati) si sommano solo al totale da pagare:
// non entrano nel 4%, né nella soglia della marca da bollo.
export function calcola(p = {}) {
  const righe = (p.righe || []).map((r) => {
    const quantita = r.qt === '' || r.qt == null ? 1 : num(r.qt);
    const prezzo = num(r.prezzo);
    return { ...r, quantita, prezzo, importo: arrotonda(quantita * prezzo) };
  });
  const totale = arrotonda(righe.reduce((s, r) => s + r.importo, 0));
  const bollo = arrotonda(totale * (1 + CONTRIBUTO)) > SOGLIA_BOLLO ? BOLLO : 0;
  const contributo = arrotonda((totale + bollo) * CONTRIBUTO);
  const imponibile = arrotonda(totale + bollo + contributo);
  const spese = (p.spese || [])
    .map((x) => ({ testo: String(x.testo || '').trim(), importo: arrotonda(num(x.importo)) }))
    .filter((x) => x.testo || x.importo);
  const totaleSpese = arrotonda(spese.reduce((s, x) => s + x.importo, 0));
  return { righe, totale, bollo, contributo, imponibile, imposte: 0, spese, totaleSpese, daPagare: arrotonda(imponibile + totaleSpese) };
}

// Destinatario: privato (C.F.) o società/professionista (P.IVA, CF, SDI)
function destinatario(c = {}) {
  const righe = [];
  const via = String(c.via || '').trim();
  if (via) righe.push(`${via}${c.civ ? ` n. ${c.civ}` : ''}`);
  const citta = [c.cap, c.citta].filter((x) => String(x || '').trim()).join(' ');
  if (citta) righe.push(`${citta} IT`);
  if (c.piva) {
    righe.push(`P.IVA ${c.piva}`);
    if (c.cf) righe.push(`CF ${c.cf}`);
    if (c.sdi) righe.push(`SDI ${c.sdi}`);
  } else if (c.cf) {
    righe.push(`C.F.: ${c.cf}`);
  }
  return righe;
}

// nome del file: vedi lib/nomi.js
export const nomeFile = (pf) => `${nomeProforma(pf)}.pdf`;

// "2026-11-15" → Date a mezzogiorno (niente salti di giorno con i fusi orari); vuoto o non valido → oggi
export function dataDi(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date();
}
export const oggiIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

// scadenza del pagamento: data del proforma + giorni
export function scadenza(pf = {}) {
  const giorni = pf.giorni === '' || pf.giorni == null ? GIORNI_PAGAMENTO : Math.max(0, Math.round(num(pf.giorni)));
  return new Date(dataDi(pf.data).getTime() + giorni * 86400000);
}

// Dati di un nuovo proforma presi da una pratica (APE, catasto o pratica edilizia): destinatario, righe con il
// testo già composto, spese non imponibili. quota (solo modulo Pratiche): { tipo: 'intero' | 'acconto' | 'saldo', percento }
export function proformaDaPratica(d = {}, quota = null) {
  const c = d.committente || {};
  const k = calcola(d.proforma || {});
  let righe = k.righe.map((r) => ({ testo: descrizione(d, r), qt: String(r.quantita), prezzo: String(r.prezzo) }));
  if (tipoPratica(d) === 'pratica') {
    const oggetto = String(d.offerta?.oggetto || '').trim().replace(/[.;]\s*$/, '');
    const per = oggetto ? ` per l’incarico professionale relativo ${oggetto}` : ' per l’incarico professionale';
    const pc = Math.min(100, Math.max(0, num(quota?.percento)));
    if (quota?.tipo === 'acconto' || quota?.tipo === 'saldo') {
      righe = [{ testo: `${quota.tipo === 'acconto' ? 'Acconto' : 'Saldo'} (${String(pc).replace('.', ',')}% dell’onorario)${per}`, qt: '1', prezzo: String(arrotonda(k.totale * pc / 100)) }];
    } else if (quota?.tipo === 'intero') {
      righe = [{ testo: `Onorario${per}`, qt: '1', prezzo: String(k.totale) }];
    }
  }
  return {
    pratica_uid: d._uid || '',
    modulo: tipoPratica(d),
    cartella: d.cartella || '',
    destinatario: Object.fromEntries(['nome', 'via', 'civ', 'cap', 'citta', 'cf', 'piva', 'sdi'].map((x) => [x, String(c[x] || '').trim()])),
    righe,
    // le spese a carico del committente delle pratiche edilizie (sanzioni, diritti) non passano dal proforma
    spese: tipoPratica(d) === 'pratica' ? [] : k.spese.map((x) => ({ testo: x.testo, importo: String(x.importo) })),
  };
}

function css(fonts) {
  return `
${fonts}
@page { size: A4; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Roboto', sans-serif; font-size: 8.6pt; color: #000; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
td, th { padding: 0 2.4pt; vertical-align: middle; text-align: left; font-weight: 400; }
b, th, .b { font-weight: 700; }
.r { text-align: right; }
.c { text-align: center; }
.top { display: flex; justify-content: space-between; align-items: flex-start; }
.logo { width: 82pt; height: 82pt; display: block; }
.titolo { text-align: right; }
.titolo .t { font-size: 15.5pt; font-weight: 700; line-height: 1.15; margin-top: 2pt; }
.titolo .n, .titolo .d { font-size: 10pt; margin-top: 3pt; }
.titolo .avv { font-size: 7.6pt; margin-top: 8pt; }
.sep { border-top: 0.75pt solid #7f7f7f; margin-top: 10pt; }
.parti { display: flex; justify-content: space-between; margin-top: 3pt; }
.parti .dest { text-align: right; }
.parti .lab { font-size: 7.6pt; }
.parti .nome { font-size: 9pt; font-weight: 700; margin: 6pt 0 6pt; }
.parti .dest .lab + .nome { margin-top: 6pt; }
.parti .mitt .nome { margin-top: 18pt; }
.righe { margin-top: 16pt; }
.righe thead th { font-weight: 700; padding-bottom: 8pt; border-bottom: 0.5pt solid #7f7f7f; }
.righe tbody td { padding-top: 8pt; padding-bottom: 8pt; border-bottom: 0.5pt solid #7f7f7f; }
.righe tbody tr { break-inside: avoid; }
.righe td.desc { line-height: 1.45; padding-right: 6pt; font-size: 8.2pt; letter-spacing: -0.12pt; }
.tot td { padding-top: 3pt; padding-bottom: 3pt; }
.tot tr.grigio td { background: #F2F2F2; border-bottom: 0.5pt solid #7f7f7f; }
.tot tr.totale td { border-bottom: 0; }
.iva { margin-top: 10pt; }
.iva th { font-size: 9.5pt; padding-bottom: 8pt; }
.iva td { line-height: 1.45; }
.iva .grande { font-size: 13.5pt; font-weight: 700; }
.iva tr + tr + tr td { padding-top: 4pt; }
.tot tr.spese-t td { font-size: 7.8pt; padding-top: 5pt; }
.pag { margin-top: 18pt; background: #F2F2F2; padding: 6pt 0 2pt; }
.pag td { padding-top: 2pt; padding-bottom: 3pt; }
.regime { margin-top: 12pt; font-size: 6.4pt; line-height: 1.5; padding: 0 2.4pt; }
`;
}

// pf: proforma del registro { numero, data, giorni, destinatario, righe: [{ testo, qt, prezzo }], spese }
export function renderProforma(pf, { fontsCss = '', logo = '', studio } = {}) {
  const S = datiStudio(studio);
  const p = pf || {};
  const c = p.destinatario || {};
  const data = dataDi(p.data);
  const k = calcola(p);
  const righe = k.righe.map((r) => `
<tr><td class="desc">${esc(r.testo || '').replace(/\n/g, '<br>')}</td>
  <td class="c">${qt(r.quantita)}</td><td class="c">-</td><td class="r">${euro(r.prezzo)}</td><td class="r b">${euro(r.importo)}</td></tr>`).join('');
  const colonne = '<colgroup><col style="width:49%"><col style="width:8%"><col style="width:14%"><col style="width:14%"><col style="width:15%"></colgroup>';
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css(fontsCss)}</style></head><body>
<div class="top">
  ${logo ? `<img class="logo" src="${logo}">` : '<div></div>'}
  <div class="titolo">
    <div class="t">PROFORMA</div>
    <div class="n">N. ${esc(p.numero || '')}</div>
    <div class="d">${dataIt(data)}</div>
    <div class="avv">Questo documento non costituisce fattura, che sarà emessa al momento del pagamento.</div>
  </div>
</div>
<div class="sep"></div>
<div class="parti">
  <div class="mitt">
    <div class="nome">${esc(S.nome)}</div>
    <div>${esc(S.indirizzo)}</div>
    <div>${esc(`${S.cap} ${S.comune} IT`)}</div>
    <div><b>P.IVA</b> ${esc(S.piva)}</div>
    <div><b>CF</b> ${esc(S.cf)}</div>
    <div><b>SDI</b> ${esc(S.sdi)}</div>
  </div>
  <div class="dest">
    <div class="lab">DESTINATARIO:</div>
    <div class="nome">${esc(String(c.nome || '').toUpperCase())}</div>
    ${destinatario(c).map((x) => `<div>${esc(x)}</div>`).join('')}
  </div>
</div>
<table class="righe">${colonne}
  <thead><tr><th>DESCRIZIONE</th><th class="c">QT.</th><th class="c">SCONTO/MAGG.</th><th class="c">PREZZO UNIT.</th><th class="c">IMPORTO</th></tr></thead>
  <tbody>${righe}</tbody>
</table>
<table class="tot">${colonne}
  <tr class="totale"><td colspan="3"></td><td class="c b">TOTALE</td><td class="r b">${euro(k.totale)}</td></tr>
  ${k.bollo ? `<tr class="grigio"><td colspan="4">Addebito marca da bollo</td><td class="r">${euro(k.bollo)}</td></tr>` : ''}
  <tr class="grigio"><td colspan="4">Contributo integrativo 4,00% INARCASSA</td><td class="r">${euro(k.contributo)}</td></tr>
  ${k.spese.length ? `<tr class="grigio spese-t"><td colspan="5" class="b">Spese non imponibili</td></tr>
  ${k.spese.map((x) => `<tr class="grigio"><td colspan="4">${esc(x.testo)}</td><td class="r">${euro(x.importo)}</td></tr>`).join('')}` : ''}
</table>
<table class="iva"><colgroup><col style="width:52%"><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>
  <tr><th>RIEPILOGO IVA</th><th class="c">IMPONIBILE</th><th class="c">IMPOSTE</th><th class="c">TOTALE</th></tr>
  <tr><td>0% Operazione non soggetta a IVA ai sensi dell'art. 1, commi 54-89, Legge n. 190/2014 e succ. modifiche/integrazioni</td>
    <td class="c">${euro(k.imponibile)}</td><td class="c">- &nbsp; €</td><td class="r grande"${k.spese.length ? ' rowspan="2"' : ''}>${euro(k.daPagare)}</td></tr>
  ${k.spese.length ? `<tr><td>Spese non imponibili</td><td class="c">${euro(k.totaleSpese)}</td><td class="c">- &nbsp; €</td></tr>` : ''}
</table>
<table class="pag"><colgroup><col style="width:17%"><col></colgroup>
  <tr><td colspan="2" class="b">MODALITA' DI PAGAMENTO</td></tr>
  <tr><td colspan="2">${esc(S.pagamento)}</td></tr>
  <tr><td>Intestato a:</td><td>${esc(S.intestatario)}</td></tr>
  <tr><td>IBAN:</td><td>${esc(S.iban)}</td></tr>
  <tr><td>Da saldare entro il:</td><td>${dataIt(scadenza(p))}</td></tr>
</table>
<div class="regime">Regime fiscale: Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, l. n. 190 del 2014 e successive modificazioni.<br>
${k.bollo ? "Assolvimento dell'imposta di bollo ai sensi dell articolo 6, comma 2, del D.M. 17 giugno 2014" : ''}</div>
</body></html>`;
}

// Piè di pagina (come nel foglio Excel): "PROFORMA" a sinistra, studio, data, recapiti e pagina a destra
export function piePaginaProforma(pf, fontsCss = '', studio) {
  const S = datiStudio(studio);
  const data = dataDi(pf?.data);
  return `<div style="width:100%;font-family:'Roboto',sans-serif;font-size:6.6pt;padding:0 0.68cm;display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">
<style>${fontsCss}</style>
<span>PROFORMA</span>
<span>${esc(S.firma)} / ${dataIt(data)} / ${esc(S.email)} / ${esc(S.pec)} / Pag. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;
}
