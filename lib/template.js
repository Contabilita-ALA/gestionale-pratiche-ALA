// Genera l'HTML del "Documento dati d'ingresso e sopralluogo" a partire dai dati del form.
// Le misure replicano il .docx originale: le larghezze delle colonne sono in twip (1/20 pt).
import { statoAllegati } from './allegati.js';

export const DOCUMENTI = [
  'Elaborati grafici (Piante, Sezioni, Prospetti) aggiornati',
  'Planimetrie catastali aggiornate',
  'Documenti D.Lgs. 192/05 oppure Legge10/91 (Relazione tecnica, Planimetrie, Stratigrafie pareti/solai)',
  'Dati sui materiali isolanti usati: Marcature CE, Bolle di consegna, Dichiarazioni di conformità DM 2/4/98',
  'Dati sugli infissi/finestre usati: Dichiarazioni U<sub>w</sub> produttore / fornitore, Dichiarazioni U<sub>g</sub> produttore / fornitore, Dichiarazione di corretta posa',
  'Libretto di impianto comprensivo delle schede: risultati della prima verifica effettuata dall’installatore e delle verifiche periodiche successive effettuate dal manutentore, interventi di controllo efficienza energetica',
  'Tabella millesimale con millesimi di riscaldamento/acs/raffrescamento (se imp. centralizzato)',
  'Progetto Impianti termici',
  'Progetto Impianti elettrici ed illuminazione',
  'Progetto impianti energia rinnovabile',
  'Progetto ventilazione meccanica',
  'Progetto o documentazione relativa ad ascensori/scale mobili',
  'Documentazione relativa a interventi di ristrutturazione effettuati negli anni',
  'Attestato di qualificazione energetica',
  'Relazione tecnica di cui al comma 1 dell’articolo 8 del D.Lgs.192/2005, attestante la rispondenza alle prescrizioni in materia di contenimento del consumo energetico degli edifici',
];

export const TIPI_ALTRI = {
  stufa_pellet: 'STUFA A PELLET',
  stufa_legna: 'STUFA A LEGNA',
  caminetto: 'CAMINETTO / TERMOCAMINO',
  stufa_gas: 'STUFA A GAS / GPL',
  scaldacqua_el: 'SCALDACQUA ELETTRICO',
  scaldacqua_gas: 'SCALDACQUA A GAS',
  pdc_acs: 'POMPA DI CALORE ACS',
  solare: 'SOLARE TERMICO',
  fotovoltaico: 'FOTOVOLTAICO',
  vmc: 'VENTILAZIONE MECCANICA',
  altro: 'ALTRO',
};

const esc = (v) =>
  v == null
    ? ''
    : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// valore compilato dall'utente
const v = (x) => (x == null || x === '' ? '' : `<span class="val">${esc(x)}</span>`);
const has = (arr, key) => Array.isArray(arr) ? arr.includes(key) : arr === key;
const cb = (on) => `<span class="cb${on ? ' on' : ''}"></span>`;
// casella e testo restano sempre sulla stessa riga
const opt = (on, label) => `<span class="opt">${cb(on)}${label}</span>`;
// numero e unità di misura sempre vicini (es. "120 cm.", "24 kW")
const un = (x, unita) => `<span class="nu">${v(x)}&nbsp;${unita}</span>`;
const cols = (grid) => `<colgroup>${grid.map((w) => `<col style="width:${w / 20}pt">`).join('')}</colgroup>`;
const vt = (html, wrap = false) => `<div class="vt${wrap ? ' wrap' : ''}">${html}</div>`;

function css(fonts) {
  return `
${fonts}
@page { size: A4; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Roboto', sans-serif; font-size: 11pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { width: 487.3pt; }
p { margin: 0; }
.title { font-weight: 700; font-size: 14pt; text-align: center; line-height: 1.1; }
.h { font-weight: 700; font-size: 12pt; text-align: center; line-height: 1.1; }
.hl { background: #D3D3D3; display: inline-block; }
.gap { height: 13.2pt; }
.gap-s { height: 8pt; }
.page-break { break-before: page; }
/* niente spazio vuoto in cima alla pagina di una nuova categoria */
.grp > .gap:first-child, .grp > .gap-s:first-child, .grp > .keep:first-child > .gap:first-child { display: none; }
.keep { break-inside: avoid; }
table { border-collapse: collapse; table-layout: fixed; width: 100%; }
td { padding: 0 5.4pt; vertical-align: middle; overflow-wrap: break-word; }
.val { font-family: 'Roboto', sans-serif; color: #1F3864; font-weight: 400; }
.opt, .nu { white-space: nowrap; }
.cb { display: inline-block; width: 0.66em; height: 0.66em; border: 0.6pt solid #000; margin-right: 0.3em; vertical-align: -0.02em; position: relative; }
/* X della casella spuntata: due linee ruotate (le sfumature diventerebbero immagini pesanti nel PDF) */
.cb.on::before, .cb.on::after { content: ''; position: absolute; left: 50%; top: 50%; width: 141%; height: 1pt; background: #000; }
.cb.on::before { transform: translate(-50%, -50%) rotate(45deg); }
.cb.on::after { transform: translate(-50%, -50%) rotate(-45deg); }
.cb.on { overflow: hidden; }
.uni { font-family: 'Roboto', sans-serif; }
.play { font-family: 'Roboto', sans-serif; }
.b { font-weight: 700; }
.c { text-align: center; }
.r { text-align: right; }

.g { background: #F2F2F2; }

/* Pagina 1 */
.t-visita td { border: 0.5pt solid #000; height: 28pt; font-size: 10pt; }
.t-visita td:first-child { font-weight: 700; text-align: center; }
.t-visita .val { font-size: 10pt; }
.t-firme td { font-size: 10pt; text-align: center; vertical-align: top; }
.firma-line { margin: 30pt auto 0; width: 85%; border-bottom: 0.75pt solid #000; }
.timbro { width: 199.5pt; height: 90.75pt; display: block; margin: 2pt auto 0; }

/* Checklist */
.legenda { font-size: 11pt; }
.t-docs td { border: 0.5pt solid #000; height: 19.85pt; font-size: 8pt; line-height: 1.12; padding-top: 1pt; padding-bottom: 1pt; }
.t-docs thead td { background: #D9D9D9; font-weight: 700; text-align: center; }
.t-docs td.n { text-align: center; }
.t-docs td.k { text-align: center; padding: 0; }
.t-docs td.k .cb { margin: 0; width: 0.75em; height: 0.75em; border-width: 0.5pt; }
.t-docs .val { font-size: 8pt; }
.allegati-t { font-weight: 700; font-size: 12pt; margin: 0 0 8pt; }
.allegati { font-size: 11pt; line-height: 1.4; }
.allegati li { padding-left: 2pt; }
.allegati ol { margin: 0; padding-left: 14.2pt; }
.allegati li::marker { background: #D3D3D3; }
.allegati .lab { display: inline-block; width: 205pt; }
.allegati .o1 { display: inline-block; width: 85pt; }
.allegati .cb { width: 0.62em; height: 0.62em; }
.allegati .dato { display: inline-block; min-width: 150pt; border-bottom: 0.5pt solid #A6A6A6; line-height: 1.2; }

/* Tabelle schede: font base */
.sk td { font-family: 'Roboto', sans-serif; font-size: 10pt; padding: 0 3.6pt; }
.sk td.vl, .t-conf td.vl { font-family: 'Roboto', sans-serif; color: #fff; text-align: center; padding: 0; line-height: 1.12; }
/* etichette laterali: testo verticale letto dal basso verso l'alto */
.vt { writing-mode: vertical-rl; transform: rotate(180deg); margin: 0 auto; white-space: nowrap; }
.vt.wrap { white-space: normal; inline-size: 90pt; text-align: center; }
.t-comm .vt, .t-imm .vt { letter-spacing: 2pt; }
.sk td.u { font-family: 'Roboto', sans-serif; }

/* Committente */
.t-comm { border: 2.25pt solid #00FFCC; }
.t-comm td { height: 28.35pt; border-top: 0.5pt solid #BFBFBF; border-bottom: 0.5pt solid #BFBFBF; }
.t-comm td.lab { border-right: none; }
.t-comm td.sep { border-left: 0.5pt solid #BFBFBF; }
.t-comm td.vl { background: #00FFCC; font-size: 12pt; border: 2.25pt solid #00FFCC; }
.t-comm tr:nth-child(even) td:not(.vl) { background: #F2F2F2; }

/* Immobile */
.t-imm { border: 2.25pt solid #808080; }
.t-imm td { height: 28.35pt; border-top: 0.5pt solid #BFBFBF; border-bottom: 0.5pt solid #BFBFBF; }
.t-imm td.sep { border-left: 0.5pt solid #BFBFBF; }
.t-imm td.vl { background: #808080; font-size: 12pt; border: 2.25pt solid #808080; }
.t-imm tr:nth-child(even) td:not(.vl) { background: #F2F2F2; }
.t-imm td.u { line-height: 1.7; }
.t-imm tr.pr td { height: 19pt; line-height: 1.2; }
.t-inf tr.mezza td { height: 16pt; }

/* Confini */
.t-conf td { height: 16.5pt; font-size: 10pt; padding: 0 3pt; }
.t-conf td.vl { font-weight: 700; font-size: 10pt; padding: 0 2pt; }
.t-conf .y { background: #FFC000; border: 1pt solid #FFC000; }
.t-conf .p { background: #7030A0; border: 1pt solid #7030A0; }
.t-conf .ry { border-right: 1pt solid #FFC000; }
.t-conf .rp { border-right: 1pt solid #7030A0; }
.t-conf .ty { border-top: 1pt solid #FFC000; }
.t-conf .tp { border-top: 1pt solid #7030A0; }
.t-conf .by { border-bottom: 1pt solid #FFC000; }
.t-conf .bp { border-bottom: 1pt solid #7030A0; }

/* Porta */
.t-porta { border: 1.5pt solid #EE0000; }
.t-porta td { height: 22.7pt; }
.t-porta td.vl { background: #EE0000; font-size: 10pt; }
.t-porta tr + tr td { border-top: 0.5pt solid #BFBFBF; }
.t-porta td.sep { border-left: 0.5pt solid #75E1CC; }

/* Infisso */
.t-inf { border: 2.25pt solid #0070C0; }
.t-inf td { height: 19pt; font-size: 9.5pt; line-height: 1.15; }
.t-inf td.vl { background: #0070C0; font-weight: 700; font-size: 10pt; }
.t-inf tr.blue td:not(.vl) { font-size: 9.5pt; white-space: nowrap; color: #0070C0; font-weight: 700; border-top: 2.25pt solid #0070C0; border-bottom: 2.25pt solid #0070C0; }
.t-inf tr.blue td.sepl { border-left: 0.5pt solid #A5A5A5; }
.t-inf tr.blue .val { color: #1F3864; }
.t-inf tr.line td:not(.vl) { border-bottom: 0.5pt solid #0070C0; }
.t-inf .sm { font-size: 8pt; line-height: 1.05; }
.t-inf sub { font-size: 6pt; vertical-align: -1pt; }

/* Codici */
.codici { margin-left: auto; width: 312.55pt; }
.codici div { height: 26.25pt; font-family: 'Roboto', sans-serif; font-weight: 700; font-size: 11pt; padding: 0 7.2pt; display: flex; align-items: center; gap: 6pt; }
.codici .k1 { background: rgba(155, 187, 89, 0.5); }
.codici .k2 { background: rgba(75, 172, 198, 0.5); }
.codici .k3 { background: rgba(247, 150, 70, 0.5); }
.codici .val { font-weight: 400; }

/* Riscaldamento */
.t-risc { border: 1.5pt solid #C00000; }
.t-risc td { height: 19.85pt; }
.t-risc td.vl { background: #C00000; font-size: 10pt; }
.t-risc tr.head td:not(.vl) { background: #FBE4D5; }
.t-risc tr.redtop td:not(.vl) { border-top: 1.5pt solid #C00000; }
.t-risc tr.dash td:not(.vl) { border-bottom: 0.5pt dashed #A6A6A6; }
.t-risc tr.line td:not(.vl) { border-bottom: 0.5pt solid #7F7F7F; }
.t-risc .pk { background: #F7C7AC; }
.t-risc .or { color: #E97132; font-weight: 700; }
.t-risc .or.lab { font-size: 9pt; line-height: 1.1; }
.t-risc td.lab-n { white-space: nowrap; font-size: 9.5pt; padding-right: 0; }

/* Raffrescamento */
.t-raff { border: 1.5pt solid #002060; }
.t-raff td { height: 19.85pt; }
.t-raff td.vl { background: #002060; font-weight: 700; font-size: 10pt; }
.t-raff tr.head td:not(.vl) { background: #DEEAF6; }
.t-raff tr.top td:not(.vl) { border-top: 1.5pt solid #002060; }
.t-raff tr.dash td:not(.vl) { border-bottom: 0.5pt dashed #A6A6A6; }
.t-raff tr.solid td:not(.vl) { border-bottom: 0.5pt solid #002060; }
.t-raff td.mid { border-left: 0.5pt solid #002060; }
.t-raff .bl { color: #0070C0; }
.t-raff .rd { color: #C00000; }

/* Altri apparecchi */
.t-alt { border: 1.5pt solid #548235; }
.t-alt td { height: 19.85pt; }
.t-alt td.vl { background: #548235; font-weight: 700; font-size: 10pt; }
.t-alt tr.head td:not(.vl) { background: #E2EFD9; }
.t-alt tr + tr td:not(.vl) { border-top: 0.5pt solid #BFBFBF; }

/* Foto */
.t-foto td { border: 0.5pt solid #75E0CC; }
.t-foto td.cap { height: 22.7pt; font-family: 'Roboto', sans-serif; font-size: 10pt; text-align: center; color: #1F3864; }
.t-foto td.ph { height: 266pt; padding: 4pt; text-align: center; vertical-align: middle; }
.t-foto img { max-width: 100%; max-height: 254pt; object-fit: contain; display: block; margin: 0 auto; }
.t-foto tbody.coppia { break-inside: avoid; }
/* rilievo: un'immagine per pagina, adattata allo spazio sotto il titolo */
.ril { display: flex; flex-direction: column; }
.ril .ril-img { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.ril img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
`;
}

function pagina1(d, { timbro = 'assets/timbro.png' } = {}) {
  // ruolo "committente": il nome è quello della scheda Committente (resta aggiornato se cambia)
  const presenti = (d.presenti || [])
    .map((p) => (p?.ruolo === 'committente' ? { ...p, nome: d.committente?.nome || '' } : p))
    .filter((p) => p && (p.nome || '').trim());
  const righe = Math.max(1, presenti.length);
  let firme = '';
  for (let i = 0; i < righe; i++) {
    const p = presenti[i];
    const nome = p ? `<div>${v(p.nome)}</div>` : '';
    if (i === 0) {
      firme += `
<tr><td></td><td>Il Certificatore</td></tr>
<tr style="height:94.1pt">
  <td>${nome}<div class="firma-line"></div></td>
  <td>${esc(d.certificatore?.nome || 'ARCH. AGNESE LORENZON')}${d.certificatore?.timbro === false ? '' : `<img class="timbro" src="${timbro}">`}</td>
</tr>`;
    } else {
      firme += `<tr style="height:60pt"><td>${nome}<div class="firma-line"></div></td><td></td></tr>`;
    }
  }
  return `
<p class="title">DOCUMENTO RIPORTANTE</p>
<p class="title">I DATI DI INGRESSO E I SOPRALLUOGHI EFFETTUATI</p>
<div class="gap"></div>
<p class="h"><span class="hl">DATI DI INPUT PER IL CALCOLO</span></p>
<div class="gap"></div>
<table class="t-visita">${cols([1805, 7931])}
  <tr><td>N. visita</td><td>${v(d.visita?.numero)}</td></tr>
  <tr><td>Data visita</td><td>${v(formatData(d.visita?.data))}</td></tr>
</table>
<div class="gap"></div><div class="gap"></div>
<p class="h"><span class="hl">PERSONE PRESENTI DURANTE IL SOPRALLUOGO:</span></p>
<div class="gap"></div>
<table class="t-firme">${cols([4868, 4868])}${firme}</table>`;
}

function formatData(s) {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// dati obbligatori del portale FVGEnergia (non allegati), dalla sezione codici del riscaldamento
const DATI_PORTALE = [['targa', 'Codice targa'], ['pod', 'POD'], ['pdr', 'PDR']];

function checklist(d) {
  const docs = d.documenti || [];
  const rows = DOCUMENTI.map((txt, i) => {
    const x = docs[i] || {};
    return `<tr><td class="n">${String(i + 1).padStart(2, '0')}</td><td>${txt}</td><td>${v(x.note)}</td><td class="k">${cb(x.stato === 'P')}</td><td class="k">${cb(x.stato === 'NP')}</td></tr>`;
  }).join('');
  // allegati del portale FVGEnergia: presenti se caricati nella pratica o generati dall'app (lib/allegati.js)
  const al = (a) =>
    `<li><span class="lab">${a.titolo}:</span><span class="o1 uni">${opt(a.presente, 'PRESENTE')}</span><span class="uni">${opt(!a.presente, 'ASSENTE')}</span></li>`;
  return `
<p class="h"><span class="hl">DATI DI INPUT PER IL CALCOLO:</span></p>
<div class="gap"></div>
<p class="legenda"><b>Legenda:</b> P: presente&nbsp;&nbsp; NP: non presente</p>
<div class="gap-s"></div>
<table class="t-docs">${cols([675, 4282, 3911, 525, 525])}
  <thead><tr><td></td><td>Documenti</td><td>Note ed osservazioni</td><td>P</td><td>NP</td></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="gap"></div>
<p class="allegati-t"><span class="hl">ALLEGATI:</span></p>
<div class="allegati"><ol>
${statoAllegati(d).map(al).join('\n')}
${DATI_PORTALE.map(([k, lab]) => `<li><span class="lab">${lab}:</span><span class="dato">${v(d.codici?.[k])}</span></li>`).join('\n')}
</ol></div>`;
}

// ---------------------------------------------------------------------------
// Solo i dati compilati: le righe senza valori né caselle spuntate non compaiono e la fascia colorata
// laterale (rowspan) si adatta. Con l'opzione disattivata si stampa il modulo completo, da compilare a mano.
// ---------------------------------------------------------------------------
let soloCompilati = true; // impostato da renderBody per ogni documento
const ETICHETTA = '<!--etichetta-->';
const pieno = (html) => html.includes('class="val"') || html.includes('class="cb on"');

// righe: '<tr…>…</tr>' oppure gruppi di righe con un'etichetta comune a sinistra:
// { etichetta: (rowspan) => '<td…>…</td>', righe: ['<tr…><!--etichetta-->…</tr>', …], interi: true }
// interi: il gruppo compare con tutte le sue righe se almeno una è compilata.
// complete: tutte le righe della tabella compaiono sempre (schede di porte, infissi, impianti: si vede il box intero).
function tabella(apertura, vl, righe, { complete = false } = {}) {
  const out = [];
  for (const r of righe) {
    if (typeof r === 'string') {
      if (complete || !soloCompilati || pieno(r)) out.push(r);
      continue;
    }
    const tenute = complete || !soloCompilati ? r.righe : r.interi ? (r.righe.some(pieno) ? r.righe : []) : r.righe.filter(pieno);
    tenute.forEach((t, i) => out.push(t.replace(ETICHETTA, i ? '' : r.etichetta(tenute.length))));
  }
  if (!out.length) return '';
  out[0] = out[0].replace(/^(\s*<tr[^>]*>)/, (m) => m + vl(out.length));
  return `${apertura}\n${out.join('\n')}\n</table>`;
}

function committente(d) {
  const c = d.committente || {};
  return tabella(`<table class="sk t-comm keep">${cols([557, 3114, 3260, 866, 1944])}`, (n) => `<td class="vl" rowspan="${n}">${vt('COMMITTENTE')}</td>`, [
    `<tr><td class="lab">Nome/Cognome o Ragione sociale:</td><td colspan="3">${v(c.nome)}</td></tr>`,
    `<tr><td class="lab">Codice Fiscale:</td><td colspan="3">${v(c.cf)}</td></tr>`,
    `<tr><td class="lab">Partita IVA:</td><td>${v(c.piva)}</td><td class="sep">SDI:</td><td>${v(c.sdi)}</td></tr>`,
    `<tr><td class="lab">Via/piazza:</td><td>${v(c.via)}</td><td class="sep">Civ.:</td><td>${v(c.civ)}</td></tr>`,
    `<tr><td class="lab">Città/provincia:</td><td>${v(c.citta)}</td><td class="sep">C.A.P.:</td><td>${v(c.cap)}</td></tr>`,
    `<tr><td class="lab">E-mail:</td><td>${v(c.email)}</td><td class="sep">Cell.:</td><td>${v(c.cell)}</td></tr>`,
  ]);
}

function immobile(d) {
  const m = d.immobile || {};
  const p = m.pratica || [];
  const t = tabella(`<table class="sk t-imm keep">${cols([552, 2127, 1173, 1173, 347, 826, 709, 464, 402, 771, 1173])}`, (n) => `<td class="vl" rowspan="${n}">${vt('IMMOBILE')}</td>`, [
    `<tr><td>Via/piazza:</td><td colspan="5">${v(m.via)}</td><td class="sep" colspan="2">Civ.:</td><td colspan="2">${v(m.civ)}</td></tr>`,
    `<tr><td>Città/provincia:</td><td colspan="5">${v(m.citta)}</td><td class="sep" colspan="2">C.A.P.:</td><td colspan="2">${v(m.cap)}</td></tr>`,
    `<tr><td>Anno di costruzione:</td><td colspan="3">${v(m.anno)}</td><td class="sep" colspan="4">Anno ultima ristr. imp.:</td><td colspan="2">${v(m.annoRistr)}</td></tr>`,
    `<tr><td>DATI CATASTALI:</td><td>FG.:</td><td>${v(m.fg)}</td><td class="sep" colspan="2">MAPP.:</td><td colspan="2">${v(m.mapp)}</td><td class="sep" colspan="2">SUB.:</td><td>${v(m.sub)}</td></tr>`,
    {
      etichetta: (n) => `<td rowspan="${n}">TIPO DI PRATICA:</td>`,
      interi: true,
      righe: [
        `<tr class="pr">${ETICHETTA}<td class="u" colspan="4">${opt(has(p, 'nuova'), 'nuova costruzione')}</td><td class="u" colspan="5">${opt(has(p, 'ristr1'), 'ristrutturazione I livello')}</td></tr>`,
        `<tr class="pr">${ETICHETTA}<td class="u" colspan="4">${opt(has(p, 'ristr2'), 'ristrutturazione II livello')}</td><td class="u" colspan="5">${opt(has(p, 'riqualificazione'), 'riqualificazione energetica')}</td></tr>`,
        `<tr class="pr">${ETICHETTA}<td class="u" colspan="4">${opt(has(p, 'passaggio'), 'passaggio di proprietà')}</td><td class="u" colspan="5">${opt(has(p, 'locazione'), 'locazione')}</td></tr>`,
        `<tr class="pr">${ETICHETTA}<td class="u" colspan="9">${opt(has(p, 'altro'), 'altro:')} ${v(m.praticaAltro)}</td></tr>`,
      ],
    },
  ]);
  return t ? `<div class="gap-s"></div>${t}` : '';
}

function confini(d) {
  const c = d.confini || {};
  const r = c.risc || [];
  const n = c.nonRisc || [];
  const L = [
    ['diverso', 'Altro appartamento&nbsp;imp. diverso'],
    ['stesso', 'Altro appartamento&nbsp;stesso imp.'],
    ['ufficio', 'Ufficio'],
    ['ristorante', 'Ristorante'],
    ['albergo', 'Albergo'],
    ['altro', 'Altro:'],
  ];
  const R = [
    ['garage', 'Garage'],
    ['scala', 'Vano scala'],
    ['sottotetto', 'Sottotetto'],
    ['interrato', 'Piano interrato o seminterrato'],
    ['controterra', 'Pavimento o parete controterra'],
    ['circolazione', 'Aree interne di circolazione'],
    ['altro', 'Altro:'],
  ];
  // la tabella compare intera (come nel modello) se almeno un ambiente è spuntato
  if (soloCompilati && !r.length && !n.length) return '';
  const sx = L;
  const dx = R;
  const righe = Math.max(L.length, R.length);
  const rows = Array.from({ length: righe }, (_, i) => {
    const g = i % 2 ? ' g' : '';
    const first = i === 0;
    const last = i === righe - 1;
    const lato = (voci, sel, cls, vlCls, titolo, altro) => {
      if (!voci.length) return '<td></td><td></td>';
      const vl = first ? `<td class="vl ${vlCls}" rowspan="${righe}">${vt(titolo, true)}</td>` : '';
      const voce = voci[i];
      const cella = voce ? `${opt(has(sel, voce[0]), voce[1])}${voce[0] === 'altro' && altro ? ' ' + v(altro) : ''}` : '';
      const bordi = `${cls}${g}${first ? ` t${cls.slice(1)}` : ''}${last ? ` b${cls.slice(1)}` : ''}`;
      return `${vl}<td class="uni ${bordi}">${cella}</td>`;
    };
    return `<tr>${lato(sx, r, 'ry', 'y', 'AMBIENTE DI CONFINE RISCALDATO', c.riscAltro)}<td></td>${lato(dx, n, 'rp', 'p', 'AMBIENTE DI CONFINE <u>NON</u> RISCALDATO', c.nonRiscAltro)}</tr>`;
  }).join('');
  return `
<div class="gap"></div>
<table class="t-conf keep">${cols([1077, 3221, 1070, 1073, 3219])}${rows}</table>`;
}

// i: posizione nell'elenco, come per gli infissi
function porta(p, i = 0) {
  const t = p.tipo;
  const tab = tabella(`<table class="sk t-porta keep">${cols([558, 1527, 616, 911, 843, 684, 1071, 457, 1527, 1522])}`, (n) => `<td class="vl" rowspan="${n}">${vt('PORTA')}</td>`, [
    `<tr><td colspan="2"><b>N.</b> ${v(String(i + 1))}&nbsp;&nbsp; TIPOLOGIA <b>PORTA</b>:</td>
      <td class="u" colspan="2">${opt(t === 'legno', 'LEGNO')}</td>
      <td class="u" colspan="2">${opt(t === 'blindato', 'BLINDATO')}</td>
      <td class="u" colspan="3">${opt(t === 'altro', 'Altro:')} ${v(p.tipoAltro)}</td></tr>`,
    `<tr><td>Larghezza:</td><td colspan="2">${un(p.larghezza, 'cm.')}</td>
      <td class="sep" colspan="2">Altezza:</td><td colspan="2">${un(p.altezza, 'cm.')}</td>
      <td class="sep">Profondità:</td><td>${un(p.profondita, 'cm.')}</td></tr>`,
  ], { complete: true });
  return tab ? `<div class="gap"></div>${tab}` : '';
}

// i: posizione nell'elenco; il numero dell'infisso è sempre progressivo (1, 2, 3…)
function infisso(f, i = 0) {
  const tab = tabella(`<table class="sk t-inf keep">${cols([429, 1166, 1154, 1162, 1158, 1164, 1164, 1156, 1147])}`, (n) => `<td class="vl" rowspan="${n}">${vt('INFISSO')}</td>`, [
    `<tr class="g blue-top">
    <td class="g b">N. ${v(String(i + 1))}</td><td class="g b">ZONA:</td><td class="g" colspan="6">${v(f.zona)}</td></tr>`,
    `<tr class="g">
    <td class="g b" colspan="2">TIPOLOGIA INFISSO:</td>
    <td class="g u" colspan="2">${opt(f.tipologia === 'finestra', 'FINESTRA')}</td>
    <td class="g u" colspan="2">${opt(f.tipologia === 'portafinestra', 'PORTA FINESTRA')}</td>
    <td class="g" colspan="2"></td></tr>`,
    `<tr class="blue">
    <td>Larghezza:</td><td>${un(f.larghezza, 'cm.')}</td>
    <td class="sepl">Altezza:</td><td>${un(f.altezza, 'cm.')}</td>
    <td class="sepl sm">Spessore<br>telaio:</td><td>${un(f.spessore, 'cm.')}</td>
    <td class="sepl">H<sub>da terra</sub>:</td><td>${un(f.hTerra, 'cm.')}</td></tr>`,
    {
      etichetta: (n) => `<td class="g" colspan="2" rowspan="${n}">Tipologia <b>TELAIO</b>:</td>`,
      righe: [
        `<tr>${ETICHETTA}
    <td class="g u">${opt(has(f.telaio, 'legno'), 'LEGNO')}</td>
    <td class="g u">${opt(has(f.telaio, 'pvc'), 'PVC')}</td>
    <td class="g u" colspan="2">${opt(has(f.telaio, 'all_anod'), 'ALLUMINIO ANOD.')}</td>
    <td class="g u" colspan="2">${opt(has(f.telaio, 'all_tt'), 'ALLUMINIO T. TERM.')}</td></tr>`,
        `<tr class="mezza">${ETICHETTA}
    <td class="g u" colspan="6">${opt(has(f.telaio, 'altro'), 'Altro:')} ${v(f.telaioAltro)}</td></tr>`,
      ],
    },
    `<tr>
    <td colspan="2">Tipologia <b>INFISSO</b>:</td>
    <td class="u">${opt(f.infisso === 'singolo', 'SINGOLO')}</td>
    <td class="u">${opt(f.infisso === 'doppio', 'DOPPIO')}</td>
    <td class="u">${opt(f.infisso === 'triplo', 'TRIPLO')}</td>
    <td class="u" colspan="3">${opt(f.infisso === 'altro', 'Altro:')} ${v(f.infissoAltro)}</td></tr>`,
    `<tr class="line">
    <td class="g" colspan="2">Tipologia <b>VETRO</b>:</td>
    <td class="g u">${opt(f.vetro === 'singolo', 'SINGOLO')}</td>
    <td class="g u">${opt(f.vetro === 'doppio', 'DOPPIO')}</td>
    <td class="g u">${opt(f.vetro === 'triplo', 'TRIPLO')}</td>
    <td class="g u" colspan="3">${opt(f.vetro === 'altro', 'Altro:')} ${v(f.vetroAltro)}</td></tr>`,
    `<tr>
    <td colspan="2">Oscuranti <b>ESTERNI</b>:</td>
    <td class="u" colspan="2">${opt(f.oscuranti === 'tapparelle', 'TAPPARELLE')}</td>
    <td class="u" colspan="2">${opt(f.oscuranti === 'scuroni', 'SCURONI/PERSIANE')}</td>
    <td class="u" colspan="2">${opt(f.oscuranti === 'altro', 'Altro:')} ${v(f.oscurantiAltro)}</td></tr>`,
    `<tr>
    <td colspan="2">CASSONETTO:</td>
    <td class="u" colspan="2">${opt(f.cassonetto === 'isolato', 'ISOLATO')}</td>
    <td class="u" colspan="2">${opt(f.cassonetto === 'non_isolato', 'NON ISOLATO')}</td>
    <td>Altezza:</td><td>${un(f.cassonettoH, 'cm.')}</td></tr>`,
  ], { complete: true });
  return tab ? `<div class="gap-s"></div>${tab}` : '';
}

function codici(d) {
  const k = d.codici || {};
  const voci = [['k1', 'CODICE TARGA', k.targa], ['k2', 'POD', k.pod], ['k3', 'PDR', k.pdr]]
    .filter(([, , val]) => !soloCompilati || String(val ?? '').trim());
  if (!voci.length) return '';
  return `
<div class="gap"></div>
<div class="codici keep">
  ${voci.map(([cls, lab, val]) => `<div class="${cls}">${lab}: ${v(val)}</div>`).join('\n  ')}
</div>`;
}

function riscaldamento(r) {
  const reg = r.regolazione || [];
  const ter = r.terminali || [];
  const tab = tabella(`<table class="sk t-risc keep">${cols([433, 1265, 1053, 113, 1145, 1059, 111, 1119, 1090, 50, 1143, 1119])}`, (n) => `<td class="vl" rowspan="${n}">${vt('IMPIANTO <b>RISCALDAMENTO</b>')}</td>`, [
    `<tr class="head">
    <td colspan="3">ANNO INSTALLAZIONE:</td><td colspan="3">${v(r.anno)}</td><td colspan="3">CODICE CATASTO:</td><td colspan="2">${v(r.catasto)}</td></tr>`,
    `<tr class="redtop g"><td class="g">IMPIANTO:</td>
    <td class="g u" colspan="3">${opt(r.impianto === 'autonomo', 'AUTONOMO')}</td>
    <td class="g u" colspan="3">${opt(r.impianto === 'centralizzato', 'CENTRALIZZATO')}</td>
    <td class="g" colspan="4"></td></tr>`,
    {
      etichetta: (n) => `<td rowspan="${n}">Tipologia<br>generatore:</td>`,
      righe: [
        `<tr>${ETICHETTA}
    <td class="u" colspan="5">${opt(r.generatore === 'standard', 'CALDAIA STANDARD')}</td>
    <td class="u" colspan="5">${opt(r.generatore === 'condensazione', 'CALDAIA A CONDENSAZIONE')}</td></tr>`,
        `<tr>${ETICHETTA}
    <td class="u" colspan="5">${opt(r.generatore === 'ibrido', 'IBRIDO')}</td>
    <td class="u" colspan="5">${opt(r.generatore === 'biomassa', 'BIOMASSA')}</td></tr>`,
      ],
    },
    `<tr class="line"><td class="g">Ubicazione:</td>
    <td class="g u" colspan="3">${opt(r.ubicazione === 'interno', 'INTERNO')}</td>
    <td class="g u" colspan="3">${opt(r.ubicazione === 'esterno', 'ESTERNO')}</td>
    <td class="g u" colspan="4">${opt(r.ubicazione === 'centrale', 'CENTRALE TERMICA')}</td></tr>`,
    `<tr class="dash"><td>MARCA:</td><td colspan="10">${v(r.marca)}</td></tr>`,
    `<tr><td>MODELLO:</td><td colspan="10">${v(r.modello)}</td></tr>`,
    `<tr class="redtop"><td class="pk b" colspan="3">POTENZA NOMINALE:</td><td class="pk" colspan="3">${un(r.potNom, '<b>kW</b>')}</td><td class="or lab" colspan="4">POTENZA CARICO INTERMEDIO/MINIMO:</td><td class="or c">${un(r.potInt, 'kW')}</td></tr>`,
    `<tr><td class="pk b" colspan="3">RENDIMENTO AL 100%:</td><td class="pk" colspan="3">${un(r.rend100, '<b>%</b>')}</td><td class="or lab" colspan="4">RENDIMENTO A CARICO INTERM./MIN.:</td><td class="or c">${un(r.rendInt, '%')}</td></tr>`,
    {
      etichetta: (n) => `<td rowspan="${n}" class="lab-n">Regolazione:</td>`,
      righe: [
        `<tr class="redtop">${ETICHETTA}
    <td class="u" colspan="5">${opt(has(reg, 'caldaia'), 'SOLO IN CALDAIA')}</td>
    <td class="u" colspan="5">${opt(has(reg, 'sonda'), 'SONDA CLIMATICA ESTERNA')}</td></tr>`,
        `<tr>${ETICHETTA}
    <td class="u" colspan="5">${opt(has(reg, 'zona'), 'TERMOSTATO DI ZONA')}</td>
    <td class="u" colspan="5">${opt(has(reg, 'ambiente'), 'TERMOSTATO PER AMBIENTE')}</td></tr>`,
        `<tr>${ETICHETTA}
    <td class="u" colspan="5">${opt(has(reg, 'valvole'), 'VALVOLE TERMOSTATICHE')}</td>
    <td class="u" colspan="5">${opt(has(reg, 'altro'), 'Altro:')} ${v(r.regolazioneAltro)}</td></tr>`,
      ],
    },
    {
      etichetta: (n) => `<td class="g" rowspan="${n}">Terminali:</td>`,
      righe: [
        `<tr>${ETICHETTA}
    <td class="g u" colspan="3">${opt(has(ter, 'termoconvettori'), 'TERMOCONVETTORI')}</td>
    <td class="g u" colspan="3">${opt(has(ter, 'radiatori'), 'RADIATORI')}</td>
    <td class="g u" colspan="4">${opt(has(ter, 'pavimento'), 'RADIANTE A PAVIMENTO')}</td></tr>`,
        `<tr>${ETICHETTA}
    <td class="g u" colspan="3">${opt(has(ter, 'fancoil'), 'FANCOIL')}</td>
    <td class="g u" colspan="7">${opt(has(ter, 'altro'), 'Altro:')} ${v(r.terminaliAltro)}</td></tr>`,
      ],
    },
    `<tr class="line"><td>Tipo distrib.:</td>
    <td class="u" colspan="3">${opt(r.distribuzione === 'monotubo', 'MONOTUBO')}</td>
    <td class="u" colspan="3">${opt(r.distribuzione === 'collettore', 'A COLLETTORE')}</td>
    <td class="u" colspan="4">${opt(r.distribuzione === 'altro', 'Altro:')} ${v(r.distribuzioneAltro)}</td></tr>`,
    `<tr><td class="g" style="line-height:1">Impianto ACS</td>
    <td class="g u" colspan="3">${opt(r.acs === 'combinato', 'COMBINATO')}</td>
    <td class="g u" colspan="3">${opt(r.acs === 'non_combinato', 'NON COMBINATO')}</td>
    <td class="g" colspan="4"></td></tr>`,
  ], { complete: true });
  return tab ? `<div class="gap-s"></div>${tab}` : '';
}

function raffrescamento(r) {
  const tab = tabella(`<table class="sk t-raff keep">${cols([437, 1182, 1140, 23, 1157, 1141, 10, 1171, 1141, 19, 1157, 1145])}`, (n) => `<td class="vl" rowspan="${n}">${vt('RAFFRESCAMENTO')}</td>`, [
    `<tr class="head">
    <td colspan="2">ANNO INSTALLAZIONE:</td><td colspan="3">${v(r.anno)}</td><td colspan="3">CODICE CATASTO:</td><td colspan="3">${v(r.catasto)}</td></tr>`,
    `<tr class="top solid"><td>Ubicazione:</td>
    <td class="u" colspan="3">${opt(r.ubicazione === 'interno', 'INTERNO')}</td>
    <td class="u" colspan="3">${opt(r.ubicazione === 'esterno', 'ESTERNO')}</td>
    <td class="u" colspan="4">${opt(r.ubicazione === 'centrale', 'CENTRALE TERMICA')}</td></tr>`,
    `<tr class="dash"><td>MARCA:</td><td colspan="6">${v(r.marca)}</td><td colspan="3">N. macchine esterne:</td><td>${v(r.nEsterne)}</td></tr>`,
    `<tr class="solid"><td>MODELLO:</td><td colspan="6">${v(r.modello)}</td><td colspan="3">N. split interni:</td><td>${v(r.nSplit)}</td></tr>`,
    `<tr class="dash"><td class="bl sm2" colspan="2" style="font-size:9pt;line-height:1.05">POTENZA UTILE<br><b>RAFFRESCAMENTO</b>:</td>
    <td class="bl" colspan="4">${un(r.potRaff, 'kW')}</td>
    <td class="rd mid" colspan="3" style="font-size:9pt;line-height:1.05">POTENZA UTILE<br><b>RISCALDAMENTO</b>:</td>
    <td class="rd" colspan="2">${un(r.potRisc, 'kW')}</td></tr>`,
    `<tr><td class="bl b c" colspan="2">EER (o GUE):</td><td colspan="4">${v(r.eer)}</td>
    <td class="rd b c mid" colspan="2">COP:</td><td colspan="3">${v(r.cop)}</td></tr>`,
  ], { complete: true });
  return tab ? `<div class="gap-s"></div>${tab}` : '';
}

function altroApparecchio(a) {
  const tipo = a.tipo === 'altro' ? (a.tipoAltro || 'ALTRO') : (TIPI_ALTRI[a.tipo] || '');
  const tab = tabella(`<table class="sk t-alt keep">${cols([620, 1650, 2050, 1250, 1900, 2230])}`, (n) => `<td class="vl" rowspan="${n}">${vt('ALTRO APPARECCHIO', true)}</td>`, [
    `<tr class="head">
    <td class="b">TIPOLOGIA:</td><td colspan="2">${v(tipo)}</td><td>ANNO INSTALL.:</td><td>${v(a.anno)}</td></tr>`,
    `<tr><td>MARCA:</td><td colspan="2">${v(a.marca)}</td><td>MODELLO:</td><td>${v(a.modello)}</td></tr>`,
    `<tr><td>POTENZA:</td><td colspan="2">${un(a.potenza, 'kW')}</td><td>ALIMENTAZIONE:</td><td>${v(a.alimentazione)}</td></tr>`,
    `<tr><td>Ubicazione:</td>
    <td class="u">${opt(a.ubicazione === 'interno', 'INTERNO')}</td>
    <td class="u">${opt(a.ubicazione === 'esterno', 'ESTERNO')}</td>
    <td>Quantità:</td><td>${v(a.quantita)}</td></tr>`,
    `<tr><td>Note:</td><td colspan="4">${v(a.note)}</td></tr>`,
  ], { complete: true });
  return tab ? `<div class="gap-s"></div>${tab}` : '';
}

function foto(d) {
  const list = (d.foto || []).filter((f) => f && f.src);
  // senza foto: con "solo i dati compilati" la sezione non compare, altrimenti quattro riquadri vuoti
  if (soloCompilati && !list.length) return '';
  const n = soloCompilati ? list.length + (list.length % 2) : Math.max(4, list.length + (list.length % 2));
  let righe = '';
  // ogni coppia di foto: riga con il titolo di ciascuna foto, poi riga con le immagini
  for (let i = 0; i < n; i += 2) {
    const titolo = (f) => `<td class="cap">${esc(f?.didascalia || '')}</td>`;
    const img = (f) => `<td class="ph">${f ? `<img src="${f.src}">` : ''}</td>`;
    righe += `<tbody class="coppia"><tr>${titolo(list[i])}${titolo(list[i + 1])}</tr><tr>${img(list[i])}${img(list[i + 1])}</tr></tbody>`;
  }
  return `
<div class="gap"></div>
<p class="h keep" style="break-after: avoid"><span class="hl">DOCUMENTAZIONE FOTOGRAFICA:</span></p>
<table class="t-foto">${cols([4751, 4996])}
  ${righe}
</table>`;
}

// Rilievo: ogni immagine su una pagina, con il titolo alla stessa altezza dei titoli delle altre pagine.
// L'altezza utile è quella della pagina A4 meno i margini usati dal server (4,24 cm sopra; 2,54 o 3,7 cm sotto con i recapiti).
function rilievo(d) {
  const CM = 72 / 2.54;
  const altezza = (29.7 - 4.24 - (d?.opzioni?.footer ? 3.7 : 2.54)) * CM - 6;
  return (d.rilievo || []).filter((r) => r && r.src).map((r, i) => `
${i ? '<div class="page-break"></div>' : ''}<div class="ril" style="height:${altezza.toFixed(1)}pt">
<p class="h"><span class="hl">RILIEVO</span></p>
<div class="gap"></div>
<div class="ril-img"><img src="${r.src}"></div>
</div>`).join('');
}

// Il documento è diviso in parti, generate separatamente e poi unite alle pagine PDF caricate:
// "visita" (pagina 1), "documenti" (pagina 2), "rilievo" (una pagina per immagine) e "schede" (committente, immobile, impianti, foto).
export const PARTI = ['visita', 'documenti', 'rilievo', 'schede'];

// un box è compilato se ha almeno un campo con un valore (il PDF allegato non conta)
const compilato = (item) =>
  Object.entries(item || {}).some(([k, val]) => k !== '_pdf' && (Array.isArray(val) ? val.length > 0 : String(val ?? '').trim() !== ''));

function schede(d) {
  // con "solo i dati compilati" i box vuoti non compaiono; altrimenti almeno un box vuoto da compilare a mano
  const elenco = (list, filtro = compilato) => (soloCompilati ? (list || []).filter(filtro) : list && list.length ? list : [{}]);
  const infissoCompilato = (f) => compilato(Object.fromEntries(Object.entries(f || {}).filter(([k]) => k !== 'n')));
  const porte = elenco(d.porte).map(porta).join('');
  const infissi = elenco(d.infissi, infissoCompilato).map(infisso).join('');
  const risc = elenco(d.riscaldamento).map(riscaldamento);
  // raffrescamento e altri apparecchi compaiono solo se compilati
  const raff = (d.raffrescamento || []).filter(compilato).map(raffrescamento).join('');
  const altri = (d.altri || []).filter(compilato).map(altroApparecchio).join('');
  const testa = `${codici(d)}${risc[0] || ''}`;
  // ogni categoria inizia su una nuova pagina; le categorie vuote non compaiono
  const gruppi = [
    `${committente(d)}${immobile(d)}${confini(d)}`,
    [porte, infissi].filter(Boolean).join('\n<div class="gap"></div>\n'),
    `${testa ? `<div class="keep">${testa}</div>` : ''}${risc.slice(1).join('')}${raff}${altri}`,
    foto(d),
  ].filter((g) => g.trim());
  return gruppi.map((g) => `<section class="grp">\n${g}\n</section>`).join('\n<div class="page-break"></div>\n');
}

// Eseguito nella pagina prima di creare il PDF: i testi compilati devono stare su una riga e le opzioni
// (casella + parola) dentro la loro cella. Se non ci stanno, si riduce un po' il carattere: prima quello del
// valore compilato, poi quello della cella; oltre il minimo si lascia andare a capo.
export const ADATTA_CELLE = `(() => {
  const celle = document.querySelectorAll('table:not(.t-docs) td:not(.vl)');
  const altezzaRiga = (td) => {
    const cs = getComputedStyle(td);
    const lh = parseFloat(cs.lineHeight);
    return Number.isFinite(lh) ? lh : parseFloat(cs.fontSize) * 1.2;
  };
  const vaACapo = (td) => {
    if (td.scrollWidth > td.clientWidth + 1) return true;
    const r = document.createRange();
    r.selectNodeContents(td);
    return r.getBoundingClientRect().height > altezzaRiga(td) * 1.45;
  };
  const riduci = (els, minimo, vale) => {
    const base = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
    for (let f = 0.96; f >= minimo && vale(); f -= 0.04) els.forEach((el, i) => { el.style.fontSize = (base[i] * f) + 'px'; });
  };
  for (const td of celle) {
    if (td.querySelector('br, img') || !td.querySelector('.val, .opt')) continue;
    if (!vaACapo(td)) continue;
    const valori = [...td.querySelectorAll('.val')];
    if (valori.length) riduci(valori, 0.66, () => vaACapo(td));
    if (vaACapo(td)) riduci([td], 0.8, () => vaACapo(td));
  }
})()`;

export function renderBody(d, parte, opts = {}) {
  soloCompilati = d?.opzioni?.soloCompilati !== false;
  const html = { visita: pagina1, documenti: checklist, rilievo, schede }[parte];
  if (!html) throw new Error(`Parte sconosciuta: ${parte}`);
  return `<div class="doc">${html(d, opts)}</div>`;
}

// timbro: indirizzo o data URI dell'immagine del timbro (il server la incorpora, così il PDF non fa richieste HTTP)
export function renderDocument(d, { parte, fontsCss = '', baseHref = '', timbro } = {}) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
${baseHref ? `<base href="${baseHref}">` : ''}
<style>${css(fontsCss)}</style></head>
<body>${renderBody(d, parte, { timbro })}</body></html>`;
}
