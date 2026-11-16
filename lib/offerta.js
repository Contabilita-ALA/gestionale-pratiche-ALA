// Modulo Pratiche: "Nota tecnica esplicativa" (facoltativa, con le figure) e "Offerta economica incarico professionale"
// (replica di "Nota tecnica - Offerta economica.docx"). I testi variabili si scrivono nell'app, anche con l'aiuto
// dell'intelligenza artificiale (lib/ai.js); le clausole fisse sono qui. Usato dal server (PDF) e dal browser (valori iniziali).
import { calcola, euro, datiStudio, BOLLO } from './proforma.js';

export const TITOLO_NOTA = 'NOTA TECNICA ESPLICATIVA';
export const TITOLO_OFFERTA = 'OFFERTA ECONOMICA INCARICO PROFESSIONALE';

// voci proposte per una nuova pratica (una per riga, modificabili)
export const ESCLUSIONI_BASE = [
  'Progetti richiesti da Enti diversi (es. Soprintendenza) e/o documentazione aggiuntiva a seguito di richieste di integrazione degli uffici preposti;',
  'Aggiornamento catastale (DOCFA) e Attestato di Prestazione Energetica (A.P.E.);',
  'Oneri, sanzioni amministrative, bolli, diritti di segreteria e catastali;',
  'Parcelle di altri professionisti o consulenti specialistici;',
  'Pratiche per bonus fiscali;',
  'Quanto non espressamente specificato nei punti precedenti.',
].join('\n');
export const PAGAMENTO_BASE = [
  'primo acconto (fondo spese) pari al 50% dell’onorario alla firma del presente incarico;',
  'il saldo, pari al 50% dell’onorario, alla conclusione della prestazione.',
].join('\n');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// **grassetto** dentro un testo già protetto
const grassetto = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const righe = (s) => String(s || '').split('\n').map((x) => x.replace(/^\s*(?:[-•–]|\d+[.)])\s+/, '').trim()).filter(Boolean);

function formatData(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || '');
}

// Testo con una formattazione minima: riga vuota = stacco, "- " = elenco puntato, "1. " = elenco numerato, **grassetto**
export function testoHtml(testo) {
  const out = [];
  let lista = null; // { tag, voci }
  const chiudi = () => {
    if (lista) out.push(`<${lista.tag}>${lista.voci.map((x) => `<li>${grassetto(x)}</li>`).join('')}</${lista.tag}>`);
    lista = null;
  };
  for (const riga of String(testo || '').replace(/\r/g, '').split('\n')) {
    const t = riga.trim();
    const punto = /^[-•–]\s+(.*)$/.exec(t);
    const numero = /^\d+[.)]\s+(.*)$/.exec(t);
    if (punto || numero) {
      const tag = punto ? 'ul' : 'ol';
      if (!lista || lista.tag !== tag) { chiudi(); lista = { tag, voci: [] }; }
      lista.voci.push((punto || numero)[1]);
      continue;
    }
    chiudi();
    out.push(t ? `<p>${grassetto(t)}</p>` : '<div class="gap"></div>');
  }
  chiudi();
  return out.join('\n');
}

function css(fonts) {
  return `
${fonts}
@page { size: A4; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Roboto', sans-serif; font-size: 10pt; color: #000; line-height: 1.28; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 14.5pt; font-weight: 700; text-align: center; margin: 0 0 9pt; }
p { margin: 0; text-align: justify; }
.gap { height: 1.15em; }
b { font-weight: 700; }
ul, ol { margin: 0; padding-left: 2.1em; }
li { text-align: justify; }
ol.pag { padding-left: 3.6em; }
.oggetto { text-decoration: underline; font-style: italic; }
.prest { width: 100%; border-collapse: separate; border-spacing: 0 3pt; margin: 6pt 0 0; }
.prest td { background: #EDEDED; padding: 5pt 7pt; vertical-align: top; text-align: justify; }
.prest td.n { width: 1.2cm; }
.prest td.e { width: 3.3cm; text-align: right; white-space: nowrap; }
.prest tr { break-inside: avoid; }
.prest tr.tot td { background: none; font-weight: 700; text-decoration: underline; padding-top: 3pt; }
.somma { text-align: center; font-style: italic; margin-top: 2pt; }
.finale { text-align: center; font-style: italic; font-weight: 700; font-size: 13pt; }
.forte, .forte li { font-weight: 700; }
.firme { display: grid; grid-template-columns: 1fr 1fr; margin-top: 1.4em; break-inside: avoid; }
.firme p { text-align: left; }
.firme .dx { text-align: center; align-self: end; }
.firme .dx p { text-align: center; }
.firme .linea { border-bottom: 0.75pt solid #000; width: 8.6cm; margin-top: 5.2em; }
.blocco { break-inside: avoid; }
figure { margin: 0 0 14pt; text-align: center; break-inside: avoid; }
figure img { max-width: 100%; max-height: 9.6cm; display: block; margin: 0 auto; }
figcaption { font-style: italic; margin-top: 2pt; }
`;
}

const pagina = (corpo, fonts) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css(fonts)}</style></head><body>${corpo}</body></html>`;

// luogo della firma: quello indicato, altrimenti il comune dello studio senza provincia
const luogoFirma = (d, S) => String(d?.offerta?.luogo || '').trim() || S.comune.replace(/\s*\([A-Za-z]{2}\)\s*$/, '');
const luogoData = (d, S, data) => [luogoFirma(d, S), formatData(data)].filter(Boolean).join(', ');

export const conNota = (d) => d?.nota?.includi !== false && Boolean(String(d?.nota?.testo || '').trim());
export const figure = (d) => (d?.nota?.figure || []).filter((f) => f && f.src);

function nota(d, S) {
  const n = d?.nota || {};
  return `<h1>${esc(String(n.titolo || '').trim() || TITOLO_NOTA)}</h1>
${testoHtml(n.testo)}
<div class="firme">
  <div><p>In fede,</p><p>${esc(luogoData(d, S, n.data || d?.offerta?.data))}</p></div>
  <div class="dx"><p><b>La Professionista</b></p><p>Dott.ssa Arch. Agnese Lorenzon</p></div>
</div>`;
}

function pagineFigure(d) {
  return figure(d).map((f, i) => `<figure><img src="${f.src}"><figcaption>Figura ${i + 1}${String(f.didascalia || '').trim() ? `: ${esc(f.didascalia.trim())}` : ''}</figcaption></figure>`).join('\n');
}

function offerta(d, S) {
  const o = d?.offerta || {};
  const k = calcola(d?.proforma || {});
  const prest = k.righe.filter((r) => String(r.testo || '').trim() || r.importo);
  const somma = prest.length <= 1 ? '' : prest.length === 2 ? ' (somma punti 1. e 2.)' : ` (somma punti da 1. a ${prest.length}.)`;
  const spese = (o.speseCommittente || []).filter((x) => String(x.testo || '').trim());
  const oggetto = String(o.oggetto || '').trim();
  return `<h1>${TITOLO_OFFERTA}</h1>
<p>La sottoscritta Dott.ssa Arch. Agnese Lorenzon, nata a Motta di Livenza (TV) il 05/02/1995, residente a ${esc(S.comune)}, ${esc(S.indirizzo)}, C.F. ${esc(S.cf)}, P. IVA ${esc(S.piva.replace(/^IT/i, ''))}, iscritta all’Ordine degli Architetti della Provincia di Venezia alla posizione n. 5160, su richiesta del Cliente sopra indicato, redige il presente preventivo di compenso professionale relativo alle prestazioni di seguito descritte.</p>
<p>Il presente documento costituisce proposta economica e non comporta conferimento di incarico, che si intenderà eventualmente perfezionato solo a seguito di firma dello stesso.</p>
<div class="gap"></div>
<p>L’oggetto dell’incarico è inerente <span class="oggetto">${oggetto ? grassetto(oggetto) : '…'}</span></p>
<div class="gap"></div>
<p>La Sottoscritta Professionista${conNota(d) ? ', facendo riferimento a quanto esposto alla pagina 1,' : ''} ha individuato una serie di servizi e prestazioni professionali comprensiva di:</p>
<table class="prest">
${prest.map((r, i) => `<tr><td class="n">${i + 1}.</td><td>${grassetto(r.testo || '').replace(/\n/g, '<br>')}</td><td class="e">${euro(r.importo)}</td></tr>`).join('\n')}
<tr class="tot"><td class="n"></td><td>TOTALE:</td><td class="e">${euro(k.totale)}</td></tr>
</table>
<div class="gap"></div>
<div class="blocco">
<p>Per lo svolgimento delle prestazioni oggetto del presente incarico, alla Professionista spettano dunque:</p>
<div class="gap" style="height:.5em"></div>
<p class="somma">${euro(k.totale)}${somma} + 4% contributo integrativo Inarcassa${k.bollo ? ` + ${euro(BOLLO)} marca da bollo` : ''} =</p>
<p class="finale">${euro(k.imponibile)}</p>
</div>
<div class="gap"></div>
${righe(o.esclusioni).length ? `<p>Si precisa che <b>non sono comprese</b>:</p>
<ul>${righe(o.esclusioni).map((x) => `<li>${grassetto(x)}</li>`).join('')}</ul>
<div class="gap"></div>` : ''}
${righe(o.pagamento).length ? `<p>Il pagamento del corrispettivo avverrà secondo le seguenti modalità e termini:</p>
<ol class="pag">${righe(o.pagamento).map((x) => `<li>${grassetto(x)}</li>`).join('')}</ol>
<div class="gap"></div>` : ''}
<p>Alle scadenze sopra indicate la Professionista provvederà all’emissione di apposito avviso di proforma per l’importo dovuto, cui seguirà l’emissione della fattura definitiva al termine dell’incarico.</p>
<p>Le coordinate per l’effettuazione dei pagamenti saranno indicate nelle rispettive proforme.</p>
<p>In caso di mancato pagamento entro i termini ivi previsti, decorreranno automaticamente, dalla data di scadenza, gli interessi moratori ai sensi dell’art. 5 del Decreto Legislativo 9 ottobre 2002 n. 231, a favore della Professionista e a carico del Committente.</p>
<div class="gap"></div>
<p>La Professionista si impegna a svolgere l’incarico nel rispetto del Codice Civile (artt. 2229 e ss.), delle leggi vigenti e delle norme deontologiche del Consiglio Nazionale degli Architetti, operando con competenza, perizia e diligenza.</p>
<p>L’incarico decorre dalla firma della lettera e termina con la conclusione della prestazione.</p>
<p>Non sono considerati nei termini contrattuali i tempi amministrativi necessari per pareri o nulla osta. Eventuali modifiche alla programmazione (proroghe o differimenti) dovute a esigenze progettuali o richieste del Committente devono essere concordate tra le parti e comportano automaticamente l’estensione dei termini.</p>
${spese.length ? `<div class="gap"></div>
<div class="blocco forte"><p>Restano a carico del Committente, in quanto <u>NON ricompresi nel compenso professionale sopra indicato</u>, le seguenti spese di natura amministrativa e burocratica, attualmente quantificabili come segue:</p>
<ul>${spese.map((x) => `<li>${String(x.importo || '').trim() ? `${esc(euroPrima(x.importo))} per ` : ''}${grassetto(x.testo.trim())}</li>`).join('')}</ul></div>` : ''}
<div class="firme">
  <div><p>In fede,</p><p>${esc(luogoData(d, S, o.data))}</p><div class="gap"></div><p>Per presa visione e accettazione,</p><p><b>il Committente</b></p><div class="linea"></div></div>
  <div class="dx" style="align-self:start;padding-top:4.9em"><p>La Professionista</p><p><b>Dott.ssa Arch. Agnese Lorenzon</b></p></div>
</div>`;
}

// "1000" → "€ 1.000,00" (come nella lettera: il simbolo prima dell'importo)
function euroPrima(v) {
  const n = parseFloat(String(v).replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })}` : String(v);
}

// Parti del documento, ognuna impaginata a sé: la prima pagina di nota e offerta ha il destinatario nell'intestazione
export function renderParti(d, { fontsCss = '', studio } = {}) {
  const S = datiStudio(studio);
  const parti = [];
  if (conNota(d)) {
    parti.push({ k: 'nota', spett: true, html: pagina(nota(d, S), fontsCss) });
    if (figure(d).length) parti.push({ k: 'figure', spett: false, html: pagina(pagineFigure(d), fontsCss) });
  }
  parti.push({ k: 'offerta', spett: true, html: pagina(offerta(d, S), fontsCss) });
  return parti;
}

// Intestazione di pagina: logo a sinistra e, se indicato, il destinatario a destra ("Spett. …")
export function intestazione(logo, fontsCss, committente) {
  const c = committente || null;
  const via = c ? [String(c.via || '').trim(), String(c.civ || '').trim()].filter(Boolean).join(' ') : '';
  const citta = c ? [String(c.cap || '').trim(), String(c.citta || '').trim()].filter(Boolean).join(', ') : '';
  return `<div style="width:100%;margin:0;padding:0 1.905cm;display:flex;justify-content:space-between;align-items:flex-start;font-family:'Roboto',sans-serif;-webkit-print-color-adjust:exact;">
<style>${fontsCss}</style>
<img src="${logo}" style="width:2.78cm;height:2.77cm;margin-top:0.48cm;display:block">
${c ? `<div style="text-align:right;margin-top:0.62cm;font-size:10pt;line-height:1.3;color:#000">
<div style="font-weight:700;font-size:10.5pt;margin-bottom:5pt">Spett. ${esc(String(c.nome || '').toUpperCase())}</div>
${via ? `<div>${esc(via.toUpperCase())}</div>` : ''}${citta ? `<div>${esc(citta.toUpperCase())}</div>` : ''}
${c.piva ? `<div>P.IVA ${esc(c.piva)}</div>` : ''}</div>` : ''}
</div>`;
}
