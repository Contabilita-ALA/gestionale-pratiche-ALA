#!/usr/bin/env node
// Gestionale Studio — versione locale (Windows e Mac).
// Si avvia con doppio clic su "Avvia Gestionale (Windows).bat" o "Avvia Gestionale (Mac).command".
// Serve solo Node.js (gratuito, nodejs.org, versione 18 o successiva): nessun pacchetto da installare.
//
// Cosa fa:
// - apre l'app nel browser all'indirizzo http://localhost:8787 (solo su questo computer, non è raggiungibile da fuori);
// - l'app legge e scrive pratiche, proforma e PDF direttamente nella cartella ALA di Google Drive per desktop
//   (Windows: es. G:\Il mio Drive\ALA · Mac: Finder → Google Drive → Il mio Drive → ALA): tutto è istantaneo e
//   Google Drive sincronizza da solo con gli altri computer;
// - i file dell'app (pagine, stili, programmi) si prendono ogni volta dalla versione pubblicata su internet, così
//   gli aggiornamenti arrivano da soli; senza internet si usa l'ultima copia salvata o questa cartella.
'use strict';
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORTA = Number(process.env.PORTA) || 8787;
const REMOTO = 'https://contabilita-ala.github.io/gestionale-pratiche-ALA/';
const QUI = __dirname;
const CONFIG = path.join(os.homedir(), '.gestionale-studio.json');
const CACHE = path.join(os.homedir(), '.gestionale-studio-cache');
const CARTELLA = 'application/vnd.google-apps.folder'; // stesso tipo usato da Google Drive per le cartelle
const PROPRIETA = '.gestionale.json'; // in ogni cartella: i riassunti dei file (come le "appProperties" di Drive)

// ---------------------------------------------------------------------------
// Impostazioni di questo computer (cartella ALA e link di Drive), nella cartella dell'utente
// ---------------------------------------------------------------------------
function leggiConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch { return {}; }
}
function scriviConfig(c) {
  fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2));
}
let config = leggiConfig();

// Dove può essere la cartella ALA di Google Drive per desktop su questo computer
function candidati() {
  const out = [];
  const prova = (p) => { try { if (fs.statSync(p).isDirectory()) out.push(p); } catch {} };
  const nomi = ['Il mio Drive', 'My Drive'];
  if (process.platform === 'win32') {
    for (const lettera of 'GHIJKLMNOPDEF') for (const n of nomi) prova(`${lettera}:\\${n}\\ALA`);
  } else if (process.platform === 'darwin') {
    const cs = path.join(os.homedir(), 'Library', 'CloudStorage');
    let voci = [];
    try { voci = fs.readdirSync(cs).filter((x) => x.startsWith('GoogleDrive')); } catch {}
    for (const v of voci) for (const n of nomi) prova(path.join(cs, v, n, 'ALA'));
    for (const n of nomi) prova(path.join('/Volumes', 'GoogleDrive', n, 'ALA'));
  } else {
    for (const n of nomi) prova(path.join(os.homedir(), 'GoogleDrive', n, 'ALA'));
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// File della cartella ALA. Ogni file o cartella ha come "id" il suo percorso relativo ("." è la cartella ALA).
// ---------------------------------------------------------------------------
function radice() {
  if (!config.radice) { const e = new Error('Cartella dello studio non impostata'); e.status = 400; throw e; }
  return config.radice;
}
function assoluto(id) {
  const r = path.resolve(radice());
  const p = path.resolve(r, String(id || '.'));
  if (p !== r && !p.startsWith(r + path.sep)) { const e = new Error('Percorso non valido'); e.status = 400; throw e; }
  return p;
}
const relativo = (p) => path.relative(path.resolve(radice()), p).split(path.sep).join('/') || '.';
const padreDi = (id) => { const d = path.posix.dirname(id); return d === '' ? '.' : d; };

const MIME = {
  '.pdf': 'application/pdf', '.json': 'application/json', '.zip': 'application/zip', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.heic': 'image/heic', '.txt': 'text/plain', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const mimeDi = (nome) => MIME[path.extname(nome).toLowerCase()] || 'application/octet-stream';

async function leggiProp(dir) {
  try { return JSON.parse(await fsp.readFile(path.join(dir, PROPRIETA), 'utf8')); } catch { return {}; }
}
async function scriviProp(dir, tutte) {
  const f = path.join(dir, PROPRIETA);
  if (!Object.keys(tutte).length) { await fsp.rm(f, { force: true }); return; }
  await fsp.writeFile(f, JSON.stringify(tutte, null, 1));
}

async function voce(p, prop) {
  const st = await fsp.stat(p);
  const id = relativo(p);
  const nome = path.basename(p);
  return {
    id, name: id === '.' ? path.basename(path.resolve(radice())) : nome,
    mimeType: st.isDirectory() ? CARTELLA : mimeDi(nome),
    parents: id === '.' ? [] : [padreDi(id)],
    modifiedTime: st.mtime.toISOString(), createdTime: (st.birthtime && st.birthtime.getTime() > 0 ? st.birthtime : st.mtime).toISOString(),
    size: String(st.size), appProperties: prop || {}, trashed: false,
  };
}

const fsApi = {
  async info({ id }) {
    const p = assoluto(id);
    const prop = (await leggiProp(path.dirname(p)))[path.basename(p)];
    return voce(p, prop);
  },
  async elenca({ id, soloCartelle, nome }) {
    const dir = assoluto(id);
    const prop = await leggiProp(dir);
    const out = [];
    for (const n of await fsp.readdir(dir)) {
      if (n.startsWith('.') || n === 'desktop.ini' || n === 'Icon\r') continue;
      if (nome != null && nome !== '' && n !== nome) continue;
      let v;
      try { v = await voce(path.join(dir, n), prop[n]); } catch { continue; }
      if (soloCartelle && v.mimeType !== CARTELLA) continue;
      out.push(v);
    }
    return out;
  },
  async cartella({ padre, nome }) {
    const p = path.join(assoluto(padre), String(nome));
    assoluto(relativo(p));
    await fsp.mkdir(p, { recursive: true });
    return voce(p);
  },
  async leggi({ id }) {
    return fsp.readFile(assoluto(id));
  },
  async scrivi({ id, padre, nome, props }, dati) {
    let p;
    if (id) {
      p = assoluto(id);
      if (nome && nome !== path.basename(p)) {
        const nuovo = path.join(path.dirname(p), nome);
        await fsp.rename(p, nuovo);
        await spostaProp(path.dirname(p), path.basename(p), path.dirname(nuovo), nome);
        p = nuovo;
      }
    } else {
      p = path.join(assoluto(padre), String(nome));
      assoluto(relativo(p));
    }
    // scrittura sicura: prima un file temporaneo, poi lo si rinomina (niente file a metà se qualcosa va storto)
    const tmp = path.join(path.dirname(p), `.~${path.basename(p)}.${process.pid}.tmp`);
    await fsp.writeFile(tmp, dati);
    await fsp.rename(tmp, p);
    let prop;
    if (props) {
      const tutte = await leggiProp(path.dirname(p));
      prop = tutte[path.basename(p)] = { ...(tutte[path.basename(p)] || {}), ...props };
      await scriviProp(path.dirname(p), tutte);
    } else {
      prop = (await leggiProp(path.dirname(p)))[path.basename(p)];
    }
    return voce(p, prop);
  },
  async aggiorna({ id, nome, props, aggiungi, togli }) {
    let p = assoluto(id);
    const dir = path.dirname(p), n = path.basename(p);
    let nuovoDir = dir, nuovoNome = n;
    if (aggiungi && togli) nuovoDir = assoluto(aggiungi);
    if (nome) nuovoNome = String(nome);
    if (nuovoDir !== dir || nuovoNome !== n) {
      const nuovo = path.join(nuovoDir, nuovoNome);
      await fsp.rename(p, nuovo);
      await spostaProp(dir, n, nuovoDir, nuovoNome);
      p = nuovo;
    }
    let prop;
    const tutte = await leggiProp(path.dirname(p));
    if (props) {
      prop = tutte[path.basename(p)] = { ...(tutte[path.basename(p)] || {}), ...props };
      await scriviProp(path.dirname(p), tutte);
    } else prop = tutte[path.basename(p)];
    return voce(p, prop);
  },
  // "cestina": il file va nel cestino di Google Drive (Drive per desktop lo sposta lì quando viene cancellato)
  async cestina({ id }) {
    const p = assoluto(id);
    if (p === path.resolve(radice())) throw new Error('Non si può eliminare la cartella principale');
    await fsp.rm(p, { recursive: true, force: true });
    const tutte = await leggiProp(path.dirname(p));
    if (tutte[path.basename(p)]) { delete tutte[path.basename(p)]; await scriviProp(path.dirname(p), tutte); }
    return null;
  },
};
async function spostaProp(daDir, daNome, aDir, aNome) {
  const da = await leggiProp(daDir);
  if (!da[daNome]) return;
  const valore = da[daNome];
  delete da[daNome];
  await scriviProp(daDir, da);
  const a = daDir === aDir ? da : await leggiProp(aDir);
  a[aNome] = valore;
  await scriviProp(aDir, a);
}

// Apre una cartella in Esplora file (Windows) o nel Finder (Mac), oppure un indirizzo nel browser
function apri(cosa) {
  const comando = process.platform === 'win32' ? ['explorer', [cosa]] : process.platform === 'darwin' ? ['open', [cosa]] : ['xdg-open', [cosa]];
  try { const c = spawn(comando[0], comando[1], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {}
}
function apriBrowser(url) {
  if (process.platform === 'win32') {
    try { const c = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); } catch {}
  } else apri(url);
}

// ---------------------------------------------------------------------------
// File dell'app: dalla versione pubblicata (aggiornamenti automatici), con copia locale di riserva
// ---------------------------------------------------------------------------
const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.mjs.map': 'application/json',
};
const tipoDi = (p) => TIPI[path.extname(p).toLowerCase()] || 'application/octet-stream';
const presi = new Map(); // file già scaricati in questa sessione: si usano dalla memoria

async function fileApp(rel) {
  if (presi.has(rel)) return presi.get(rel);
  const inCache = path.join(CACHE, rel);
  // 1. versione pubblicata
  if (!process.env.SOLO_LOCALE) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(REMOTO + rel.split('/').map(encodeURIComponent).join('/'), { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer());
        presi.set(rel, b);
        fsp.mkdir(path.dirname(inCache), { recursive: true }).then(() => fsp.writeFile(inCache, b)).catch(() => {});
        return b;
      }
      if (r.status === 404) return null;
    } catch {}
  }
  // 2. ultima copia scaricata · 3. questa cartella
  for (const p of [inCache, path.join(QUI, rel)]) {
    try { const b = await fsp.readFile(p); presi.set(rel, b); return b; } catch {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const json = (res, dati, stato = 200) => {
  res.writeHead(stato, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dati));
};
const corpo = (req) => new Promise((ok, ko) => {
  const parti = [];
  req.on('data', (c) => parti.push(c));
  req.on('end', () => ok(Buffer.concat(parti)));
  req.on('error', ko);
});
const corpoJson = async (req) => { const b = await corpo(req); return b.length ? JSON.parse(b.toString('utf8')) : {}; };

async function gestisci(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(u.pathname);
  const q = Object.fromEntries(u.searchParams);
  try {
    // --- versione locale: stato e impostazioni
    if (p === '/locale/stato') {
      return json(res, { locale: true, radice: config.radice || '', linkDrive: config.linkDrive || '', sistema: process.platform, candidati: candidati(), versioneServer: 1 });
    }
    if (p === '/locale/radice' && req.method === 'POST') {
      const b = await corpoJson(req);
      const percorso = String(b.percorso || '').trim().replace(/^["']|["']$/g, '');
      if (percorso) {
        let st;
        try { st = await fsp.stat(percorso); } catch { return json(res, { error: `Cartella non trovata: ${percorso}` }, 400); }
        if (!st.isDirectory()) return json(res, { error: 'Il percorso indicato non è una cartella' }, 400);
        config.radice = path.resolve(percorso);
      }
      if (b.linkDrive !== undefined) config.linkDrive = String(b.linkDrive || '').trim();
      scriviConfig(config);
      return json(res, { radice: config.radice || '', linkDrive: config.linkDrive || '' });
    }
    if (p === '/locale/apri' && req.method === 'POST') {
      const b = await corpoJson(req);
      if (b.url && /^https:\/\//.test(b.url)) apriBrowser(b.url);
      else apri(assoluto(b.id || '.'));
      return json(res, null);
    }
    // --- file della cartella ALA
    if (p.startsWith('/locale/fs/')) {
      const op = p.slice('/locale/fs/'.length);
      if (op === 'leggi') {
        const b = await fsApi.leggi(q);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' });
        return res.end(b);
      }
      if (op === 'scrivi') {
        const meta = JSON.parse(decodeURIComponent(req.headers['x-meta'] || '%7B%7D'));
        return json(res, await fsApi.scrivi(meta, await corpo(req)));
      }
      if (op === 'elenca') return json(res, await fsApi.elenca({ id: q.id, soloCartelle: q.soloCartelle === '1', nome: q.nome }));
      if (op === 'info') return json(res, await fsApi.info(q));
      const b = await corpoJson(req);
      if (fsApi[op]) return json(res, await fsApi[op](b));
      return json(res, { error: 'Operazione sconosciuta' }, 404);
    }
    // --- file dell'app
    let rel = p.replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    if (rel.split('/').includes('..')) return json(res, { error: 'Percorso non valido' }, 400);
    const b = await fileApp(rel);
    if (!b) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Non trovato'); }
    res.writeHead(200, { 'Content-Type': tipoDi(rel), 'Cache-Control': 'no-cache' });
    res.end(b);
  } catch (err) {
    const stato = err.status || (err.code === 'ENOENT' ? 404 : 500);
    json(res, { error: err.code === 'ENOENT' ? 'File o cartella non trovati (forse spostati o eliminati)' : err.message }, stato);
  }
}

const server = http.createServer((req, res) => { gestisci(req, res); });
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // il gestionale è già acceso: basta aprire il browser
    console.log('Il Gestionale è già aperto: lo apro nel browser.');
    apriBrowser(`http://localhost:${PORTA}/`);
    setTimeout(() => process.exit(0), 1500);
  } else {
    console.error(err);
    process.exit(1);
  }
});
server.listen(PORTA, '127.0.0.1', () => {
  console.log(`Gestionale Studio acceso: http://localhost:${PORTA}/`);
  console.log(config.radice ? `Cartella dello studio: ${config.radice}` : 'Cartella dello studio non ancora impostata: si sceglie nel browser.');
  console.log('Per spegnerlo chiudi questa finestra.');
  if (!process.env.NON_APRIRE) apriBrowser(`http://localhost:${PORTA}/`);
});
