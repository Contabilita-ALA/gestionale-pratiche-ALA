// Archivio su Google Drive. Tutto sta nella cartella principale dello studio (es. "ALA"):
//   00_GESTIONALE/pratiche/      una scheda .json per pratica (i dati dei moduli APE, catasto, pratiche)
//   00_GESTIONALE/dati-studio.json
//   00_PROFORMA/registro/        una scheda .json per proforma, fattura o entrata + numerazione.json
//   00_PROFORMA/<anno>/          i PDF dei proforma
// e i documenti di ogni pratica nella sua cartella (percorso relativo alla principale, es. "00_APE/VENETO/CAORLE …").
// Ogni scheda porta con sé un riassunto (appProperties di Drive), così gli elenchi si leggono con una sola richiesta.
import { drive, CARTELLA } from './gdrive.js';
import { moduloDi, versioneDi, pulisciNome, nomePratica } from '../lib/nomi.js';
import { calcola, datiStudio } from '../lib/proforma.js';
import { importo, stessoCliente } from '../lib/importa.js';

export const CARTELLA_APP = '00_GESTIONALE';
export const CARTELLA_PROFORMA = '00_PROFORMA';

// ---------------------------------------------------------------------------
// Impostazioni di questo browser: la cartella principale (id di Drive) e il suo nome
// ---------------------------------------------------------------------------
const leggiLS = (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const scriviLS = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, String(v)); } catch {} };

export const impostazioni = {
  // versione locale: la cartella ALA del computer (impostata nel server, window.LOCALE.radice), id "."
  get radice() { if (window.LOCALE) return window.LOCALE.radice ? '.' : ''; return window.DRIVE_FINTO ? (leggiLS('gs.radice') || drive.radice) : leggiLS('gs.radice'); },
  get nome() { if (window.LOCALE) return window.LOCALE.radice || ''; return leggiLS('gs.radiceNome') || (window.DRIVE_FINTO ? 'Il mio Drive/ALA' : ''); },
  get salvaPdf() { return leggiLS('gs.salvaPdf', '1') !== '0'; },
  imposta({ radice, nome, salvaPdf }) {
    if (radice !== undefined) { scriviLS('gs.radice', radice || null); svuotaCache(); }
    if (nome !== undefined) scriviLS('gs.radiceNome', nome || null);
    if (salvaPdf !== undefined) scriviLS('gs.salvaPdf', salvaPdf ? '1' : '0');
  },
};

// Id della cartella dal link di Drive ("…/folders/<id>", "…?id=<id>") o dall'id incollato
export function idDaLink(testo) {
  const t = String(testo || '').trim();
  const m = t.match(/\/folders\/([\w-]{10,})/) || t.match(/[?&]id=([\w-]{10,})/) || t.match(/^([\w-]{20,})$/);
  return m ? m[1] : '';
}

// Percorso leggibile di una cartella ("Il mio Drive/ALA"), risalendo i genitori
export async function percorsoLeggibile(id) {
  const nomi = [];
  let cur = await drive.info(id);
  for (let i = 0; cur && i < 8; i++) {
    nomi.unshift(cur.name);
    const su = cur.parents?.[0];
    if (!su) break;
    try { cur = await drive.info(su); } catch { break; }
  }
  return nomi.join('/');
}

export async function verificaRadice(id) {
  const f = await drive.info(id);
  if (f.mimeType !== CARTELLA) throw new Error('Il link non è di una cartella');
  return f;
}

// ---------------------------------------------------------------------------
// Cartelle per percorso relativo alla principale (con memoria degli id già trovati)
// ---------------------------------------------------------------------------
const cache = new Map();
const inCorso = new Map();
export function svuotaCache() { cache.clear(); inCorso.clear(); elencoPratiche.svuota(); fileRegistro.svuota(); numerazione.svuota(); }

// Memoria degli elenchi letti da Drive: cambiando schermata si mostra subito quello che si conosce già.
// Se l'elenco ha più di 30 secondi si rilegge da Drive "dietro le quinte"; se è cambiato (es. da un altro PC)
// l'interfaccia riceve l'evento "archivio-aggiornato" e ridisegna la schermata. Dopo ogni salvataggio fatto da qui
// la memoria si svuota e l'elenco si rilegge subito.
const DURATA = 30000;
function ricorda(leggi) {
  let valore = null, quando = 0, inAggiornamento = false;
  const f = (fresco = false) => {
    if (fresco || !valore) {
      quando = Date.now();
      const v = leggi();
      valore = v;
      v.catch(() => { if (valore === v) valore = null; });
      return v;
    }
    if (Date.now() - quando > DURATA && !inAggiornamento) {
      quando = Date.now();
      inAggiornamento = true;
      const vecchio = valore;
      leggi().then(async (nuovo) => {
        if (valore !== vecchio) return; // nel frattempo c'è stato un salvataggio: vale la lettura nuova
        valore = Promise.resolve(nuovo);
        const prima = await vecchio.catch(() => null);
        if (JSON.stringify(prima) !== JSON.stringify(nuovo)) window.dispatchEvent(new Event('archivio-aggiornato'));
      }, () => {}).finally(() => { inAggiornamento = false; });
    }
    return valore;
  };
  f.svuota = () => { valore = null; };
  return f;
}

export const parti = (rel) => String(rel || '').split(/[\\/]+/).map((p) => p.trim()).filter((p) => p && p !== '.');

export function radice() {
  const r = impostazioni.radice;
  if (!r) throw new Error('Imposta prima la cartella principale delle pratiche (Opzioni)');
  return r;
}

// id della cartella al percorso; crea: true le crea se mancano
export async function cartella(rel, { crea = false } = {}) {
  const p = parti(rel);
  if (p.includes('..')) throw new Error('Percorso non valido');
  let id = radice();
  let chiave = '';
  for (const nome of p) {
    chiave = chiave ? `${chiave}/${nome}` : nome;
    if (cache.has(chiave)) { id = cache.get(chiave); continue; }
    const padre = id;
    const k = `${chiave}|${crea}`;
    if (!inCorso.has(k)) {
      inCorso.set(k, (async () => {
        const trovate = await drive.elenca(padre, { soloCartelle: true, nome });
        if (trovate[0]) return trovate[0].id;
        if (!crea) { const e = new Error(`Cartella "${chiave}" non trovata in Google Drive`); e.status = 404; throw e; }
        return (await drive.creaCartella(padre, nome)).id;
      })().finally(() => inCorso.delete(k)));
    }
    id = await inCorso.get(k);
    cache.set(chiave, id);
  }
  return id;
}

export async function elencaCartelle(rel) {
  const id = await cartella(rel);
  return (await drive.elenca(id, { soloCartelle: true })).map((f) => f.name).filter((n) => !n.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'it', { numeric: true, sensitivity: 'base' }));
}

export async function creaCartella(rel, nome) {
  const pulito = pulisciNome(nome).replace(/^\.+/, '');
  if (!pulito) throw new Error('Indica il nome della cartella');
  const percorso = [...parti(rel), pulito].join('/');
  await cartella(percorso, { crea: true });
  return percorso;
}

// File con questo nome nella cartella: si sostituisce (stesso documento riesportato), altrimenti si crea
async function scriviFile(parentId, nome, dati, mime = 'application/pdf', props) {
  const esistente = (await drive.elenca(parentId, { nome }))[0];
  return drive.scrivi({ id: esistente?.id, parentId, nome, mime, dati, props });
}

// Documento di una pratica (lettere, proforma, sopralluogo…) nella sua cartella (o nella principale)
export async function salvaDocumento(dati, nomeFile, pdf, mime = 'application/pdf') {
  const id = await cartella(dati?.cartella || '', { crea: true });
  const nome = pulisciNome(nomeFile);
  await scriviFile(id, nome, pdf, mime);
  return nome;
}

export const salvaPdfSopralluogo = (dati, pdf) => salvaDocumento(dati, `${nomePratica(dati)}.pdf`, pdf);

// Allegati FVG in una sottocartella della pratica: i vecchi allegati numerati ("1. …") si tolgono prima
export async function salvaCartellaAllegati(dati, nomeCartella, file) {
  const nome = pulisciNome(nomeCartella);
  const rel = [...parti(dati?.cartella), nome].join('/');
  const id = await cartella(rel, { crea: true });
  for (const f of await drive.elenca(id)) if (/^\d+\. /.test(f.name)) await drive.cestina(f.id);
  for (const f of file) await drive.scrivi({ parentId: id, nome: pulisciNome(f.nome), mime: f.nome.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream', dati: f.dati });
  return rel;
}

export async function linkCartella(rel) {
  const id = await cartella(rel || '', { crea: true });
  return `https://drive.google.com/drive/folders/${id}`;
}

// ---------------------------------------------------------------------------
// Riassunti nelle appProperties di Drive: chiave + valore al massimo 124 byte
// ---------------------------------------------------------------------------
const enc = new TextEncoder();
function proprieta(obj) {
  const out = {};
  for (const [k, v0] of Object.entries(obj)) {
    let v = String(v0 ?? '');
    while (enc.encode(k).length + enc.encode(v).length > 120) v = v.slice(0, -1);
    out[k] = v;
  }
  return out;
}
const leggiJson = async (id) => JSON.parse(new TextDecoder().decode(await drive.leggi(id)));
const dataLocale = (iso) => {
  const d = new Date(iso || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// ---------------------------------------------------------------------------
// Pratiche: 00_GESTIONALE/pratiche/<codice>.json. Ogni pratica ha un numero progressivo (id) per l'interfaccia.
// ---------------------------------------------------------------------------
const cartellaPratiche = () => cartella(`${CARTELLA_APP}/pratiche`, { crea: true });
const elencoPratiche = ricorda(async () => completaPratiche(await drive.elenca(await cartellaPratiche())));

// Riassunti da rifare. Versione locale e versione web salvano gli stessi file (Google Drive per desktop li sincronizza),
// ma i riassunti per gli elenchi stanno in posti diversi: le appProperties su Drive, il file .gestionale.json sul
// computer. Ogni riassunto ricorda quando è stato fatto ("agg"): se il file è stato modificato dopo (dall'altra
// versione), oppure il riassunto manca, si rilegge il file e lo si rifà. Così gli elenchi sono giusti in tutte e due.
const ORA = () => new Date().toISOString();
const daRifare = (f) => {
  const a = f.appProperties || {};
  return !a.agg || Date.parse(f.modifiedTime) - Date.parse(a.agg) > 120000;
};
// esegue fn su tutti gli elementi, al massimo k alla volta (lettura più veloce su Drive)
async function aGruppi(lista, fn, k = 6) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(k, lista.length) }, async () => { while (i < lista.length) await fn(lista[i++]); }));
}
async function completaPratiche(file) {
  const json = file.filter((f) => /\.json$/i.test(f.name));
  const senzaNumero = json.filter((f) => !Number(f.appProperties?.n)).sort((a, b) => String(a.createdTime).localeCompare(String(b.createdTime)));
  const vecchi = json.filter((f) => Number(f.appProperties?.n) && daRifare(f));
  if (!senzaNumero.length && !vecchi.length) return file;
  // i numeri nuovi si assegnano subito, in ordine di creazione
  let n = Math.max(0, ...file.map((f) => Number(f.appProperties?.n) || 0));
  const nuovi = new Map(senzaNumero.map((f) => [f, ++n]));
  await aGruppi([...senzaNumero, ...vecchi], async (f) => {
    try {
      const dati = await leggiJson(f.id);
      const base = { uid: dati?._uid || f.appProperties?.uid || f.name.replace(/\.json$/i, ''), ...riassunto(dati), agg: ORA() };
      const props = proprieta(nuovi.has(f) ? { n: nuovi.get(f), ...base, creata: f.createdTime, pdf: 0 } : base);
      Object.assign(f, await drive.aggiorna(f.id, { props }));
    } catch {}
  });
  return file;
}

function riassunto(d = {}) {
  const m = d.immobile || {};
  return {
    committente: d.committente?.nome || '',
    immobile: [[m.via, m.civ].filter(Boolean).join(' '), m.citta].filter(Boolean).join(', '),
    data_visita: d.visita?.data || '',
    n_visita: d.visita?.numero || '',
    modulo: moduloDi(d),
    versione: versioneDi(d),
    titolo: moduloDi(d) === 'pratica' ? String(d.offerta?.titolo || '') : '',
  };
}
const riga = (f) => {
  const a = f.appProperties || {};
  return {
    id: Number(a.n) || 0, uid: a.uid || '', committente: a.committente || '', immobile: a.immobile || '', data_visita: a.data_visita || '',
    n_visita: a.n_visita || '', modulo: a.modulo || '', versione: a.versione || '', titolo: a.titolo || '',
    creata_il: dataLocale(a.creata || f.createdTime), modificata_il: dataLocale(f.modifiedTime),
    pdf_generati: Number(a.pdf) || 0, ultimo_pdf_il: a.ultimo_pdf ? dataLocale(a.ultimo_pdf) : null, _file: f.id,
  };
};

export const pratiche = {
  async elenco(fresco = false) {
    const file = await elencoPratiche(fresco);
    return file.map(riga).filter((r) => r.id).sort((a, b) => b.modificata_il.localeCompare(a.modificata_il) || b.id - a.id);
  },
  async _trova(id) {
    return (await this.elenco()).find((r) => r.id === Number(id)) || null;
  },
  async get(id) {
    const r = await this._trova(id);
    if (!r) return null;
    const { _file, ...resto } = r;
    return { ...resto, dati: await leggiJson(_file) };
  },
  async getByUid(uid) {
    const r = uid ? (await this.elenco()).find((x) => x.uid === uid) : null;
    return r ? this.get(r.id) : null;
  },
  async idByUid(uid) {
    return uid ? ((await this.elenco()).find((x) => x.uid === uid)?.id ?? null) : null;
  },
  async create(dati) {
    const lista = await this.elenco(true); // il numero nuovo si calcola sui dati aggiornati
    elencoPratiche.svuota();
    const n = Math.max(0, ...lista.map((r) => r.id)) + 1;
    const uid = dati?._uid || crypto.randomUUID();
    const props = proprieta({ n, uid, ...riassunto(dati), creata: new Date().toISOString(), pdf: 0, agg: ORA() });
    const f = await drive.scrivi({ parentId: await cartellaPratiche(), nome: `${uid}.json`, mime: 'application/json', dati: JSON.stringify(dati, null, 1), props });
    elencoPratiche.svuota();
    const { _file, ...r } = riga(f);
    return r;
  },
  async update(id, dati) {
    const r = await this._trova(id);
    if (!r) return null;
    elencoPratiche.svuota();
    const f = await drive.scrivi({ id: r._file, mime: 'application/json', dati: JSON.stringify(dati, null, 1), props: proprieta({ ...riassunto(dati), uid: dati?._uid || r.uid, agg: ORA() }) });
    elencoPratiche.svuota();
    const { _file, ...out } = riga(f);
    return out;
  },
  async markPdf(id) {
    const r = await this._trova(id);
    elencoPratiche.svuota();
    if (r) await drive.aggiorna(r._file, { props: { pdf: String(r.pdf_generati + 1), ultimo_pdf: new Date().toISOString(), agg: ORA() } });
    elencoPratiche.svuota();
  },
  async remove(id) {
    const r = await this._trova(id);
    if (!r) return false;
    elencoPratiche.svuota();
    await drive.cestina(r._file);
    elencoPratiche.svuota();
    return true;
  },
};

// ---------------------------------------------------------------------------
// Dati dello studio (intestazione, dati fiscali, pagamento): 00_GESTIONALE/dati-studio.json
// ---------------------------------------------------------------------------
export const studio = {
  async leggi() {
    try {
      const id = await cartella(CARTELLA_APP, { crea: true });
      const f = (await drive.elenca(id, { nome: 'dati-studio.json' }))[0];
      if (f) return datiStudio(await leggiJson(f.id));
    } catch {}
    try { return datiStudio(JSON.parse(leggiLS('gs.studio') || 'null')); } catch { return datiStudio(); }
  },
  async salva(dati) {
    const s = datiStudio(dati);
    scriviLS('gs.studio', JSON.stringify(s));
    const id = await cartella(CARTELLA_APP, { crea: true });
    await scriviFile(id, 'dati-studio.json', JSON.stringify(s, null, 2), 'application/json');
    return s;
  },
};

// ---------------------------------------------------------------------------
// Registro dei proforma (come lib/proforme.js della versione per PC)
// Tipi: 'proforma' (dell'app), 'importato', 'fattura', 'entrata'. Numerazioni separate per proforma e fatture.
// ---------------------------------------------------------------------------
const annoDi = (pf) => Number(String(pf?.data || '').slice(0, 4)) || new Date().getFullYear();
const tipoDi = (pf) => (['importato', 'entrata', 'fattura'].includes(pf.tipo) ? pf.tipo : 'proforma');
const gruppo = (pf) => ({ proforma: 'proforma', importato: 'proforma', fattura: 'fattura' }[tipoDi(pf)] || '');
const totaleDi = (pf) => (tipoDi(pf) === 'proforma' ? calcola(pf).daPagare : importo(pf.totale));
const chiaveNum = (anno, grp) => `${grp === 'fattura' ? 'F' : ''}${anno}`;

const riepilogoDi = (pf) => ({
  id: pf.id, tipo: tipoDi(pf), numero: tipoDi(pf) === 'entrata' ? '' : String(pf.numero ?? ''), anno: annoDi(pf), data: pf.data || '', stato: pf.stato || 'emesso', modulo: pf.modulo || '',
  pratica_uid: pf.pratica_uid || '', cliente: pf.destinatario?.nome || '',
  descrizione: String((tipoDi(pf) === 'proforma' ? pf.righe?.[0]?.testo : pf.descrizione) || '').slice(0, 160),
  totale: totaleDi(pf), modificato: pf.modificato || '', fattura_id: pf.fattura_id || '', proforma_id: pf.proforma_id || '',
});
// riepilogo → appProperties e ritorno
const propsRegistro = (r) => proprieta({ rid: r.id, tipo: r.tipo, numero: r.numero, data: r.data, stato: r.stato, modulo: r.modulo, puid: r.pratica_uid, cliente: r.cliente, descr: r.descrizione, totale: r.totale, fid: r.fattura_id, pid: r.proforma_id, mod: r.modificato, agg: ORA() });
const daProps = (f) => {
  const a = f.appProperties || {};
  return {
    id: a.rid, tipo: a.tipo || 'proforma', numero: a.numero || '', anno: Number(String(a.data || '').slice(0, 4)) || new Date().getFullYear(), data: a.data || '', stato: a.stato || 'emesso',
    modulo: a.modulo || '', pratica_uid: a.puid || '', cliente: a.cliente || '', descrizione: a.descr || '', totale: Number(a.totale) || 0,
    modificato: a.mod || '', fattura_id: a.fid || '', proforma_id: a.pid || '', _file: f.id,
  };
};

const cartellaRegistro = () => cartella(`${CARTELLA_PROFORMA}/registro`, { crea: true });
const fileRegistro = ricorda(async () => completaRegistro(await drive.elenca(await cartellaRegistro())));
async function completaRegistro(file) {
  const daLeggere = file.filter((f) => f.name !== 'numerazione.json' && /\.json$/i.test(f.name) && (!f.appProperties?.rid || daRifare(f)));
  await aGruppi(daLeggere, async (f) => {
    try {
      const pf = await leggiJson(f.id);
      Object.assign(f, await drive.aggiorna(f.id, { props: propsRegistro(riepilogoDi({ ...pf, id: pf.id || f.name.replace(/\.json$/i, '') })) }));
    } catch {}
  });
  return file;
}
// numerazione.json sta nella stessa cartella del registro: si trova nello stesso elenco
const numerazione = ricorda(async () => {
  const f = (await fileRegistro()).find((x) => x.name === 'numerazione.json');
  try { return f ? await leggiJson(f.id) : {}; } catch { return {}; }
});
const registroCambiato = () => { fileRegistro.svuota(); numerazione.svuota(); };

async function elencoRegistro(fresco = false) {
  const file = await fileRegistro(fresco);
  const perId = new Map();
  for (const f of file) {
    if (f.name === 'numerazione.json' || !f.appProperties?.rid) continue;
    const r = daProps(f);
    const altro = perId.get(r.id);
    if (!altro || altro.modificato < r.modificato) perId.set(r.id, r);
  }
  return [...perId.values()].sort((a, b) => String(b.data).localeCompare(String(a.data)) || (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0) || String(b.modificato).localeCompare(String(a.modificato)));
}
const senzaFile = ({ _file, ...r }) => r;

async function fileNumerazione() {
  return (await fileRegistro(true)).find((x) => x.name === 'numerazione.json') || null;
}

export const registro = {
  async elenco() { return (await elencoRegistro()).map(senzaFile); },
  async leggiNumerazione() {
    return structuredClone(await numerazione());
  },
  async impostaNumerazione(anno, ultimo, grp = 'proforma') {
    const f = await fileNumerazione();
    const dati = f ? await leggiJson(f.id).catch(() => ({})) : {};
    const n = Math.max(0, Math.floor(Number(ultimo) || 0));
    if (n) dati[chiaveNum(anno, grp)] = n;
    else delete dati[chiaveNum(anno, grp)];
    registroCambiato();
    await drive.scrivi({ id: f?.id, parentId: await cartellaRegistro(), nome: 'numerazione.json', mime: 'application/json', dati: JSON.stringify(dati, null, 2) });
    registroCambiato();
    return dati;
  },
  async prossimo(anno = new Date().getFullYear(), grp = 'proforma', elenco = null) {
    const lista = elenco || (await elencoRegistro());
    const usati = lista.filter((pf) => pf.anno === Number(anno) && gruppo(pf) === grp).map((pf) => parseInt(pf.numero, 10)).filter(Number.isFinite);
    const partenza = Number((await this.leggiNumerazione())[chiaveNum(anno, grp)]) || 0;
    return Math.max(partenza, ...usati, 0) + 1;
  },
  async leggi(id) {
    if (!id) return null;
    const r = (await elencoRegistro()).find((x) => x.id === id);
    return r ? leggiJson(r._file) : null;
  },
  async doppione(pf) {
    if (!gruppo(pf)) return null;
    const anno = annoDi(pf);
    return (await elencoRegistro(true)).find((x) => x.id !== pf.id && gruppo(x) === gruppo(pf) && x.anno === anno && String(x.numero).trim() === String(pf.numero).trim()) || null;
  },
  async proformaPerFattura(f) {
    const tot = importo(f.totale);
    const data = String(f.data || '');
    const r = (await elencoRegistro())
      .filter((x) => gruppo(x) === 'proforma' && !x.fattura_id && Math.abs(Number(x.totale) - tot) < 0.01 && String(x.data || '') <= data && stessoCliente(x.cliente, f.destinatario?.nome))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];
    return r ? this.leggi(r.id) : null;
  },
  async salva(dati) {
    const pf = { ...dati, id: dati.id || crypto.randomUUID(), modificato: new Date().toISOString() };
    if (!pf.creato) pf.creato = pf.modificato;
    const esistente = (await elencoRegistro(true)).find((x) => x.id === pf.id);
    registroCambiato();
    await drive.scrivi({ id: esistente?._file, parentId: await cartellaRegistro(), nome: `${pf.id}.json`, mime: 'application/json', dati: JSON.stringify(pf, null, 1), props: propsRegistro(riepilogoDi(pf)) });
    registroCambiato();
    return pf;
  },
  async elimina(id) {
    const r = (await elencoRegistro()).find((x) => x.id === id);
    if (!r) return false;
    registroCambiato();
    await drive.cestina(r._file);
    registroCambiato();
    return true;
  },
  // PDF del proforma: 00_PROFORMA/<anno>/PROFORMA N. … .pdf (lo stesso proforma riesportato sostituisce il vecchio)
  async salvaPdf(pf, nomeFile, pdf) {
    const anno = String(annoDi(pf));
    const id = await cartella(`${CARTELLA_PROFORMA}/${anno}`, { crea: true });
    const nome = pulisciNome(nomeFile);
    const prefisso = `PROFORMA N. ${String(pf.numero).trim()} DEL `;
    for (const f of await drive.elenca(id)) if (f.name.startsWith(prefisso) && f.name !== nome && f.name.toLowerCase().endsWith('.pdf')) await drive.cestina(f.id);
    await scriviFile(id, nome, pdf);
    return [CARTELLA_PROFORMA, anno, nome].join('/');
  },
};
