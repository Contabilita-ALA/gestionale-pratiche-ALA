// Lettera di incarico per la pratica di variazione catastale (DOCFA): due pagine A4, con la stessa grafica
// dell'informativa APE (testata, piè di pagina, firme, tabella del compenso). Committente e immobile vengono
// dalle rispettive sezioni, il compenso (con le spese non imponibili) dalle prestazioni dell'incarico.
import { calcola, euro, datiStudio } from './proforma.js';
import { css, testata, piede, firme, tabellaCompenso, cb, val, esc, sito, subalterni } from './informativa.js';

// prezzo proposto per la prestazione catastale (resta modificabile)
export const PREZZO_CATASTO = 350;

// motivazioni della variazione catastale (scheda Incarico)
export const MOTIVAZIONI_CATASTO = [
  ['distribuzione', 'diversa distribuzione degli spazi interni'],
  ['ristrutturazione', 'ristrutturazione'],
  ['ampliamento', 'ampliamento'],
  ['frazionamento', 'frazionamento'],
  ['fusione', 'fusione'],
  ['destinazione', "cambio di destinazione d'uso"],
  ['rappresentazione', 'esatta rappresentazione grafica'],
  ['altro', 'altro'],
];

const ALTRO_CSS = `
.motiv-cat { display: grid; grid-template-columns: 1fr 1fr; row-gap: 0.4em; column-gap: 1.5em; margin-top: 0.3em; }
.parti-inc p { margin-bottom: 0.15em; }
.corpo.cat { font-size: var(--fs, 9.6pt); line-height: 1.3; }
`;

// Committente: "Mario Rossi, C.F. …, residente in via … n. …, 30020 Torre di Mosto (VE)"; società con P.IVA e sede
function committente(c = {}) {
  const indirizzo = [
    [String(c.via || '').trim(), String(c.civ || '').trim() && `n. ${String(c.civ).trim()}`].filter(Boolean).join(' '),
    [c.cap, c.citta].map((x) => String(x || '').trim()).filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');
  const fiscali = c.piva
    ? [`P.IVA ${c.piva}`, c.cf && c.cf !== c.piva ? `C.F. ${c.cf}` : ''].filter(Boolean).join(', ')
    : c.cf ? `C.F. ${c.cf}` : 'C.F. ____________________';
  const dove = indirizzo ? `${c.piva ? 'con sede in' : 'residente in'} ${val(indirizzo)}` : `residente in ________________________________________`;
  return `${val(c.nome) || '________________________________'}, ${val(fiscali) || fiscali}, ${dove}`;
}

function pagina1(d, studio) {
  const S = datiStudio(studio);
  const m = d?.immobile || {};
  const cat = d?.catasto || {};
  const scelte = Array.isArray(cat.motivazione) ? cat.motivazione : [];
  const mot = (k) => {
    const [, label] = MOTIVAZIONI_CATASTO.find(([key]) => key === k);
    const extra = k === 'altro' && scelte.includes('altro') && cat.motivazioneAltro ? `: ${val(cat.motivazioneAltro)}` : '';
    return `<span>${cb(scelte.includes(k))}${label}${extra}</span>`;
  };
  return `
<div class="parti-inc">
<p>Il Committente ${committente(d?.committente)},</p>
<p>di seguito «Committente»,</p>
<div class="gap-s"></div>
<p style="text-align:center"><b>conferisce</b></p>
<div class="gap-s"></div>
<p>alla Dott.ssa Arch. Agnese Lorenzon, nata a Motta di Livenza (TV) il 05/02/1995, C.F. ${esc(S.cf)}, P. IVA ${esc(S.piva.replace(/^IT/i, ''))}, con studio in ${esc(S.comune)}, ${esc(S.indirizzo)}, e-mail: <a>${esc(S.email)}</a>, P.E.C.: <a>${esc(S.pec)}</a>, iscritta all’Ordine degli Architetti P.P.C. della Provincia di Venezia alla posizione n. 5160, di seguito «Professionista»,</p>
</div>
<div class="gap-s"></div>
<p>l’incarico professionale per la redazione e la presentazione della <b>pratica di variazione catastale</b> (procedura DOCFA) presso l’Agenzia delle Entrate – Servizi catastali, relativa all’immobile/agli immobili:</p>
<table class="sito">
  <tr class="r1"><td colspan="3">sito/i in: ${val(sito(m))}</td></tr>
  <tr class="r2"><td style="width:38%">Foglio: ${val(m.fg)}</td><td style="width:38%">Mappale: ${val(m.mapp)}</td><td>Sub: ${val(subalterni(d))}</td></tr>
</table>
<div class="gap-s"></div>
<p>per la seguente motivazione:</p>
<div class="motiv-cat">${MOTIVAZIONI_CATASTO.map(([k]) => mot(k)).join('')}</div>
<div class="h">Oggetto e fasi della prestazione</div>
<p>L’incarico comprende le seguenti attività:</p>
<div class="gap-s"></div>
<ul class="punti">
  <li>raccolta e analisi della documentazione fornita dal Committente e reperimento, presso l’Agenzia delle Entrate, delle visure e delle planimetrie catastali in atti;</li>
  <li>sopralluogo presso l’immobile, con rilievo metrico e fotografico dello stato di fatto;</li>
  <li>restituzione grafica delle planimetrie catastali e, se necessario, dell’elaborato planimetrico;</li>
  <li>redazione della dichiarazione di variazione con procedura DOCFA, con la proposta di categoria, classe e consistenza;</li>
  <li>presentazione telematica della pratica all’Agenzia delle Entrate tramite la piattaforma SISTER;</li>
  <li>consegna al Committente della ricevuta di avvenuta registrazione e della documentazione catastale aggiornata (visura e planimetria).</li>
</ul>
<div class="gap-s"></div>
<p>Restano escluse dall’incarico eventuali prestazioni non espressamente indicate (ad esempio verifiche di conformità urbanistico-edilizia, pratiche edilizie, tipi mappali o frazionamenti al Catasto Terreni), che dovranno essere oggetto di separato accordo e specificabili nella sezione “Note” a piè pagina.</p>
<div class="h">Obblighi del Committente – Documentazione</div>
<p>Il Committente si impegna a mettere a disposizione della Professionista <b>tutta la documentazione necessaria</b> alla corretta redazione della pratica e a consentire l’accesso all’immobile per il sopralluogo. A titolo esemplificativo e non esaustivo:</p>
<div class="gap-s"></div>
<ul class="punti">
  <li><b>documento d’identità</b> e <b>codice fiscale</b> degli intestatari;</li>
  <li><b>atto di provenienza</b> (compravendita, successione, donazione…) o altro titolo di proprietà;</li>
  <li><b>titoli edilizi</b> relativi all’immobile e alle opere che hanno originato la variazione (permesso di costruire, SCIA, CILA, condono…);</li>
  <li>ogni ulteriore documento utile alla corretta individuazione dell’unità immobiliare.</li>
</ul>
<div class="gap-s"></div>
<p>Il Committente prende atto che l’eventuale <b>mancata, incompleta o tardiva trasmissione</b> della documentazione potrà comportare <b>ritardi nella presentazione della pratica</b>, senza responsabilità in capo alla Professionista, e che l’aggiornamento catastale <b>non attesta né sostituisce la regolarità urbanistico-edilizia</b> dell’immobile.</p>`;
}

function pagina2(d, timbro) {
  const k = calcola(d?.proforma || {});
  const note = String(d?.informativa?.note || '').trim();
  const spese = k.spese.length
    ? `<div class="gap-s"></div>
<p>Il totale comprende le seguenti <b>spese non imponibili</b>, anticipate dalla Professionista in nome e per conto del Committente ed escluse dal calcolo del contributo integrativo e della marca da bollo:</p>
<ul class="punti">${k.spese.map((x) => `<li>${esc(x.testo || 'spesa non imponibile')}: <b>${euro(x.importo)}</b></li>`).join('')}</ul>`
    : `<div class="gap-s"></div>
<p>Sono inoltre a carico del Committente i <b>tributi speciali catastali</b> (diritti) dovuti all’Agenzia delle Entrate per la registrazione della pratica e i costi associati, che saranno rimborsati come spese non imponibili.</p>`;
  return `
<div class="h">Compenso professionale</div>
<p>Il compenso professionale è determinato sulla base delle aliquote previste dalla tariffa professionale vigente e dalle sue successive modifiche ed integrazioni. L’onorario relativo alle prestazioni oggetto del presente incarico, così come descritte nel presente contratto, è quantificato preventivamente in:</p>
${tabellaCompenso(k)}
${spese}
<div class="h">Modalità e termini di pagamento</div>
<p>Ad avvenuta presentazione della pratica, la Professionista trasmetterà al Committente la <b>nota proforma</b> relativa al compenso professionale concordato e alle spese anticipate.</p>
<p>Il pagamento dovrà essere effettuato <b>entro 15 (quindici) giorni</b> dall’invio della nota proforma, mediante <b>bonifico bancario</b> alle coordinate indicate nella stessa proforma.</p>
<p>Il Committente prende atto e accetta che <b>la consegna della ricevuta di avvenuta registrazione e della documentazione catastale aggiornata avverrà a seguito della ricezione del pagamento</b> del compenso professionale dovuto.</p>
<div class="h">Ulteriori prestazioni</div>
<p>Le eventuali correzioni richieste dall’Ufficio per cause imputabili alla Professionista sono comprese nel compenso. Le rettifiche dovute a informazioni o documenti non corretti forniti dal Committente, nonché ulteriori pratiche o variazioni non indicate nel presente incarico, saranno oggetto di separato accordo.</p>
<div class="h">Trattamento dei dati personali</div>
<p>I dati personali del Committente sono trattati ai sensi del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003 esclusivamente per l’esecuzione del presente incarico e per gli adempimenti di legge a esso connessi.</p>
${firme(d, timbro, 'Il professionista incaricato')}
<p class="note">Note: ${note ? val(note).replace(/\n/g, '<br>') : ''}</p>`;
}

// Carattere più grande dell'informativa APE (meno testo): si riduce solo se il contenuto non sta nella pagina
export const ADATTA_CATASTO = `
for (const c of document.querySelectorAll('.corpo')) {
  let fs = 9.6;
  c.style.setProperty('--fs', fs + 'pt');
  while (c.scrollHeight > c.clientHeight + 1 && fs > 6.2) {
    fs -= 0.1;
    c.style.setProperty('--fs', fs.toFixed(2) + 'pt');
  }
}`;

export function renderLetteraCatasto(d, { fontsCss = '', timbro = '', footer = '', studio } = {}) {
  const t = testata('LETTERA DI INCARICO PROFESSIONALE', '(Pratica di variazione catastale – Agenzia delle Entrate, Servizi catastali)');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css(fontsCss)}${ALTRO_CSS}</style></head><body>
<section class="pagina">${t}<div class="corpo cat">${pagina1(d, studio)}</div>${piede(1, footer)}</section>
<section class="pagina">${t}<div class="corpo cat">${pagina2(d, timbro)}</div>${piede(2, footer)}</section>
</body></html>`;
}
