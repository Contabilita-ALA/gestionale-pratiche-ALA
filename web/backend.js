// "Server" nel browser: le stesse richieste api/… della versione per PC (server.js), servite qui con Google Drive
// come archivio. L'interfaccia (app.js) continua a chiamare fetch('api/…') senza sapere che non c'è un server.
import { PDFDocument } from '../vendor/pdf-lib.esm.min.js';
import { oggiIso } from '../lib/proforma.js';
import { statoAllegati, nomeAllegato, nomeZipAllegati, nomeCartellaAllegati } from '../lib/allegati.js';
import { COMUNI, comuneDaCitta, capDelComune, formatoCitta } from '../lib/comuni.js';
import { parseImpianto, PARSERS } from '../lib/impparse.js';
import { parseIdentity } from '../lib/idparse.js';
import * as A from './archivio.js';
import * as D from './documenti.js';
import { creaZip } from './zip.js';

const { pratiche: db, registro, studio, impostazioni } = A;

// ---------------------------------------------------------------------------
// Instradamento
// ---------------------------------------------------------------------------
class Errore extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const json = (corpo, status = 200, headers = {}) => new Response(status === 204 ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const binario = (dati, tipo, headers = {}) => new Response(dati instanceof Blob ? dati : new Blob([dati], { type: tipo }), { status: 200, headers: { 'Content-Type': tipo, ...headers } });
const nomeFile = (nome) => ({ 'X-Nome-File': encodeURIComponent(nome) });

const rotte = [];
const rotta = (metodo, schema, fn) => rotte.push({ metodo, re: new RegExp(`^${schema.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

async function gestisci(url, init) {
  const u = new URL(url, location.href);
  const percorso = u.pathname.slice(u.pathname.indexOf('/api/') + 1);
  const metodo = (init?.method || 'GET').toUpperCase();
  for (const r of rotte) {
    if (r.metodo !== metodo) continue;
    const m = percorso.match(r.re);
    if (!m) continue;
    const corpo = init?.body;
    let body = null;
    if (typeof corpo === 'string') { try { body = JSON.parse(corpo); } catch { body = corpo; } }
    else body = corpo ?? null;
    // la nuova scheda per "Apri cartella" va aperta subito, durante il clic (dopo verrebbe bloccata)
    const finestra = percorso === 'api/apri-cartella' ? window.open('about:blank', '_blank') : null;
    const req = { finestra, params: Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)])), query: Object.fromEntries(u.searchParams), body };
    try {
      return await r.fn(req);
    } catch (err) {
      console.error(err);
      return json({ error: err.message || String(err), ...(err.extra || {}) }, err.status || 500);
    }
  }
  return json({ error: `Funzione non disponibile nella versione web (${metodo} ${percorso})` }, 404);
}

export function installa() {
  const originale = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (/^(\.\/)?api\//.test(url) || url.startsWith(`${location.origin}${location.pathname.replace(/[^/]*$/, '')}api/`)) return gestisci(url, init);
    return originale(input, init);
  };
}

// ---------------------------------------------------------------------------
// Documenti PDF
// ---------------------------------------------------------------------------
const salvaPdf = () => impostazioni.salvaPdf && impostazioni.radice;

// esito della copia nella cartella della pratica, nelle intestazioni come in server.js
async function archivia(fn, messaggio) {
  try {
    await fn();
    return { 'X-Archivio': '1' };
  } catch (err) {
    return { 'X-Archivio-Errore': encodeURIComponent(`${messaggio}: ${err.message}`) };
  }
}

rotta('POST', 'api/pdf', async ({ body, query }) => {
  const { pdf, nome } = await D.pdfSopralluogo(body || {});
  const id = Number(query.pratica);
  let h = {};
  if (id) {
    db.markPdf(id).catch(() => {});
    if (salvaPdf() && body?._uid) h = await archivia(() => A.salvaPdfSopralluogo(body, pdf), 'Copia nella cartella della pratica non riuscita');
  }
  return binario(pdf, 'application/pdf', { ...nomeFile(nome), ...h });
});

rotta('POST', 'api/incarico', async ({ body, query }) => {
  const r = await D.pdfIncarico(body || {}, await studio.leggi());
  if (!query.separate) return binario(r.pdf, 'application/pdf', nomeFile(r.nome));
  const file = r.catasto ? [{ nome: r.nome, pdf: r.pdf }] : await D.dividiPagine(r.pdf, r.nomiPagine);
  const esito = {};
  if (query.archivia && impostazioni.radice) {
    try {
      for (const f of file) await A.salvaDocumento(body, f.nome, f.pdf);
      esito.archiviato = true;
    } catch (err) {
      esito.erroreArchivio = `Copia della lettera di incarico nella cartella non riuscita: ${err.message}`;
    }
  }
  return json({ ...esito, file: file.map((f) => ({ nome: f.nome, data: base64(f.pdf) })) });
});

rotta('POST', 'api/offerta', async ({ body, query }) => {
  const { pdf, nome } = await D.pdfOfferta(body || {}, await studio.leggi());
  const h = query.archivia && impostazioni.radice ? await archivia(() => A.salvaDocumento(body, nome, pdf), "Copia dell'offerta nella cartella non riuscita") : {};
  return binario(pdf, 'application/pdf', { ...nomeFile(nome), ...h });
});

rotta('POST', 'api/visita-da-firmare', async ({ body, query }) => {
  const { pdf, nome } = await D.pdfVisitaDaFirmare(body || {});
  const h = query.archivia && impostazioni.radice ? await archivia(() => A.salvaDocumento(body, nome, pdf), 'Copia nella cartella non riuscita') : {};
  return binario(pdf, 'application/pdf', { ...nomeFile(nome), ...h });
});

const daBase64 = (b64) => Uint8Array.from(atob(String(b64 || '')), (c) => c.charCodeAt(0));
function base64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

rotta('POST', 'api/allegati', async ({ body, query }) => {
  const data = body || {};
  const file = [];
  const mancanti = [];
  for (const [i, a] of statoAllegati(data).entries()) {
    if (!a.presente) { mancanti.push(a.titolo); continue; }
    let dati;
    if (a.come === 'caricato') dati = daBase64(a.file.data);
    else if (a.k === 'sopralluogo') dati = (await D.pdfSopralluogo(data)).pdf;
    else if (a.k === 'informativa') dati = (await D.pdfIncarico(data, await studio.leggi())).pdf;
    file.push({ nome: nomeAllegato(data, i, a.come === 'caricato' ? a.file : null), dati });
  }
  if (!file.length) throw new Errore(400, 'Nessun allegato disponibile');
  if (query.cartella) {
    if (!impostazioni.radice || !data.cartella) throw new Errore(400, 'Cartella della APE non impostata');
    const cartella = await A.salvaCartellaAllegati(data, nomeCartellaAllegati(data), file);
    return json({ cartella, file: file.map((f) => f.nome), mancanti });
  }
  const nome = nomeZipAllegati(data);
  const zip = creaZip(file);
  const h = query.archivia && impostazioni.radice ? await archivia(async () => A.salvaDocumento(data, nome, zip, 'application/zip'), 'Copia dello zip nella cartella non riuscita') : {};
  return binario(zip, 'application/zip', { ...nomeFile(nome), 'X-Mancanti': encodeURIComponent(mancanti.join(', ')), ...h });
});

rotta('POST', 'api/pdf-info', async ({ body }) => {
  try {
    const doc = await PDFDocument.load(daBase64(body?.data), { ignoreEncryption: true });
    return json({ pagine: doc.getPageCount() });
  } catch {
    throw new Errore(422, 'Il file non è un PDF valido');
  }
});

// ---------------------------------------------------------------------------
// Registro dei proforma
// ---------------------------------------------------------------------------
const annoOggi = () => Number(oggiIso().slice(0, 4));

rotta('GET', 'api/proforme', async () => {
  try {
    const proforme = await registro.elenco();
    return json({
      proforme,
      prossimo: await registro.prossimo(annoOggi(), 'proforma', proforme),
      prossimaFattura: await registro.prossimo(annoOggi(), 'fattura', proforme),
      numerazione: await registro.leggiNumerazione(), oggi: oggiIso(), condiviso: true,
    });
  } catch (err) {
    throw new Errore(500, `Registro dei proforma non leggibile: ${err.message}`);
  }
});

rotta('GET', 'api/proforme/numerazione', async () => json({ numerazione: await registro.leggiNumerazione() }));
rotta('PUT', 'api/proforme/numerazione', async ({ body }) => {
  const anno = Number(body?.anno);
  const ultimo = Number(body?.ultimo);
  const grp = body?.gruppo === 'fattura' ? 'fattura' : 'proforma';
  if (!Number.isInteger(anno) || anno < 2000 || anno > 2100) throw new Errore(400, 'Anno non valido');
  if (!Number.isFinite(ultimo) || ultimo < 0 || ultimo > 99999) throw new Errore(400, 'Indica un numero da 0 in su');
  const numerazione = await registro.impostaNumerazione(anno, ultimo, grp);
  return json({ numerazione, prossimo: await registro.prossimo(anno, grp) });
});

rotta('GET', 'api/proforme/prossimo', async ({ query }) =>
  json({ prossimo: await registro.prossimo(Number(query.anno) || annoOggi(), query.gruppo === 'fattura' ? 'fattura' : 'proforma') }));

async function collegaFattura(fattura, proformaId = '') {
  const pf = proformaId ? await registro.leggi(proformaId) : await registro.proformaPerFattura(fattura);
  if (!pf || (pf.fattura_id && pf.fattura_id !== fattura.id)) return null;
  await registro.salva({ ...pf, fattura_id: fattura.id, stato: 'pagato' });
  await registro.salva({ ...fattura, proforma_id: pf.id });
  return pf;
}
async function scollegaFattura(fattura) {
  if (!fattura?.proforma_id) return;
  const pf = await registro.leggi(fattura.proforma_id);
  if (pf && pf.fattura_id === fattura.id) {
    const { fattura_id, ...resto } = pf;
    await registro.salva(resto);
  }
}

rotta('POST', 'api/proforme/:id/fattura', async ({ params, body, query }) => {
  const pf = await registro.leggi(params.id);
  if (!pf || pf.tipo === 'fattura' || pf.tipo === 'entrata') throw new Errore(404, 'Proforma non trovato');
  if (pf.fattura_id && (await registro.leggi(pf.fattura_id))) throw new Errore(409, 'Questo proforma ha già la sua fattura');
  const data = String(body?.data || oggiIso()).slice(0, 10);
  const elenco = await registro.elenco();
  const numero = String(body?.numero ?? '').trim() || String(await registro.prossimo(Number(data.slice(0, 4)), 'fattura', elenco));
  const riepilogo = elenco.find((x) => x.id === pf.id);
  const fattura = {
    tipo: 'fattura', numero, data, stato: 'pagato',
    destinatario: { ...(pf.destinatario || {}) },
    descrizione: riepilogo?.descrizione || '',
    totale: String(body?.totale ?? riepilogo?.totale ?? ''),
    note: String(body?.note || ''),
    modulo: pf.modulo || '', pratica_uid: pf.pratica_uid || '',
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fattura.data)) throw new Errore(400, 'Data della fattura non valida');
  const doppione = await registro.doppione(fattura);
  if (doppione && !query.forza) throw new Errore(409, `La fattura n. ${numero} del ${data.slice(0, 4)} è già nel registro (${doppione.cliente || 'altro cliente'})`, { doppione: doppione.id });
  const salvata = await registro.salva(fattura);
  await collegaFattura(salvata, pf.id);
  return json({ fattura: await registro.leggi(salvata.id), proforma: await registro.leggi(pf.id) });
});

rotta('GET', 'api/proforme/:id/collegabili', async ({ params }) => {
  const f = (await registro.leggi(params.id)) || {};
  const proposto = f.id ? await registro.proformaPerFattura(f) : null;
  return json({
    proposto: proposto?.id || '',
    proforme: (await registro.elenco()).filter((x) => (x.tipo === 'proforma' || x.tipo === 'importato') && (!x.fattura_id || x.fattura_id === f.id)).slice(0, 200),
  });
});

rotta('GET', 'api/proforme/:id', async ({ params }) => {
  const pf = await registro.leggi(params.id);
  if (!pf) throw new Errore(404, 'Proforma non trovato');
  return json(pf);
});

async function salvaProforma({ params, body, query }) {
  const dati = body?.proforma;
  if (!dati || typeof dati !== 'object') throw new Errore(400, 'Dati mancanti');
  if (dati.tipo !== 'entrata' && !String(dati.numero ?? '').trim()) throw new Errore(400, dati.tipo === 'fattura' ? 'Indica il numero della fattura' : 'Indica il numero del proforma');
  if (dati.tipo === 'entrata') dati.numero = '';
  if (params.id) dati.id = params.id;
  const doppione = await registro.doppione(dati);
  if (doppione && !query.forza) throw new Errore(409, `Il n. ${dati.numero} del ${String(dati.data || '').slice(0, 4)} è già usato per ${doppione.cliente || 'un altro documento'}`, { doppione: doppione.id });
  if (dati.tipo === 'fattura') {
    const prima = dati.id ? await registro.leggi(dati.id) : null;
    const scelta = Object.prototype.hasOwnProperty.call(dati, 'collega') ? String(dati.collega || '') : null;
    delete dati.collega;
    if (scelta !== null && prima?.proforma_id !== scelta) {
      await scollegaFattura(prima);
      delete dati.proforma_id;
      const salvato = await registro.salva(dati);
      if (scelta) await collegaFattura(salvato, scelta);
      return json(await registro.leggi(salvato.id));
    }
    const salvato = await registro.salva(dati);
    if (!prima && scelta === null) await collegaFattura(salvato);
    return json(await registro.leggi(salvato.id));
  }
  return json(await registro.salva(dati));
}
rotta('POST', 'api/proforme', salvaProforma);
rotta('PUT', 'api/proforme/:id', salvaProforma);

rotta('POST', 'api/proforme/importa', async ({ body }) => {
  const voci = Array.isArray(body?.voci) ? body.voci : [];
  if (!voci.length) throw new Errore(400, 'Nessuna voce da importare');
  const esito = { importati: 0, fatture: 0, collegate: [], saltati: [] };
  for (const v of voci) {
    const dati = {
      tipo: ['entrata', 'fattura'].includes(v.tipo) ? v.tipo : 'importato',
      numero: v.tipo === 'entrata' ? '' : String(v.numero ?? '').trim(),
      data: String(v.data || '').slice(0, 10),
      stato: v.stato === 'emesso' ? 'emesso' : 'pagato',
      destinatario: { nome: String(v.cliente || '').trim() },
      descrizione: String(v.descrizione || '').trim(),
      totale: String(v.totale ?? ''),
      note: String(v.note || '').trim(),
      origine: String(v.origine || '').slice(0, 200),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dati.data) || (dati.tipo !== 'entrata' && !dati.numero)) { esito.saltati.push(`${dati.numero || '?'} (dati incompleti)`); continue; }
    const nome = `${dati.tipo === 'fattura' ? 'fattura' : 'proforma'} n. ${dati.numero}`;
    if (await registro.doppione(dati)) { esito.saltati.push(`${nome} del ${dati.data.slice(0, 4)} (già nel registro)`); continue; }
    const salvato = await registro.salva(dati);
    esito.importati++;
    if (dati.tipo === 'fattura') {
      esito.fatture++;
      const pf = await collegaFattura(salvato);
      if (pf) esito.collegate.push(`fattura n. ${dati.numero} → proforma n. ${pf.numero}`);
    }
  }
  return json(esito);
});

rotta('DELETE', 'api/proforme/:id', async ({ params }) => {
  const voce = await registro.leggi(params.id);
  if (voce?.tipo === 'fattura') await scollegaFattura(voce);
  if (voce?.fattura_id) {
    const f = await registro.leggi(voce.fattura_id);
    if (f) { const { proforma_id, ...resto } = f; await registro.salva(resto); }
  }
  if (!(await registro.elimina(params.id))) throw new Errore(404, 'Documento non trovato');
  return json(null, 204);
});

rotta('POST', 'api/proforme/pdf', async ({ body, query }) => {
  const pf = body?.proforma || {};
  const { pdf, nome } = await D.pdfProforma(pf, await studio.leggi());
  let h = {};
  if (query.archivia && impostazioni.radice) {
    try {
      const salvato = await registro.salvaPdf(pf, nome, pdf);
      if (pf.cartella) await A.salvaDocumento({ cartella: pf.cartella }, nome, pdf);
      h = { 'X-Archivio': '1', 'X-Archivio-Percorso': encodeURIComponent(pf.cartella ? `${salvato} e ${pf.cartella}` : salvato) };
    } catch (err) {
      h = { 'X-Archivio-Errore': encodeURIComponent(`Copia del proforma su Google Drive non riuscita: ${err.message}`) };
    }
  }
  return binario(pdf, 'application/pdf', { ...nomeFile(nome), ...h });
});

// ---------------------------------------------------------------------------
// Pratiche
// ---------------------------------------------------------------------------
const idPratica = (params) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw new Errore(400, 'Id non valido');
  return id;
};

rotta('GET', 'api/pratiche', async () => json(await db.elenco()));
rotta('GET', 'api/pratiche/uid/:uid', async ({ params }) => {
  const p = await db.getByUid(params.uid);
  if (!p) throw new Errore(404, 'Pratica non trovata');
  return json(p);
});
rotta('GET', 'api/pratiche/:id', async ({ params }) => {
  const p = await db.get(idPratica(params));
  if (!p) throw new Errore(404, 'Pratica non trovata');
  return json(p);
});
rotta('POST', 'api/pratiche', async ({ body }) => {
  if (!body?.dati) throw new Errore(400, 'Dati mancanti');
  const esistente = await db.idByUid(body.dati._uid);
  const p = esistente ? await db.update(esistente, body.dati) : await db.create(body.dati);
  return json(p, esistente ? 200 : 201);
});
rotta('PUT', 'api/pratiche/:id', async ({ params, body }) => {
  if (!body?.dati) throw new Errore(400, 'Dati mancanti');
  const p = await db.update(idPratica(params), body.dati);
  if (!p) throw new Errore(404, 'Pratica non trovata');
  return json(p);
});
rotta('DELETE', 'api/pratiche/:id', async ({ params }) => {
  if (!(await db.remove(idPratica(params)))) throw new Errore(404, 'Pratica non trovata');
  return json(null, 204);
});

// ---------------------------------------------------------------------------
// Cartella principale (Google Drive) e cartelle delle pratiche
// ---------------------------------------------------------------------------
const descrizioneImpostazioni = () => ({ cartellaArchivio: impostazioni.radice ? impostazioni.nome || 'Google Drive' : '', salvaPdfInArchivio: impostazioni.salvaPdf, suggerimenti: [], web: true });
rotta('GET', 'api/impostazioni', async () => json(descrizioneImpostazioni()));
rotta('PUT', 'api/impostazioni', async ({ body }) => {
  const testo = String(body?.cartellaArchivio || '').trim();
  const salva = body?.salvaPdfInArchivio !== false;
  if (!testo) {
    impostazioni.imposta({ radice: '', nome: '', salvaPdf: salva });
    return json(descrizioneImpostazioni());
  }
  // stesso valore mostrato (nome della cartella già impostata): cambia solo l'opzione dei PDF
  if (impostazioni.radice && testo === impostazioni.nome) {
    impostazioni.imposta({ salvaPdf: salva });
    return json(descrizioneImpostazioni());
  }
  const id = A.idDaLink(testo);
  if (!id) throw new Errore(400, 'Incolla il link della cartella di Google Drive (in Drive: tasto destro sulla cartella → Condividi → Copia link)');
  try {
    await A.verificaRadice(id);
  } catch (err) {
    throw new Errore(400, err.status === 404 ? 'Cartella non trovata: controlla il link (deve essere una cartella del tuo Drive)' : err.message);
  }
  impostazioni.imposta({ radice: id, nome: await A.percorsoLeggibile(id).catch(() => 'Google Drive'), salvaPdf: salva });
  return json(descrizioneImpostazioni());
});

// le pratiche stanno tutte nell'archivio su Drive: non c'è un elenco separato "dalla cartella"
rotta('GET', 'api/drive', async () => json({ cartella: '', pratiche: [] }));

rotta('GET', 'api/studio', async () => json({ studio: await studio.leggi(), condivisi: true }));
rotta('PUT', 'api/studio', async ({ body }) => {
  try {
    return json({ studio: await studio.salva(body?.studio), condivisi: true });
  } catch (err) {
    throw new Errore(400, `Dati dello studio non salvati: ${err.message}`);
  }
});

// "Apri cartella": la cartella su Google Drive, in una nuova scheda. La scheda si apre subito (durante il clic),
// altrimenti il browser la bloccherebbe; l'indirizzo arriva appena trovato l'id della cartella.
rotta('POST', 'api/apri-cartella', async ({ body, finestra }) => {
  if (!impostazioni.radice) throw new Errore(400, 'Cartella principale non impostata');
  const url = await A.linkCartella(body?.cartella || '');
  if (finestra && !finestra.closed) finestra.location.href = url;
  else window.open(url, '_blank', 'noopener');
  return json(null, 204);
});

rotta('GET', 'api/cartelle', async ({ query }) => {
  if (!impostazioni.radice) throw new Errore(400, 'Imposta prima la cartella principale delle pratiche');
  const percorso = A.parti(query.percorso).join('/');
  try {
    if (query.crea && percorso) await A.cartella(percorso, { crea: true });
    return json({ base: impostazioni.nome, percorso, cartelle: await A.elencaCartelle(percorso) });
  } catch (err) {
    throw new Errore(400, `Cartella non leggibile: ${err.message}`);
  }
});
rotta('POST', 'api/cartelle', async ({ body }) => {
  if (!impostazioni.radice) throw new Errore(400, 'Imposta prima la cartella principale delle pratiche');
  try {
    return json({ percorso: await A.creaCartella(body?.percorso, body?.nome) }, 201);
  } catch (err) {
    throw new Errore(400, `Cartella non creata: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// Comuni e CAP, OCR, foto HEIC
// ---------------------------------------------------------------------------
rotta('GET', 'api/comuni', async () => json(COMUNI.map(formatoCitta)));

const capInCache = new Map();
let ultimaOsm = 0;
async function capDaOpenStreetMap(c, via, civ) {
  const chiave = `${c.nome}|${via}|${civ}`.toUpperCase();
  if (capInCache.has(chiave)) return capInCache.get(chiave);
  const attesa = ultimaOsm + 1100 - Date.now();
  if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
  ultimaOsm = Date.now();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'it', street: [civ, via].filter(Boolean).join(' '), city: c.nome, 'accept-language': 'it' });
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`OpenStreetMap: errore ${r.status}`);
  const cap = (await r.json()).map((x) => x.address?.postcode).find((p) => c.cap.includes(p)) || '';
  capInCache.set(chiave, cap);
  return cap;
}
rotta('GET', 'api/cap', async ({ query }) => {
  const c = comuneDaCitta(query.citta);
  if (!c) return json({ cap: '', possibili: [] });
  const out = { comune: formatoCitta(c), cap: capDelComune(c), possibili: c.cap, fonte: 'elenco' };
  const via = String(query.via || '').trim();
  if (!out.cap && via) {
    try {
      out.cap = await capDaOpenStreetMap(c, via, String(query.civ || '').trim());
      out.fonte = 'openstreetmap';
    } catch (err) {
      out.errore = err.name === 'TimeoutError' ? 'OpenStreetMap non risponde' : err.message.startsWith('OpenStreetMap') ? err.message : 'Ricerca su OpenStreetMap non riuscita (connessione assente?)';
    }
  }
  return json(out);
});

// OCR (Tesseract nel browser; i file del motore e della lingua italiana si scaricano la prima volta)
let workerOcr;
let codaOcr = Promise.resolve();
async function ocr(img, modo = '3') {
  const job = codaOcr.then(async () => {
    if (!workerOcr) {
      const { createWorker } = await import('../vendor/tesseract.esm.min.js');
      workerOcr = createWorker('ita', 1).catch((e) => { workerOcr = null; throw e; });
    }
    const w = await workerOcr;
    await w.setParameters({ tessedit_pageseg_mode: modo });
    const { data } = await w.recognize(new Blob([daBase64(img)]));
    return data.text || '';
  });
  codaOcr = job.catch(() => {});
  return job;
}
const ocrTutte = async (images, modo) => { const t = []; for (const i of images) t.push(await ocr(i, modo)); return t; };
const CAMPI_RESIDENZA = ['indirizzo_via', 'indirizzo_civico', 'comune', 'provincia', 'cap'];

rotta('POST', 'api/id', async ({ body }) => {
  const images = (body?.images || []).filter((x) => typeof x === 'string' && x.length);
  if (!images.length) throw new Errore(400, 'Nessuna immagine ricevuta');
  if (images.length > 6) throw new Errore(400, 'Carica al massimo 6 immagini per volta');
  try {
    const testi = await ocrTutte(images);
    const dati = parseIdentity(testi);
    if (!dati.indirizzo_via || !dati.comune) {
      const sparsi = await ocrTutte(images, '11');
      const altri = parseIdentity(sparsi);
      if (altri.indirizzo_via && (altri.comune || !dati.comune) && !dati.indirizzo_via) for (const k of CAMPI_RESIDENZA) dati[k] = altri[k];
      else if (!dati.comune && altri.comune) for (const k of ['comune', 'provincia', 'cap']) dati[k] = altri[k];
      for (const [k, v] of Object.entries(altri)) if (v && !dati[k]) dati[k] = v;
      testi.push(...sparsi.map((t) => `[lettura come testo sparso]\n${t}`));
    }
    return json({ ...dati, testo: testi.join('\n\n— — —\n\n').trim() });
  } catch (err) {
    throw new Errore(500, `Lettura non riuscita: ${err.message}`);
  }
});

rotta('POST', 'api/impianto', async ({ body }) => {
  const { tipo, testo = '', images = [] } = body || {};
  if (!PARSERS[tipo]) throw new Errore(400, 'Tipo di impianto non valido');
  if (images.length > 6) throw new Errore(400, 'Troppe pagine da leggere');
  const letti = images.length ? await ocrTutte(images) : [];
  const completo = [testo, ...letti].join('\n').trim();
  return json({ campi: parseImpianto(tipo, completo), testo: completo, ocr: letti.length > 0 });
});

rotta('POST', 'api/heic', async ({ body }) => {
  if (!body) throw new Errore(400, 'File mancante');
  try {
    if (!window.heic2any) await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = new URL('../vendor/heic2any.min.js', import.meta.url).href; s.onload = ok; s.onerror = ko; document.head.append(s); });
    const blob = await window.heic2any({ blob: body instanceof Blob ? body : new Blob([body]), toType: 'image/jpeg', quality: 0.9 });
    return binario(Array.isArray(blob) ? blob[0] : blob, 'image/jpeg');
  } catch {
    throw new Errore(422, 'Foto HEIC non leggibile');
  }
});
