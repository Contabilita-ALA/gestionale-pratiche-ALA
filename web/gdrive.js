// Google Drive: accesso con l'account Google (Google Identity Services) e operazioni sui file (Drive API v3).
// Con window.DRIVE_FINTO (solo per le prove) si usa un Drive simulato in memoria, con le stesse funzioni.
export const CLIENT_ID = '1087110593347-m2vfru0fljg0funoa47ig25qf34u1tgn.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const CARTELLA = 'application/vnd.google-apps.folder';

// ---------------------------------------------------------------------------
// Accesso
// ---------------------------------------------------------------------------
let token = '';
let scade = 0;
// il token resta valido anche ricaricando la pagina (solo in questa scheda, fino alla scadenza di circa un'ora)
try {
  const t = JSON.parse(sessionStorage.getItem('gs.token') || 'null');
  if (t && t.scade > Date.now() + 120_000) ({ token, scade } = t);
} catch {}
const tieni = () => { try { token ? sessionStorage.setItem('gs.token', JSON.stringify({ token, scade })) : sessionStorage.removeItem('gs.token'); } catch {} };
let client;
let attesa = null; // richiesta del token in corso: { ok, ko }
const ricorda = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const ricordato = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };

function caricaGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = ok;
    s.onerror = () => ko(new Error('Servizio di accesso Google non raggiungibile (connessione assente?)'));
    document.head.append(s);
  });
}

async function tokenClient() {
  await caricaGis();
  client ||= google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (r) => {
      const a = attesa;
      attesa = null;
      if (r.error) return a?.ko(new Error(r.error_description || r.error));
      if (!google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) {
        return a?.ko(new Error('Serve il permesso su Google Drive: rifai l’accesso e lascia spuntata la casella di Google Drive'));
      }
      token = r.access_token;
      scade = Date.now() + (Number(r.expires_in) || 3600) * 1000;
      tieni();
      a?.ok(token);
    },
    error_callback: (e) => {
      const a = attesa;
      attesa = null;
      a?.ko(new Error(e?.type === 'popup_closed' ? 'Finestra di accesso chiusa' : e?.type === 'popup_failed_to_open' ? 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito' : 'Accesso non riuscito'));
    },
  });
  return client;
}

// Chiede il token a Google. Va chiamata durante un clic (apre una piccola finestra di Google).
export async function accedi({ scegliAccount = false } = {}) {
  if (window.DRIVE_FINTO) return (token = 'finto');
  const c = await tokenClient();
  const p = new Promise((ok, ko) => (attesa = { ok, ko }));
  const hint = ricordato('gs.account');
  c.requestAccessToken({ prompt: scegliAccount || !hint ? 'select_account' : '', ...(hint && !scegliAccount ? { login_hint: hint } : {}) });
  await p;
  // indirizzo dell'account: serve solo a non richiedere la scelta dell'account la volta successiva
  try {
    const me = await richiesta(`${API}/about?fields=user(emailAddress,displayName)`).then((r) => r.json());
    if (me.user?.emailAddress) ricorda('gs.account', me.user.emailAddress);
    utente = me.user || null;
  } catch {}
  return token;
}
export let utente = null;
export const collegato = () => Boolean(token) && (window.DRIVE_FINTO || Date.now() < scade - 60_000);
export const scadeTraPoco = () => !window.DRIVE_FINTO && token && Date.now() > scade - 10 * 60_000;
export const giaAutorizzato = () => Boolean(ricordato('gs.account'));
export function esci() {
  if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  token = '';
  scade = 0;
  ricorda('gs.account', null);
  tieni();
}

// Chi deve chiedere di nuovo l'accesso (token scaduto e nessun clic in corso): lo decide l'interfaccia
export let suAccessoScaduto = async () => { throw new Error('Accesso a Google scaduto: ricarica la pagina'); };
export const impostaSuAccessoScaduto = (fn) => { suAccessoScaduto = fn; };

async function richiesta(url, opzioni = {}, ripeti = true) {
  if (!collegato()) await suAccessoScaduto();
  const res = await fetch(url, { ...opzioni, headers: { ...(opzioni.headers || {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401 && ripeti) {
    token = '';
    tieni();
    await suAccessoScaduto();
    return richiesta(url, opzioni, false);
  }
  if ((res.status === 429 || res.status >= 500) && ripeti) {
    await new Promise((r) => setTimeout(r, 800));
    return richiesta(url, opzioni, false);
  }
  if (!res.ok) {
    let msg = `Google Drive: errore ${res.status}`;
    try {
      const e = (await res.json()).error;
      if (e?.message) msg = `Google Drive: ${e.message}`;
      if (res.status === 403 && /insufficient|scope/i.test(e?.message || '')) msg = 'Google Drive: permesso mancante. Esci e rientra, lasciando spuntata la casella di Google Drive.';
      if (res.status === 404) msg = 'Google Drive: file o cartella non trovati (forse spostati o eliminati)';
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res;
}

// ---------------------------------------------------------------------------
// Operazioni sui file (stessa interfaccia per il Drive vero e per quello finto)
// ---------------------------------------------------------------------------
const CAMPI = 'id,name,mimeType,parents,modifiedTime,createdTime,size,appProperties,webViewLink,trashed';
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const vero = {
  async info(id) {
    return (await richiesta(`${API}/files/${id}?fields=${CAMPI}&supportsAllDrives=true`)).json();
  },
  // figli di una cartella (solo cartelle, se richiesto; nome esatto, se indicato)
  async elenca(parentId, { soloCartelle = false, nome = null, campi = CAMPI } = {}) {
    const filtro = [`${q(parentId)} in parents`, 'trashed = false'];
    if (soloCartelle) filtro.push(`mimeType = ${q(CARTELLA)}`);
    if (nome != null) filtro.push(`name = ${q(nome)}`);
    const out = [];
    let pagina = '';
    do {
      const p = new URLSearchParams({ q: filtro.join(' and '), fields: `nextPageToken,files(${campi})`, pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(pagina ? { pageToken: pagina } : {}) });
      const r = await (await richiesta(`${API}/files?${p}`)).json();
      out.push(...(r.files || []));
      pagina = r.nextPageToken || '';
    } while (pagina);
    return out;
  },
  async creaCartella(parentId, nome) {
    const r = await richiesta(`${API}/files?fields=${CAMPI}&supportsAllDrives=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, mimeType: CARTELLA, parents: [parentId] }),
    });
    return r.json();
  },
  async leggi(id) {
    return (await richiesta(`${API}/files/${id}?alt=media&supportsAllDrives=true`)).arrayBuffer();
  },
  // crea (parentId) o sostituisce (id) un file; dati: stringa, Uint8Array, ArrayBuffer o Blob
  async scrivi({ id, parentId, nome, mime = 'application/octet-stream', dati, props }) {
    const meta = { ...(nome ? { name: nome } : {}), ...(props ? { appProperties: props } : {}), ...(!id && parentId ? { parents: [parentId] } : {}), mimeType: mime };
    const confine = `gs${Math.random().toString(36).slice(2)}`;
    const corpo = new Blob([
      `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${confine}\r\nContent-Type: ${mime}\r\n\r\n`,
      dati instanceof Blob ? dati : new Blob([dati]),
      `\r\n--${confine}--`,
    ]);
    const url = `${UPLOAD}/files${id ? `/${id}` : ''}?uploadType=multipart&fields=${CAMPI}&supportsAllDrives=true`;
    const r = await richiesta(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${confine}` }, body: corpo });
    return r.json();
  },
  async aggiorna(id, { nome, props, aggiungi, togli }) {
    const p = new URLSearchParams({ fields: CAMPI, supportsAllDrives: 'true', ...(aggiungi ? { addParents: aggiungi } : {}), ...(togli ? { removeParents: togli } : {}) });
    const r = await richiesta(`${API}/files/${id}?${p}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(nome ? { name: nome } : {}), ...(props ? { appProperties: props } : {}) }) });
    return r.json();
  },
  async cestina(id) {
    await richiesta(`${API}/files/${id}?supportsAllDrives=true`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
  },
};

// Drive finto (prove automatiche): tutto in memoria, con un "Il mio Drive" che contiene la cartella ALA
function driveFinto() {
  const file = new Map();
  let n = 0;
  const ora = () => new Date(Date.now() + n).toISOString();
  const nuovo = (dati) => {
    const id = `f${++n}`;
    const f = { id, trashed: false, createdTime: ora(), modifiedTime: ora(), appProperties: {}, ...dati };
    file.set(id, f);
    return f;
  };
  const copia = (f) => ({ ...f, data: undefined, webViewLink: `https://drive.google.com/drive/folders/${f.id}` });
  window.__driveFinto = file; // per le prove: elenco dei file
  const radice = nuovo({ name: 'Il mio Drive', mimeType: CARTELLA, parents: [] });
  const ala = nuovo({ name: 'ALA', mimeType: CARTELLA, parents: [radice.id] });
  for (const nome of ['00_APE', '47_Carbonera_CDU Biverone', '46_Striuli_Catasto Gusso']) nuovo({ name: nome, mimeType: CARTELLA, parents: [ala.id] });
  const ape = [...file.values()].find((f) => f.name === '00_APE');
  for (const nome of ['VENETO', 'FRIULI VENEZIA GIULIA']) nuovo({ name: nome, mimeType: CARTELLA, parents: [ape.id] });
  const comeBuffer = async (d) => (d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)));
  const api = {
    radice: ala.id,
    file,
    async info(id) {
      const f = file.get(id);
      if (!f || f.trashed) { const e = new Error('Google Drive: file o cartella non trovati'); e.status = 404; throw e; }
      return copia(f);
    },
    async elenca(parentId, { soloCartelle = false, nome = null } = {}) {
      return [...file.values()].filter((f) => !f.trashed && f.parents.includes(parentId) && (!soloCartelle || f.mimeType === CARTELLA) && (nome == null || f.name === nome)).map(copia);
    },
    async creaCartella(parentId, nome) { return copia(nuovo({ name: nome, mimeType: CARTELLA, parents: [parentId] })); },
    async leggi(id) { const d = file.get(id).data; return d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength); },
    async scrivi({ id, parentId, nome, mime, dati, props }) {
      const data = await comeBuffer(dati);
      if (id) {
        const f = file.get(id);
        Object.assign(f, { data, modifiedTime: ora(), size: String(data.length), ...(nome ? { name: nome } : {}), ...(mime ? { mimeType: mime } : {}) });
        if (props) f.appProperties = { ...f.appProperties, ...props };
        return copia(f);
      }
      return copia(nuovo({ name: nome, mimeType: mime, parents: [parentId], data, size: String(data.length), appProperties: props || {} }));
    },
    async aggiorna(id, { nome, props, aggiungi, togli }) {
      const f = file.get(id);
      if (nome) f.name = nome;
      if (props) f.appProperties = { ...f.appProperties, ...props };
      if (togli) f.parents = f.parents.filter((p) => p !== togli);
      if (aggiungi) f.parents.push(aggiungi);
      f.modifiedTime = ora();
      return copia(f);
    },
    async cestina(id) { file.get(id).trashed = true; },
  };
  // per le prove di velocità: window.DRIVE_RITARDO = millisecondi di attesa per ogni richiesta (come la rete vera),
  // window.__richiesteDrive = elenco delle richieste fatte
  window.__richiesteDrive = [];
  for (const k of ['info', 'elenca', 'creaCartella', 'leggi', 'scrivi', 'aggiorna', 'cestina']) {
    const fn = api[k];
    api[k] = async (...arg) => {
      window.__richiesteDrive.push(k);
      if (window.DRIVE_RITARDO) await new Promise((ok) => setTimeout(ok, window.DRIVE_RITARDO));
      return fn(...arg);
    };
  }
  return api;
}

// ---------------------------------------------------------------------------
// Versione locale (server.cjs sul computer): stessi comandi, ma sui file della cartella ALA di Google Drive per
// desktop. L'id di un file è il suo percorso relativo ("." è la cartella ALA). Niente accesso con Google.
// ---------------------------------------------------------------------------
async function chiamaLocale(op, { query, body, dati, meta } = {}) {
  const url = `locale/fs/${op}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const opz = dati !== undefined
    ? { method: 'POST', headers: { 'X-Meta': encodeURIComponent(JSON.stringify(meta || {})) }, body: dati instanceof Blob ? dati : new Blob([dati]) }
    : body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opz);
  if (!res.ok) {
    let msg = `Errore ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res;
}
const locale = {
  radice: '.',
  async info(id) { return (await chiamaLocale('info', { query: { id } })).json(); },
  async elenca(parentId, { soloCartelle = false, nome = null } = {}) {
    return (await chiamaLocale('elenca', { query: { id: parentId, ...(soloCartelle ? { soloCartelle: '1' } : {}), ...(nome != null ? { nome } : {}) } })).json();
  },
  async creaCartella(parentId, nome) { return (await chiamaLocale('cartella', { body: { padre: parentId, nome } })).json(); },
  async leggi(id) { return (await chiamaLocale('leggi', { query: { id } })).arrayBuffer(); },
  async scrivi({ id, parentId, nome, dati, props }) {
    return (await chiamaLocale('scrivi', { dati, meta: { id, padre: parentId, nome, props } })).json();
  },
  async aggiorna(id, { nome, props, aggiungi, togli }) { return (await chiamaLocale('aggiorna', { body: { id, nome, props, aggiungi, togli } })).json(); },
  async cestina(id) { await chiamaLocale('cestina', { body: { id } }); },
};

let finto;
export const drive = new Proxy({}, {
  get(_t, k) {
    if (window.DRIVE_FINTO) return (finto ||= driveFinto())[k];
    if (window.LOCALE) return locale[k];
    return vero[k];
  },
});
