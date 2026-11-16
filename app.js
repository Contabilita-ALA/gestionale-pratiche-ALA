import { DOCUMENTI, TIPI_ALTRI } from './lib/template.js';
import { AGGIORNAMENTO, TIPI_LETTERA, PREZZO_PROPOSTO as PREZZO_APE } from './lib/informativa.js';
import { PREZZO_CATASTO, MOTIVAZIONI_CATASTO } from './lib/catasto.js';
import { ESCLUSIONI_BASE, PAGAMENTO_BASE, TITOLO_NOTA } from './lib/offerta.js';
import { creaPrompt, leggiRisposta } from './lib/prompt.js';
import * as Google from './web/gdrive.js';
import { leggiProformaPdf, leggiIncolla, leggiFatturaXml, xmlDaP7m, incassiDi, importo as importoDa } from './lib/importa.js';
import { statoAllegati, ALLEGATI_FVG } from './lib/allegati.js';
import { nomePratica, nomeCartella, moduloDi, versioneDi, etichettaModulo, riferimento } from './lib/nomi.js';
import {
  descrizione as descrizioneProforma, calcola as calcolaProforma, euro, scadenza as scadenzaProforma, dataIt as dataProforma,
  GIORNI_PAGAMENTO, SPESA_SISTER, IMPORTO_SISTER, protocollo, proformaDaPratica, oggiIso,
} from './lib/proforma.js';

// prezzo proposto per la prestazione: APE primo incarico, aggiornamento APE, pratica catastale
const PREZZO_PROPOSTO = { ...PREZZO_APE, catasto: PREZZO_CATASTO };

const STORAGE_KEY = 'gestionale-studio-v1';
const $ = (sel, root = document) => root.querySelector(sel);

// ---------------------------------------------------------------------------
// Moduli: ognuno ha il suo colore (menu, intestazioni, pulsanti principali) e la sua icona
// ---------------------------------------------------------------------------
const ICONE = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  ape: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  catasto: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  pratica: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  proforma: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>',
  opzioni: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  cerca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  indietro: '<path d="M15 5l-7 7 7 7"/>',
  ia: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  cartella: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  scarica: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  occhio: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  salva: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  copia: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  graffetta: '<path d="M20.5 11.5 12 20a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.7 1.7 0 0 1-2.4-2.4l8.3-8.3"/>',
  euro: '<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5"/><path d="M4 10.5h9M4 13.5h9"/>',
  orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  freccia: '<path d="M7 17 17 7M9 7h8v8"/>',
};
const icona = (nome, size = 18) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONE[nome] || ''}</svg>`;

const MODULI = {
  ape: { nome: 'APE', colore: '#F5D867', colore2: '#E9C337', forma: 'ape', icona: 'ape', descrizione: 'Informativa e lettera di incarico; nella versione FVG anche il documento di sopralluogo.' },
  catasto: { nome: 'Catasto', colore: '#A8D5A2', colore2: '#86BF7F', forma: 'catasto', icona: 'catasto', descrizione: 'Lettera di incarico per la variazione catastale, con protocollo e spese non imponibili.' },
  pratica: { nome: 'Pratiche', colore: '#B6CAEB', colore2: '#8FAEE0', forma: 'pratiche', icona: 'pratica', descrizione: 'Nota tecnica e offerta economica per le pratiche edilizie; la bozza anche con una chat gratuita.' },
  proforma: { nome: 'Proforma', colore: '#F5B8DB', colore2: '#EE95C5', forma: 'maialino', icona: 'proforma', descrizione: 'Registro unico con numerazione progressiva; i dati si prendono dalle pratiche.' },
  fatture: { nome: 'Fatture', colore: '#F5B8DB', colore2: '#EE95C5', forma: 'maialino', icona: 'euro', descrizione: 'Fatture emesse ed entrate: gli incassi dello studio.' },
};

// ---------------------------------------------------------------------------
// Stato
// ---------------------------------------------------------------------------
// codice univoco della pratica: permette di riconoscerla quando passa da un PC all'altro tramite .json
const nuovoUid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

// modulo: 'ape' (versione 'veneto' o 'fvg'), 'catasto', 'pratica'
const emptyState = (modulo = 'ape', versione = 'fvg') => ({
  _uid: nuovoUid(),
  app: 'gestionale',
  modulo,
  versione: modulo === 'ape' ? versione : '',
  // cartella di questa pratica, relativa alla cartella principale (uguale su tutti i PC): ci finiscono tutti i documenti
  cartella: '',
  visita: { numero: '', data: new Date().toISOString().slice(0, 10) },
  presenti: [{ ruolo: 'committente', nome: '' }],
  certificatore: { nome: 'ARCH. AGNESE LORENZON', timbro: true },
  documenti: DOCUMENTI.map(() => ({ stato: '', note: '' })),
  allegati: { foto: '', libretto: '', rcee: '' },
  committente: {},
  immobile: { pratica: [] },
  confini: { risc: [], nonRisc: [] },
  porte: [{}],
  infissi: [{ n: '1' }],
  codici: {},
  riscaldamento: [{ regolazione: [], terminali: [] }],
  raffrescamento: [],
  altri: [],
  foto: [],
  // immagini del rilievo, una per pagina del PDF: { src, nome }
  rilievo: [],
  // compenso: prestazioni e spese non imponibili. Il proforma si crea dal registro (numero progressivo unico).
  proforma: modulo === 'pratica'
    ? { righe: [{ testoLibero: true, testo: '', qt: '1', prezzo: '' }], spese: [] }
    : { righe: [{ tipo: 'res', qt: '1', prezzo: String(PREZZO_PROPOSTO[modulo === 'catasto' ? 'catasto' : 'primo']) }], spese: modulo === 'catasto' ? [{ testo: SPESA_SISTER, importo: String(IMPORTO_SISTER) }] : [] },
  // lettera di incarico APE (primo incarico o aggiornamento) e catasto: data della firma e note
  informativa: { pratica: modulo === 'catasto' ? 'catasto' : 'ape', tipo: 'primo', dataPrecedente: '', data: '', note: '' },
  // pratica catastale: protocollo della variazione (sigla + numero, es. VE0098153), data e motivazione
  catasto: { sigla: 'VE', numero: '', data: '', motivazione: [], motivazioneAltro: '' },
  // modulo Pratiche: nota tecnica (testo, figure) e offerta economica
  nota: { includi: true, titolo: TITOLO_NOTA, appunti: '', fonti: [], testo: '', figure: [], data: '' },
  offerta: { titolo: '', oggetto: '', esclusioni: ESCLUSIONI_BASE, pagamento: PAGAMENTO_BASE, speseCommittente: [], data: '', luogo: '' },
  // file caricati per gli allegati FVG: libretto, RCEE e, se servono, le versioni firmate di sopralluogo e informativa
  allegatiFvg: {},
  opzioni: { footer: false, soloCompilati: true },
  // pagine PDF caricate: { nome, data (base64), pagine }
  pagine: { visita: null, documenti: null, rilievo: null },
});

// Pratiche salvate (anche con le due app precedenti): si completano i campi mancanti e si riconosce il modulo
const withDefaults = (d) => {
  const modulo = moduloDi(d);
  const versione = versioneDi(d);
  const vuoto = emptyState(modulo, versione);
  const out = {
    ...vuoto, ...d, app: 'gestionale', modulo, versione,
    pagine: { ...vuoto.pagine, ...(d?.pagine || {}) },
    proforma: { ...vuoto.proforma, ...(d?.proforma || {}) },
    informativa: { ...vuoto.informativa, ...(d?.informativa || {}), pratica: modulo === 'catasto' ? 'catasto' : 'ape' },
    catasto: { ...vuoto.catasto, ...(d?.catasto || {}) },
    nota: { ...vuoto.nota, ...(d?.nota || {}) },
    offerta: { ...vuoto.offerta, ...(d?.offerta || {}) },
    allegatiFvg: { ...(d?.allegatiFvg || {}) },
  };
  if (!Array.isArray(out.proforma.spese)) out.proforma.spese = [];
  if (!Array.isArray(out.proforma.righe) || !out.proforma.righe.length) out.proforma.righe = vuoto.proforma.righe;
  return out;
};

const modulo = () => moduloDi(state);
const versione = () => versioneDi(state);
const fvg = () => modulo() === 'ape' && versione() === 'fvg';
const catasto = () => modulo() === 'catasto';
const coloreModulo = () => MODULI[modulo()].colore;
let state = load() || emptyState();

// Copia di lavoro nel browser (protegge da chiusure e ricaricamenti accidentali). Sta in IndexedDB perché con
// gli allegati supera presto i ~5 MB di localStorage: lì il salvataggio falliva in silenzio e la copia restava
// vecchia (dati sì, ma solo una parte degli allegati). localStorage resta solo come lettura delle vecchie copie.
const bozzaDb = () => new Promise((ok, ko) => {
  const req = indexedDB.open('gestionale-studio', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('bozza');
  req.onsuccess = () => ok(req.result);
  req.onerror = () => ko(req.error);
});
async function scriviBozza(dati) {
  try {
    const db = await bozzaDb();
    await new Promise((ok, ko) => {
      const tx = db.transaction('bozza', 'readwrite');
      tx.objectStore('bozza').put(JSON.parse(JSON.stringify(dati)), 'corrente');
      tx.oncomplete = ok;
      tx.onerror = () => ko(tx.error);
    });
    db.close();
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Copia di lavoro non salvata nel browser:', err);
  }
}
async function leggiBozza() {
  try {
    const db = await bozzaDb();
    const dati = await new Promise((ok, ko) => {
      const req = db.transaction('bozza').objectStore('bozza').get('corrente');
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(req.error);
    });
    db.close();
    return dati ? withDefaults(dati) : null;
  } catch {
    return null;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? withDefaults(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

// Pratica dell'archivio su cui si sta lavorando e presenza di modifiche non ancora archiviate
const META_KEY = 'gestionale-studio-pratica';
let pratica = loadMeta();

function loadMeta() {
  try {
    return { id: null, dirty: false, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') };
  } catch {
    return { id: null, dirty: false };
  }
}

function setPratica(changes) {
  pratica = { ...pratica, ...changes };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(pratica));
  } catch {}
  updateStatus();
}

const ora = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
let lastDbSave = '';
function updateStatus() {
  const el = $('#saveState');
  const nome = pratica.id ? `Pratica n. ${pratica.id}` : 'Nuova pratica';
  if (!pratica.id) el.textContent = `${nome} · non ancora in archivio`;
  else if (pratica.dirty) el.textContent = `${nome} · modifiche non salvate`;
  else el.textContent = `${nome} · salvata${lastDbSave ? ` alle ${lastDbSave}` : ''}`;
  el.classList.toggle('dirty', !pratica.id || pratica.dirty);
  // il nome nella barra segue il committente mentre lo si scrive
  if (vista === 'pratica') $('#barNome').textContent = [state.committente?.nome || 'Nuova pratica', modulo() === 'pratica' ? state.offerta?.titolo : ''].filter(Boolean).join(' · ');
}

// Salvataggio automatico nel browser (protegge da chiusure accidentali);
// l'archivio vero e proprio si aggiorna con "Salva bozza" e "Scarica PDF".
let saveTimer;
function save() {
  aggiornaRiepilogoProforma();
  aggiornaSpunte();
  if (!pratica.dirty) setPratica({ dirty: true });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => scriviBozza(state), 300);
}

const getIn = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setIn(obj, path, value) {
  let o = obj;
  path.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = typeof path[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  o[path[path.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Definizione dei campi
// ---------------------------------------------------------------------------
const ALTRO = 'altro';
const fields = {
  committente: [
    { k: 'nome', l: 'Nome e cognome o ragione sociale', s: 8 },
    { k: 'cf', l: 'Codice fiscale', s: 4, upper: true, check: 'cf' },
    { k: 'piva', l: 'Partita IVA', s: 6 },
    { k: 'sdi', l: 'Codice SDI', s: 6, upper: true },
    { k: 'via', l: 'Via/piazza', s: 9, indirizzo: true },
    { k: 'civ', l: 'Civico', s: 3, indirizzo: true },
    { k: 'citta', l: 'Città/provincia', s: 9, ph: 'es. Torre di Mosto (VE)', indirizzo: true },
    { k: 'cap', l: 'CAP', s: 3, indirizzo: true },
    { k: 'email', l: 'E-mail', t: 'email', s: 6 },
    { k: 'cell', l: 'Cellulare', t: 'tel', s: 6 },
  ],
  immobile: [
    { k: 'via', l: 'Via/piazza', s: 9, indirizzo: true },
    { k: 'civ', l: 'Civico', s: 3, indirizzo: true },
    { k: 'citta', l: 'Città/provincia', s: 9, ph: 'es. Torre di Mosto (VE)', indirizzo: true },
    { k: 'cap', l: 'CAP', s: 3, indirizzo: true },
    { k: 'anno', l: 'Anno di costruzione', s: 6, t: 'number' },
    { k: 'annoRistr', l: 'Anno ultima ristrutturazione impianto', s: 6, t: 'number' },
    { k: 'fg', l: 'Foglio', s: 4 },
    { k: 'mapp', l: 'Mappale', s: 4 },
    { k: 'sub', l: 'Subalterno', s: 4 },
    {
      k: 'pratica', l: 'Tipo di pratica', t: 'multi', s: 12, altro: 'praticaAltro',
      o: [['nuova', 'Nuova costruzione'], ['ristr1', 'Ristrutturazione I livello'], ['ristr2', 'Ristrutturazione II livello'], ['riqualificazione', 'Riqualificazione energetica'], ['passaggio', 'Passaggio di proprietà'], ['locazione', 'Locazione'], [ALTRO, 'Altro']],
    },
  ],
  confini: [
    {
      k: 'risc', l: 'Ambiente di confine riscaldato', t: 'multi', s: 12, altro: 'riscAltro',
      o: [['diverso', 'Altro appartamento, impianto diverso'], ['stesso', 'Altro appartamento, stesso impianto'], ['ufficio', 'Ufficio'], ['ristorante', 'Ristorante'], ['albergo', 'Albergo'], [ALTRO, 'Altro']],
    },
    {
      k: 'nonRisc', l: 'Ambiente di confine non riscaldato', t: 'multi', s: 12, altro: 'nonRiscAltro',
      o: [['garage', 'Garage'], ['scala', 'Vano scala'], ['sottotetto', 'Sottotetto'], ['interrato', 'Piano interrato o seminterrato'], ['controterra', 'Pavimento o parete controterra'], ['circolazione', 'Aree interne di circolazione'], [ALTRO, 'Altro']],
    },
  ],
  porta: [
    { k: 'n', l: 'N.', s: 2, auto: true }, // posizione nell'elenco, come per gli infissi
    { k: 'tipo', l: 'Tipologia porta', t: 'single', s: 10, altro: 'tipoAltro', o: [['legno', 'Legno'], ['blindato', 'Blindato'], [ALTRO, 'Altro']] },
    { k: 'larghezza', l: 'Larghezza', u: 'cm', t: 'number', s: 4, riga: true },
    { k: 'altezza', l: 'Altezza', u: 'cm', t: 'number', s: 4, riga: true },
    { k: 'profondita', l: 'Profondità', u: 'cm', t: 'number', s: 4, riga: true },
  ],
  infisso: [
    { k: 'n', l: 'N.', s: 2, auto: true }, // posizione nell'elenco, rinumerata a ogni modifica
    { k: 'zona', l: 'Zona', s: 4, ph: 'es. Soggiorno' },
    { k: 'tipologia', l: 'Tipologia infisso', t: 'single', s: 6, o: [['finestra', 'Finestra'], ['portafinestra', 'Porta finestra']] },
    { k: 'larghezza', l: 'Larghezza', u: 'cm', t: 'number', s: 3, half: true, riga: true },
    { k: 'altezza', l: 'Altezza', u: 'cm', t: 'number', s: 3, half: true, riga: true },
    { k: 'spessore', l: 'Spessore telaio', u: 'cm', t: 'number', s: 3, half: true, riga: true },
    { k: 'hTerra', l: 'H da terra', u: 'cm', t: 'number', s: 3, half: true, riga: true },
    { k: 'telaio', l: 'Tipologia telaio (anche più di una, es. doppio infisso)', t: 'multi', s: 12, altro: 'telaioAltro', o: [['legno', 'Legno'], ['pvc', 'PVC'], ['all_anod', 'Alluminio anodizzato'], ['all_tt', 'Alluminio taglio termico'], [ALTRO, 'Altro']] },
    { k: 'infisso', l: 'Tipologia infisso', t: 'single', s: 6, altro: 'infissoAltro', o: [['singolo', 'Singolo'], ['doppio', 'Doppio'], ['triplo', 'Triplo'], [ALTRO, 'Altro']] },
    { k: 'vetro', l: 'Tipologia vetro', t: 'single', s: 6, altro: 'vetroAltro', o: [['singolo', 'Singolo'], ['doppio', 'Doppio'], ['triplo', 'Triplo'], [ALTRO, 'Altro']] },
    { k: 'oscuranti', l: 'Oscuranti esterni', t: 'single', s: 6, altro: 'oscurantiAltro', o: [['tapparelle', 'Tapparelle'], ['scuroni', 'Scuroni/persiane'], [ALTRO, 'Altro']] },
    { k: 'cassonetto', l: 'Cassonetto', t: 'single', s: 4, o: [['isolato', 'Isolato'], ['non_isolato', 'Non isolato']] },
    { k: 'cassonettoH', l: 'Altezza cassonetto', u: 'cm', t: 'number', s: 2 },
  ],
  codici: [
    { k: 'targa', l: 'Codice targa impianto', s: 4, upper: true },
    { k: 'pod', l: 'POD (energia elettrica)', s: 4, upper: true },
    { k: 'pdr', l: 'PDR (gas)', s: 4 },
  ],
  riscaldamento: [
    { k: 'anno', l: 'Anno installazione', t: 'number', s: 3 },
    { k: 'catasto', l: 'Codice catasto', s: 3, upper: true },
    { k: 'impianto', l: 'Impianto', t: 'single', s: 6, o: [['autonomo', 'Autonomo'], ['centralizzato', 'Centralizzato']] },
    { k: 'generatore', l: 'Tipologia generatore', t: 'single', s: 7, o: [['standard', 'Caldaia standard'], ['condensazione', 'Caldaia a condensazione'], ['ibrido', 'Ibrido'], ['biomassa', 'Biomassa']] },
    { k: 'ubicazione', l: 'Ubicazione', t: 'single', s: 5, o: [['interno', 'Interno'], ['esterno', 'Esterno'], ['centrale', 'Centrale termica']] },
    { k: 'marca', l: 'Marca', s: 6 },
    { k: 'modello', l: 'Modello', s: 6 },
    { k: 'potNom', l: 'Potenza nominale', u: 'kW', t: 'number', s: 3, half: true },
    { k: 'potInt', l: 'Potenza carico intermedio/minimo', u: 'kW', t: 'number', s: 3, half: true },
    { k: 'rend100', l: 'Rendimento al 100%', u: '%', t: 'number', s: 3, half: true },
    { k: 'rendInt', l: 'Rendimento carico interm./min.', u: '%', t: 'number', s: 3, half: true },
    { k: 'regolazione', l: 'Regolazione', t: 'multi', s: 7, altro: 'regolazioneAltro', o: [['caldaia', 'Solo in caldaia'], ['sonda', 'Sonda climatica esterna'], ['zona', 'Termostato di zona'], ['ambiente', 'Termostato per ambiente'], ['valvole', 'Valvole termostatiche'], [ALTRO, 'Altro']] },
    { k: 'terminali', l: 'Terminali', t: 'multi', s: 5, altro: 'terminaliAltro', o: [['termoconvettori', 'Termoconvettori'], ['radiatori', 'Radiatori'], ['pavimento', 'Radiante a pavimento'], ['fancoil', 'Fancoil'], [ALTRO, 'Altro']] },
    { k: 'distribuzione', l: 'Tipo distribuzione', t: 'single', s: 6, altro: 'distribuzioneAltro', o: [['monotubo', 'Monotubo'], ['collettore', 'A collettore'], [ALTRO, 'Altro']] },
    { k: 'acs', l: 'Impianto ACS', t: 'single', s: 6, o: [['combinato', 'Combinato'], ['non_combinato', 'Non combinato']] },
  ],
  raffrescamento: [
    { k: 'anno', l: 'Anno installazione', t: 'number', s: 3 },
    { k: 'catasto', l: 'Codice catasto', s: 3, upper: true },
    { k: 'ubicazione', l: 'Ubicazione', t: 'single', s: 6, o: [['interno', 'Interno'], ['esterno', 'Esterno'], ['centrale', 'Centrale termica']] },
    { k: 'marca', l: 'Marca', s: 6 },
    { k: 'modello', l: 'Modello', s: 6 },
    { k: 'nEsterne', l: 'N. macchine esterne', t: 'number', s: 3, half: true },
    { k: 'nSplit', l: 'N. split interni', t: 'number', s: 3, half: true },
    { k: 'potRaff', l: 'Potenza utile raffrescamento', u: 'kW', t: 'number', s: 3, half: true },
    { k: 'potRisc', l: 'Potenza utile riscaldamento', u: 'kW', t: 'number', s: 3, half: true },
    { k: 'eer', l: 'EER (o GUE)', t: 'number', s: 3, half: true },
    { k: 'cop', l: 'COP', t: 'number', s: 3, half: true },
  ],
  rigaProforma: [
    { k: 'tipo', l: 'Unità', t: 'single', s: 12, o: [['res', 'Residenziale'], ['non', 'Non residenziale']] },
    { k: 'sub', l: 'Sub.', s: 3 },
    { k: 'qt', l: 'Quantità', s: 3, t: 'number' },
    { k: 'prezzo', l: 'Prezzo unitario', s: 3, t: 'number', u: '€' },
  ],
  altro: [
    { k: 'tipo', l: 'Tipologia apparecchio', t: 'single', s: 12, altro: 'tipoAltro', o: Object.entries(TIPI_ALTRI).map(([k, l]) => [k, l.charAt(0) + l.slice(1).toLowerCase()]) },
    { k: 'marca', l: 'Marca', s: 4 },
    { k: 'modello', l: 'Modello', s: 4 },
    { k: 'anno', l: 'Anno installazione', t: 'number', s: 4 },
    { k: 'potenza', l: 'Potenza', u: 'kW', t: 'number', s: 3, half: true },
    { k: 'quantita', l: 'Quantità', t: 'number', s: 3, half: true },
    { k: 'alimentazione', l: 'Alimentazione', s: 6, ph: 'es. pellet, legna, metano, elettrica' },
    { k: 'ubicazione', l: 'Ubicazione', t: 'single', s: 12, o: [['interno', 'Interno'], ['esterno', 'Esterno']] },
    { k: 'note', l: 'Note', s: 12 },
  ],
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) {
    if (val == null || val === false) continue;
    if (k === 'class') el.className = val;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), val);
    else if (k === 'html') el.innerHTML = val;
    else el.setAttribute(k, val === true ? '' : val);
  }
  // gli elenchi possono essere annidati (es. righe create con map dentro un box)
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};

let uid = 0;
function field(def, path) {
  const id = `f${++uid}`;
  const p = [...path, def.k];
  // riga: campi che restano affiancati anche su schermi stretti (dimensioni di porte e infissi)
  const cls = `f s${def.s || 6}${def.half ? ' half' : ''}${def.riga ? ' riga' : ''}`;
  let value = getIn(state, p);

  if (def.t === 'single' || def.t === 'multi') {
    const multi = def.t === 'multi';
    // pratiche salvate quando il campo era a scelta singola
    if (multi && typeof value === 'string') { value = value ? [value] : []; setIn(state, p, value); }
    const altroInput = def.altro
      ? h('input', {
          type: 'text', class: 'altro', placeholder: 'Specificare…', value: getIn(state, [...path, def.altro]) || '',
          oninput: (e) => { setIn(state, [...path, def.altro], e.target.value); save(); },
        })
      : null;
    const showAltro = () => {
      if (!altroInput) return;
      const cur = getIn(state, p);
      altroInput.hidden = !(multi ? (cur || []).includes(ALTRO) : cur === ALTRO);
    };
    const chips = h('div', { class: `chips${multi ? '' : ' single'}`, role: 'group', 'aria-label': def.l },
      def.o.map(([val, label]) =>
        h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(multi ? (value || []).includes(val) : value === val),
          onclick: (e) => {
            const cur = getIn(state, p);
            let next;
            if (multi) {
              const arr = Array.isArray(cur) ? [...cur] : [];
              next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
            } else {
              next = cur === val ? '' : val; // un secondo clic deseleziona
            }
            setIn(state, p, next);
            e.currentTarget.parentElement.querySelectorAll('.chip').forEach((btn, i) => {
              const v = def.o[i][0];
              btn.setAttribute('aria-pressed', String(multi ? next.includes(v) : next === v));
            });
            showAltro();
            save();
          },
        }, label)));
    showAltro();
    return h('div', { class: cls }, h('label', {}, def.l), chips, altroInput);
  }

  if (def.auto) {
    return h('div', { class: cls }, h('label', { for: id }, def.l),
      h('input', { type: 'text', id, class: 'fisso', readonly: true, tabindex: -1, value: value ?? '' }));
  }

  const input = h(def.t === 'textarea' ? 'textarea' : 'input', {
    id,
    type: def.t === 'textarea' ? null : def.t === 'number' ? 'text' : def.t || 'text',
    inputmode: def.t === 'number' ? 'decimal' : null,
    placeholder: def.ph || null,
    autocomplete: 'off',
    value: value ?? '',
    'data-p': p.join('.'),
    list: def.indirizzo && def.k === 'citta' ? 'lista-comuni' : def.indirizzo && def.k === 'cap' ? `cap-${path.join('.')}` : null,
    onfocus: def.indirizzo && def.k === 'citta' ? caricaComuni : null,
    // via, civico o comune cambiati: si cerca il CAP (non se è stato scritto a mano)
    onchange: def.indirizzo && def.k !== 'cap' ? () => aggiornaCap(path) : null,
    oninput: (e) => {
      if (def.indirizzo && def.k === 'cap') capAutomatico.delete(path.join('.'));
      let val = e.target.value;
      if (def.upper) {
        const pos = e.target.selectionStart;
        val = val.toUpperCase();
        e.target.value = val;
        e.target.setSelectionRange(pos, pos);
      }
      setIn(state, p, val);
      if (hint) updateHint();
      save();
    },
  });
  let hint = null;
  const updateHint = () => {
    if (def.check !== 'cf') return;
    const val = (getIn(state, p) || '').trim();
    const msg = val && !/^\d{11}$/.test(val) ? checkCodiceFiscale(val) : '';
    hint.textContent = msg;
    hint.className = `hint${msg ? ' warn' : ''}`;
  };
  if (def.check) {
    hint = h('span', { class: 'hint' });
    updateHint();
  }
  const control = def.u ? h('div', { class: 'unit' }, input, h('span', {}, def.u)) : input;
  const capPossibili = def.indirizzo && def.k === 'cap' ? h('datalist', { id: `cap-${path.join('.')}` }) : null;
  return h('div', { class: cls }, h('label', { for: id }, def.l), control, hint, capPossibili);
}

// ---------------------------------------------------------------------------
// Indirizzi: comuni suggeriti e CAP automatico
// ---------------------------------------------------------------------------
let comuniCaricati;
function caricaComuni() {
  comuniCaricati ||= fetch('api/comuni').then((r) => r.json()).then((lista) => {
    const dl = h('datalist', { id: 'lista-comuni' }, lista.map((c) => h('option', { value: c })));
    document.body.append(dl);
  }).catch(() => { comuniCaricati = null; });
}

// sezioni (committente, immobile) il cui CAP è stato compilato dall'app: si aggiorna se cambia l'indirizzo
const capAutomatico = new Set();
const inputDi = (p) => document.querySelector(`[data-p="${p}"]`);

async function aggiornaCap(path) {
  const chiave = path.join('.');
  const o = getIn(state, path);
  if (!o?.citta?.trim()) return;
  if (o.cap && !capAutomatico.has(chiave)) return;
  let r;
  try {
    r = await api(`api/cap?${new URLSearchParams({ citta: o.citta, via: o.via || '', civ: o.civ || '' })}`);
  } catch {
    return;
  }
  const scrivi = (k, val) => {
    o[k] = val;
    const el = inputDi(`${chiave}.${k}`);
    if (el && el.value !== val) el.value = val;
  };
  // comune riconosciuto: si scrive nel formato "Nome (SIGLA)" se manca la provincia
  if (r.comune && !/\([A-Za-z]{2}\)\s*$/.test(o.citta)) scrivi('citta', r.comune);
  const lista = document.getElementById(`cap-${chiave}`);
  if (lista) lista.replaceChildren(...(r.possibili || []).map((c) => h('option', { value: c })));
  if (r.cap) {
    scrivi('cap', r.cap);
    capAutomatico.add(chiave);
  } else if (r.possibili?.length > 1) {
    if (capAutomatico.has(chiave)) scrivi('cap', '');
    const comune = (r.comune || o.citta).replace(/\s*\(.*$/, '');
    toast(r.errore
      ? `${comune} ha più CAP e ${r.errore.charAt(0).toLowerCase()}${r.errore.slice(1)}: scegli il CAP dall'elenco del campo`
      : o.via ? `CAP non trovato per ${o.via}: ${comune} ha più CAP, sceglilo dall'elenco del campo` : `${comune} ha più CAP: indica la via oppure scegli il CAP dall'elenco`, true);
  }
  save();
}

// Immobile: stesso indirizzo del committente
async function copiaIndirizzoCommittente() {
  const c = state.committente || {};
  const m = state.immobile;
  const campi = ['via', 'civ', 'citta', 'cap'];
  if (!campi.some((k) => c[k])) return toast("L'indirizzo del committente è vuoto", true);
  if (campi.some((k) => m[k] && m[k] !== c[k])) {
    const ok = await chiediConferma({ titolo: "Copiare l'indirizzo del committente?", messaggio: "L'indirizzo dell'immobile già inserito verrà sostituito.", ok: 'Sostituisci' });
    if (!ok) return;
  }
  for (const k of campi) m[k] = c[k] || '';
  if (capAutomatico.has('committente')) capAutomatico.add('immobile');
  else capAutomatico.delete('immobile');
  rerender();
  toast("Indirizzo del committente copiato nell'immobile");
}

const grid = (defs, path) => h('div', { class: 'grid' }, defs.map((d) => field(d, path)));

// testo scuro sui colori chiari (giallo, verde acqua), bianco sugli altri
function testoSu(colore) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colore || '');
  if (!m) return '#fff';
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1d2327' : '#fff';
}

// Ogni sezione ha il colore della sua scheda nel PDF: bordo, intestazione e voce del menu
function section(id, title, _colore, desc, ...content) {
  return h('section', { class: `section${id === sezioneAttiva ? ' active' : ''}`, id },
    h('header', {}, h('div', {}, h('h2', {}, title), desc ? h('p', {}, desc) : null)),
    h('div', { class: 'body' }, content),
    navigazioneSezione(id));
}

// ---------------------------------------------------------------------------
// Schede: si vede una sezione alla volta, scelta dal menu o con "Precedente" / "Successiva"
// ---------------------------------------------------------------------------
const idSezioni = () => SECTIONS.map(([id]) => id);
let sezioneAttiva = 'committente';
// vista aperta (Home, elenco di un modulo, pratica, proforma, opzioni): vedi più sotto


// (i pulsanti "← precedente / successiva →" in fondo alle sezioni sono stati tolti: si usa il menu a sinistra)
function navigazioneSezione() {
  return null;
}
function _navigazioneSezioneVecchia(id) {
  const ids = idSezioni();
  const i = ids.indexOf(id);
  if (i < 0) return null;
  const etichetta = (j) => SECTIONS[j][1];
  return h('footer', { class: 'sec-nav' },
    i > 0 ? h('button', { type: 'button', class: 'btn', onclick: () => mostraSezione(ids[i - 1]) }, `← ${etichetta(i - 1)}`) : h('span'),
    i < ids.length - 1 ? h('button', { type: 'button', class: 'btn primary', onclick: () => mostraSezione(ids[i + 1]) }, `${etichetta(i + 1)} →`) : h('span'));
}

function mostraSezione(id, { scorri = true } = {}) {
  if (!idSezioni().includes(id)) id = idSezioni()[0];
  sezioneAttiva = id;
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('.sidenav a').forEach((a) => a.classList.toggle('active', a.dataset.id === id));
  if (vista === 'pratica' && location.hash !== `#p/${id}`) history.replaceState(null, '', `#p/${id}`);
  try {
    localStorage.setItem('gestionale-sezione', id);
  } catch {}
  // su schermi stretti il menu è una fila orizzontale: si porta in vista la voce della scheda aperta
  const voce = document.querySelector('.sidenav a.active');
  if (voce && matchMedia('(max-width: 900px)').matches) voce.parentElement.scrollLeft = voce.offsetLeft - 16;
  if (scorri) window.scrollTo({ top: 0, behavior: 'instant' });
}


// Lista di elementi ripetibili (porte, infissi, impianti, …)
function repeater({ key, label, defs, accent, newItem = () => ({}), numbered, pdf = false, vuoto = 'Nessun elemento: nel PDF comparirà una scheda vuota.' }) {
  const list = state[key] || (state[key] = []);
  // numerazione automatica: sempre 1, 2, 3… nell'ordine dell'elenco, anche dopo spostamenti e duplicazioni
  if (numbered) list.forEach((item, i) => { item[numbered] = String(i + 1); });
  const items = list.map((item, i) =>
    h('div', { class: 'item item-bar', style: `--accent:${accent};--accent-ink:${testoSu(accent)}`, 'data-label': `${label} ${i + 1}` },
      h('div', { class: 'item-head' },
        h('strong', {}, `${label} ${i + 1}`),
        h('div', { class: 'tools' },
          i > 0 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta su', onclick: () => move(key, i, -1) }, '↑') : null,
          i < list.length - 1 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta giù', onclick: () => move(key, i, 1) }, '↓') : null,
          h('button', {
            type: 'button', class: 'btn small ghost', title: 'Crea una copia',
            onclick: () => {
              const copy = structuredClone(item);
              delete copy._pdf; // il PDF caricato resta solo sull'originale
              list.splice(i + 1, 0, copy);
              rerender();
            },
          }, 'Duplica'),
          h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { list.splice(i, 1); rerender(); } }, 'Elimina'))),
      pdf ? pdfImpianto(key, i, defs) : null,
      grid(defs, [key, i])));
  return h('div', { class: 'items' },
    items.length ? items : h('p', { class: 'empty' }, vuoto),
    h('div', { class: 'add-row' },
      h('button', {
        type: 'button', class: 'btn',
        onclick: () => {
          const item = newItem();
          list.push(item);
          rerender(`${key}-${list.length - 1}`);
        },
      }, `+ Aggiungi ${label.toLowerCase()}`)));
}

function move(key, i, delta) {
  const list = state[key];
  const [it] = list.splice(i, 1);
  list.splice(i + delta, 0, it);
  rerender();
}

function seg(options, value, onChange) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  options.forEach(([val, label]) => {
    wrap.append(h('button', {
      type: 'button', 'aria-pressed': String(value === val),
      onclick: () => {
        const next = value === val ? '' : val;
        value = next;
        wrap.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === next)));
        onChange(next);
      },
    }, label));
  });
  return wrap;
}

// Visita: tre box — dati della visita, persone presenti, certificatore; in fondo, facoltativa, la pagina già firmata
function sezioneVisita() {
  const presenti = (state.presenti ||= []);
  const committente = String(state.committente?.nome || '').trim();
  return section('visita', 'Visita', '#75E0CC', 'Prima pagina del documento di sopralluogo.',
    boxPdf('Visita', '#75E0CC',
      grid([
        { k: 'numero', l: 'N. visita', s: 3 },
        { k: 'data', l: 'Data visita', t: 'date', s: 4 },
      ], ['visita'])),
    boxPdf('Presenti', '#75E0CC',
      h('p', { class: 'box-sub-desc' }, 'Persone presenti durante il sopralluogo (il nome compare sopra la riga per la firma). Con "Committente" il nome è preso dalla scheda Committente.'),
      h('div', { class: 'presenti' },
        presenti.map((x, i) => {
          const ruolo = x.ruolo === 'committente' ? 'committente' : 'altro';
          return h('div', { class: 'presente' },
            h('span', { class: 'n' }, `${i + 1}.`),
            seg([['committente', 'Committente'], ['altro', 'Altro']], ruolo, (val) => { x.ruolo = val || 'altro'; rerender(); }),
            ruolo === 'committente'
              ? h('input', { type: 'text', class: 'fisso', readonly: true, tabindex: -1, value: committente, placeholder: 'Compila il nome nella scheda Committente', 'aria-label': `Persona ${i + 1}: committente` })
              : h('input', { type: 'text', placeholder: 'Nome e cognome', value: x.nome || '', 'aria-label': `Persona ${i + 1}`, oninput: (e) => { x.nome = e.target.value; save(); } }),
            h('button', { type: 'button', class: 'btn small ghost danger', title: 'Rimuovi', 'aria-label': `Rimuovi persona ${i + 1}`, onclick: () => { presenti.splice(i, 1); rerender(); } }, '×'));
        })),
      h('div', { class: 'add-row' },
        h('button', { type: 'button', class: 'btn small', onclick: () => { presenti.push({ ruolo: 'altro', nome: '' }); rerender(); } }, '+ Aggiungi persona'))),
    boxPdf('Certificatore', '#75E0CC',
      h('div', { class: 'grid' },
        field({ k: 'nome', l: 'Nome certificatore', s: 8 }, ['certificatore']),
        h('div', { class: 'f s4', style: 'justify-content:flex-end' },
          h('label', { class: 'switch' },
            h('input', { type: 'checkbox', checked: state.certificatore?.timbro !== false, onchange: (e) => { state.certificatore.timbro = e.target.checked; save(); } }),
            'Inserisci timbro e firma')))),
    // firma in due passi: la pagina da stampare (nella cartella della APE) e poi la versione controfirmata
    boxPdf('Firma', '#75E0CC',
      h('div', { class: 'firma-passi' },
        h('div', { class: 'passo' },
          h('span', { class: 'n' }, '1'),
          h('div', { class: 'testo' }, h('strong', {}, 'Pagina da far firmare'),
            h('span', {}, state.cartella ? 'Si salva nella cartella della pratica, pronta da stampare.' : 'Senza cartella della pratica si scarica in Download.')),
          h('button', { type: 'button', class: 'btn', onclick: (e) => scaricaVisitaDaFirmare(e.currentTarget) }, 'Scarica da firmare')),
        h('div', { class: 'passo' },
          h('span', { class: 'n' }, '2'),
          paginaPdf('visita', 'Versione controfirmata',
            'Carica la pagina firmata e scansionata: nel PDF del sopralluogo sostituisce quella generata ed è necessaria per l\'allegato 3 del portale FVG.')))));
}

// ---------------------------------------------------------------------------
// File caricati nella pratica (planimetria, libretto, RCEE, versioni firmate): { nome, tipo, data (base64) }
// ---------------------------------------------------------------------------
const MAX_FILE_MB = 25;
async function leggiFile(file) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`${file.name}: il file supera i ${MAX_FILE_MB} MB`);
  return { nome: file.name, tipo: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : ''), data: (await readAsDataURL(file)).split(',')[1] };
}

function apriFile(f) {
  const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: f.tipo || 'application/pdf' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Planimetria catastale: sul bordo del foglio (testo vettoriale) ci sono foglio, particella e subalterno
function datiPlanimetria(testo) {
  const t = testo.replace(/\s+/g, ' ');
  const cerca = (re) => (t.match(re) || [])[1] || '';
  return {
    fg: cerca(/\bFoglio\s*[:.]?\s*(\d+[A-Z]?)\b/i),
    mapp: cerca(/\b(?:Particella|Mappale|Mapp\.)\s*[:.]?\s*(\d+[A-Z]?)\b/i),
    sub: cerca(/\b(?:Subalterno|Sub\.)\s*[:.]?\s*(\d+[A-Z]?)\b/i),
  };
}

async function caricaPlanimetria(file) {
  try {
    const f = await leggiFile(file);
    state.immobile.planimetria = f;
    let letti = {};
    if (/pdf/.test(f.tipo) || /\.pdf$/i.test(f.nome)) {
      const { testo, doc } = await testoPdf(file, 3);
      doc.destroy?.();
      letti = datiPlanimetria(testo);
    }
    const trovati = Object.entries(letti).filter(([, val]) => val);
    trovati.forEach(([k, val]) => { state.immobile[k] = val; });
    rerender();
    toast(trovati.length
      ? `Planimetria caricata · letti ${trovati.map(([k, val]) => `${{ fg: 'Fg.', mapp: 'Mapp.', sub: 'Sub.' }[k]} ${val}`).join(', ')}`
      : 'Planimetria caricata · dati catastali non trovati nel file: inseriscili a mano', !trovati.length);
  } catch (err) {
    toast(err.message || 'File non leggibile', true);
  }
}

function boxPlanimetria() {
  const p = state.immobile?.planimetria;
  const input = h('input', { type: 'file', accept: 'application/pdf,.pdf,image/*', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) caricaPlanimetria(f); } });
  const zone = h('div', { class: `dropzone${p ? ' loaded' : ''}` },
    h('div', { class: 'icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h8v9M11 7h10M15 7v5h6"/></svg>' }),
    h('div', { class: 'txt' },
      h('strong', {}, p ? p.nome : 'Planimetria catastale'),
      h('span', {}, p
        ? 'Foglio, mappale e subalterno letti dal bordo del foglio. Il file è anche l\'allegato "Scheda catastale" per il portale FVG.'
        : 'Carica il PDF della planimetria: foglio, mappale e subalterno vengono letti dal bordo del foglio e inseriti qui sotto.')),
    h('div', { class: 'add-row' },
      p ? h('button', { type: 'button', class: 'btn ghost', onclick: () => apriFile(p) }, 'Apri') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, p ? 'Sostituisci' : 'Carica planimetria'),
      p ? h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { delete state.immobile.planimetria; rerender(); } }, 'Rimuovi') : null),
    input);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) caricaPlanimetria(f);
  });
  return zone;
}

// Dati obbligatori del portale FVGEnergia (non sono allegati): presi dai codici della scheda Riscaldamento
const DATI_FVG = [['targa', 'Codice targa'], ['pod', 'POD'], ['pdr', 'PDR']];
function datoFvg([k, titolo], i) {
  const valore = () => String(state.codici?.[k] || '').trim();
  const stato = h('span', { class: 'pill' });
  const riga = h('div', { class: 'fvg-row dato' },
    h('span', { class: 'n' }, String(ALLEGATI_FVG.length + i + 1)),
    h('span', { class: 't' }, h('strong', {}, titolo), h('div', { class: 'valore' }, campoFisso(`fvg-${k}`, '', valore, { s: 12 }))),
    stato,
    h('span', { class: 'tools' },
      h('button', { type: 'button', class: 'btn small ghost', title: 'Si compila nella scheda Riscaldamento, nei codici', onclick: () => mostraSezione('impianti') }, 'Compila')));
  // stato (presente / mancante) aggiornato insieme al valore
  CALCOLATI.set(`fvg-stato-${k}`, () => {
    const ok = Boolean(valore());
    riga.classList.toggle('ok', ok);
    riga.classList.toggle('manca', !ok);
    stato.className = `pill ${ok ? 'ok' : 'no'}`;
    stato.textContent = ok ? 'Compilato' : 'Mancante';
    return '';
  });
  CALCOLATI.get(`fvg-stato-${k}`)();
  return riga;
}

function sezioneDocumenti() {
  const rows = DOCUMENTI.map((txt, i) => {
    const d = (state.documenti[i] ||= { stato: '', note: '' });
    // la nota si apre solo quando serve (pulsante a matita), così l'elenco resta compatto
    const nota = h('div', { class: 'note', hidden: !d.note },
      h('input', { type: 'text', placeholder: 'Note ed osservazioni', value: d.note || '', 'aria-label': `Note documento ${i + 1}`, oninput: (e) => { d.note = e.target.value; save(); } }));
    const matita = h('button', {
      type: 'button', class: `btn small ghost matita${d.note ? ' attiva' : ''}`, title: 'Note ed osservazioni', 'aria-label': `Note documento ${i + 1}`,
      html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
      onclick: () => { nota.hidden = !nota.hidden; if (!nota.hidden) nota.querySelector('input').focus(); },
    });
    return h('div', { class: 'doc-row' },
      h('span', { class: 'n' }, String(i + 1).padStart(2, '0')),
      h('span', { class: 't', html: txt }),
      h('span', { class: 'doc-scelta' }, matita, seg([['P', 'P'], ['NP', 'NP']], d.stato, (val) => { d.stato = val; save(); })),
      nota);
  });
  // Allegati per il portale FVGEnergia: controllo di cosa c'è e caricamento dei file (cartella o zip dalla barra in alto)
  const allegato = (st, i) => {
    let input;
    const carica = async (file) => {
      // documento di sopralluogo: si carica la pagina della Visita controfirmata (la stessa della scheda Visita)
      if (st.k === 'sopralluogo') return caricaPagina('visita', file);
      try {
        if (st.immagine && !(file.type.startsWith('image/') || isHeic(file))) throw new Error(`${st.titolo}: carica un'immagine (JPG, PNG o HEIC)`);
        if (isHeic(file)) toast("Conversione dell'immagine HEIC in corso…");
        // le foto HEIC dell'iPhone diventano JPEG, che il portale accetta
        const f = await leggiFile(st.immagine ? await comeImmagineLeggibile(file) : file);
        if (st.k === 'scheda') state.immobile.planimetria = f;
        else state.allegatiFvg[st.k] = f;
        rerender();
        toast(`${st.titolo}: ${f.nome} caricato`);
      } catch (err) {
        toast(err.message, true);
      }
    };
    const rimuovi = () => {
      if (st.k === 'sopralluogo') state.pagine.visita = null;
      else if (st.k === 'scheda') delete state.immobile.planimetria;
      else delete state.allegatiFvg[st.k];
      rerender();
    };
    const dettaglio = st.k === 'sopralluogo'
      ? (st.presente ? `Creato dall'app con la pagina della Visita controfirmata: ${st.visita.nome}` : 'Serve la pagina della Visita controfirmata (la carichi qui o nella scheda Visita)')
      : st.come === 'caricato' ? st.file.nome
        : st.k === 'informativa' ? "Carica l'informativa firmata dal cliente (la crei e la stampi con il pulsante Informativa in alto)"
          : st.k === 'scheda' ? 'La planimetria caricata nella scheda Immobile'
            : st.immagine ? "Un'immagine, di solito l'esterno dell'edificio" : 'PDF da caricare';
    const pill = !st.presente ? ['no', 'Mancante'] : st.k === 'sopralluogo' || st.firmata ? ['ok', 'Firmato'] : ['ok', 'Caricato'];
    const giaCaricato = st.come === 'caricato' || (st.k === 'sopralluogo' && st.presente);
    // stesso pulsante per tutte le righe: cosa caricare lo dice la spiegazione sotto il nome
    const etichettaCarica = giaCaricato ? 'Sostituisci' : 'Carica';
    return h('div', { class: `fvg-row${st.presente ? ' ok' : ' manca'}` },
      h('span', { class: 'n' }, String(i + 1)),
      h('span', { class: 't' }, h('strong', {}, st.titolo), h('small', { title: dettaglio }, dettaglio)),
      h('span', { class: `pill ${pill[0]}` }, pill[1]),
      h('span', { class: 'tools' },
        st.come === 'caricato' ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => apriFile(st.file) }, 'Apri') : null,
        st.k === 'sopralluogo' && st.presente ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => apriPagina(st.visita) }, 'Apri') : null,
        h('button', { type: 'button', class: 'btn small', onclick: () => input.click() }, etichettaCarica),
        giaCaricato ? h('button', { type: 'button', class: 'btn small ghost danger', onclick: rimuovi }, 'Rimuovi') : null,
        (input = h('input', { type: 'file', accept: st.immagine ? 'image/*,.heic,.heif' : st.k === 'sopralluogo' ? 'application/pdf,.pdf' : 'application/pdf,.pdf,image/*', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) carica(f); } }))));
  };
  // due colonne: a sinistra l'elenco dei documenti (P / NP), a destra gli allegati e i dati del portale FVGEnergia
  return section('documenti', 'Documenti e allegati', '#9aa3aa', null,
    h('div', { class: 'doc-colonne' },
    boxPdf('Documenti', null,
      h('div', { class: 'doc-testa' },
        h('span', { class: 'nota-campo' }, 'P: presente · NP: non presente'),
        h('div', { class: 'add-row' },
          h('button', { type: 'button', class: 'btn small', onclick: () => { state.documenti.forEach((d) => (d.stato = 'NP')); rerender(); } }, 'Imposta tutti NP'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => { state.documenti.forEach((d) => (d.stato = '')); rerender(); } }, 'Azzera'))),
      h('div', { class: 'doc-rows' }, rows)),
    boxPdf('Portale FVGEnergia', '#ED7D31',
      h('div', { class: 'fvg-gruppo' },
        h('div', { class: 'fvg-gruppo-head' }, h('strong', {}, 'Allegati'), h('span', {}, 'nella cartella "ALLEGATI FVG RIF. COGNOME" della APE, rinominati: "1. Scheda catastale rif. COGNOME.pdf"…')),
        h('div', { class: 'fvg-rows' }, statoAllegati(state).map(allegato))),
      h('div', { class: 'fvg-gruppo' },
        h('div', { class: 'fvg-gruppo-head' }, h('strong', {}, 'Dati da inserire nel portale'), h('span', {}, 'dai codici della scheda Riscaldamento; non sono file da allegare')),
        h('div', { class: 'fvg-rows' }, DATI_FVG.map(datoFvg))))));
}

function sezioneCommittente() {
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif,application/pdf,.pdf', multiple: true, hidden: true, onchange: (e) => { const files = [...e.target.files]; e.target.value = ''; if (files.length) leggiDocumento(files); } });
  const zone = h('div', { class: 'dropzone' },
    h('div', { class: 'icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.4 1.6-2 2.5-2s1.9.6 2.5 2M14 10h4M14 13h3"/></svg>' }),
    h('div', { class: 'txt' },
      h('strong', {}, "Compila dal documento d'identità"),
      h('span', {}, "Carica foto o PDF di carta d'identità, patente, passaporto o tessera sanitaria. Per la carta d'identità elettronica seleziona insieme fronte e retro: l'indirizzo è sul retro. La lettura avviene sul tuo computer.")),
    h('button', { type: 'button', class: 'btn', id: 'btnId', onclick: () => input.click() }, 'Carica documento'),
    input);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const files = [...e.dataTransfer.files];
    if (files.length) leggiDocumento(files);
  });
  return section('committente', 'Committente', '#00FFCC', null, zone, h('div', { id: 'idResult' }),
    boxPdf('Committente', '#00FFCC', grid(fields.committente, ['committente'])), boxCartella());
}

// Caricamento di una pagina PDF (rilievo, oppure visita/documenti compilati a parte)
const MAX_PDF_MB = 25;
function paginaPdf(chiave, titolo, descrizione) {
  const p = state.pagine?.[chiave];
  const input = h('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) caricaPagina(chiave, f); } });
  const icona = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
  const zone = h('div', { class: `dropzone${p ? ' loaded' : ''}` },
    h('div', { class: 'icon', html: icona }),
    p
      ? h('div', { class: 'txt' },
          h('strong', {}, p.nome),
          h('span', {}, p.pagine > 1 ? `${p.pagine} pagine: nel PDF finale verrà inserita solo la prima.` : 'Pagina singola, verrà inserita nel PDF finale.'))
      : h('div', { class: 'txt' }, h('strong', {}, titolo), h('span', {}, descrizione)),
    h('div', { class: 'add-row' },
      p ? h('button', { type: 'button', class: 'btn ghost', onclick: () => apriPagina(p) }, 'Apri') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, p ? 'Sostituisci' : 'Carica PDF'),
      p ? h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { state.pagine[chiave] = null; rerender(); } }, 'Rimuovi') : null),
    input);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) caricaPagina(chiave, f);
  });
  return zone;
}

async function caricaPagina(chiave, file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return toast('Carica un file PDF', true);
  if (file.size > MAX_PDF_MB * 1024 * 1024) return toast(`Il PDF supera i ${MAX_PDF_MB} MB`, true);
  try {
    const data = (await readAsDataURL(file)).split(',')[1];
    const res = await fetch('api/pdf-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
    const info = await res.json();
    if (!res.ok) throw new Error(info.error);
    state.pagine = { ...state.pagine, [chiave]: { nome: file.name, data, pagine: info.pagine } };
    rerender();
    toast(info.pagine > 1 ? `Il PDF ha ${info.pagine} pagine: verrà usata solo la prima` : 'PDF caricato', info.pagine > 1);
  } catch (err) {
    toast(err.message || 'PDF non valido', true);
  }
}

function apriPagina(p) {
  const bytes = Uint8Array.from(atob(p.data), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Box impianto: PDF (libretto, scheda tecnica, RCEE…) da cui compilare automaticamente i campi
function pdfImpianto(key, i, defs) {
  const item = state[key][i];
  const p = item._pdf;
  const input = h('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) leggiPdfImpianto(key, i, defs, f); } });
  const etichette = Object.fromEntries(defs.map((d) => [d.k, d.l]));
  const bar = h('div', { class: `pdf-imp${p ? ' loaded' : ''}` },
    h('div', { class: 'pdf-imp-txt' },
      p
        ? [h('strong', {}, p.nome), h('span', {}, p.campi?.length ? `Compilati: ${p.campi.map((k) => etichette[k] || k).join(', ')}` : 'Nessun dato riconosciuto nel PDF')]
        : [h('strong', {}, 'Compila da PDF'), h('span', {}, 'Carica il libretto di impianto, la scheda tecnica o il rapporto di controllo: i dati trovati vengono inseriti nei campi qui sotto.')]),
    h('div', { class: 'add-row' },
      p ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => apriPagina(p) }, 'Apri') : null,
      h('button', { type: 'button', class: 'btn small', 'data-pdf-btn': `${key}-${i}`, onclick: () => input.click() }, p ? 'Sostituisci' : 'Carica PDF'),
      p ? h('button', { type: 'button', class: 'btn small ghost danger', title: 'Rimuove il PDF (i dati inseriti restano)', onclick: () => { delete item._pdf; rerender(); } }, 'Rimuovi') : null),
    input);
  bar.addEventListener('dragover', (e) => { e.preventDefault(); bar.classList.add('drag'); });
  bar.addEventListener('dragleave', () => bar.classList.remove('drag'));
  bar.addEventListener('drop', (e) => {
    e.preventDefault();
    bar.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) leggiPdfImpianto(key, i, defs, f);
  });
  return bar;
}

async function leggiPdfImpianto(key, i, defs, file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return toast('Carica un file PDF', true);
  if (file.size > MAX_PDF_MB * 1024 * 1024) return toast(`Il PDF supera i ${MAX_PDF_MB} MB`, true);
  const btn = document.querySelector(`[data-pdf-btn="${key}-${i}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Lettura…'; }
  try {
    const { testo, doc } = await testoPdf(file);
    // PDF scansionato (senza testo): si leggono le prime pagine con l'OCR
    const scansione = testo.replace(/[^A-Za-z0-9]/g, '').length < 80;
    if (scansione && btn) btn.textContent = 'OCR in corso…';
    const images = scansione ? await pdfPerOcr(file, 3, doc) : [];
    const res = await fetch('api/impianto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: key, testo, images }) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'Lettura non riuscita');
    const item = state[key][i];
    const validi = new Set(defs.map((d) => d.k));
    const campi = Object.keys(out.campi).filter((k) => validi.has(k));
    for (const k of campi) item[k] = out.campi[k];
    item._pdf = { nome: file.name, data: (await readAsDataURL(file)).split(',')[1], campi };
    rerender();
    toast(campi.length ? `Compilati ${campi.length} campi dal PDF: controllali prima di generare il documento` : 'Nessun dato riconosciuto nel PDF', !campi.length);
  } catch (err) {
    toast(err.message || 'PDF non leggibile', true);
    if (btn) { btn.disabled = false; btn.textContent = 'Carica PDF'; }
  }
}

const ICONA_RUOTA_SX = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
const ICONA_RUOTA_DX = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>';

// Ruota la foto (o l'immagine del rilievo) di 90°: la rotazione viene applicata all'immagine salvata, quindi anche al PDF
async function ruotaFoto(i, gradi, btn, key = 'foto') {
  const f = state[key][i];
  if (!f) return;
  if (btn) btn.disabled = true;
  try {
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Immagine non leggibile'));
      im.src = f.src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((gradi * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    f.src = canvas.toDataURL('image/jpeg', key === 'rilievo' ? 0.92 : 0.9);
    rerender();
  } catch (err) {
    toast(err.message, true);
    if (btn) btn.disabled = false;
  }
}

// Sostituisce l'immagine di una foto mantenendone titolo e posizione
async function sostituisciFoto(i, file) {
  const f = state.foto[i];
  if (!f) return;
  try {
    if (isHeic(file)) toast('Conversione della foto HEIC in corso…');
    f.src = await resizeImage(await comeImmagineLeggibile(file), 1600, 0.82);
    rerender();
    toast(`Immagine della foto ${i + 1} sostituita`);
  } catch (err) {
    toast(`${file.name}: ${err.message}`, true);
  }
}

// ---------------------------------------------------------------------------
// Cartella: la cartella principale delle APE (su Google Drive, una per PC, in impostazioni.json) e, dentro,
// la cartella di questa APE, in cui vengono salvati tutti i suoi documenti
// ---------------------------------------------------------------------------
let archivio = null; // { cartellaArchivio, salvaPdfInArchivio, suggerimenti }
let archivioInCaricamento;
function caricaArchivio() {
  archivioInCaricamento ||= api('api/impostazioni').then((r) => { archivio = r; aggiornaCalcolati(); return r; })
    .catch(() => { archivioInCaricamento = null; return null; });
  return archivioInCaricamento;
}

// percorso completo della cartella della APE, con i separatori del sistema (\ su Windows)
function percorsoApe() {
  const base = archivio?.cartellaArchivio;
  if (!base || !state.cartella) return '';
  const sep = base.includes('\\') ? '\\' : '/';
  return [base.replace(/[\\/]+$/, ''), ...state.cartella.split('/')].join(sep);
}

// percorso breve da mostrare: da "Il mio Drive" in poi ("Il mio Drive/ALA/00_APE")
const percorsoBreve = (p) => {
  const m = String(p || '').match(/(Il mio Drive|My Drive|Mon Drive|Mi unidad)[\\/].*$/);
  return m ? m[0].replace(/\\/g, '/') : String(p || '');
};

// Una volta impostata, la cartella principale si vede come una riga sola; "Cambia" riapre l'impostazione
function sezioneCartellaPrincipale() {
  const input = h('input', { type: 'text', placeholder: 'Link della cartella: https://drive.google.com/drive/folders/…', autocomplete: 'off' });
  const pdf = h('input', { type: 'checkbox', checked: true });
  const stato = h('div', { class: 'stato' }, 'Caricamento…');
  const suggerimenti = h('div', { class: 'row' });
  const riga = h('span', { class: 'cp-percorso' });
  const compatta = h('div', { class: 'cp-riga', hidden: true },
    h('span', {}, 'Cartella principale: '), riga,
    h('button', { type: 'button', class: 'btn small ghost', onclick: () => { compatta.hidden = true; editor.hidden = false; } }, 'Cambia'));
  const salva = async () => {
    try {
      const r = await api('api/impostazioni', { method: 'PUT', body: JSON.stringify({ cartellaArchivio: input.value, salvaPdfInArchivio: pdf.checked }) });
      archivio = { ...archivio, ...r };
      archivioInCaricamento = Promise.resolve(archivio); // chi la legge dopo vede la cartella appena salvata
      mostra(r);
      aggiornaCalcolati();
      toast(r.cartellaArchivio ? 'Cartella principale impostata' : 'Copia su Google Drive disattivata');
      // arrivando da "Scegli o crea la cartella…": si torna alla pratica e si apre la scelta della cartella
      if (r.cartellaArchivio && dopoCartellaPrincipale) {
        const poi = dopoCartellaPrincipale;
        dopoCartellaPrincipale = null;
        avvisoOpzioni = '';
        sezioneAttiva = 'committente';
        await vai('pratica');
        poi();
      }
    } catch (err) {
      stato.textContent = err.message;
      stato.className = 'stato err';
    }
  };
  const mostra = (r) => {
    input.value = r.cartellaArchivio || '';
    pdf.checked = r.salvaPdfInArchivio !== false;
    riga.textContent = percorsoBreve(r.cartellaArchivio);
    riga.title = r.cartellaArchivio || '';
    stato.textContent = r.cartellaArchivio
      ? `Cartella principale su Google Drive: ${r.cartellaArchivio}`
      : 'Cartella principale non ancora impostata: incolla qui il link della cartella dello studio su Google Drive.';
    stato.className = `stato${r.cartellaArchivio ? ' ok' : ' err'}`;
    compatta.hidden = !r.cartellaArchivio;
    editor.hidden = Boolean(r.cartellaArchivio);
  };
  const editor = h('div', { class: 'drive-box' },
    h('p', { class: 'hint', style: 'margin:0;font-size:13px;color:var(--muted)' },
      "È la cartella di Google Drive che contiene le cartelle di tutte le pratiche (00_APE, 00_CATASTO, pratiche edilizie): qui l'app salva pratiche, proforma e documenti. Per cambiarla incolla il link della cartella (in Drive: apri la cartella e copia l'indirizzo dalla barra del browser)."),
    h('div', { class: 'row' }, input, h('button', { type: 'button', class: 'btn', onclick: salva }, 'Salva impostazione')),
    suggerimenti,
    h('label', { class: 'switch' }, pdf, 'Salva nella cartella anche il PDF del sopralluogo esportato'),
    stato);
  caricaArchivio().then((r) => {
    if (!r) { stato.textContent = 'Impostazione non disponibile'; return; }
    mostra(r);
    suggerimenti.replaceChildren(...(r.suggerimenti || []).map((c) =>
      h('button', { type: 'button', class: 'btn small ghost', title: c, onclick: () => { input.value = c; } }, `Usa ${percorsoBreve(c)}`)));
  });
  return h('div', { class: 'cp' }, compatta, editor);
}

// Dati dello studio (Opzioni): intestazione, dati fiscali e pagamento di proforma e informativa
const CAMPI_STUDIO = [
  ['Intestazione e dati fiscali', [
    ['nome', "Nome nell'intestazione del proforma", 6], ['firma', 'Nome e cognome', 6],
    ['indirizzo', 'Indirizzo dello studio', 6], ['cap', 'CAP', 2], ['comune', 'Comune (provincia)', 4],
    ['piva', 'Partita IVA', 4], ['cf', 'Codice fiscale', 4], ['sdi', 'Codice SDI', 4],
    ['email', 'E-mail', 6], ['pec', 'PEC', 6],
  ]],
  ['Pagamento', [['pagamento', 'Metodo di pagamento', 3], ['intestatario', 'Intestato a', 3], ['iban', 'IBAN', 6]]],
];

function sezioneStudio() {
  const inputs = {};
  const stato = h('div', { class: 'stato' }, 'Caricamento…');
  const mostra = (r) => {
    for (const [k, el] of Object.entries(inputs)) el.value = r.studio?.[k] || '';
    stato.textContent = r.condivisi
      ? 'Salvati su Google Drive (00_GESTIONALE): valgono su ogni computer.'
      : 'Salvati solo in questo browser.';
    stato.className = 'stato ok';
  };
  const salva = async () => {
    try {
      const studio = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value]));
      mostra(await api('api/studio', { method: 'PUT', body: JSON.stringify({ studio }) }));
      toast('Dati dello studio salvati: valgono per i prossimi proforma e informative');
    } catch (err) {
      stato.textContent = err.message;
      stato.className = 'stato err';
    }
  };
  api('api/studio').then(mostra).catch(() => { stato.textContent = 'Dati dello studio non disponibili'; });
  return h('div', { class: 'drive-box' },
    h('p', { class: 'hint', style: 'margin:0;font-size:13px;color:var(--muted)' },
      "Compaiono nel proforma (intestazione, modalità di pagamento, piè di pagina) e nell'informativa. Cambiali qui, ad esempio se cambia l'IBAN; un campo lasciato vuoto torna al valore iniziale."),
    ...CAMPI_STUDIO.flatMap(([titolo, campi]) => [
      h('p', { class: 'studio-titolo' }, titolo),
      h('div', { class: 'grid' }, campi.map(([k, l, sp]) => {
        inputs[k] = h('input', { type: 'text', id: `studio-${k}`, autocomplete: 'off', ...(k === 'iban' || k === 'piva' || k === 'cf' || k === 'sdi' ? { style: 'text-transform:uppercase' } : {}) });
        return h('div', { class: `f s${sp}` }, h('label', { for: `studio-${k}` }, l), inputs[k]);
      })),
    ]),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', onclick: salva }, 'Salva dati dello studio')),
    stato);
}

// Aggiunge un elemento a destra del titolo di una scheda
function conIntestazione(extra, sec) {
  sec.querySelector(':scope > header').append(extra);
  return sec;
}

// Foto immobile (allegato 2 del portale FVG): una sola immagine, di solito l'esterno dell'edificio, con anteprima
function fotoImmobile() {
  const f = state.allegatiFvg?.foto;
  const input = h('input', {
    type: 'file', accept: 'image/*,.heic,.heif', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        if (!(file.type.startsWith('image/') || isHeic(file))) throw new Error("Carica un'immagine (JPG, PNG o HEIC)");
        if (isHeic(file)) toast("Conversione dell'immagine HEIC in corso…");
        state.allegatiFvg.foto = await leggiFile(await comeImmagineLeggibile(file));
        rerender();
        toast('Foto immobile caricata (allegato 2 del portale FVG)');
      } catch (err) {
        toast(err.message, true);
      }
    },
  });
  return h('div', { class: 'foto-immobile' },
    f
      ? h('img', { src: `data:${f.tipo || 'image/jpeg'};base64,${f.data}`, alt: 'Foto immobile', title: `${f.nome} · clic per aprirla`, onclick: () => apriFile(f) })
      : h('div', { class: 'vuota', title: 'Nessuna foto immobile' }, '🏠'),
    h('div', { class: 'testo' },
      h('strong', {}, 'Foto immobile'),
      h('span', {}, f ? 'Allegato 2 del portale FVG' : "Di solito l'esterno dell'edificio")),
    h('div', { class: 'tools' },
      h('button', { type: 'button', class: 'btn small', onclick: () => input.click() }, f ? 'Sostituisci' : 'Carica'),
      f ? h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { delete state.allegatiFvg.foto; rerender(); } }, 'Rimuovi') : null),
    input);
}

// Box come le tabelle del PDF: fascia colorata verticale a sinistra con il nome, dal basso verso l'alto
// (il colore è sempre quello del modulo: il secondo argomento resta per compatibilità)
const boxPdf = (nome, _colore, ...contenuto) =>
  h('div', { class: 'box-sub box-pdf', 'data-label': nome }, contenuto);

// Box "Cartella della APE" nella scheda Committente (il nome proposto per la cartella usa il cognome del committente)
function boxCartella() {
  caricaArchivio();
  // cartella principale non ancora impostata su questo PC
  const senzaBase = archivio && !archivio.cartellaArchivio;
  return h('div', { class: 'box-sub', style: '--accent:#4a90a4;--accent-ink:#fff', 'data-label': 'Cartella' },
    h('p', { class: 'box-sub-desc' }, 'Cartella della pratica: qui vengono salvati i suoi documenti (dati .json, lettere di incarico, sopralluogo, proforma).'),
    h('div', { class: 'grid' },
      campoFisso('cartellaApe', 'Percorso', () => percorsoApe() || (state.cartella ? state.cartella : ''), { s: 12 })),
    h('div', { class: 'add-row' },
      h('button', { type: 'button', class: 'btn primary btn-cartella-ape', onclick: () => scegliCartellaApe() }, state.cartella ? 'Cambia cartella…' : 'Scegli o crea la cartella…'),
      state.cartella ? h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { state.cartella = ''; rerender(); } }, 'Togli') : null),
    h('p', { class: `hint-row${senzaBase ? ' avviso' : ''}`, style: 'text-align:left' }, senzaBase
      ? 'Per scegliere la cartella serve prima la cartella principale delle pratiche (in Opzioni): il pulsante qui sopra porta lì.'
      : state.cartella
        ? 'Ogni documento esportato di questa pratica viene salvato qui. Se cambi cartella, il .json (e il PDF del sopralluogo) si spostano nella nuova.'
        : 'Nessuna cartella scelta: i documenti vengono salvati direttamente nella cartella principale (Opzioni).'));
}

// Dove nasce la cartella di una pratica: APE in 00_APE/VENETO o 00_APE/FRIULI VENEZIA GIULIA, catasto in 00_CATASTO
// (cartelle "PAESE VIA CIVICO RIF COGNOME"), pratiche edilizie direttamente nella principale ("48_Cognome_Descrizione")
const CARTELLE_APE = { veneto: '00_APE/VENETO', fvg: '00_APE/FRIULI VENEZIA GIULIA' };
function cartellaPredefinita() {
  const m = moduloDi(state);
  if (m === 'catasto') return '00_CATASTO';
  if (m === 'ape') return CARTELLE_APE[versioneDi(state)] || '00_APE';
  return '';
}
// numero successivo delle pratiche edilizie: il più alto tra le cartelle "NN_…" della principale, + 1
function nomeCartellaNumerata(cartelle) {
  const n = Math.max(0, ...cartelle.map((c) => parseInt((String(c).match(/^(\d+)_/) || [])[1], 10)).filter(Number.isFinite)) + 1;
  const cognome = String(riferimento(state.committente?.nome) || '').toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (x) => x.toUpperCase());
  const titolo = String(state.offerta?.titolo || '').trim();
  return [n, cognome, titolo].filter(Boolean).join('_');
}

// Finestra per scegliere una sottocartella della principale, o crearne una nuova con il nome proposto
async function scegliCartellaApe() {
  // impostazione aggiornata dal server: la cartella principale può essere stata appena salvata
  archivioInCaricamento = null;
  const r0 = await caricaArchivio();
  if (!r0?.cartellaArchivio) {
    // dopo averla impostata si torna da soli alla scelta della cartella
    return apriOpzioni({
      avviso: 'Per scegliere la cartella della pratica imposta prima qui la cartella principale delle pratiche (la cartella di Google Drive che contiene le cartelle delle pratiche) e premi "Salva impostazione": si torna poi alla scelta della cartella.',
      poi: () => scegliCartellaApe(),
    });
  }
  const dlg = h('dialog', { class: 'cartelle' });
  const titolo = h('div', { class: 'percorso' });
  const elenco = h('div', { class: 'elenco' });
  const nuova = h('input', { type: 'text', value: nomeCartella(state), placeholder: 'Nome della nuova cartella' });
  const btnUsa = h('button', { type: 'button', class: 'btn' }, 'Usa questa cartella');
  let percorso = '';
  const chiudi = () => { dlg.close(); dlg.remove(); };
  const imposta = (rel) => {
    state.cartella = rel;
    chiudi();
    rerender();
    toast(`Cartella della pratica: ${rel}`);
  };
  let nomeToccato = false;
  nuova.addEventListener('input', () => { nomeToccato = true; });
  const carica = async (rel, crea = false) => {
    try {
      const r = await api(`api/cartelle?percorso=${encodeURIComponent(rel)}${crea ? '&crea=1' : ''}`);
      percorso = r.percorso;
      if (moduloDi(state) === 'pratica' && !percorso && !nomeToccato) nuova.value = nomeCartellaNumerata(r.cartelle);
      const parti = percorso ? percorso.split('/') : [];
      titolo.replaceChildren(
        h('button', { type: 'button', class: 'briciola', onclick: () => carica('') }, 'Cartella principale'),
        ...parti.flatMap((p, i) => [' / ', h('button', { type: 'button', class: 'briciola', onclick: () => carica(parti.slice(0, i + 1).join('/')) }, p)]));
      elenco.replaceChildren(
        ...(percorso ? [h('button', { type: 'button', class: 'voce su', onclick: () => carica(parti.slice(0, -1).join('/')) }, '↑ Cartella superiore')] : []),
        ...r.cartelle.map((c) => h('button', { type: 'button', class: 'voce', onclick: () => carica([percorso, c].filter(Boolean).join('/')) }, `📁 ${c}`)),
        ...(r.cartelle.length ? [] : [h('p', { class: 'empty' }, 'Nessuna sottocartella.')]));
      btnUsa.disabled = !percorso;
    } catch (err) {
      toast(err.message, true);
    }
  };
  btnUsa.addEventListener('click', () => percorso && imposta(percorso));
  const crea = async () => {
    try {
      const r = await api('api/cartelle', { method: 'POST', body: JSON.stringify({ percorso, nome: nuova.value }) });
      imposta(r.percorso);
    } catch (err) {
      toast(err.message, true);
    }
  };
  dlg.append(
    h('div', { class: 'testa' }, h('strong', {}, 'Cartella di questa pratica'), h('button', { type: 'button', class: 'btn small ghost', onclick: chiudi }, 'Chiudi')),
    titolo,
    elenco,
    h('div', { class: 'nuova' },
      h('label', {}, 'Nuova cartella qui dentro'),
      h('div', { class: 'row' }, nuova, h('button', { type: 'button', class: 'btn primary', onclick: crea }, 'Crea e usa'))),
    h('div', { class: 'piede' }, h('span', { class: 'hint' }, 'Apri una cartella con un clic, poi "Usa questa cartella".'), btnUsa));
  document.body.append(dlg);
  dlg.addEventListener('cancel', () => dlg.remove());
  dlg.showModal();
  // si parte dalla cartella superiore di quella attuale, così si vedono anche le cartelle vicine
  await carica(state.cartella ? state.cartella.split('/').slice(0, -1).join('/') : cartellaPredefinita(), !state.cartella);
}

// Rilievo: immagini (JPG, PNG, HEIC), ognuna su una pagina del PDF sotto il titolo "RILIEVO".
// Risoluzione più alta delle foto, perché i disegni hanno linee sottili e scritte piccole.
const RILIEVO_LATO = 3200;
const RILIEVO_QUALITA = 0.92;
async function aggiungiRilievo(files) {
  const immagini = files.filter((f) => f.type.startsWith('image/') || isHeic(f));
  if (immagini.length < files.length) toast('Per il rilievo carica immagini (JPG, PNG o HEIC)', true);
  if (immagini.some(isHeic)) toast('Conversione delle immagini HEIC in corso…');
  for (const f of immagini) {
    try {
      state.rilievo.push({ src: await resizeImage(await comeImmagineLeggibile(f), RILIEVO_LATO, RILIEVO_QUALITA), nome: f.name });
    } catch (err) {
      toast(`${f.name}: ${err.message}`, true);
    }
  }
  rerender();
}

async function sostituisciRilievo(i, file) {
  const r = state.rilievo[i];
  if (!r) return;
  try {
    if (isHeic(file)) toast("Conversione dell'immagine HEIC in corso…");
    r.src = await resizeImage(await comeImmagineLeggibile(file), RILIEVO_LATO, RILIEVO_QUALITA);
    r.nome = file.name;
    rerender();
    toast(`Pagina ${i + 1} del rilievo sostituita`);
  } catch (err) {
    toast(`${file.name}: ${err.message}`, true);
  }
}

function sezioneRilievo() {
  const list = state.rilievo || (state.rilievo = []);
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, hidden: true, onchange: (e) => { const files = [...e.target.files]; e.target.value = ''; aggiungiRilievo(files); } });
  const vecchioPdf = state.pagine?.rilievo;
  const zone = h('div', { class: 'dropzone' },
    h('div', { class: 'icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>' }),
    h('div', { class: 'txt' },
      h('strong', {}, list.length ? 'Aggiungi altre pagine al rilievo' : 'Carica le immagini del rilievo'),
      h('span', {}, 'JPG, PNG o HEIC; puoi selezionarne più di una. Ogni immagine occupa una pagina, adattata allo spazio sotto il titolo.')),
    h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, list.length ? '+ Aggiungi immagini' : 'Carica immagini')),
    input);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const files = [...e.dataTransfer.files];
    if (files.length) aggiungiRilievo(files);
  });
  return section('rilievo', 'Rilievo', '#3d464d', 'Nel PDF finale compare dopo la pagina dei documenti e prima del committente, un\'immagine per pagina',
    // bozze precedenti: il rilievo era un PDF; resta usato finché non si caricano immagini
    vecchioPdf
      ? h('div', { class: 'id-result warn' },
          `Questa pratica ha il rilievo come PDF (${vecchioPdf.nome})${list.length ? ', che non viene più usato perché ci sono le immagini' : ', che viene ancora inserito nel PDF finale'}. `,
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => apriPagina(vecchioPdf) }, 'Apri'), ' ',
          h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { state.pagine.rilievo = null; rerender(); } }, 'Rimuovi PDF'))
      : null,
    list.length
      ? h('div', { class: 'photos ril-pages' },
          list.map((r, i) => { let sostituisci; return (
            h('div', { class: 'photo' },
              h('div', { class: 'p-img' },
                h('img', { src: r.src, alt: `Rilievo, pagina ${i + 1}` }),
                h('div', { class: 'p-rot' },
                  h('button', { type: 'button', class: 'btn small', title: 'Ruota a sinistra', 'aria-label': 'Ruota a sinistra', html: ICONA_RUOTA_SX, onclick: (e) => ruotaFoto(i, -90, e.currentTarget, 'rilievo') }),
                  h('button', { type: 'button', class: 'btn small', title: 'Ruota a destra', 'aria-label': 'Ruota a destra', html: ICONA_RUOTA_DX, onclick: (e) => ruotaFoto(i, 90, e.currentTarget, 'rilievo') }))),
              h('div', { class: 'p-body' },
                h('div', { class: 'p-label' }, `Pagina ${i + 1} del rilievo`),
                r.nome ? h('div', { class: 'p-nome', title: r.nome }, r.nome) : null,
                h('div', { class: 'p-tools' },
                  h('div', {},
                    i > 0 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta prima', onclick: () => move('rilievo', i, -1) }, '←') : null,
                    i < list.length - 1 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta dopo', onclick: () => move('rilievo', i, 1) }, '→') : null),
                  h('div', {},
                    h('button', { type: 'button', class: 'btn small ghost', title: "Sostituisci l'immagine di questa pagina", onclick: () => sostituisci.click() }, 'Sostituisci'),
                    h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { list.splice(i, 1); rerender(); } }, 'Elimina')),
                  (sostituisci = h('input', { type: 'file', accept: 'image/*,.heic,.heif', hidden: true, onchange: (e) => { const file = e.target.files[0]; e.target.value = ''; if (file) sostituisciRilievo(i, file); } }))))));
          }))
      : null,
    zone);
}

// ---------------------------------------------------------------------------
// Incarico (APE e catasto): scelte della lettera di incarico e prestazioni con il compenso
// (lo stesso importo va nella lettera e nel proforma)
// ---------------------------------------------------------------------------
// luogo della firma: il comune dell'immobile, senza la provincia ("Caorle (VE)" → "Caorle")
const luogoFirma = () => String(state.immobile?.citta || '').replace(/\s*\([A-Za-z]{2}\)\s*$/, '').trim();
const destinatarioProforma = () => [state.committente?.nome, state.committente?.cf || state.committente?.piva].filter(Boolean).join(' · ');

// Campi calcolati da altre sezioni: si vedono come campi, grigi e non modificabili, e si aggiornano a ogni modifica.
// calcola è una funzione che restituisce il valore da mostrare.
const CALCOLATI = new Map();
function campoFisso(id, label, calcola, { s = 6, righe = 0, forte = false } = {}) {
  CALCOLATI.set(id, calcola);
  const attrs = { id, class: `fisso${forte ? ' forte' : ''}`, readonly: true, tabindex: -1 };
  const control = righe ? h('textarea', { ...attrs, rows: righe }, calcola() || '') : h('input', { ...attrs, type: 'text', value: calcola() || '' });
  return h('div', { class: `f s${s}` }, h('label', { for: id }, label), control);
}
function aggiornaCalcolati() {
  document.querySelectorAll('.fisso[id]').forEach((el) => {
    const calcola = CALCOLATI.get(el.id);
    if (calcola) el.value = calcola() || '';
  });
  for (const [id, calcola] of CALCOLATI) if (id.startsWith('fvg-stato-')) calcola();
}

const campoImmobile = (k) => () => String(state.immobile?.[k] ?? '').trim();
const totaliProforma = () => calcolaProforma(state.proforma);

// Totali del compenso, uguali nella lettera di incarico e nel proforma
function campiCompenso(prefisso) {
  return h('div', { class: 'grid pf-totali' },
    campoFisso(`${prefisso}Totale`, 'Totale prestazioni', () => euro(totaliProforma().totale), { s: 3 }),
    campoFisso(`${prefisso}Bollo`, 'Marca da bollo', () => (totaliProforma().bollo ? euro(totaliProforma().bollo) : 'non dovuta (fino a 77,47 €)'), { s: 3 }),
    campoFisso(`${prefisso}Contributo`, 'Contributo integrativo 4%', () => euro(totaliProforma().contributo), { s: 3 }),
    campoFisso(`${prefisso}Spese`, 'Spese non imponibili', () => (totaliProforma().totaleSpese ? euro(totaliProforma().totaleSpese) : 'nessuna'), { s: 3 }),
    campoFisso(`${prefisso}Compenso`, 'Totale da pagare', () => euro(totaliProforma().daPagare), { s: 12, forte: true }));
}

// Immobile in una riga, per controllare i dati che finiscono nella lettera e nel proforma
function riepilogoImmobile() {
  const m = state.immobile || {};
  const indirizzo = [String(m.via || '').trim(), String(m.civ || '').trim() && `n. ${String(m.civ).trim()}`].filter(Boolean).join(' ');
  const catasto = [m.fg && `Fg. ${m.fg}`, m.mapp && `Mapp. ${m.mapp}`, m.sub && `Sub. ${m.sub}`].filter(Boolean).join(' · ');
  return [m.citta, indirizzo, catasto].filter((x) => String(x || '').trim()).join(' — ');
}

// Prestazioni in righe compatte: unità, Sub., quantità, prezzo; sotto, il testo che andrà nel proforma
function righePrestazioni() {
  const p = state.proforma;
  if (!p.righe?.length) p.righe = [{ tipo: 'res', qt: '1', prezzo: '' }];
  // la prima prestazione è l'unità della sezione Immobile: il suo Sub. è quello dell'immobile
  const prima = p.righe[0];
  if (prima.sub) {
    if (!state.immobile.sub) state.immobile.sub = prima.sub;
    prima.sub = '';
  }
  const [defTipo, , defQt, defPrezzo] = fields.rigaProforma;
  return p.righe.map((r, i) =>
    h('div', { class: 'prest' },
      h('div', { class: 'prest-head' },
        h('strong', {}, `Prestazione ${i + 1}`),
        h('div', { class: 'tools' },
          h('button', { type: 'button', class: 'btn small ghost', title: "Un'altra unità dello stesso immobile (con un altro Sub.)", onclick: () => { p.righe.splice(i + 1, 0, { ...structuredClone(r), sub: '', testoLibero: false, testo: '' }); rerender(); } }, 'Duplica'),
          p.righe.length > 1 ? h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { p.righe.splice(i, 1); rerender(); } }, 'Elimina') : null)),
      h('div', { class: 'grid' },
        field({ ...defTipo, s: 5 }, ['proforma', 'righe', i]),
        i === 0
          ? campoFisso('subRiga0', "Sub. (dall'immobile)", campoImmobile('sub'), { s: 2 })
          : field({ k: 'sub', l: 'Sub. nuova unità', s: 2 }, ['proforma', 'righe', i]),
        field({ ...defQt, s: 2 }, ['proforma', 'righe', i]),
        field({ ...defPrezzo, s: 3 }, ['proforma', 'righe', i])),
      h('div', { class: 'prest-testo' },
        h('div', { class: 'pf-testo-head' },
          h('span', {}, 'Testo nel proforma'),
          h('label', { class: 'switch small' },
            h('input', {
              type: 'checkbox', checked: !!r.testoLibero,
              onchange: (e) => {
                // il testo libero parte da quello generato, così basta ritoccarlo
                if (e.target.checked && !r.testo) r.testo = descrizioneProforma(state, { ...r, testoLibero: false });
                r.testoLibero = e.target.checked;
                rerender();
              },
            }), 'Modifica a mano')),
        r.testoLibero
          ? h('textarea', { rows: 2, oninput: (e) => { r.testo = e.target.value; save(); } }, r.testo || '')
          : campoFisso(`testoRiga${i}`, '', () => descrizioneProforma(state, state.proforma.righe[i] || {}), { s: 12, righe: 3 }))));
}

// Spese non imponibili (es. diritti catastali): nel proforma in una sezione a sé, fuori dal 4% e dalla marca da bollo
const nuovaSpesaSister = () => ({ testo: SPESA_SISTER, importo: String(IMPORTO_SISTER) });
function speseNonImponibili() {
  const p = state.proforma;
  const spese = (p.spese ||= []);
  const haSister = spese.some((x) => x.testo === SPESA_SISTER);
  return h('div', { class: 'spese' },
    h('div', { class: 'pf-testo-head' }, h('strong', {}, 'Spese non imponibili'),
      h('span', { class: 'nota-campo' }, 'Si sommano al totale da pagare ma non entrano nel 4% INARCASSA né nel calcolo della marca da bollo.')),
    spese.length
      ? spese.map((x, i) => h('div', { class: 'grid spesa' },
          field({ k: 'testo', l: `Descrizione spesa ${i + 1}`, s: 8 }, ['proforma', 'spese', i]),
          field({ k: 'importo', l: 'Importo', s: 3, t: 'number', u: '€' }, ['proforma', 'spese', i]),
          h('div', { class: 'f s1 spesa-elimina' },
            h('button', { type: 'button', class: 'btn small ghost danger', title: 'Togli la spesa', 'aria-label': `Togli la spesa ${i + 1}`, onclick: () => { spese.splice(i, 1); rerender(); } }, '×'))))
      : h('p', { class: 'empty' }, 'Nessuna spesa non imponibile: nel proforma la sezione non compare.'),
    h('div', { class: 'add-row' },
      haSister ? null : h('button', { type: 'button', class: 'btn small', onclick: () => { spese.push(nuovaSpesaSister()); rerender(); } }, '+ Rimborso diritti catastali (SISTER)'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { spese.push({ testo: '', importo: '' }); rerender(); } }, '+ Altra spesa')));
}

// Protocollo della variazione: sigla (VE) e numero; incollando "VE0098153" nel numero la sigla si separa da sola
function campoProtocollo() {
  const c = state.catasto;
  const sigla = h('input', {
    type: 'text', id: 'protSigla', class: 'sigla', maxlength: 2, value: c.sigla || 'VE', autocomplete: 'off', 'aria-label': 'Sigla del protocollo',
    oninput: (e) => { c.sigla = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); e.target.value = c.sigla; save(); },
  });
  const numero = h('input', {
    type: 'text', id: 'protNumero', inputmode: 'numeric', placeholder: 'es. 0098153', value: c.numero || '', autocomplete: 'off', 'aria-label': 'Numero del protocollo',
    oninput: (e) => {
      const v = e.target.value.toUpperCase().replace(/\s+/g, '');
      const m = /^([A-Z]{2})(\d.*)$/.exec(v);
      if (m) { c.sigla = m[1]; sigla.value = m[1]; c.numero = m[2]; e.target.value = m[2]; } else c.numero = v;
      save();
    },
  });
  return h('div', { class: 'f s5' }, h('label', { for: 'protNumero' }, 'Protocollo della variazione'), h('div', { class: 'protocollo' }, sigla, numero));
}

// Ricevuta di avvenuta denuncia di variazione (Agenzia delle Entrate, PDF con testo): protocollo, data, motivo,
// foglio/numero/sub della prima unità e importo dei tributi pagati
const MOTIVI_RICEVUTA = [
  [/DISTRIBUZIONE/, 'distribuzione'], [/RISTRUTTURAZIONE/, 'ristrutturazione'], [/AMPLIAMENTO/, 'ampliamento'],
  [/FRAZIONAMENTO/, 'frazionamento'], [/FUSIONE/, 'fusione'], [/DESTINAZIONE/, 'destinazione'], [/RAPPRESENTAZIONE/, 'rappresentazione'],
];
function datiRicevuta(testo) {
  const t = testo.replace(/[ \t]+/g, ' ');
  const out = {};
  const prot = /Pratica\s+numero\s*:?\s*([A-Z]{2})\s*(\d{4,})/i.exec(t);
  if (prot) { out.sigla = prot[1].toUpperCase(); out.numero = prot[2]; }
  // data della ricevuta (intestazione); in alternativa quella in fondo alla pagina
  const data = /\bData\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(t);
  if (data) out.data = `${data[3]}-${data[2]}-${data[1]}`;
  const motivo = /Motivo\s+della\s+variazione\s*:\s*([^\n]+)/i.exec(t);
  if (motivo) {
    out.motivoTesto = motivo[1].trim();
    const m = MOTIVI_RICEVUTA.find(([re]) => re.test(out.motivoTesto.toUpperCase()));
    out.motivo = m ? m[1] : 'altro';
  }
  // prima riga delle unità: "1 V 34 1051 VIA FERRARA, 58, …" (sezione e sub possono mancare)
  const riga = /^\s*\d+\s+[A-Z]\s+(?:[A-Z]\s+)?(\d+)\s+(\d+)(?:\s+(\d+))?\s+[A-Z]/m.exec(testo.replace(/[ \t]+/g, ' '));
  if (riga) { out.fg = riga[1]; out.mapp = riga[2]; out.sub = riga[3] || ''; }
  const importo = /Importo\s+della\s+liquidazione\s*:?\s*Euro\s*([\d.,]+)/i.exec(t);
  if (importo) out.tributi = importo[1];
  return out;
}

async function caricaRicevuta(file) {
  try {
    if (!(/pdf/.test(file.type) || /\.pdf$/i.test(file.name))) throw new Error('Carica il PDF della ricevuta');
    const f = await leggiFile(file);
    const { testo, doc } = await testoPdf(file, 3);
    doc.destroy?.();
    const r = datiRicevuta(testo);
    const c = state.catasto;
    const m = state.immobile;
    c.ricevuta = f;
    const letti = [];
    if (r.numero) { c.sigla = r.sigla; c.numero = r.numero; letti.push(`protocollo ${r.sigla}${r.numero}`); }
    if (r.data) { c.data = r.data; letti.push(`data ${r.data.split('-').reverse().join('/')}`); }
    if (r.motivo) {
      c.motivazione = [r.motivo];
      if (r.motivo === 'altro') c.motivazioneAltro = r.motivoTesto.toLowerCase();
      letti.push('motivazione');
    }
    // dati catastali: solo se nella scheda Immobile mancano (quelli inseriti non si toccano)
    const diversi = [];
    for (const k of ['fg', 'mapp', 'sub']) {
      if (!r[k]) continue;
      if (!String(m[k] || '').trim()) { m[k] = r[k]; letti.push(`${{ fg: 'Fg.', mapp: 'Mapp.', sub: 'Sub.' }[k]} ${r[k]}`); }
      else if (String(m[k]).trim() !== r[k]) diversi.push(`${{ fg: 'Fg.', mapp: 'Mapp.', sub: 'Sub.' }[k]} ${r[k]} (scheda Immobile: ${m[k]})`);
    }
    rerender();
    if (!r.numero) return toast('Ricevuta caricata, ma il protocollo non è stato trovato: è la "Ricevuta di avvenuta denuncia di variazione" in PDF? Inseriscilo a mano.', true);
    toast(`Ricevuta letta · ${letti.join(', ')}${r.tributi ? ` · tributi catastali pagati: ${r.tributi} €` : ''}`);
    if (diversi.length) setTimeout(() => toast(`Attenzione: nella ricevuta ${diversi.join(', ')}. Controlla la scheda Immobile.`, true), 3200);
  } catch (err) {
    toast(err.message || 'Ricevuta non leggibile', true);
  }
}

function boxRicevuta() {
  const f = state.catasto?.ricevuta;
  const input = h('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true, onchange: (e) => { const x = e.target.files[0]; e.target.value = ''; if (x) caricaRicevuta(x); } });
  const zone = h('div', { class: `dropzone ricevuta${f ? ' loaded' : ''}` },
    h('div', { class: 'icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/></svg>' }),
    h('div', { class: 'txt' },
      h('strong', {}, f ? f.nome : 'Ricevuta di avvenuta denuncia di variazione'),
      h('span', {}, f
        ? 'Protocollo, data e motivazione letti dalla ricevuta (controllali qui sotto).'
        : "PDF dell'Agenzia delle Entrate: protocollo, data e motivo si compilano da soli (foglio, mappale e sub solo se mancano).")),
    h('div', { class: 'add-row' },
      f ? h('button', { type: 'button', class: 'btn ghost', onclick: () => apriFile(f) }, 'Apri') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, f ? 'Sostituisci' : 'Carica ricevuta'),
      f ? h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { delete state.catasto.ricevuta; rerender(); } }, 'Rimuovi') : null),
    input);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const x = e.dataTransfer.files[0];
    if (x) caricaRicevuta(x);
  });
  return zone;
}

// Pulsante che porta i dati della pratica nel registro dei proforma
const pulsanteProforma = (testo = 'Crea proforma da questa pratica') =>
  h('button', { type: 'button', class: 'btn primary', html: `${icona('proforma', 16)}<span>${testo}</span>`, onclick: (e) => creaProformaDaPratica(e.currentTarget) });

// Compenso (APE e catasto): prestazioni, spese non imponibili, totali; da qui si crea il proforma
function boxCompenso() {
  const p = state.proforma;
  return boxPdf('Compenso', null,
    h('div', { class: 'grid' }, campoFisso('pfImmobile', "Immobile (dalla scheda Immobile: va nella lettera e nel proforma)", riepilogoImmobile, { s: 12 })),
    h('div', { class: 'prests' }, righePrestazioni()),
    h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { p.righe.push({ tipo: 'res', qt: '1', prezzo: '', sub: '' }); rerender(); } }, '+ Aggiungi prestazione (altra unità)')),
    speseNonImponibili());
}
// Totale del compenso e creazione del proforma (box a parte, sotto la lettera sugli schermi larghi)
function boxTotale() {
  // le spiegazioni compaiono passando il mouse sopra (title), così il riquadro resta basso
  const pulsante = pulsanteProforma();
  pulsante.title = 'Il proforma prende destinatario, prestazioni e spese da questa pratica e il primo numero libero del registro.';
  return h('div', { class: 'box-sub box-pdf box-totale', 'data-label': 'Totale', title: 'La marca da bollo (2,00 €) si aggiunge da sola quando prestazioni + 4% INARCASSA superano 77,47 € (le spese non imponibili non contano).' },
    campiCompenso('inc'),
    h('div', { class: 'add-row fine' }, pulsante,
      h('span', { class: 'nota-campo' }, 'Marca da bollo automatica sopra 77,47 €.')));
}

// Incarico: lettera (APE) o variazione (catasto) e compenso
function sezioneIncarico() {
  const p = state.proforma;
  const inf = state.informativa;
  const cat = catasto();
  const aggiornamento = !cat && inf.tipo === 'aggiornamento';
  // prezzo proposto (180 € primo incarico APE, 70 € aggiornamento, 350 € catasto), se non è ancora indicato
  if (p.righe.every((r) => !String(r.prezzo || '').trim())) p.righe[0].prezzo = String(PREZZO_PROPOSTO[cat ? 'catasto' : inf.tipo || 'primo']);
  const firma = [
    field({ k: 'data', l: 'Data della firma', s: 4, t: 'date' }, ['informativa']),
    campoFisso('luogoFirma', "Luogo della firma (comune dell'immobile)", luogoFirma, { s: 8 }),
    field({ k: 'note', l: 'Note (in fondo alla seconda pagina)', s: 12, t: 'textarea' }, ['informativa']),
  ];
  const motivazioneCatasto = { k: 'motivazione', l: 'Motivazione della variazione', t: 'multi', s: 12, altro: 'motivazioneAltro', o: MOTIVAZIONI_CATASTO.map(([k, l]) => [k, l.charAt(0).toUpperCase() + l.slice(1)]) };
  return section('incarico', 'Incarico', null, cat
    ? 'Variazione catastale, lettera di incarico e compenso. Il proforma si crea dal compenso e finisce nel registro.'
    : 'Lettera di incarico e compenso. Il proforma si crea dal compenso e finisce nel registro.',
    cat
      ? boxPdf('Variazione', null,
          h('div', { class: 'grid' },
            boxRicevuta(),
            campoProtocollo(),
            field({ k: 'data', l: 'Data del protocollo', s: 3, t: 'date' }, ['catasto']),
            campoFisso('protocolloCompleto', 'Nel proforma', () => [protocollo(state.catasto), state.catasto?.data && `del ${dataProforma(new Date(`${state.catasto.data}T12:00:00`))}`].filter(Boolean).join(' ') || 'da indicare', { s: 4 }),
            field(motivazioneCatasto, ['catasto']),
            ...firma))
      : boxPdf('Lettera', null,
          h('div', { class: 'grid' },
            h('div', { class: 'f s12' }, h('label', {}, 'Tipologia'),
              seg(TIPI_LETTERA, inf.tipo || 'primo', (val) => {
                inf.tipo = val || 'primo';
                // cambiando tipologia, la prestazione prende il suo prezzo (resta modificabile)
                p.righe[0].prezzo = String(PREZZO_PROPOSTO[inf.tipo]);
                rerender();
                toast(`${inf.tipo === 'aggiornamento' ? 'Aggiornamento APE' : 'Primo incarico'}: prezzo della prestazione ${euro(PREZZO_PROPOSTO[inf.tipo])}`);
              })),
            aggiornamento ? field({ k: 'dataPrecedente', l: 'Data della lettera di incarico originaria', s: 4, t: 'date' }, ['informativa']) : null,
            aggiornamento ? h('div', { class: 'f s8 nota-campo' }, `Nella lettera il corrispettivo dell'aggiornamento è di ${euro(AGGIORNAMENTO)}, come pattuito nella lettera originaria.`) : null,
            // tipo di pratica: la motivazione dell'incarico (nella versione FVG compare anche nel sopralluogo)
            field({ ...fields.immobile.find((d) => d.k === 'pratica'), l: 'Tipo di pratica (motivazione)' }, ['immobile']),
            ...firma)),
    boxCompenso(),
    boxTotale());
}

// totali, testi e campi calcolati, aggiornati a ogni modifica senza ridisegnare il form
function aggiornaRiepilogoProforma() {
  aggiornaCalcolati();
}
// ---------------------------------------------------------------------------
// Modulo Pratiche: nota tecnica esplicativa (con le figure) e offerta economica.
// I testi si scrivono a mano oppure si fanno preparare all'intelligenza artificiale dagli appunti.
// ---------------------------------------------------------------------------
// area di testo collegata a un campo dello stato
function areaTesto(path, { righe = 4, ph = '', id = null } = {}) {
  return h('textarea', { id, rows: righe, placeholder: ph, 'data-p': path.join('.'), oninput: (e) => { setIn(state, path, e.target.value); save(); } }, getIn(state, path) || '');
}

// Testi già scritti nella pratica (la chat li mantiene, a meno che gli appunti non dicano altro)
function testiAttuali() {
  const n = state.nota;
  const o = state.offerta;
  return [
    String(n.testo || '').trim() && `NOTA TECNICA:\n${n.testo}`,
    String(o.oggetto || '').trim() && `OGGETTO: ${o.oggetto}`,
    state.proforma.righe.some((r) => String(r.testo || '').trim()) && `PRESTAZIONI:\n${state.proforma.righe.map((r, i) => `${i + 1}. [${r.prezzo || ''}] ${r.testo || ''}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');
}

// Prompt da incollare nella chat (claude.ai o simili): regole, esempio dello studio, appunti, immobile, elenco degli allegati.
// Il committente non compare mai: nome e codice fiscale non lasciano l'app.
function promptPratica(parti) {
  const m = state.immobile || {};
  return creaPrompt({
    appunti: state.nota.appunti,
    immobile: { via: m.via, civ: m.civ, citta: m.citta, fg: m.fg, mapp: m.mapp, sub: m.sub },
    parti,
    allegati: [...(state.nota.fonti || []).map((f) => f.nome), ...(state.nota.figure || []).map((f, i) => `Figura ${i + 1}${f.didascalia ? `: ${f.didascalia}` : ''}`)],
    attuale: testiAttuali(),
  });
}

async function copiaTesto(testo) {
  try {
    await navigator.clipboard.writeText(testo);
    return true;
  } catch {
    // browser senza accesso agli appunti (o pagina non sicura): si copia dalla casella di testo selezionata
    const t = h('textarea', { style: 'position:fixed;opacity:0' }, testo);
    document.body.append(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

// Finestra in tre passi: 1. copia il prompt, 2. incollalo nella chat con gli allegati, 3. incolla qui la risposta
function apriAssistente(parti = ['nota', 'offerta']) {
  if (!String(state.nota.appunti || '').trim() && !(state.nota.fonti || []).length) {
    mostraSezione('nota');
    return toast('Scrivi prima gli appunti della pratica (o carica i documenti): sono la base della bozza', true);
  }
  const prompt = promptPratica(parti);
  const allegati = [...(state.nota.fonti || []), ...(state.nota.figure || []).map((f, i) => ({ nome: `Figura ${i + 1}`, figura: f }))];
  const risposta = h('textarea', { rows: 9, placeholder: 'Incolla qui tutta la risposta della chat (il blocco che inizia con { e finisce con })…' });
  const esito = h('p', { class: 'assist-esito' });
  const dlg = h('dialog', { class: 'assistente' });
  const chiudi = () => { dlg.close(); dlg.remove(); };
  const applica = async () => {
    let r;
    try {
      r = leggiRisposta(risposta.value);
    } catch (err) {
      esito.textContent = err.message;
      esito.className = 'assist-esito err';
      return;
    }
    const n = state.nota;
    const o = state.offerta;
    const sostituisce = (parti.includes('nota') && String(n.testo || '').trim() && r.nota) || (parti.includes('offerta') && String(o.oggetto || '').trim() && r.oggetto);
    if (sostituisce) {
      const ok = await chiediConferma({ titolo: 'Sostituire i testi già scritti?', messaggio: 'La bozza sostituisce nota e/o offerta presenti. Gli importi già inseriti restano dove la bozza non ne indica altri.', ok: 'Sostituisci' });
      if (!ok) return;
    }
    if (parti.includes('nota') && r.nota) n.testo = r.nota;
    if (!String(o.titolo || '').trim() && r.titolo) o.titolo = r.titolo;
    if (r.oggetto && (parti.includes('offerta') || !String(o.oggetto || '').trim())) o.oggetto = r.oggetto;
    if (parti.includes('offerta')) {
      if (r.prestazioni.length) {
        const vecchie = state.proforma.righe;
        state.proforma.righe = r.prestazioni.map((x, i) => ({ testoLibero: true, testo: x.testo, qt: '1', prezzo: x.prezzo || vecchie[i]?.prezzo || '' }));
      }
      if (r.esclusioni.length) o.esclusioni = r.esclusioni.join('\n');
      if (r.pagamento.length) o.pagamento = r.pagamento.join('\n');
      if (r.speseCommittente.length) o.speseCommittente = r.speseCommittente;
    }
    chiudi();
    rerender();
    mostraSezione(parti.includes('nota') ? 'nota' : 'offerta');
    const segnaposto = JSON.stringify(r).includes('[da ');
    toast(`Bozza inserita: rileggila prima di scaricare la lettera${segnaposto ? ' · ci sono parti [da completare] o [da verificare]' : ''}`, false, segnaposto ? { label: 'Ho capito', fn: () => {} } : null);
  };
  const btnCopia = h('button', { type: 'button', class: 'btn primary', html: `${icona('copia', 16)}<span>Copia il prompt</span>`,
    onclick: async () => {
      const ok = await copiaTesto(prompt);
      btnCopia.innerHTML = `${icona(ok ? 'spunta' : 'copia', 16)}<span>${ok ? 'Copiato!' : 'Copia non riuscita: selezionalo qui sotto'}</span>`;
      if (!ok) anteprima.open = true;
    } });
  const anteprima = h('details', { class: 'assist-prompt' }, h('summary', {}, `Vedi il prompt (${prompt.length.toLocaleString('it-IT')} caratteri)`), h('textarea', { rows: 8, readonly: true }, prompt));
  dlg.append(
    h('div', { class: 'testa' }, h('div', { class: 'assist-titolo' }, h('span', { class: 'mod-icona', html: icona('ia', 18) }), h('div', {}, h('strong', {}, 'Bozza con la chat'), h('span', {}, 'Gratis: usi il tuo account di una chat di intelligenza artificiale (es. claude.ai)'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: chiudi }, 'Chiudi')),
    h('ol', { class: 'assist-passi' },
      h('li', {}, h('div', {}, h('strong', {}, 'Copia il prompt'), h('span', {}, 'Contiene le regole, un esempio di una tua lettera, gli appunti e i dati dell’immobile. Nome e codice fiscale del committente non ci sono.')),
        h('div', { class: 'assist-azioni' }, btnCopia), anteprima),
      h('li', {}, h('div', {}, h('strong', {}, 'Incollalo in una chat nuova'), h('span', {}, allegati.length
        ? 'Allega anche questi file (trascinali nella chat): se non li hai sul computer, scaricali da qui.'
        : 'Se hai foto o documenti della pratica (titoli edilizi, planimetrie), allegali nella chat e scrivili negli appunti.')),
        allegati.length ? h('div', { class: 'assist-file' }, allegati.map((f) => h('button', {
          type: 'button', class: 'chip-file', title: 'Scarica il file',
          onclick: () => (f.figura ? scaricaBlob(dataUrlBlob(f.figura.src), `${f.nome}.jpg`) : scaricaBlob(new Blob([Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0))], { type: f.tipo || 'application/octet-stream' }), f.nome)),
          html: `${icona('scarica', 14)}<span>${escHtml(f.nome)}</span>`,
        }))) : null,
        h('div', { class: 'assist-azioni' }, h('a', { class: 'btn', href: 'https://claude.ai/new', target: '_blank', rel: 'noopener' }, 'Apri claude.ai'))),
      h('li', {}, h('div', {}, h('strong', {}, 'Incolla qui la risposta'), h('span', {}, 'Copia tutto il blocco che la chat ti restituisce: l’app riempie nota, oggetto, punti, esclusioni, pagamento e spese.')),
        risposta, esito,
        h('div', { class: 'assist-azioni' }, h('button', { type: 'button', class: 'btn primary', onclick: applica }, 'Inserisci la bozza nella pratica')))));
  document.body.append(dlg);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  dlg.showModal();
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function dataUrlBlob(src) {
  const [testa, dati] = String(src).split(',');
  const tipo = (/data:([^;]+)/.exec(testa) || [])[1] || 'image/jpeg';
  return new Blob([Uint8Array.from(atob(dati), (c) => c.charCodeAt(0))], { type: tipo });
}

const pulsanteIa = (testo, parti) =>
  h('button', { type: 'button', class: 'btn ia', html: `${icona('ia', 16)}<span>${testo}</span>`, onclick: () => apriAssistente(parti) });

// Documenti della pratica da dare alla chat (titoli edilizi, visure, planimetrie, foto): restano nella pratica
async function aggiungiFonti(files) {
  for (const f of files) {
    try {
      const file = isHeic(f) ? await comeImmagineLeggibile(f) : f;
      (state.nota.fonti ||= []).push(await leggiFile(file));
    } catch (err) {
      toast(`${f.name}: ${err.message}`, true);
    }
  }
  rerender();
}

function boxFonti() {
  const fonti = (state.nota.fonti ||= []);
  const input = h('input', { type: 'file', multiple: true, accept: 'application/pdf,.pdf,image/*,.heic,.heif', hidden: true, onchange: (e) => { const files = [...e.target.files]; e.target.value = ''; aggiungiFonti(files); } });
  const zona = h('div', { class: 'dropzone fonti' },
    h('div', { class: 'icon', html: icona('graffetta', 22) }),
    h('div', { class: 'txt' }, h('strong', {}, 'Documenti e foto per la bozza'),
      h('span', {}, 'Titoli edilizi, planimetrie, visure, foto del sopralluogo: restano nella pratica e il prompt li elenca, così li alleghi alla chat. Non finiscono nella lettera (per le immagini nella lettera usa le Figure).')),
    h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, '+ Carica'), input);
  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('drag'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('drag'));
  zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('drag'); aggiungiFonti([...e.dataTransfer.files]); });
  return h('div', { class: 'fonti-box' }, zona,
    fonti.length ? h('div', { class: 'assist-file' }, fonti.map((f, i) => h('span', { class: 'chip-file' },
      h('button', { type: 'button', class: 'link', onclick: () => apriFile(f), title: 'Apri' }, f.nome),
      h('button', { type: 'button', class: 'x', title: 'Togli', 'aria-label': `Togli ${f.nome}`, onclick: () => { fonti.splice(i, 1); rerender(); } }, '×')))) : null);
}

async function aggiungiFigure(files) {
  for (const f of files) {
    try {
      state.nota.figure.push({ src: await resizeImage(await comeImmagineLeggibile(f), 2200, 0.88), didascalia: '' });
    } catch (err) {
      toast(`${f.name}: ${err.message}`, true);
    }
  }
  rerender();
}

function sezioneNota() {
  const n = state.nota;
  const figure = (n.figure ||= []);
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, hidden: true, onchange: (e) => { const files = [...e.target.files]; e.target.value = ''; aggiungiFigure(files); } });
  return section('nota', 'Nota tecnica', null, 'Prima parte della lettera: spiega al cliente la situazione e perché serve la pratica. Si può anche non includere.',
    boxPdf('Appunti', null,
      h('p', { class: 'box-sub-desc' }, 'Scrivi liberamente cosa hai riscontrato e cosa proponi: tipo di pratica, immobile, estremi dei titoli edilizi, difformità, importi, pagamenti. Con "Bozza con la chat" l’app prepara il testo da incollare in una chat gratuita (es. claude.ai) insieme ai documenti; la risposta si incolla qui e riempie nota e offerta.'),
      areaTesto(['nota', 'appunti'], { righe: 8, ph: 'es. CILA in sanatoria per opere interne, appartamento al piano terra. Ultimo titolo del 04/11/1992 (prot. …). Dal sopralluogo: cucina ora chiusa, bagno senza nicchia vasca… Rilievo 300 €, pratica 1.200 €. Sanzione 1.000 €, diritti 100 €. Acconto 50% alla firma.' }),
      h('div', { class: 'add-row fine' },
        pulsanteIa('Bozza con la chat: nota e offerta', ['nota', 'offerta']),
        pulsanteIa('Solo la nota', ['nota']),
        h('span', { class: 'nota-campo' }, 'Gratis, con il tuo account della chat. L’app non invia nulla da sola: copi e incolli tu.')),
      boxFonti()),
    boxPdf('Nota', null,
      h('div', { class: 'grid' },
        h('div', { class: 'f s12' },
          h('label', { class: 'switch' },
            h('input', { type: 'checkbox', checked: n.includi !== false, onchange: (e) => { n.includi = e.target.checked; rerender(); } }),
            'Includi la nota tecnica nel documento (prima dell’offerta)')),
        field({ k: 'titolo', l: 'Titolo', s: 8 }, ['nota']),
        field({ k: 'data', l: 'Data (vuota = quella dell’offerta)', s: 4, t: 'date' }, ['nota']),
        h('div', { class: 'f s12' }, h('label', { for: 'notaTesto' }, 'Testo della nota'),
          areaTesto(['nota', 'testo'], { righe: 18, id: 'notaTesto', ph: 'Con riferimento all’immobile sito in …' }),
          h('span', { class: 'hint' }, 'Riga vuota = stacco tra paragrafi · righe che iniziano con "- " = elenco puntato · **testo** = grassetto. Luogo, data e firma li aggiunge l’app.')))),
    boxPdf('Figure', null,
      h('p', { class: 'box-sub-desc' }, 'Immagini dopo la nota (es. pianta dello stato legittimo e planimetria catastale), ognuna con la sua didascalia: "Figura 1: …".'),
      figure.length
        ? h('div', { class: 'photos' }, figure.map((f, i) =>
            h('div', { class: 'photo' },
              h('div', { class: 'p-img' }, h('img', { src: f.src, alt: f.didascalia || `Figura ${i + 1}` })),
              h('div', { class: 'p-body' },
                h('label', { class: 'p-label', for: `fig-${i}` }, `Didascalia figura ${i + 1}`),
                h('input', { type: 'text', id: `fig-${i}`, placeholder: 'es. Pianta come presentata nella pratica prot. … – stato legittimo', value: f.didascalia || '', oninput: (e) => { f.didascalia = e.target.value; save(); } }),
                h('div', { class: 'p-tools' },
                  h('div', {},
                    i > 0 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta prima', onclick: () => { figure.splice(i - 1, 0, figure.splice(i, 1)[0]); rerender(); } }, '←') : null,
                    i < figure.length - 1 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta dopo', onclick: () => { figure.splice(i + 1, 0, figure.splice(i, 1)[0]); rerender(); } }, '→') : null),
                  h('div', {}, h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { figure.splice(i, 1); rerender(); } }, 'Elimina')))))))
        : h('p', { class: 'empty' }, 'Nessuna figura.'),
      h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, '+ Aggiungi figure'), input)));
}

function sezioneOfferta() {
  const o = state.offerta;
  const p = state.proforma;
  const spese = (o.speseCommittente ||= []);
  if (!p.righe?.length) p.righe = [{ testoLibero: true, testo: '', qt: '1', prezzo: '' }];
  return section('offerta', 'Offerta economica', null, 'Oggetto dell’incarico, prestazioni con i loro importi, esclusioni, pagamento e spese a carico del committente.',
    boxPdf('Oggetto', null,
      h('div', { class: 'grid' },
        field({ k: 'titolo', l: 'Titolo breve della pratica (per elenchi e nomi dei file)', s: 6, ph: 'es. CILA in sanatoria' }, ['offerta']),
        field({ k: 'data', l: 'Data dell’offerta', s: 3, t: 'date' }, ['offerta']),
        field({ k: 'luogo', l: 'Luogo (vuoto = comune dello studio)', s: 3 }, ['offerta']),
        h('div', { class: 'f s12' }, h('label', { for: 'offOggetto' }, 'Oggetto: completa la frase «L’oggetto dell’incarico è inerente …»'),
          areaTesto(['offerta', 'oggetto'], { righe: 3, id: 'offOggetto', ph: 'alla regolarizzazione mediante C.I.L.A. in sanatoria di opere interne realizzate in un’unità residenziale sita in …, catastalmente identificata al Fg. … Mapp. … Sub. …' }))),
      h('div', { class: 'add-row fine' }, pulsanteIa('Bozza dell’offerta con la chat', ['offerta']),
        h('span', { class: 'nota-campo' }, 'Usa gli appunti e i documenti della scheda Nota tecnica.'))),
    boxPdf('Prestazioni', null,
      h('div', { class: 'prests' }, p.righe.map((r, i) =>
        h('div', { class: 'prest' },
          h('div', { class: 'prest-head' },
            h('strong', {}, `Punto ${i + 1}`),
            h('div', { class: 'tools' },
              i > 0 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta su', onclick: () => { p.righe.splice(i - 1, 0, p.righe.splice(i, 1)[0]); rerender(); } }, '↑') : null,
              i < p.righe.length - 1 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta giù', onclick: () => { p.righe.splice(i + 1, 0, p.righe.splice(i, 1)[0]); rerender(); } }, '↓') : null,
              p.righe.length > 1 ? h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { p.righe.splice(i, 1); rerender(); } }, 'Elimina') : null)),
          h('div', { class: 'grid' },
            h('div', { class: 'f s9' }, h('label', { for: `prest-${i}` }, 'Descrizione (una attività per riga)'),
              h('textarea', { id: `prest-${i}`, rows: 4, oninput: (e) => { r.testo = e.target.value; r.testoLibero = true; save(); } }, r.testo || '')),
            field({ k: 'prezzo', l: 'Importo', s: 3, t: 'number', u: '€' }, ['proforma', 'righe', i]))))),
      h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { p.righe.push({ testoLibero: true, testo: '', qt: '1', prezzo: '' }); rerender(); } }, '+ Aggiungi punto')),
      h('div', { class: 'grid pf-totali' },
        campoFisso('offTotale', 'Totale prestazioni', () => euro(totaliProforma().totale), { s: 3 }),
        campoFisso('offContributo', 'Contributo integrativo 4%', () => euro(totaliProforma().contributo), { s: 3 }),
        campoFisso('offBollo', 'Marca da bollo', () => (totaliProforma().bollo ? euro(totaliProforma().bollo) : 'non dovuta'), { s: 3 }),
        campoFisso('offCompenso', 'Totale nella lettera', () => euro(totaliProforma().imponibile), { s: 3, forte: true })),
      h('div', { class: 'add-row fine' }, pulsanteProforma('Crea proforma (acconto, saldo o intero)'),
        h('span', { class: 'nota-campo' }, 'Il proforma si calcola sull’onorario di questa offerta e prende il primo numero libero del registro.'))),
    boxPdf('Condizioni', null,
      h('div', { class: 'grid' },
        h('div', { class: 'f s6' }, h('label', { for: 'offEsclusioni' }, 'Non sono comprese (una voce per riga)'), areaTesto(['offerta', 'esclusioni'], { righe: 8, id: 'offEsclusioni' })),
        h('div', { class: 'f s6' }, h('label', { for: 'offPagamento' }, 'Modalità e termini di pagamento (una voce per riga)'), areaTesto(['offerta', 'pagamento'], { righe: 8, id: 'offPagamento' }),
          h('span', { class: 'hint' }, 'Le clausole su proforma, interessi di mora, norme deontologiche e termini sono fisse, come nel modello.')))),
    boxPdf('Spese', null,
      h('p', { class: 'box-sub-desc' }, 'Spese amministrative a carico del committente, non comprese nel compenso (sanzioni, diritti di segreteria…): nella lettera compaiono in grassetto, «€ importo per descrizione».'),
      spese.length
        ? spese.map((x, i) => h('div', { class: 'grid spesa' },
            field({ k: 'testo', l: `Descrizione spesa ${i + 1}`, s: 8, ph: 'es. diritti di segreteria relativi alla presentazione della pratica presso il Comune di …' }, ['offerta', 'speseCommittente', i]),
            field({ k: 'importo', l: 'Importo', s: 3, t: 'number', u: '€' }, ['offerta', 'speseCommittente', i]),
            h('div', { class: 'f s1 spesa-elimina' },
              h('button', { type: 'button', class: 'btn small ghost danger', title: 'Togli la spesa', 'aria-label': `Togli la spesa ${i + 1}`, onclick: () => { spese.splice(i, 1); rerender(); } }, '×'))))
        : h('p', { class: 'empty' }, 'Nessuna spesa indicata: il paragrafo non compare nella lettera.'),
      h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { spese.push({ testo: '', importo: '' }); rerender(); } }, '+ Aggiungi spesa'))));
}
// ---------------------------------------------------------------------------
// Lettere di incarico e offerta: anteprima e download (il sopralluogo ha i suoi pulsanti, più sotto)
// ---------------------------------------------------------------------------
const DOCUMENTI_EXTRA = {
  incarico: {
    url: 'api/incarico',
    nome: () => (catasto() ? 'Lettera di incarico catasto' : 'Informativa e lettera di incarico'),
    separate: true, // APE: le due pagine si scaricano come due PDF distinti; catasto: un solo PDF
    // APE FVG: con "Scarica" anche la pagina della Visita (i tre documenti da far firmare)
    conVisita: () => fvg(),
    controlla: () => {
      const mancano = [];
      if (!state.committente?.nome) mancano.push('il committente');
      if (!state.immobile?.via && !state.immobile?.citta) mancano.push("l'indirizzo dell'immobile");
      if (state.proforma.righe.some((r) => !String(r.prezzo || '').trim())) mancano.push('il prezzo delle prestazioni (scheda Incarico)');
      return mancano.length ? `Manca ${mancano.join(', ')}` : '';
    },
  },
  offerta: {
    url: 'api/offerta',
    nome: () => 'Offerta economica',
    conVisita: () => false,
    controlla: () => {
      const mancano = [];
      if (!state.committente?.nome) mancano.push('il committente');
      if (!String(state.offerta?.oggetto || '').trim()) mancano.push("l'oggetto dell'incarico");
      if (state.proforma.righe.some((r) => !String(r.testo || '').trim() || !String(r.prezzo || '').trim())) mancano.push('descrizione e importo di ogni punto');
      return mancano.length ? `Manca ${mancano.join(', ')}` : '';
    },
  },
};

async function generaDocumento(tipo, archivia = false) {
  const doc = DOCUMENTI_EXTRA[tipo];
  const res = await fetch(`${doc.url}${archivia ? '?archivia=1' : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Errore nella generazione: ${doc.nome()}`);
  const errore = res.headers.get('X-Archivio-Errore');
  return {
    blob: await res.blob(),
    nome: decodeURIComponent(res.headers.get('X-Nome-File') || `${doc.nome()}.pdf`),
    archiviato: res.headers.get('X-Archivio') === '1',
    erroreArchivio: errore ? decodeURIComponent(errore) : '',
  };
}

let previewUrl;
let aggiornaAnteprimaCorrente = () => {};

// Anteprima di un PDF nel pannello laterale: genera() restituisce { blob }
async function mostraAnteprima(titolo, genera) {
  aggiornaAnteprimaCorrente = () => mostraAnteprima(titolo, genera);
  $('#previewTitle').textContent = `Anteprima · ${titolo}`;
  $('#preview').hidden = false;
  $('#previewSpinner').hidden = false;
  try {
    const { blob } = await genera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    $('#previewFrame').src = previewUrl;
  } catch (err) {
    toast(err.message, true);
  } finally {
    $('#previewSpinner').hidden = true;
  }
}

function anteprimaDocumento(tipo) {
  const avviso = DOCUMENTI_EXTRA[tipo].controlla();
  if (avviso) toast(avviso, true);
  return mostraAnteprima(DOCUMENTI_EXTRA[tipo].nome(), () => generaDocumento(tipo));
}

function scaricaBlob(blob, nome) {
  const a = h('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// documento in uno o più file (informativa APE: una pagina per file)
async function generaFileSeparati(tipo) {
  const res = await fetch(`${DOCUMENTI_EXTRA[tipo].url}?archivia=1&separate=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Errore nella generazione: ${DOCUMENTI_EXTRA[tipo].nome()}`);
  return body;
}

async function scaricaDocumento(tipo, btn) {
  const doc = DOCUMENTI_EXTRA[tipo];
  const avviso = doc.controlla();
  if (avviso) return toast(avviso, true);
  btn.disabled = true;
  try {
    // l'esportazione salva anche la pratica
    const id = await salvaInArchivio();
    let archiviato;
    let erroreArchivio;
    if (doc.separate) {
      const r = await generaFileSeparati(tipo);
      ({ archiviato, erroreArchivio } = r);
      for (const [i, f] of (salvatoNellaCartella(archiviato) ? [] : r.file).entries()) {
        const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
        // piccola pausa tra un download e l'altro: alcuni browser ignorano download troppo ravvicinati
        if (i) await new Promise((ok) => setTimeout(ok, 400));
        scaricaBlob(new Blob([bytes], { type: 'application/pdf' }), f.nome);
      }
      // APE FVG: i documenti da stampare e far firmare sono tre (informativa, lettera di incarico, pagina della Visita)
      if (doc.conVisita()) {
        if (!salvatoNellaCartella(archiviato)) await new Promise((ok) => setTimeout(ok, 400));
        const v = await esportaVisitaDaFirmare();
        if (v.errore) erroreArchivio ||= v.errore;
      }
    } else {
      const r = await generaDocumento(tipo, true);
      ({ archiviato, erroreArchivio } = r);
      if (!salvatoNellaCartella(archiviato)) scaricaBlob(r.blob, r.nome);
    }
    const cosa = tipo === 'offerta' ? 'Offerta economica'
      : catasto() ? 'Lettera di incarico'
        : doc.conVisita() ? 'Informativa, lettera di incarico e pagina della Visita da firmare' : 'Informativa e lettera di incarico';
    if (salvatoNellaCartella(archiviato)) toast(`${cosa}: PDF salvato nella cartella della pratica`, false, AZIONE_CARTELLA);
    else toast(`${cosa}: PDF scaricato · dati salvati nella pratica n. ${id}${archiviato ? notaCartella() : ''}${notaDownload()}`);
    avvisaErroreDrive();
    if (erroreArchivio) setTimeout(() => toast(erroreArchivio, true), 2500);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// Visita: pagina da stampare e far firmare, salvata nella cartella della APE (o scaricata se manca)
async function esportaVisitaDaFirmare() {
  const res = await fetch('api/visita-da-firmare?archivia=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Pagina della Visita non creata');
  const nome = decodeURIComponent(res.headers.get('X-Nome-File') || 'Visita da firmare.pdf');
  const blob = await res.blob();
  const nellaCartella = salvatoNellaCartella(res.headers.get('X-Archivio') === '1');
  if (!nellaCartella) scaricaBlob(blob, nome);
  const errore = res.headers.get('X-Archivio-Errore');
  return { nome, nellaCartella, errore: errore ? decodeURIComponent(errore) : '' };
}

async function scaricaVisitaDaFirmare(btn) {
  btn.disabled = true;
  try {
    await salvaInArchivio();
    const { nome, nellaCartella, errore } = await esportaVisitaDaFirmare();
    if (nellaCartella) {
      toast(`Pagina da firmare salvata nella cartella della pratica: ${nome}`, false, AZIONE_CARTELLA);
    } else {
      toast(`Pagina da firmare scaricata${notaDownload()}`);
    }
    if (errore) setTimeout(() => toast(errore, true), 2500);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// Allegati FVG: i documenti presenti, rinominati (cartella o zip); quelli mancanti vengono segnalati
$('#btnZip').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const presenti = statoAllegati(state).filter((a) => a.presente);
  if (!presenti.length) return toast('Nessun allegato disponibile', true);
  btn.disabled = true;
  btn.textContent = 'Preparazione…';
  try {
    // con la cartella della APE: sottocartella "ALLEGATI FVG RIF. …" con i file sciolti; senza, zip in Download
    if (state.cartella) {
      const r = await api('api/allegati?cartella=1', { method: 'POST', body: JSON.stringify(state) });
      const apri = { label: 'Apri cartella', fn: () => api('api/apri-cartella', { method: 'POST', body: JSON.stringify({ cartella: r.cartella }) }).catch((err) => toast(err.message, true)) };
      const mancanti = r.mancanti.join(', ');
      toast(mancanti ? `Cartella allegati salvata con ${r.file.length} allegati su ${ALLEGATI_FVG.length} · mancano: ${mancanti}` : `Cartella allegati salvata con tutti i ${ALLEGATI_FVG.length} allegati`, Boolean(mancanti), apri);
      return;
    }
    const res = await fetch('api/allegati', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Zip non creato');
    const nome = decodeURIComponent(res.headers.get('X-Nome-File') || 'Allegati FVG.zip');
    scaricaBlob(await res.blob(), nome);
    const mancanti = decodeURIComponent(res.headers.get('X-Mancanti') || '');
    toast(`${mancanti ? `Zip scaricato con ${presenti.length} allegati su ${ALLEGATI_FVG.length} · mancano: ${mancanti}` : `Zip scaricato con tutti i ${ALLEGATI_FVG.length} allegati`}${notaDownload()}`, Boolean(mancanti));
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scarica';
  }
});

$('#btnPrevInf').addEventListener('click', () => anteprimaDocumento('incarico'));
$('#btnInf').addEventListener('click', (e) => scaricaDocumento('incarico', e.currentTarget));
$('#btnPrevOff').addEventListener('click', () => anteprimaDocumento('offerta'));
$('#btnOff').addEventListener('click', (e) => scaricaDocumento('offerta', e.currentTarget));
$('#btnProforma').addEventListener('click', (e) => creaProformaDaPratica(e.currentTarget));
function sezioneFoto() {
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, hidden: true, onchange: (e) => { const files = [...e.target.files]; e.target.value = ''; aggiungiFoto(files); } });
  const list = state.foto || (state.foto = []);
  return section('foto', 'Documentazione fotografica', '#75E0CC', 'Due foto per riga, ognuna con il suo titolo sopra l\'immagine',
    list.length
      ? h('div', { class: 'photos' },
          list.map((f, i) => { let sostituisci; return (
            h('div', { class: 'photo' },
              h('div', { class: 'p-img' },
                h('img', { src: f.src, alt: f.didascalia || `Foto ${i + 1}` }),
                h('div', { class: 'p-rot' },
                  h('button', { type: 'button', class: 'btn small', title: 'Ruota a sinistra', 'aria-label': 'Ruota a sinistra', html: ICONA_RUOTA_SX, onclick: (e) => ruotaFoto(i, -90, e.currentTarget) }),
                  h('button', { type: 'button', class: 'btn small', title: 'Ruota a destra', 'aria-label': 'Ruota a destra', html: ICONA_RUOTA_DX, onclick: (e) => ruotaFoto(i, 90, e.currentTarget) }))),
              h('div', { class: 'p-body' },
                h('label', { class: 'p-label', for: `foto-${i}` }, `Titolo / didascalia foto ${i + 1}`),
                h('input', { type: 'text', id: `foto-${i}`, placeholder: 'es. Facciata nord, Caldaia, Finestra soggiorno', value: f.didascalia || '', oninput: (e) => { f.didascalia = e.target.value; save(); } }),
                h('div', { class: 'p-tools' },
                  h('div', {},
                    i > 0 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta prima', onclick: () => move('foto', i, -1) }, '←') : null,
                    i < list.length - 1 ? h('button', { type: 'button', class: 'btn small ghost', title: 'Sposta dopo', onclick: () => move('foto', i, 1) }, '→') : null),
                  h('div', {},
                    h('button', { type: 'button', class: 'btn small ghost', title: "Sostituisci l'immagine mantenendo il titolo", onclick: () => sostituisci.click() }, 'Sostituisci'),
                    h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { list.splice(i, 1); rerender(); } }, 'Elimina')),
                  (sostituisci = h('input', { type: 'file', accept: 'image/*,.heic,.heif', hidden: true, onchange: (e) => { const file = e.target.files[0]; e.target.value = ''; if (file) sostituisciFoto(i, file); } }))))));
          }))
      : h('p', { class: 'empty' }, 'Nessuna foto: nel PDF compariranno i riquadri vuoti.'),
    h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, '+ Aggiungi foto'), input));
}

// ---------------------------------------------------------------------------
// Schede della pratica aperta: dipendono dal modulo (e, per l'APE, dalla versione)
// ---------------------------------------------------------------------------
function sezioniPratica() {
  const base = [['committente', 'Committente'], ['immobile', 'Immobile']];
  if (modulo() === 'pratica') return [...base, ['nota', 'Nota tecnica'], ['offerta', 'Offerta economica']];
  if (!fvg()) return [...base, ['incarico', 'Incarico']];
  return [...base,
    ['incarico', 'Incarico'],
    ['visita', 'Visita'],
    ['documenti', 'Documenti'],
    ['rilievo', 'Rilievo'],
    ['confini', 'Ambienti di confine'],
    ['porte', 'Porte', 'porte'],
    ['infissi', 'Serramenti', 'infissi'],
    ['impianti', 'Riscaldamento', 'riscaldamento'],
    ['raffrescamento', 'Raffrescamento', 'raffrescamento'],
    ['altri', 'Stufe e altri apparecchi', 'altri'],
    ['foto', 'Foto', 'foto'],
    ['stampa', 'Stampa'],
  ];
}
let SECTIONS = [];

function sezioneImmobile() {
  // anno di costruzione e di ristrutturazione dell'impianto servono solo al sopralluogo (APE FVG)
  const campi = fields.immobile.filter((d) => fvg() || !['anno', 'annoRistr'].includes(d.k));
  const iFg = campi.findIndex((d) => d.k === 'fg');
  const sec = section('immobile', 'Immobile', null, null,
    h('div', { class: 'add-row copia-indirizzo' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: copiaIndirizzoCommittente }, "Copia l'indirizzo del committente")),
    // prima dei dati catastali, la planimetria da cui leggerli
    boxPdf('Immobile', null,
      grid(campi.slice(0, iFg), ['immobile']),
      boxPlanimetria(),
      // il tipo di pratica APE è nella scheda Incarico (è la motivazione della lettera)
      grid(campi.slice(iFg).filter((d) => d.k !== 'pratica'), ['immobile'])));
  return fvg() ? conIntestazione(fotoImmobile(), sec) : sec;
}

function sezioniSopralluogo() {
  const acc = coloreModulo();
  return [
    sezioneVisita(),
    sezioneDocumenti(),
    sezioneRilievo(),
    section('confini', 'Ambienti di confine', null, 'Seleziona tutti quelli presenti',
      h('div', { class: 'confini-box' },
        ...fields.confini.map((d, i) => h('div', { class: 'box-sub', style: `--accent:${acc};--accent-ink:#fff`, 'data-label': i ? 'Non riscaldato' : 'Riscaldato' },
          h('p', { class: 'box-sub-desc' }, i ? 'Ambiente di confine NON riscaldato' : 'Ambiente di confine riscaldato'),
          grid([{ ...d, l: '' }], ['confini']))))),
    section('porte', 'Porte', null, 'Una scheda per ogni porta', repeater({ key: 'porte', label: 'Porta', defs: fields.porta, accent: acc, numbered: 'n' })),
    section('infissi', 'Serramenti', null, 'Una scheda per ogni infisso; usa "Duplica" per quelli simili',
      repeater({ key: 'infissi', label: 'Infisso', defs: fields.infisso, accent: acc, numbered: 'n' })),
    section('impianti', 'Impianto di riscaldamento', null, 'Codici di fornitura e generatori (caldaie, pompe di calore, …)',
      boxPdf('Codici', null, grid(fields.codici, ['codici'])),
      repeater({ key: 'riscaldamento', label: 'Impianto', defs: fields.riscaldamento, accent: acc, newItem: () => ({ regolazione: [], terminali: [] }) })),
    section('raffrescamento', 'Raffrescamento', null, 'Condizionatori e pompe di calore aria-aria. I box lasciati vuoti non compaiono nel PDF',
      repeater({ key: 'raffrescamento', label: 'Condizionatore', defs: fields.raffrescamento, accent: acc, pdf: true, vuoto: 'Nessun condizionatore: la sezione non comparirà nel PDF.' })),
    section('altri', 'Stufe e altri apparecchi', null, 'Stufe, caminetti, scaldacqua, solare, fotovoltaico… (sezione aggiuntiva, compare nel PDF solo se compilata)',
      repeater({ key: 'altri', label: 'Apparecchio', defs: fields.altro, accent: acc, pdf: true })),
    sezioneFoto(),
    section('stampa', 'Stampa del sopralluogo', null, 'Opzioni del PDF del documento di sopralluogo di questa pratica.',
      h('div', { class: 'f' }, h('label', {}, 'Grafica del documento'),
        seg([['classica', 'Classica'], ['nuova', 'Nuova (prova)']], state.opzioni?.stile === 'nuovo' ? 'nuova' : 'classica', (val) => {
          state.opzioni = { ...state.opzioni, stile: val === 'nuova' ? 'nuovo' : '' };
          save();
        })),
      h('label', { class: 'switch' },
        h('input', { type: 'checkbox', checked: !!state.opzioni?.footer, onchange: (e) => { state.opzioni = { ...state.opzioni, footer: e.target.checked }; save(); } }),
        'Aggiungi a piè di pagina i recapiti dello studio (il numero di pagina e, sull\'ultima pagina, giorno e ora di esportazione ci sono sempre)'),
      h('label', { class: 'switch' },
        h('input', { type: 'checkbox', checked: state.opzioni?.soloCompilati !== false, onchange: (e) => { state.opzioni = { ...state.opzioni, soloCompilati: e.target.checked }; save(); } }),
        'Nel PDF del sopralluogo mostra solo i dati compilati (disattiva per stampare il modulo completo, da compilare a mano)')),
  ];
}

function render() {
  uid = 0;
  CALCOLATI.clear();
  SECTIONS = sezioniPratica();
  if (!idSezioni().includes(sezioneAttiva)) sezioneAttiva = idSezioni()[0];
  document.documentElement.style.setProperty('--mod', coloreModulo());
  document.documentElement.style.setProperty('--mod2', MODULI[modulo()].colore2);
  const form = $('#form');
  form.replaceChildren(
    sezioneCommittente(),
    sezioneImmobile(),
    ...(modulo() === 'pratica' ? [sezioneNota(), sezioneOfferta()] : [sezioneIncarico()]),
    ...(fvg() ? sezioniSopralluogo() : []),
  );
  renderNav();
  aggiornaRiepilogoProforma();
  aggiornaBarra();
}

// Quanto è compilata una sezione: [campi compilati, campi da compilare], oppure null (nessun indicatore).
// Si contano solo i dati che servono davvero (es. del committente nome, codice fiscale e indirizzo; e-mail e
// cellulare sono facoltativi). Le sezioni facoltative (raffrescamento, stufe) senza schede non hanno indicatore.
const pieno = (v) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const contaCampi = (obj, defs) => defs.filter((d) => !d.auto).reduce(([f, t], d) => [f + (pieno(obj?.[d.k]) ? 1 : 0), t + 1], [0, 0]);
const contaSi = (...valori) => [valori.filter(Boolean).length, valori.length];
const somma = (...parti) => parti.filter(Boolean).reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
const soloCampi = (defs, chiavi) => defs.filter((d) => chiavi.includes(d.k));
function completamento(id) {
  const s = state;
  const schede = (key, defs, facoltativo = false) => {
    const l = s[key] || [];
    if (!l.length) return facoltativo ? null : [0, 1];
    return somma(...l.map((it) => contaCampi(it, defs)));
  };
  const prezzi = () => (s.proforma?.righe || []).length > 0 && s.proforma.righe.every((r) => pieno(r.prezzo));
  switch (id) {
    case 'committente': return contaCampi(s.committente, soloCampi(fields.committente, ['nome', 'cf', 'via', 'civ', 'citta', 'cap']));
    case 'immobile': return contaCampi(s.immobile, soloCampi(fields.immobile, ['via', 'civ', 'citta', 'cap', 'fg', 'mapp', 'sub', ...(fvg() ? ['anno'] : [])]));
    case 'incarico': return catasto()
      ? contaSi(pieno(s.catasto?.data), pieno(s.catasto?.motivazione), pieno(s.informativa?.data), prezzi())
      : contaSi(pieno(s.informativa?.data), pieno(s.immobile?.pratica), prezzi());
    case 'visita': return contaSi(pieno(s.visita?.numero), pieno(s.visita?.data), pieno(s.certificatore?.nome), (s.presenti || []).length > 0, Boolean(s.pagine?.visita?.data));
    case 'documenti': return contaSi(...DOCUMENTI.map((_, i) => pieno(s.documenti?.[i]?.stato)));
    case 'rilievo': return contaSi((s.rilievo || []).some((r) => r && r.src) || Boolean(s.pagine?.rilievo?.data));
    case 'confini': return contaSi(pieno(s.confini?.risc) || pieno(s.confini?.nonRisc));
    case 'porte': return schede('porte', fields.porta);
    case 'infissi': return schede('infissi', fields.infisso);
    case 'impianti': return somma(contaCampi(s.codici, fields.codici), schede('riscaldamento', fields.riscaldamento));
    case 'raffrescamento': return schede('raffrescamento', fields.raffrescamento, true);
    case 'altri': return schede('altri', fields.altro.filter((d) => d.k !== 'note'), true);
    case 'foto': return (s.foto || []).length ? somma(...s.foto.map((f) => contaSi(Boolean(f.src), pieno(f.didascalia)))) : [0, 1];
    default: return null;
  }
}

// Indicatore nel menu: cerchio vuoto (da fare), anello che si riempie (in corso), cerchio nero con la spunta (completa)
function spunta(id) {
  const c = completamento(id);
  if (!c) return '';
  const [f, t] = c;
  const titolo = f >= t ? 'Sezione completa' : f ? `Compilata in parte (${f} di ${t})` : 'Da compilare';
  if (f >= t) return `<svg viewBox="0 0 18 18" width="18" height="18" aria-label="${titolo}"><title>${titolo}</title><circle cx="9" cy="9" r="8" fill="currentColor"/><path d="M5.2 9.3l2.4 2.4 5-5.2" fill="none" stroke="var(--spunta-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const lung = 2 * Math.PI * 7;
  const arco = f ? `<circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="${(lung * f) / t} ${lung}" transform="rotate(-90 9 9)"/>` : '';
  return `<svg viewBox="0 0 18 18" width="18" height="18" aria-label="${titolo}"><title>${titolo}</title><circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="${f ? 'none' : '2.2 2'}"/>${arco}</svg>`;
}
function aggiornaSpunte() {
  document.querySelectorAll('#sidenav a[data-id]').forEach((a) => {
    const el = a.querySelector('.spunta');
    if (el) el.innerHTML = spunta(a.dataset.id);
  });
}

function renderNav() {
  const nav = $('#sidenav');
  nav.replaceChildren(
    h('div', { class: 'sidenav-titolo' }, h('span', { class: 'mod-icona', html: icona(MODULI[modulo()].icona, 16) }), etichettaModulo(state)),
    ...SECTIONS.map(([id, label, key]) => {
      const n = key ? (state[key] || []).length : null;
      return h('a', {
        href: `#p/${id}`, 'data-id': id, class: id === sezioneAttiva ? 'active' : null,
        onclick: (e) => { e.preventDefault(); mostraSezione(id); },
      }, h('span', { class: 'spunta', 'aria-hidden': 'false', html: spunta(id) }), h('span', { class: 'nav-label' }, label), n != null ? h('span', { class: 'count' }, String(n)) : null);
    }));
}

function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
  save();
}
// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
// azione: { label, fn } per un pulsante nel messaggio (es. "Apri cartella")
function toast(msg, isError = false, azione = null) {
  const t = $('#toast');
  t.replaceChildren(document.createTextNode(msg));
  if (azione) t.append(h('button', { type: 'button', class: 'toast-azione', onclick: () => { t.className = 'toast'; azione.fn(); } }, azione.label));
  t.className = `toast show${isError ? ' err' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), azione ? 8000 : isError ? 6000 : 3000);
}

// ---------------------------------------------------------------------------
// Esportazione: con la cartella della APE i documenti vanno solo lì (niente copia in Download);
// senza, si scaricano nel browser come sempre
// ---------------------------------------------------------------------------
const apriCartellaApe = () => api('api/apri-cartella', { method: 'POST', body: JSON.stringify({ cartella: state.cartella }) }).catch((err) => toast(err.message, true));
const AZIONE_CARTELLA = { label: 'Apri cartella', fn: apriCartellaApe };
const salvatoNellaCartella = (archiviato) => Boolean(archiviato && state.cartella);
const notaDownload = () => (state.cartella ? '' : ' · scaricato in Download: scegli la cartella della pratica (scheda Committente) per salvarlo direttamente lì');

function checkCodiceFiscale(cf) {
  cf = cf.toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return 'Formato del codice fiscale non valido';
  const odd = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf[i];
    if (i % 2 === 0) sum += odd[c];
    else sum += /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65;
  }
  return String.fromCharCode(65 + (sum % 26)) === cf[15] ? '' : 'Carattere di controllo errato: verifica il codice fiscale';
}

const readAsDataURL = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

// Le foto HEIC/HEIF (formato predefinito dell'iPhone) vengono convertite in JPEG dal server
const isHeic = (file) => /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
async function comeImmagineLeggibile(file) {
  if (!isHeic(file)) return file;
  const res = await fetch('api/heic', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Conversione HEIC non riuscita');
  return new File([await res.blob()], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}

// Ridimensiona un'immagine a JPEG (riduce il peso del PDF e della richiesta)
async function resizeImage(file, maxSide = 1800, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Formato immagine non supportato dal browser'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function aggiungiFoto(files) {
  const heic = files.filter(isHeic).length;
  if (heic) toast(`Conversione di ${heic} foto HEIC in corso…`);
  for (const f of files) {
    try {
      state.foto.push({ src: await resizeImage(await comeImmagineLeggibile(f), 1600, 0.82), didascalia: '' });
    } catch (err) {
      toast(`${f.name}: ${err.message}`, true);
    }
  }
  if (state.foto.length && !state.allegati.foto) state.allegati.foto = 'P';
  rerender();
}

// ---------------------------------------------------------------------------
// Documento d'identità
// ---------------------------------------------------------------------------
const PARTICELLE = new Set(['di', 'de', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'dal', 'dalla', 'al', 'alla', 'sul', 'sulla', 'in', 'e']);
const titleCase = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|[\s'’\-/(])([a-zà-ù]+)/g, (m, sep, w) => (sep && PARTICELLE.has(w) ? sep + w : sep + w[0].toUpperCase() + w.slice(1)))
    .replace(/\(([a-z]{2})\)/g, (m, sigla) => `(${sigla.toUpperCase()})`);

// Prepara un'immagine per l'OCR: scala di grigi, contrasto e dimensione adatta al riconoscimento
function canvasPerOcr(source, w, h) {
  const target = 2400;
  const scale = Math.min(3, target / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.35)';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

async function immaginePerOcr(file) {
  file = await comeImmagineLeggibile(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`${file.name}: formato immagine non supportato (usa JPG, PNG o PDF)`));
      i.src = url;
    });
    return canvasPerOcr(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Converte le prime pagine di un PDF in immagini, con pdf.js (incluso nel progetto)
let pdfjs;
async function apriPdfjs(file) {
  if (!pdfjs) {
    pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.mjs';
  }
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

// Testo di un PDF ricostruito riga per riga (gli elementi con la stessa altezza formano una riga)
async function testoPdf(file, maxPagine = 12) {
  const doc = await apriPdfjs(file);
  const pagine = [];
  for (let n = 1; n <= Math.min(doc.numPages, maxPagine); n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const righe = new Map();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!righe.has(y)) righe.set(y, []);
      righe.get(y).push({ x: it.transform[4], w: it.width, s: it.str });
    }
    const testo = [...righe.entries()].sort((a, b) => b[0] - a[0]).map(([, parti]) => {
      parti.sort((a, b) => a.x - b.x);
      return parti.reduce((acc, p, i) => {
        if (!i) return p.s;
        const prev = parti[i - 1];
        return acc + (p.x - (prev.x + prev.w) > 12 ? '  ' : ' ') + p.s; // spazio doppio tra colonne
      }, '');
    }).join('\n');
    pagine.push(testo);
  }
  return { testo: pagine.join('\n\n'), doc };
}

async function pdfPerOcr(file, maxPagine = 2, doc) {
  doc ||= await apriPdfjs(file);
  const out = [];
  for (let n = 1; n <= Math.min(doc.numPages, maxPagine); n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, 2400 / Math.max(base.width, base.height)) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push(canvasPerOcr(canvas, canvas.width, canvas.height));
  }
  return out;
}

async function leggiDocumento(files) {
  const btn = $('#btnId');
  btn.disabled = true;
  btn.textContent = 'Preparazione…';
  try {
    const images = [];
    for (const f of files.slice(0, 4)) {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) images.push(...(await pdfPerOcr(f)));
      else images.push(await immaginePerOcr(f));
    }
    btn.textContent = images.length > 1 ? `Lettura di ${images.length} immagini…` : 'Lettura in corso…';
    const res = await fetch('api/id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images }) });
    const info = await res.json();
    if (!res.ok) throw new Error(info.error || 'Errore durante la lettura');
    applicaIdentita(info, 'OCR locale');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Carica documento';
  }
}

function applicaIdentita(info, fonte) {
  const c = state.committente;
  const nome = [titleCase(info.nome), titleCase(info.cognome)].filter(Boolean).join(' ');
  const set = (k, v) => { if (v) c[k] = v; };
  // documento di un'altra persona: l'indirizzo precedente non vale più
  if (nome && c.nome && nome.toLowerCase() !== c.nome.toLowerCase()) Object.assign(c, { via: '', civ: '', citta: '', cap: '' });
  set('nome', nome);
  set('cf', (info.codice_fiscale || '').toUpperCase().replace(/\s/g, ''));
  // l'indirizzo viene sostituito in blocco, per non mescolarlo con quello di un committente precedente
  if (info.indirizzo_via || info.comune) {
    c.via = titleCase(info.indirizzo_via);
    c.civ = info.indirizzo_civico || '';
    c.citta = info.comune ? `${titleCase(info.comune)}${info.provincia ? ` (${info.provincia.toUpperCase()})` : ''}` : '';
    c.cap = info.cap || '';
    capAutomatico.add('committente');
  }
  rerender();
  if (c.citta && !c.cap) aggiornaCap(['committente']);

  const dettagli = [
    ['Documento', info.tipo_documento],
    ['N.', info.numero_documento],
    ['Nato/a a', info.luogo_nascita && titleCase(info.luogo_nascita)],
    ['il', info.data_nascita],
    ['Scadenza', info.scadenza],
  ].filter(([, v]) => v);
  const box = $('#idResult');
  box.replaceChildren(h('div', { class: 'id-result' },
    `Dati letti con ${fonte}. `,
    dettagli.map(([k, v]) => h('span', {}, `${k} `, h('b', {}, v), ' · ')),
    'Controlla i campi qui sotto prima di generare il PDF.',
    info.testo ? h('details', {}, h('summary', {}, 'Testo riconosciuto'), h('pre', {}, info.testo)) : null));
  const trovati = ['nome', 'cf', 'via', 'citta'].filter((k) => c[k]).length;
  toast(trovati ? 'Dati del committente compilati dal documento' : 'Nessun dato riconosciuto: prova con una foto più nitida', !trovati);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
async function generaPdf(praticaId) {
  const res = await fetch(`api/pdf${praticaId ? `?pratica=${praticaId}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Errore nella generazione del PDF');
  }
  const errore = res.headers.get('X-Archivio-Errore');
  return { blob: await res.blob(), erroreArchivio: errore ? decodeURIComponent(errore) : '', archiviato: res.headers.get('X-Archivio') === '1' };
}

// stesso nome usato nella cartella di archivio (lib/nomi.js)
const nomeFile = () => `${nomePratica(state)}.pdf`;

$('#btnPreview').addEventListener('click', () => mostraAnteprima('Sopralluogo', () => generaPdf()));
$('#btnRefresh').addEventListener('click', () => aggiornaAnteprimaCorrente());
$('#btnClosePreview').addEventListener('click', () => ($('#preview').hidden = true));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#preview').hidden = true; });

$('#btnPdf').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Generazione…';
  try {
    // ogni esportazione archivia anche i dati, per poter riprendere la pratica in futuro
    const id = await salvaInArchivio();
    const { blob, erroreArchivio, archiviato } = await generaPdf(id);
    if (salvatoNellaCartella(archiviato)) {
      toast(`Sopralluogo salvato nella cartella della pratica: ${nomeFile()}`, false, AZIONE_CARTELLA);
    } else {
      scaricaBlob(blob, nomeFile());
      toast(`PDF generato · dati salvati nella pratica n. ${id}${notaDrive()}${notaDownload()}`);
    }
    avvisaErroreDrive();
    if (erroreArchivio) setTimeout(() => toast(erroreArchivio, true), 2500);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scarica PDF';
  }
});

// ---------------------------------------------------------------------------
// Archivio pratiche (database locale sul server)
// ---------------------------------------------------------------------------
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Errore ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function salvaInArchivio() {
  clearTimeout(saveTimer);
  const body = JSON.stringify({ dati: state });
  let saved;
  if (pratica.id) {
    try {
      saved = await api(`api/pratiche/${pratica.id}`, { method: 'PUT', body });
    } catch (err) {
      if (err.status !== 404) throw err; // pratica eliminata dall'archivio: ne crea una nuova
    }
  }
  saved ||= await api('api/pratiche', { method: 'POST', body });
  lastDbSave = ora();
  setPratica({ id: saved.id, dirty: false });
  scriviBozza(state);
  ultimoEsitoDrive = saved;
  return saved.id;
}

// esito dell'ultima copia nella cartella di archivio (Google Drive)
let ultimoEsitoDrive = {};
const notaCartella = () => (state.cartella ? ' · copia salvata nella cartella della pratica' : ' · copia salvata nella cartella principale (nessuna cartella della pratica)');
const notaDrive = () => (ultimoEsitoDrive.drive ? notaCartella() : '');
function avvisaErroreDrive() {
  if (ultimoEsitoDrive.driveErrore) setTimeout(() => toast(ultimoEsitoDrive.driveErrore, true), 2500);
}

$('#btnSave').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const nuova = !pratica.id;
    const id = await salvaInArchivio();
    toast(`${nuova ? `Pratica n. ${id} creata nell'archivio` : `Pratica n. ${id} salvata`}${notaDrive()}`);
    avvisaErroreDrive();
  } catch (err) {
    toast(`Salvataggio non riuscito: ${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
});

// Finestra di conferma interna alla pagina: window.confirm non è disponibile in tutti i browser
// (nel browser integrato dell'app risponde sempre "no" senza mostrare nulla)
let annullaConfermaInSospeso = null;
function chiediConferma({ titolo, messaggio, ok = 'Conferma', pericolo = false }) {
  const dlg = $('#confirmDialog');
  $('#confirmTitle').textContent = titolo;
  $('#confirmText').textContent = messaggio;
  const btnOk = $('#confirmOk');
  const btnAnnulla = $('#confirmCancel');
  btnOk.textContent = ok;
  btnOk.className = `btn ${pericolo ? 'danger-solid' : 'primary'}`;
  annullaConfermaInSospeso?.(); // una richiesta precedente rimasta aperta vale come "Annulla"
  dlg.showModal();
  btnOk.focus();
  return new Promise((resolve) => {
    const fine = (risposta) => (e) => {
      e?.preventDefault();
      btnOk.removeEventListener('click', si);
      btnAnnulla.removeEventListener('click', no);
      dlg.removeEventListener('cancel', no);
      annullaConfermaInSospeso = null;
      if (dlg.open) dlg.close();
      resolve(risposta);
    };
    const si = fine(true);
    const no = fine(false);
    btnOk.addEventListener('click', si);
    btnAnnulla.addEventListener('click', no);
    dlg.addEventListener('cancel', no); // tasto Esc
    annullaConfermaInSospeso = () => no();
  });
}

const confermaAbbandono = async () =>
  !pratica.dirty ||
  chiediConferma({ titolo: 'Modifiche non salvate', messaggio: "La pratica aperta ha modifiche non salvate in archivio. Se continui andranno perse.", ok: 'Continua senza salvare', pericolo: true });

function caricaPratica(dati, id) {
  state = withDefaults(dati);
  $('#idResult')?.replaceChildren();
  sezioneAttiva = 'committente'; // pratica nuova o riaperta: si riparte dal committente
  rerender();
  lastDbSave = '';
  setPratica({ id, dirty: false });
  scriviBozza(state);
}

// ---------------------------------------------------------------------------
// Viste dell'applicazione: Home, elenco di un modulo, pratica aperta, registro dei proforma, opzioni
// ---------------------------------------------------------------------------
const VISTE = {
  home: { titolo: '', hash: 'home' },
  'elenco/ape': { titolo: 'APE', hash: 'ape' },
  'elenco/catasto': { titolo: 'Catasto', hash: 'catasto' },
  'elenco/pratica': { titolo: 'Pratiche', hash: 'pratiche' },
  pratica: { titolo: '', hash: 'p' },
  proforma: { titolo: 'Proforma', hash: 'proforma' },
  fatture: { titolo: 'Fatture', hash: 'fatture' },
  opzioni: { titolo: 'Opzioni', hash: 'opzioni' },
};
let vista = 'home';

const azioneBarra = (testo, ic, fn, classe = '') => h('button', { type: 'button', class: `btn ${classe}`, html: `${icona(ic, 16)}<span>${testo}</span>`, onclick: fn });

// Barra in alto: titolo della vista e azioni; nella pratica, stato del salvataggio e documenti del modulo
function aggiornaBarra() {
  document.body.classList.toggle('vista-home', vista === 'home');
  const inPratica = vista === 'pratica';
  $('#barPratica').hidden = !inPratica;
  $('#barVista').hidden = inPratica;
  if (inPratica) {
    const m = modulo();
    $('#barModulo').innerHTML = `${icona(MODULI[m].icona, 15)}<span>${etichettaModulo(state)}</span>`;
    $('#barNome').textContent = [state.committente?.nome || 'Nuova pratica', m === 'pratica' ? state.offerta?.titolo : ''].filter(Boolean).join(' · ');
    $('#grpIncarico').hidden = m === 'pratica';
    $('#lblIncarico').textContent = fvg() ? 'Da firmare' : 'Incarico';
    $('#grpIncarico').title = fvg() ? 'Informativa, lettera di incarico e pagina della Visita da far firmare'
      : m === 'catasto' ? 'Lettera di incarico per la pratica catastale' : 'Informativa e lettera di incarico APE (due PDF)';
    $('#grpSopralluogo').hidden = !fvg();
    $('#grpAllegati').hidden = !fvg();
    $('#grpOfferta').hidden = m !== 'pratica';
    return;
  }
  $('#barTitolo').textContent = VISTE[vista].titolo;
  const azioni = $('#barAzioni');
  if (vista === 'elenco/ape') azioni.replaceChildren(azioneBarra('Nuova APE Veneto', 'piu', () => nuovaPratica('ape', 'veneto')), azioneBarra('Nuova APE FVG', 'piu', () => nuovaPratica('ape', 'fvg'), 'primary'));
  else if (vista === 'elenco/catasto') azioni.replaceChildren(azioneBarra('Nuova pratica catastale', 'piu', () => nuovaPratica('catasto'), 'primary'));
  else if (vista === 'elenco/pratica') azioni.replaceChildren(azioneBarra('Nuova pratica', 'piu', () => nuovaPratica('pratica'), 'primary'));
  else if (vista === 'proforma') azioni.replaceChildren(azioneBarra('Importa già emessi', 'scarica', () => apriImportazione()), azioneBarra('Da una pratica…', 'cerca', () => scegliPraticaPerProforma()), azioneBarra('Nuovo proforma', 'piu', () => nuovoProforma(), 'primary'));
  else if (vista === 'fatture') azioni.replaceChildren(azioneBarra('Importa fatture', 'scarica', () => apriImportazione()), azioneBarra('Entrata senza fattura', 'piu', () => nuovaEntrata()), azioneBarra('Nuova fattura', 'euro', () => nuovaFattura(), 'primary'));
  else azioni.replaceChildren();
}

function aggiornaMenu() {
  const attiva = vista === 'pratica' ? `elenco/${modulo()}` : vista;
  document.querySelectorAll('.rail a[data-vista]').forEach((a) => a.classList.toggle('active', a.dataset.vista === attiva));
  const m = vista.startsWith('elenco/') ? vista.slice(7) : vista === 'pratica' ? modulo() : vista === 'proforma' || vista === 'fatture' ? vista : 'ape';
  document.documentElement.style.setProperty('--mod', MODULI[m].colore);
  document.documentElement.style.setProperty('--mod2', MODULI[m].colore2);
}

async function vai(nome, { hash = true } = {}) {
  if (!VISTE[nome]) nome = 'home';
  // uscendo dal registro con un proforma modificato e non salvato
  if ((vista === 'proforma' || vista === 'fatture') && nome !== vista && pf.sporco) {
    const ok = await chiediConferma({ titolo: 'Modifiche non salvate', messaggio: 'Il proforma aperto ha modifiche non salvate. Se continui andranno perse.', ok: 'Continua senza salvare', pericolo: true });
    if (!ok) return;
    pf.sporco = false;
    pf.corrente = null;
  }
  vista = nome;
  // Proforma e Fatture usano la stessa pagina del registro
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.vista !== (nome.startsWith('elenco/') ? 'elenco' : nome === 'fatture' ? 'proforma' : nome); });
  $('#preview').hidden = true;
  aggiornaMenu();
  aggiornaBarra();
  if (hash) {
    const h2 = nome === 'pratica' ? `#p/${sezioneAttiva}` : `#${VISTE[nome].hash}`;
    if (location.hash !== h2) history.replaceState(null, '', h2);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (nome === 'home') await renderHome();
  else if (nome.startsWith('elenco/')) await apriElenco(nome.slice(7));
  else if (nome === 'proforma' || nome === 'fatture') {
    sezioneRegistro = nome;
    // il documento aperto resta solo se è della sezione giusta
    if (pf.corrente && !nellaSezione(pf.corrente)) { pf.corrente = null; pf.sporco = false; }
    await apriRegistroProforma();
  }
  else if (nome === 'opzioni') renderOpzioni();
  else if (nome === 'pratica') mostraSezione(sezioneAttiva, { scorri: false });
}

// indirizzo (#home, #ape, #p/incarico…) → vista
function vistaDaHash() {
  const hsh = location.hash.slice(1);
  if (hsh.startsWith('p/') || hsh === 'p') return { nome: 'pratica', sezione: hsh.slice(2) };
  const trovata = Object.entries(VISTE).find(([, v]) => v.hash === hsh);
  return { nome: trovata ? trovata[0] : 'home' };
}
window.addEventListener('hashchange', () => {
  const { nome, sezione } = vistaDaHash();
  if (nome === 'pratica' && sezione && idSezioni().includes(sezione)) sezioneAttiva = sezione;
  if (nome !== vista || nome === 'pratica') vai(nome, { hash: false });
});

// Elenchi riletti da Drive dietro le quinte e cambiati (es. modifiche da un altro PC): si ridisegna la schermata aperta
window.addEventListener('archivio-aggiornato', async () => {
  try {
    if (vista === 'home') await renderHome();
    else if (vista.startsWith('elenco/')) { elenco = await api('api/pratiche'); renderElenco(); }
    else if (vista === 'proforma' || vista === 'fatture') { await caricaRegistro(); renderElencoProforma(); }
  } catch {}
});

document.querySelectorAll('.rail a[data-vista]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); vai(a.dataset.vista); }));
$('#btnIndietro').addEventListener('click', () => vai(`elenco/${modulo()}`));

// "12/11/2026" da "2026-11-12" o "2026-11-12 10:30:00"
const giorno = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const etichettaRiga = (p) => (p.modulo === 'ape' ? `APE ${p.versione === 'fvg' ? 'FVG' : 'Veneto'}` : p.modulo === 'catasto' ? 'Catasto' : p.titolo || 'Pratica');
const pillModulo = (m, testo) => h('span', { class: 'pill-mod', style: `--c:${(MODULI[m] || MODULI.ape).colore}` }, testo);

// ---------------------------------------------------------------------------
// Home: i moduli, la pratica in corso, le ultime pratiche e gli ultimi proforma
// ---------------------------------------------------------------------------
// Forme decorative delle card (icone dello studio: ape, pianta quotata, pergamena con casa, salvadanaio), colorate nel tono
// più scuro del modulo con una maschera: l'immagine dà solo la sagoma
const forma = (m) => h('span', { class: `forma forma-${MODULI[m].forma}`, 'aria-hidden': 'true', style: `--img:url(assets/forme/${MODULI[m].forma}.png)` });

async function renderHome() {
  const box = $('#viewHome');
  let pratiche = [];
  let registro = { proforme: [], prossimo: 1 };
  try {
    [pratiche, registro] = await Promise.all([api('api/pratiche'), api('api/proforme')]);
  } catch (err) {
    toast(`Archivio non disponibile: ${err.message}`, true);
  }
  elenco = pratiche;
  const di = (m) => pratiche.filter((p) => p.modulo === m);
  const anno = new Date().getFullYear();
  const delAnno = registro.proforme.filter((x) => x.anno === anno);
  // fatture ed entrate incassate + proforma senza fattura (pagati o da incassare): niente doppioni proforma/fattura
  const { incassato, daIncassare, totale: emesso } = incassiDi(delAnno);
  const ora = new Date().getHours();
  const saluto = ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const inCorso = pratica.id || pratica.dirty;
  const conDato = (valore, etichetta) => h('div', { class: 'dato' }, h('strong', {}, valore), h('span', {}, etichetta));

  // proforma mese per mese: barra nera = pagati, barra tratteggiata = da incassare (come i grafici di Intelly)
  const mesi = Array.from({ length: 12 }, (_, i) => {
    const del = delAnno.filter((x) => Number(String(x.data).slice(5, 7)) === i + 1);
    const k = incassiDi(del);
    return { pagato: k.incassato, aperto: k.daIncassare };
  });
  const massimo = Math.max(1, ...mesi.flatMap((m) => [m.pagato, m.aperto]));
  const NOMI_MESI = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
  const grafico = h('div', { class: 'grafico', role: 'img', 'aria-label': `Proforma ${anno} per mese: emessi ${euro(emesso)}, incassati ${euro(incassato)}` },
    mesi.map((m, i) => h('div', { class: `colonna${i === new Date().getMonth() ? ' oggi' : ''}`, title: `pagati ${euro(m.pagato)} · da incassare ${euro(m.aperto)}` },
      h('div', { class: 'barre' },
        h('span', { class: 'pagato', style: `height:${Math.max(m.pagato ? 6 : 0, (m.pagato / massimo) * 100)}%` }),
        h('span', { class: 'aperto', style: `height:${Math.max(m.aperto ? 6 : 0, (m.aperto / massimo) * 100)}%` })),
      h('em', {}, NOMI_MESI[i]))));

  const carta = (m, titolo, dati, ...azioni) => h('article', { class: `mod-card mod-${m}`, style: `--c:${MODULI[m].colore};--c2:${MODULI[m].colore2}` },
    forma(m),
    h('header', {}, h('h3', {}, `${titolo}:`),
      h('button', { type: 'button', class: 'freccia', title: 'Apri elenco', 'aria-label': `Apri elenco ${MODULI[m].nome}`, html: icona('freccia', 16), onclick: () => vai(m === 'proforma' ? 'proforma' : `elenco/${m}`) })),
    h('div', { class: 'dati' }, ...dati),
    h('footer', {}, ...azioni));

  box.replaceChildren(
    h('section', { class: 'saluto' },
      h('h1', {}, `${saluto}, Agnese`),
      h('p', {}, `${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}. ${inCorso
        ? `Hai una pratica in corso: ${state.committente?.nome || 'senza committente'} (${etichettaModulo(state)}).`
        : `Il prossimo proforma è il n. ${registro.prossimo}.`}`),
      inCorso ? h('button', { type: 'button', class: 'btn nero', html: `${icona(MODULI[modulo()].icona, 16)}<span>Riprendi la pratica</span>`, onclick: () => vai('pratica') }) : null),
    h('div', { class: 'home-griglia' },
      h('div', { class: 'mod-cards' },
        carta('ape', 'APE', [conDato(String(di('ape').length), 'pratiche'), conDato(String(di('ape').filter((p) => p.versione !== 'fvg').length), 'Veneto'), conDato(String(di('ape').filter((p) => p.versione === 'fvg').length), 'FVG')],
          h('button', { type: 'button', class: 'btn nero small', onclick: () => nuovaPratica('ape', 'veneto') }, '+ Veneto'),
          h('button', { type: 'button', class: 'btn nero small', onclick: () => nuovaPratica('ape', 'fvg') }, '+ FVG')),
        carta('catasto', 'Catasto', [conDato(String(di('catasto').length), 'pratiche')],
          h('button', { type: 'button', class: 'btn nero small', onclick: () => nuovaPratica('catasto') }, '+ Nuova pratica')),
        carta('pratica', 'Pratiche', [conDato(String(di('pratica').length), 'pratiche edilizie')],
          h('button', { type: 'button', class: 'btn nero small', onclick: () => nuovaPratica('pratica') }, '+ Nuova pratica')),
        carta('proforma', `Proforma ${anno}`, [conDato(String(delAnno.filter((x) => x.tipo === 'proforma' || x.tipo === 'importato').length), 'emessi'), conDato(euro(incassato), 'incassati'), conDato(euro(daIncassare), 'da incassare')],
          h('button', { type: 'button', class: 'btn nero small', onclick: async () => { await vai('proforma'); nuovoProforma(); } }, `+ Proforma n. ${registro.prossimo}`))),
      h('section', { class: 'card-incassi', style: `--c:${MODULI.fatture.colore};--c2:${MODULI.fatture.colore2}` },
        forma('fatture'),
        h('header', {}, h('h3', { class: 'clic', onclick: () => vai('fatture'), title: 'Apri le fatture' }, 'Fatture e incassi:'), h('span', { class: 'legenda' }, h('i', { class: 'pagato' }), 'pagati', h('i', { class: 'aperto' }), 'da incassare')),
        h('div', { class: 'dati' }, conDato(euro(emesso), `totale ${anno}`), conDato(euro(incassato), 'incassati'), conDato(euro(daIncassare), 'da incassare')),
        grafico)),
    h('div', { class: 'home-colonne' },
      h('section', { class: 'pannello' },
        h('header', {}, h('h2', {}, 'Ultime pratiche'), h('span', { class: 'tag-trat' }, `${pratiche.length} in archivio`)),
        pratiche.length
          ? h('div', { class: 'lista-card' }, pratiche.slice(0, 7).map((p) => h('button', { type: 'button', class: 'riga-card', style: `--c:${(MODULI[p.modulo] || MODULI.ape).colore}`, onclick: () => apriPratica(p.id) },
              h('span', { class: 'avatar', html: icona((MODULI[p.modulo] || MODULI.ape).icona, 18) }),
              h('span', { class: 'riga-testo' }, h('strong', {}, p.committente || 'Committente non indicato'), h('em', {}, [etichettaRiga(p), p.immobile].filter(Boolean).join(' · '))),
              h('span', { class: 'pill-ora' }, giorno(p.modificata_il)))))
          : h('p', { class: 'empty' }, 'Nessuna pratica salvata: creane una dalle card qui sopra.')),
      h('section', { class: 'pannello rosa' },
        h('header', {}, h('h2', {}, 'Ultimi proforma'), h('button', { type: 'button', class: 'btn nero small', onclick: () => vai('proforma') }, 'Vedi tutti')),
        registro.proforme.length
          ? h('div', { class: 'lista-card' }, registro.proforme.filter((x) => x.tipo === 'proforma' || x.tipo === 'importato').slice(0, 5).map((x) => h('button', { type: 'button', class: 'riga-card', onclick: async () => { await vai('proforma'); apriProforma(x.id); } },
              h('span', { class: `numero${x.tipo === 'fattura' ? ' fattura' : ''}`, title: x.tipo === 'fattura' ? 'Fattura' : null }, x.tipo === 'entrata' ? '€' : String(x.numero)),
              h('span', { class: 'riga-testo' }, h('strong', {}, x.cliente || '—'), h('em', {}, `${giorno(x.data)} · ${euro(x.totale)}`)),
              pillStato(x.stato))))
          : h('p', { class: 'empty' }, 'Nessun proforma nel registro.'))));
}

// "Mario De Luca" → "MD"
const iniziali = (nome) => String(nome || '?').trim().split(/\s+/).filter(Boolean).map((x) => x[0]).filter((c) => /\p{L}/u.test(c)).slice(0, 2).join('').toUpperCase() || '?';

// ---------------------------------------------------------------------------
// Elenco delle pratiche di un modulo: quelle di questo PC oppure quelle della cartella di Google Drive
// ---------------------------------------------------------------------------
let elenco = [];
let elencoDrive = { cartella: '', pratiche: [] };
let fonteElenco = 'locale';
let moduloElenco = 'ape';

async function caricaElencoDrive() {
  try {
    elencoDrive = await api('api/drive');
  } catch (err) {
    elencoDrive = { cartella: '', pratiche: [] };
    toast(err.message, true);
  }
}

async function apriElenco(m) {
  moduloElenco = m;
  const box = $('#viewElenco');
  const cerca = h('input', { type: 'search', id: 'elencoCerca', placeholder: 'Cerca per committente, indirizzo, titolo…', autocomplete: 'off', oninput: () => renderElenco() });
  const importa = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importaPratica(f); } });
  box.replaceChildren(
    h('div', { class: 'strumenti' },
      h('div', { class: 'cerca' }, h('span', { html: icona('cerca', 16) }), cerca),
      h('div', { class: 'seg', role: 'group', id: 'elencoFonte' },
        ...[].map(([k, l]) => h('button', {
          type: 'button', 'aria-pressed': String(fonteElenco === k),
          onclick: async (e) => {
            fonteElenco = k;
            e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
            if (k === 'drive') { $('#elencoCorpo').replaceChildren(h('p', { class: 'empty' }, 'Lettura della cartella…')); await caricaElencoDrive(); }
            renderElenco();
          },
        }, l))),
      h('button', { type: 'button', class: 'btn ghost', title: 'Aggiungi una pratica salvata come file .json', onclick: () => importa.click() }, 'Importa .json'), importa),
    h('section', { class: 'pannello' }, h('div', { id: 'elencoCorpo' }, h('p', { class: 'empty' }, 'Lettura dell\'archivio…'))));
  try {
    elenco = await api('api/pratiche');
    if (fonteElenco === 'drive') await caricaElencoDrive();
  } catch (err) {
    toast(`Archivio non disponibile: ${err.message}`, true);
  }
  renderElenco();
}

function renderElenco() {
  const box = $('#elencoCorpo');
  if (!box) return;
  const m = moduloElenco;
  const q = ($('#elencoCerca')?.value || '').trim().toLowerCase();
  const filtra = (p, extra = '') => p.modulo === m && (!q || [p.committente, p.immobile, p.titolo, etichettaRiga(p), giorno(p.data_visita), extra].join(' ').toLowerCase().includes(q));
  const vuoto = (testo) => box.replaceChildren(h('p', { class: 'empty' }, testo));
  const terza = m === 'ape' ? 'Versione' : m === 'catasto' ? 'Tipo' : 'Pratica';
  if (fonteElenco === 'drive') {
    if (!elencoDrive.cartella) {
      return box.replaceChildren(h('p', { class: 'empty' }, 'Cartella principale non impostata. ',
        h('a', { href: '#opzioni' }, 'Impostala in Opzioni'), ': ogni pratica salvata verrà copiata lì come file .json e potrai aprirla da qualsiasi PC.'));
    }
    const locali = new Map(elenco.filter((p) => p.uid).map((p) => [p.uid, p]));
    const lista = elencoDrive.pratiche.filter((p) => filtra(p, p.file));
    if (!lista.length) return vuoto(q ? 'Nessuna pratica corrisponde alla ricerca.' : `Nessuna pratica di questo modulo in ${elencoDrive.cartella}.`);
    return box.replaceChildren(h('table', { class: 'tab' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Committente'), h('th', {}, terza), h('th', {}, 'Immobile'), h('th', {}, 'Cartella'), h('th', {}, 'Salvata'), h('th', {}))),
      h('tbody', {}, lista.map((p) => {
        const locale = locali.get(p.uid);
        return h('tr', { class: `clic${locale && locale.id === pratica.id ? ' corrente' : ''}`, onclick: () => apriDaDrive(p) },
          h('td', { class: 'forte' }, p.committente || 'Committente non indicato'),
          h('td', {}, pillModulo(p.modulo, etichettaRiga(p))),
          h('td', { class: 'tenue' }, p.immobile || '—'),
          h('td', { class: 'tenue', title: p.file }, p.cartella || '(cartella principale)'),
          h('td', { class: 'tenue' }, giorno(p.modificato)),
          h('td', { class: 'azioni' }, locale ? h('span', { class: 'badge ok', title: 'La pratica è anche nell\'archivio di questo PC' }, `anche qui, n. ${locale.id}`) : null));
      }))));
  }
  const lista = elenco.filter((p) => filtra(p, `n. ${p.id}`));
  if (!lista.length) return vuoto(q ? 'Nessuna pratica corrisponde alla ricerca.' : 'Nessuna pratica di questo modulo. Creane una con il pulsante in alto a destra.');
  box.replaceChildren(h('table', { class: 'tab' },
    h('thead', {}, h('tr', {}, h('th', {}, 'N.'), h('th', {}, 'Committente'), h('th', {}, terza), h('th', {}, 'Immobile'), h('th', {}, 'Modificata'), h('th', {}))),
    h('tbody', {}, lista.map((p) => h('tr', { class: `clic${p.id === pratica.id ? ' corrente' : ''}`, onclick: () => apriPratica(p.id) },
      h('td', { class: 'tenue' }, String(p.id)),
      h('td', { class: 'forte' }, p.committente || 'Committente non indicato', p.id === pratica.id ? h('span', { class: 'badge' }, 'aperta') : null),
      h('td', {}, pillModulo(p.modulo, etichettaRiga(p))),
      h('td', { class: 'tenue' }, p.immobile || '—'),
      h('td', { class: 'tenue' }, giorno(p.modificata_il)),
      h('td', { class: 'azioni' },
        h('button', { type: 'button', class: 'btn small ghost', title: 'Scarica la pratica come file .json', onclick: (e) => { e.stopPropagation(); esportaPratica(p.id); } }, '.json'),
        h('button', { type: 'button', class: 'btn small ghost danger', title: 'Elimina la pratica dall\'archivio', 'aria-label': 'Elimina', html: icona('cestino', 15), onclick: (e) => { e.stopPropagation(); eliminaPratica(p); } })))))));
}

async function apriDaDrive(p) {
  if (!(await confermaAbbandono())) return false;
  try {
    const r = await api('api/drive/apri', { method: 'POST', body: JSON.stringify({ file: p.file }) });
    caricaPratica(r.dati, r.id);
    await vai('pratica');
    toast(r.aggiornata ? `Pratica aperta da Google Drive (aggiornata la n. ${r.id} di questo PC)` : `Pratica aperta da Google Drive e aggiunta all'archivio (n. ${r.id})`);
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  }
}

async function apriPratica(id) {
  if (id === pratica.id) return vai('pratica');
  if (!(await confermaAbbandono())) return;
  try {
    const p = await api(`api/pratiche/${id}`);
    caricaPratica(p.dati, p.id);
    await vai('pratica');
  } catch (err) {
    toast(err.message, true);
  }
}

async function esportaPratica(id) {
  try {
    const p = await api(`api/pratiche/${id}`);
    scaricaBlob(new Blob([JSON.stringify(p.dati, null, 2)], { type: 'application/json' }), `${nomePratica(p.dati)}.json`);
  } catch (err) {
    toast(err.message, true);
  }
}

async function eliminaPratica(p) {
  const ok = await chiediConferma({
    titolo: `Eliminare la pratica n. ${p.id}?`,
    messaggio: `La pratica di ${p.committente || 'committente non indicato'} verrà eliminata dall'archivio (finisce nel cestino di Google Drive, da cui si può recuperare per 30 giorni). I documenti già salvati nella sua cartella restano.`,
    ok: 'Elimina',
    pericolo: true,
  });
  if (!ok) return;
  try {
    await api(`api/pratiche/${p.id}`, { method: 'DELETE' });
    elenco = elenco.filter((x) => x.id !== p.id);
    if (p.id === pratica.id) setPratica({ id: null, dirty: true });
    renderElenco();
    toast(`Pratica n. ${p.id} eliminata`);
  } catch (err) {
    toast(err.message, true);
  }
}

// Un file .json esportato viene aggiunto all'archivio e aperto
async function importaPratica(f) {
  let dati;
  try {
    dati = JSON.parse(await f.text());
    if (typeof dati !== 'object' || !dati) throw new Error();
  } catch {
    return toast('File non valido', true);
  }
  if (!(await confermaAbbandono())) return;
  try {
    const completi = withDefaults(dati); // stesso codice univoco per archivio e pagina
    const saved = await api('api/pratiche', { method: 'POST', body: JSON.stringify({ dati: completi }) });
    caricaPratica(completi, saved.id);
    lastDbSave = ora();
    updateStatus();
    await vai('pratica');
    toast(`File importato nella pratica n. ${saved.id} (${etichettaModulo(completi)})`);
  } catch (err) {
    toast(err.message, true);
  }
}

async function nuovaPratica(m = 'ape', v = 'fvg') {
  if (!(await confermaAbbandono())) return false;
  caricaPratica(emptyState(m, v), null);
  setPratica({ id: null, dirty: false });
  await vai('pratica');
  return true;
}

// ---------------------------------------------------------------------------
// Opzioni: cartella principale, dati dello studio, intelligenza artificiale
// ---------------------------------------------------------------------------
function renderOpzioni() {
  $('#viewOpzioni').replaceChildren(
    ...(avvisoOpzioni ? [h('p', { class: 'opzioni-avviso' }, avvisoOpzioni)] : []),
    h('section', { class: 'pannello opz' }, h('header', {}, h('span', { class: 'mod-icona', html: icona('cartella', 16) }), h('h2', {}, 'Cartella principale delle pratiche')), sezioneCartellaPrincipale()),
    h('section', { class: 'pannello opz' }, h('header', {}, h('span', { class: 'mod-icona', html: icona('salva', 16) }), h('h2', {}, 'Dati dello studio e pagamento')), sezioneStudio()),
    h('section', { class: 'pannello opz' }, h('header', {}, h('span', { class: 'mod-icona', html: icona('cartella', 16) }), h('h2', {}, 'Account Google')), sezioneAccount()));
}

// Account Google con cui l'app legge e scrive nel Drive; "Esci" scollega questo browser
function sezioneAccount() {
  const u = Google.utente;
  return h('div', { class: 'cp' },
    h('p', { class: 'hint', style: 'margin:0 0 10px;font-size:13px;color:var(--muted)' }, u?.emailAddress
      ? `Collegato come ${u.displayName ? `${u.displayName} (${u.emailAddress})` : u.emailAddress}. Pratiche, proforma e documenti sono salvati nel suo Google Drive.`
      : 'Collegato a Google Drive.'),
    h('button', { type: 'button', class: 'btn ghost', onclick: () => { Google.esci(); location.reload(); } }, 'Esci da Google'));
}

// avviso: spiegazione in cima (arrivando da "Scegli o crea la cartella…"); poi: azione da fare appena la cartella è salvata
let avvisoOpzioni = '';
let dopoCartellaPrincipale = null;
function apriOpzioni({ avviso = '', poi = null } = {}) {
  avvisoOpzioni = avviso;
  dopoCartellaPrincipale = poi;
  return vai('opzioni');
}
// ---------------------------------------------------------------------------
// Registro dei proforma: numerazione progressiva unica per tutte le pratiche. A sinistra l'elenco, a destra il
// proforma aperto. I dati si prendono da una pratica (APE, catasto, pratiche) oppure si scrivono a mano.
// ---------------------------------------------------------------------------
const pf = { elenco: [], prossimo: 1, prossimaFattura: 1, numerazione: {}, oggi: '', condiviso: false, corrente: null, sporco: false, filtro: { q: '', anno: '', stato: '', tipo: '' } };
const STATI_PF = [['emesso', 'Da incassare'], ['pagato', 'Pagato']];
const STATI_PF_BREVI = [['emesso', 'Emesso'], ['pagato', 'Pagato']];
const pillStato = (s) => h('span', { class: `pill ${s === 'pagato' ? 'ok' : 'attesa'}` }, s === 'pagato' ? 'Pagato' : 'Da incassare');
const numero = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

async function caricaRegistro() {
  const r = await api('api/proforme');
  Object.assign(pf, { elenco: r.proforme, prossimo: r.prossimo, prossimaFattura: r.prossimaFattura || 1, numerazione: r.numerazione || {}, oggi: r.oggi, condiviso: r.condiviso });
}

// sezione del registro aperta: 'proforma' (proforma dell'app e importati) o 'fatture' (fatture ed entrate)
let sezioneRegistro = 'proforma';
const inFatture = (x) => x.tipo === 'fattura' || x.tipo === 'entrata';
const nellaSezione = (x) => (sezioneRegistro === 'fatture' ? inFatture(x) : !inFatture(x));

async function apriRegistroProforma() {
  try {
    await caricaRegistro();
  } catch (err) {
    toast(err.message, true);
  }
  renderRegistro();
}

function renderRegistro() {
  const box = $('#viewProforma');
  const anni = [...new Set(pf.elenco.filter(nellaSezione).map((x) => x.anno))].sort((a, b) => b - a);
  if (sezioneRegistro !== 'fatture') pf.filtro.tipo = '';
  if (pf.filtro.anno && !anni.includes(Number(pf.filtro.anno))) pf.filtro.anno = '';
  box.replaceChildren(
    h('div', { class: 'pf-lista' },
      h('div', { class: 'strumenti' },
        h('div', { class: 'cerca' }, h('span', { html: icona('cerca', 16) }),
          h('input', { type: 'search', placeholder: 'Cerca per cliente, numero, descrizione…', value: pf.filtro.q, autocomplete: 'off', oninput: (e) => { pf.filtro.q = e.target.value; renderElencoProforma(); } })),
        h('select', { 'aria-label': 'Anno', onchange: (e) => { pf.filtro.anno = e.target.value; renderElencoProforma(); } },
          h('option', { value: '' }, 'Tutti gli anni'), ...anni.map((a) => h('option', { value: String(a), selected: String(a) === String(pf.filtro.anno) }, String(a)))),
        h('select', { 'aria-label': 'Stato', onchange: (e) => { pf.filtro.stato = e.target.value; renderElencoProforma(); } },
          h('option', { value: '' }, 'Tutti'), ...STATI_PF.map(([k, l]) => h('option', { value: k, selected: k === pf.filtro.stato }, l))),
        ...(sezioneRegistro === 'fatture' ? [h('select', { 'aria-label': 'Tipo', onchange: (e) => { pf.filtro.tipo = e.target.value; renderElencoProforma(); } },
          ...[['', 'Fatture ed entrate'], ['fattura', 'Solo fatture'], ['entrata', 'Solo entrate']].map(([k, l]) => h('option', { value: k, selected: k === pf.filtro.tipo }, l)))] : [])),
      boxNumerazione(sezioneRegistro === 'fatture' ? 'fattura' : 'proforma'),
      h('section', { class: 'pannello' }, h('div', { id: 'pfElenco' })),
      h('p', { class: 'nota-campo', style: 'text-align:left' }, pf.condiviso
        ? (sezioneRegistro === 'fatture' ? 'Registro su Google Drive (00_PROFORMA): fatture ed entrate uguali su ogni computer. Le fatture hanno una numerazione separata da quella dei proforma.' : 'Registro su Google Drive (00_PROFORMA): numerazione unica su ogni computer. I PDF scaricati finiscono in 00_PROFORMA/<anno> e nella cartella della pratica.')
        : 'Registro solo su questo PC: imposta la cartella principale (Opzioni) per avere la stessa numerazione su tutti i PC.')),
    h('div', { class: 'pf-scheda', id: 'pfScheda' }));
  renderElencoProforma();
  renderSchedaProforma();
}

// Numerazione dell'anno: l'ultimo proforma già emesso fuori dall'app (es. 19 → il prossimo dal registro è il 20).
// I numeri ripartono ogni anno; per gli anni senza indicazione si parte da 1.
function boxNumerazione(grp = 'proforma') {
  const fatt = grp === 'fattura';
  const chiave = (a) => `${fatt ? 'F' : ''}${a}`;
  const annoOggi = Number(String(pf.oggi || oggiIso()).slice(0, 4));
  let anno = annoOggi;
  const input = h('input', { type: 'text', inputmode: 'numeric', id: 'numUltimo', autocomplete: 'off', placeholder: '0' });
  const sceltaAnno = h('select', { 'aria-label': 'Anno della numerazione' }, [annoOggi - 1, annoOggi, annoOggi + 1].map((a) => h('option', { value: String(a), selected: a === annoOggi }, String(a))));
  const esito = h('span', { class: 'num-esito' });
  const aggiorna = async () => {
    input.value = pf.numerazione[chiave(anno)] ? String(pf.numerazione[chiave(anno)]) : '';
    try {
      const r = await api(`api/proforme/prossimo?anno=${anno}&gruppo=${grp}`);
      esito.replaceChildren(fatt ? 'La prossima fattura del ' : 'Il prossimo proforma del ', String(anno), fatt ? ' sarà la ' : ' sarà il ', h('strong', {}, `n. ${r.prossimo}`));
    } catch {
      esito.textContent = '';
    }
  };
  sceltaAnno.addEventListener('change', () => { anno = Number(sceltaAnno.value); aggiorna(); });
  const salva = async () => {
    const v = input.value.trim();
    if (v && !/^\d{1,5}$/.test(v)) return toast('Scrivi solo il numero (es. 19)', true);
    try {
      const r = await api('api/proforme/numerazione', { method: 'PUT', body: JSON.stringify({ anno, ultimo: Number(v || 0), gruppo: grp }) });
      pf.numerazione = r.numerazione;
      if (anno === annoOggi) pf[fatt ? 'prossimaFattura' : 'prossimo'] = r.prossimo;
      await aggiorna();
      renderSchedaProforma();
      toast(v ? `Numerazione ${fatt ? 'fatture ' : ''}${anno}: ultimo emesso n. ${v}, il prossimo è il n. ${r.prossimo}` : `Numerazione ${fatt ? 'fatture ' : ''}${anno}: si riparte dal registro (prossimo n. ${r.prossimo})`);
    } catch (err) {
      toast(err.message, true);
    }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') salva(); });
  aggiorna();
  return h('section', { class: 'pannello numerazione' },
    h('header', {}, h('h2', {}, 'Numerazione'), sceltaAnno),
    h('div', { class: 'num-corpo' },
      h('label', { for: 'numUltimo' }, fatt ? 'Ultima fattura già emessa fuori dall’app' : 'Ultimo proforma già emesso fuori dall’app'),
      h('div', { class: 'num-riga' }, input, h('button', { type: 'button', class: 'btn nero small', onclick: salva }, 'Salva')),
      esito,
      h('p', { class: 'nota-campo' }, 'La numerazione riparte ogni anno. Se nel registro ci sono numeri più alti, si prosegue da quelli.')));
}

function renderElencoProforma() {
  const box = $('#pfElenco');
  if (!box) return;
  const q = pf.filtro.q.trim().toLowerCase();
  const tipoOk = (x) => nellaSezione(x) && (!pf.filtro.tipo || x.tipo === pf.filtro.tipo);
  const lista = pf.elenco.filter((x) => tipoOk(x) && (!pf.filtro.anno || String(x.anno) === String(pf.filtro.anno)) && (!pf.filtro.stato || (x.stato || 'emesso') === pf.filtro.stato)
    && (!q || [`n. ${x.numero}`, x.cliente, x.descrizione, giorno(x.data), x.tipo === 'entrata' ? 'entrata' : x.tipo].join(' ').toLowerCase().includes(q)));
  if (!lista.length) {
    if (sezioneRegistro === 'fatture') return box.replaceChildren(h('p', { class: 'empty' }, pf.elenco.some(inFatture) ? 'Nessuna fattura corrisponde ai filtri.' : 'Nessuna fattura. Le fatture arrivano qui confermando la fatturazione di un proforma, importandole (PDF o XML della fattura elettronica) oppure con "Nuova fattura".'));
    return box.replaceChildren(h('p', { class: 'empty' }, pf.elenco.some((x) => !inFatture(x)) ? 'Nessun proforma corrisponde ai filtri.' : 'Il registro è vuoto. Crea il primo proforma con "Nuovo proforma" oppure da una pratica: il numero proposto si può cambiare, i successivi proseguono da lì.'));
  }
  // totali senza doppioni: un proforma con la sua fattura conta una volta sola
  const { totale, daIncassare: aperti } = incassiDi(lista);
  const numeroDi = new Map(pf.elenco.map((x) => [x.id, x.numero]));
  box.replaceChildren(h('table', { class: 'tab' },
    h('thead', {}, h('tr', {}, h('th', {}, 'N.'), h('th', {}, 'Data'), h('th', {}, 'Cliente'), h('th', {}, 'Origine'), h('th', { class: 'dx' }, 'Totale'), h('th', {}, 'Stato'))),
    h('tbody', {}, lista.map((x) => h('tr', { class: `clic${pf.corrente?.id === x.id ? ' corrente' : ''}`, title: x.descrizione, onclick: () => apriProforma(x.id) },
      h('td', { class: 'forte' }, x.tipo === 'entrata' ? '—' : String(x.numero)),
      h('td', { class: 'tenue' }, giorno(x.data)),
      h('td', {}, x.cliente || '—'),
      h('td', {}, x.tipo === 'entrata' ? h('span', { class: 'pill-tipo entrata' }, 'entrata')
        : x.tipo === 'fattura' ? h('span', { class: 'pill-tipo fattura', title: x.proforma_id ? `Salda il proforma n. ${numeroDi.get(x.proforma_id) || '?'}` : 'Non collegata a un proforma' }, x.proforma_id ? `fattura · pf ${numeroDi.get(x.proforma_id) || '?'}` : 'fattura')
        : x.tipo === 'importato' ? h('span', { class: 'pill-tipo' }, x.fattura_id ? `importato · fatt. ${numeroDi.get(x.fattura_id) || '?'}` : 'importato')
          : x.modulo ? pillModulo(x.modulo, `${MODULI[x.modulo]?.nome || x.modulo}${x.fattura_id ? ` · fatt. ${numeroDi.get(x.fattura_id) || '?'}` : ''}`) : h('span', { class: 'tenue' }, x.fattura_id ? `libero · fatt. ${numeroDi.get(x.fattura_id) || '?'}` : 'libero')),
      h('td', { class: `dx forte${x.fattura_id ? ' barrato' : ''}`, title: x.fattura_id ? 'Incasso contato nella sua fattura' : null }, euro(x.totale)),
      h('td', {}, pillStato(x.stato))))),
    h('tfoot', {}, h('tr', {}, h('td', { colspan: 4 }, `${lista.length} ${lista.length === 1 ? 'voce' : 'voci'}`), h('td', { class: 'dx forte' }, euro(totale)), h('td', { class: 'tenue' }, aperti ? `da incassare ${euro(aperti)}` : '')))));
}

async function lasciaProforma() {
  if (!pf.sporco) return true;
  return chiediConferma({ titolo: 'Proforma non salvato', messaggio: 'Il proforma aperto ha modifiche non salvate. Se continui andranno perse.', ok: 'Continua senza salvare', pericolo: true });
}

async function apriProforma(id) {
  if (pf.corrente?.id === id && !pf.sporco) return;
  if (!(await lasciaProforma())) return;
  try {
    pf.corrente = await api(`api/proforme/${id}`);
    pf.sporco = false;
    renderElencoProforma();
    renderSchedaProforma();
  } catch (err) {
    toast(err.message, true);
  }
}

// nuovo proforma (non ancora nel registro finché non si salva): primo numero libero dell'anno, data di oggi
async function nuovoProforma(dati = {}) {
  if (!(await lasciaProforma())) return;
  try {
    await caricaRegistro();
  } catch {}
  pf.corrente = {
    numero: pf.prossimo, data: pf.oggi || oggiIso(), giorni: String(GIORNI_PAGAMENTO), stato: 'emesso', note: '',
    pratica_uid: '', modulo: '', cartella: '',
    destinatario: { nome: '', via: '', civ: '', cap: '', citta: '', cf: '', piva: '', sdi: '' },
    righe: [{ testo: '', qt: '1', prezzo: '' }], spese: [],
    ...dati,
  };
  pf.sporco = true;
  renderElencoProforma();
  renderSchedaProforma();
}

// Modulo Pratiche: il proforma è un acconto, un saldo o l'intero onorario
function chiediQuota(totale) {
  return new Promise((resolve) => {
    let tipo = 'acconto';
    const percento = h('input', { type: 'text', inputmode: 'decimal', value: '50', id: 'quotaPc' });
    const anteprima = h('p', { class: 'quota-importo' });
    const aggiorna = () => {
      const pc = tipo === 'intero' ? 100 : Math.min(100, Math.max(0, numero(percento.value)));
      percento.disabled = tipo === 'intero';
      anteprima.textContent = `Importo della prestazione nel proforma: ${euro(totale * pc / 100)} (su ${euro(totale)} di onorario)`;
    };
    percento.addEventListener('input', aggiorna);
    const dlg = h('dialog', { class: 'cartelle quota' });
    const chiudi = (esito) => { dlg.close(); dlg.remove(); resolve(esito); };
    dlg.append(
      h('div', { class: 'testa' }, h('strong', {}, 'Proforma dalla pratica'), h('button', { type: 'button', class: 'btn small ghost', onclick: () => chiudi(null) }, 'Annulla')),
      h('div', { class: 'quota-corpo' },
        h('label', {}, 'Cosa vuoi fatturare?'),
        seg([['acconto', 'Acconto'], ['saldo', 'Saldo'], ['intero', 'Intero onorario']], tipo, (val) => { tipo = val || tipo; aggiorna(); }),
        h('div', { class: 'f' }, h('label', { for: 'quotaPc' }, 'Percentuale dell’onorario'), h('div', { class: 'unit' }, percento, h('span', {}, '%'))),
        anteprima),
      h('div', { class: 'piede' }, h('span', { class: 'hint' }, 'Il testo e l’importo si possono ritoccare nel proforma.'),
        h('button', { type: 'button', class: 'btn primary', onclick: () => chiudi({ tipo, percento: tipo === 'intero' ? 100 : numero(percento.value) }) }, 'Crea proforma')));
    document.body.append(dlg);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(null); });
    aggiorna();
    dlg.showModal();
  });
}

// dati di una pratica → nuovo proforma nel registro
async function proformaDa(dati) {
  let quota = null;
  if (moduloDi(dati) === 'pratica') {
    quota = await chiediQuota(calcolaProforma(dati.proforma || {}).totale);
    if (!quota) return;
  }
  await vai('proforma');
  await nuovoProforma(proformaDaPratica(dati, quota));
  const c = pf.corrente;
  if (!c) return;
  toast(`Proforma n. ${c.numero} preparato con i dati di ${dati.committente?.nome || 'questa pratica'}: controlla e salva`);
}

// dal pulsante "Crea proforma" della pratica aperta: prima si salva la pratica
async function creaProformaDaPratica(btn) {
  const mancano = [];
  if (!state.committente?.nome) mancano.push('il committente');
  if (state.proforma.righe.some((r) => !String(r.prezzo || '').trim())) mancano.push(modulo() === 'pratica' ? "l'importo di ogni punto dell'offerta" : 'il prezzo delle prestazioni');
  if (catasto() && !protocollo(state.catasto)) mancano.push('il protocollo della variazione catastale');
  if (mancano.length) return toast(`Per il proforma manca ${mancano.join(', ')}`, true);
  btn.disabled = true;
  try {
    await salvaInArchivio();
    await proformaDa(state);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// scelta di una pratica dell'archivio di questo PC da cui prendere i dati
async function scegliPraticaPerProforma() {
  let pratiche = [];
  try {
    pratiche = await api('api/pratiche');
  } catch (err) {
    return toast(err.message, true);
  }
  const dlg = h('dialog', { class: 'cartelle scegli-pratica' });
  const lista = h('div', { class: 'elenco' });
  const chiudi = () => { dlg.close(); dlg.remove(); };
  const cerca = h('input', { type: 'search', placeholder: 'Cerca per committente, indirizzo, tipo…', autocomplete: 'off' });
  const disegna = () => {
    const q = cerca.value.trim().toLowerCase();
    const trovate = pratiche.filter((p) => !q || [p.committente, p.immobile, etichettaRiga(p), p.titolo].join(' ').toLowerCase().includes(q));
    lista.replaceChildren(...(trovate.length ? trovate.slice(0, 60).map((p) => h('button', {
      type: 'button', class: 'voce pratica-voce',
      onclick: async () => {
        chiudi();
        try {
          // la pratica aperta si prende com'è sullo schermo (anche se non ancora salvata)
          const dati = p.id === pratica.id ? state : (await api(`api/pratiche/${p.id}`)).dati;
          await proformaDa(withDefaults(dati));
        } catch (err) {
          toast(err.message, true);
        }
      },
    }, pillModulo(p.modulo, etichettaRiga(p)), h('strong', {}, p.committente || 'Committente non indicato'), h('span', {}, p.immobile || ''))) : [h('p', { class: 'empty' }, 'Nessuna pratica trovata.')]));
  };
  cerca.addEventListener('input', disegna);
  dlg.append(
    h('div', { class: 'testa' }, h('strong', {}, 'Da quale pratica prendo i dati?'), h('button', { type: 'button', class: 'btn small ghost', onclick: chiudi }, 'Chiudi')),
    h('div', { class: 'nuova' }, cerca),
    lista);
  document.body.append(dlg);
  dlg.addEventListener('cancel', () => dlg.remove());
  disegna();
  dlg.showModal();
  cerca.focus();
}

// campo del proforma aperto (non passa dallo stato della pratica)
function campoPf(obj, k, label, { s = 6, t = 'text', u = '', ph = '', righe = 0, upper = false, id = null } = {}) {
  const fid = id || `pf-${k}-${++uid}`;
  const input = h(righe ? 'textarea' : 'input', {
    id: fid, type: righe ? null : t === 'number' ? 'text' : t, inputmode: t === 'number' ? 'decimal' : null, rows: righe || null,
    placeholder: ph || null, autocomplete: 'off', value: righe ? null : obj[k] ?? '',
    oninput: (e) => {
      obj[k] = upper ? e.target.value.toUpperCase() : e.target.value;
      if (upper) e.target.value = obj[k];
      proformaModificato(k);
    },
  }, righe ? String(obj[k] ?? '') : null);
  return h('div', { class: `f s${s}` }, label ? h('label', { for: fid }, label) : null, u ? h('div', { class: 'unit' }, input, h('span', {}, u)) : input);
}

// a ogni modifica: totali, scadenza, stato "non salvato"
function proformaModificato(campo) {
  pf.sporco = true;
  const c = pf.corrente;
  if (!c) return;
  if (c.tipo === 'importato' || c.tipo === 'entrata' || c.tipo === 'fattura') {
    const st = $('#pfStatoSalvataggio');
    if (st) { st.textContent = 'Modifiche non salvate'; st.className = 'pf-salvataggio sporco'; }
    return;
  }
  const k = calcolaProforma(c);
  const scrivi = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  scrivi('pfTotale', euro(k.totale));
  scrivi('pfBollo', k.bollo ? euro(k.bollo) : 'non dovuta');
  scrivi('pfContributo', euro(k.contributo));
  scrivi('pfSpese', k.totaleSpese ? euro(k.totaleSpese) : 'nessuna');
  scrivi('pfDaPagare', euro(k.daPagare));
  scrivi('pfScadenza', dataProforma(scadenzaProforma(c)));
  k.righe.forEach((r, i) => scrivi(`pfImporto${i}`, euro(r.importo)));
  const st = $('#pfStatoSalvataggio');
  if (st) { st.textContent = 'Modifiche non salvate'; st.className = 'pf-salvataggio sporco'; }
  // cambiando anno della data di un proforma nuovo, il numero proposto è quello dell'anno giusto
  if (campo === 'data' && !c.id) {
    const anno = String(c.data || '').slice(0, 4);
    if (/^\d{4}$/.test(anno)) api(`api/proforme/prossimo?anno=${anno}`).then((r) => { c.numero = r.prossimo; scrivi('pfNumero', r.prossimo); }).catch(() => {});
  }
}

function renderSchedaProforma() {
  const box = $('#pfScheda');
  if (!box) return;
  const c = pf.corrente;
  if (c && (c.tipo === 'importato' || c.tipo === 'entrata' || c.tipo === 'fattura')) return renderSchedaSemplice(box, c);
  if (!c) {
    return box.replaceChildren(h('div', { class: 'pf-vuoto' },
      h('span', { class: 'mod-icona grande', html: icona('proforma', 26) }),
      h('h2', {}, sezioneRegistro === 'fatture' ? `Prossima fattura: n. ${pf.prossimaFattura}` : `Prossimo proforma: n. ${pf.prossimo}`),
      h('p', {}, sezioneRegistro === 'fatture'
        ? 'Scegli una fattura dall’elenco. Una nuova fattura nasce confermando la fatturazione di un proforma (dalla sua scheda), oppure importandola o scrivendola qui.'
        : 'Scegli un proforma dall’elenco oppure creane uno nuovo: la numerazione prosegue da sola, qualunque sia la pratica. Quando l’hai fatturato, apri il proforma e premi "Conferma fatturazione".'),
      h('div', { class: 'add-row' }, ...(sezioneRegistro === 'fatture'
        ? [azioneBarra('Importa fatture', 'scarica', () => apriImportazione()), azioneBarra('Nuova fattura', 'euro', () => nuovaFattura(), 'primary')]
        : [azioneBarra('Da una pratica…', 'cerca', () => scegliPraticaPerProforma()), azioneBarra('Nuovo proforma', 'piu', () => nuovoProforma(), 'primary')]))));
  }
  c.destinatario ||= {};
  c.righe = c.righe?.length ? c.righe : [{ testo: '', qt: '1', prezzo: '' }];
  c.spese ||= [];
  const k = calcolaProforma(c);
  const d = c.destinatario;
  const fisso = (id, label, val, s = 3, forte = false) => h('div', { class: `f s${s}` }, h('label', { for: id }, label), h('input', { type: 'text', id, class: `fisso${forte ? ' forte' : ''}`, readonly: true, tabindex: -1, value: val }));
  const ridisegna = () => { pf.sporco = true; renderSchedaProforma(); };
  box.replaceChildren(
    h('div', { class: 'pf-testa' },
      h('div', {}, h('h2', {}, c.id ? `Proforma n. ${c.numero}` : 'Nuovo proforma'),
        h('span', { id: 'pfStatoSalvataggio', class: `pf-salvataggio${pf.sporco ? ' sporco' : ''}` }, pf.sporco ? (c.id ? 'Modifiche non salvate' : 'Non ancora nel registro') : 'Salvato nel registro'),
        c.modulo ? pillModulo(c.modulo, `da ${MODULI[c.modulo]?.nome || c.modulo}`) : null),
      h('div', { class: 'pf-azioni' },
        azioneBarra('Anteprima', 'occhio', () => anteprimaProforma()),
        azioneBarra('Scarica PDF', 'scarica', (e) => scaricaProforma(e.currentTarget)),
        azioneBarra('Salva', 'salva', (e) => salvaProforma(e.currentTarget), 'primary'))),
    ...barraFatturazione(c),
    boxPdf('Proforma', null,
      h('div', { class: 'grid' },
        campoPf(c, 'numero', 'Numero', { s: 2, id: 'pfNumero' }),
        campoPf(c, 'data', 'Data', { s: 3, t: 'date' }),
        campoPf(c, 'giorni', 'Giorni per il saldo', { s: 2, t: 'number' }),
        fisso('pfScadenza', 'Scadenza', dataProforma(scadenzaProforma(c)), 2),
        h('div', { class: 'f s3' }, h('label', {}, 'Stato'),
          seg(STATI_PF_BREVI, c.stato || 'emesso', (val) => { c.stato = val || 'emesso'; proformaModificato('stato'); })))),
    boxPdf('Destinatario', null,
      h('div', { class: 'grid' },
        campoPf(d, 'nome', 'Nome e cognome o ragione sociale', { s: 6 }),
        campoPf(d, 'cf', 'Codice fiscale', { s: 3, upper: true }),
        campoPf(d, 'piva', 'Partita IVA', { s: 3 }),
        campoPf(d, 'via', 'Via/piazza', { s: 4 }),
        campoPf(d, 'civ', 'Civico', { s: 1 }),
        campoPf(d, 'citta', 'Città (provincia)', { s: 3 }),
        campoPf(d, 'cap', 'CAP', { s: 2 }),
        campoPf(d, 'sdi', 'Codice SDI', { s: 2, upper: true }))),
    boxPdf('Prestazioni', null,
      h('div', { class: 'prests' }, c.righe.map((r, i) => h('div', { class: 'grid pf-riga' },
        campoPf(r, 'testo', `Descrizione ${i + 1}`, { s: 7, righe: 3 }),
        campoPf(r, 'qt', 'Quantità', { s: 1, t: 'number' }),
        campoPf(r, 'prezzo', 'Prezzo unitario', { s: 2, t: 'number', u: '€' }),
        fisso(`pfImporto${i}`, 'Importo', euro(k.righe[i]?.importo || 0), 2),
        c.righe.length > 1 ? h('button', { type: 'button', class: 'btn small ghost danger togli', title: 'Togli la riga', 'aria-label': `Togli la riga ${i + 1}`, onclick: () => { c.righe.splice(i, 1); ridisegna(); } }, '×') : null))),
      h('div', { class: 'add-row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { c.righe.push({ testo: '', qt: '1', prezzo: '' }); ridisegna(); } }, '+ Aggiungi prestazione')),
      h('div', { class: 'spese' },
        h('div', { class: 'pf-testo-head' }, h('strong', {}, 'Spese non imponibili'), h('span', { class: 'nota-campo' }, 'Fuori dal 4% INARCASSA e dalla marca da bollo.')),
        c.spese.map((x, i) => h('div', { class: 'grid pf-riga' },
          campoPf(x, 'testo', `Descrizione spesa ${i + 1}`, { s: 9 }),
          campoPf(x, 'importo', 'Importo', { s: 3, t: 'number', u: '€' }),
          h('button', { type: 'button', class: 'btn small ghost danger togli', title: 'Togli la spesa', 'aria-label': `Togli la spesa ${i + 1}`, onclick: () => { c.spese.splice(i, 1); ridisegna(); } }, '×'))),
        h('div', { class: 'add-row' },
          c.spese.some((x) => x.testo === SPESA_SISTER) ? null : h('button', { type: 'button', class: 'btn small', onclick: () => { c.spese.push({ testo: SPESA_SISTER, importo: String(IMPORTO_SISTER) }); ridisegna(); } }, '+ Rimborso diritti catastali (SISTER)'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => { c.spese.push({ testo: '', importo: '' }); ridisegna(); } }, '+ Altra spesa'))),
      h('div', { class: 'grid pf-totali' },
        fisso('pfTotale', 'Totale prestazioni', euro(k.totale), 2),
        fisso('pfBollo', 'Marca da bollo', k.bollo ? euro(k.bollo) : 'non dovuta', 2),
        fisso('pfContributo', 'Contributo 4%', euro(k.contributo), 2),
        fisso('pfSpese', 'Spese non imponibili', k.totaleSpese ? euro(k.totaleSpese) : 'nessuna', 2),
        fisso('pfDaPagare', 'Totale da pagare', euro(k.daPagare), 4, true))),
    boxPdf('Note', null,
      h('div', { class: 'grid' }, campoPf(c, 'note', 'Note interne (non compaiono nel PDF)', { s: 12, righe: 2 }))),
    ...(c.id ? [h('div', { class: 'add-row fine' }, h('button', { type: 'button', class: 'btn ghost danger', html: `${icona('cestino', 15)}<span>Elimina dal registro</span>`, onclick: () => eliminaProforma() }))] : []));
}

// Fattura scritta a mano (quelle in PDF o XML si importano): numerazione propria, collegabile al proforma che salda
async function nuovaFattura() {
  if (!(await lasciaProforma())) return;
  try { await caricaRegistro(); } catch {}
  pf.corrente = { tipo: 'fattura', numero: String(pf.prossimaFattura || ''), data: pf.oggi || oggiIso(), stato: 'pagato', destinatario: { nome: '' }, descrizione: '', totale: '', note: '' };
  pf.sporco = true;
  renderElencoProforma();
  renderSchedaProforma();
}

// Entrata senza documento (rimborso, acconto in contanti…): niente numero, conta solo negli incassi
async function nuovaEntrata() {
  if (!(await lasciaProforma())) return;
  try { await caricaRegistro(); } catch {}
  pf.corrente = { tipo: 'entrata', numero: '', data: pf.oggi || oggiIso(), stato: 'pagato', destinatario: { nome: '' }, descrizione: '', totale: '', note: '' };
  pf.sporco = true;
  renderElencoProforma();
  renderSchedaProforma();
}

// Scheda delle voci senza righe: proforma importati ed entrate senza proforma (solo i totali)
function renderSchedaSemplice(box, c) {
  c.destinatario ||= {};
  const entrata = c.tipo === 'entrata';
  const fattura = c.tipo === 'fattura';
  // fattura: il proforma che salda (scelta a mano, proposto quello dello stesso cliente e importo)
  const collega = h('select', { id: 'pfCollega', onchange: (e) => { c.collega = e.target.value; proformaModificato('collega'); } }, h('option', { value: '' }, 'Nessuno'));
  if (fattura) {
    api(`api/proforme/${c.id || 'nuova'}/collegabili`).then((r) => {
      collega.replaceChildren(h('option', { value: '' }, 'Nessuno'), ...r.proforme.map((x) => h('option', { value: x.id, selected: (c.collega ?? c.proforma_id) === x.id }, `n. ${x.numero} del ${giorno(x.data)} · ${x.cliente || '—'} · ${euro(x.totale)}${x.id === r.proposto && !c.proforma_id ? ' (proposto)' : ''}`)));
    }).catch(() => {});
  }
  box.replaceChildren(
    h('div', { class: 'pf-testa' },
      h('div', {}, h('h2', {}, entrata ? (c.id ? 'Entrata' : 'Nuova entrata') : fattura ? (c.id ? `Fattura n. ${c.numero}` : 'Nuova fattura') : `Proforma n. ${c.numero}`),
        h('span', { id: 'pfStatoSalvataggio', class: `pf-salvataggio${pf.sporco ? ' sporco' : ''}` }, pf.sporco ? (c.id ? 'Modifiche non salvate' : 'Non ancora nel registro') : 'Salvato nel registro'),
        h('span', { class: `pill-tipo${entrata ? ' entrata' : fattura ? ' fattura' : ''}` }, entrata ? 'entrata senza documento' : fattura ? 'fattura' : 'emesso fuori dall’app')),
      h('div', { class: 'pf-azioni' }, azioneBarra('Salva', 'salva', (e) => salvaProforma(e.currentTarget), 'primary'))),
    ...(c.tipo === 'importato' ? barraFatturazione(c) : []),
    boxPdf(entrata ? 'Entrata' : fattura ? 'Fattura' : 'Proforma importato', null,
      h('p', { class: 'box-sub-desc' }, entrata
        ? 'Un incasso senza documento (es. rimborso, acconto in contanti). Non ha numero e non cambia la numerazione: conta solo negli incassi.'
        : fattura ? 'Una fattura emessa: conta come incassata. Se salda un proforma, collegalo qui sotto: il proforma diventa pagato e l’importo si conta una volta sola. La numerazione delle fatture è separata da quella dei proforma.'
          : 'Un proforma emesso fuori dall’app: ne tieni numero, cliente e totale, così la numerazione prosegue e gli incassi sono completi. Il PDF resta quello che hai già.'),
      h('div', { class: 'grid' },
        entrata ? null : campoPf(c, 'numero', 'Numero', { s: 2, id: 'pfNumero' }),
        campoPf(c, 'data', entrata ? 'Data dell’incasso' : fattura ? 'Data della fattura' : 'Data del proforma', { s: 3, t: 'date' }),
        campoPf(c, 'totale', 'Importo totale', { s: 3, t: 'number', u: '€' }),
        h('div', { class: `f s${entrata ? 4 : 4}` }, h('label', {}, 'Stato'),
          seg(STATI_PF_BREVI, c.stato || 'pagato', (val) => { c.stato = val || 'pagato'; proformaModificato('stato'); })),
        campoPf(c.destinatario, 'nome', 'Cliente', { s: 6 }),
        campoPf(c, 'descrizione', 'Descrizione', { s: 6 }),
        fattura ? h('div', { class: 'f s12' }, h('label', { for: 'pfCollega' }, 'Salda il proforma'),
          h('div', { class: 'num-riga' }, collega, c.proforma_id ? h('button', { type: 'button', class: 'btn small', onclick: () => apriProformaDaFattura(c.proforma_id) }, 'Apri il proforma') : null)) : null,
        campoPf(c, 'note', 'Note interne', { s: 12, righe: 2 }))),
    ...(c.id ? [h('div', { class: 'add-row fine' }, h('button', { type: 'button', class: 'btn ghost danger', html: `${icona('cestino', 15)}<span>Elimina dal registro</span>`, onclick: () => eliminaProforma() }))] : []));
}

// ---------------------------------------------------------------------------
// Importazione dei proforma già emessi: dai PDF (letti sul PC) o da righe copiate da Excel
// ---------------------------------------------------------------------------
// XML della fattura elettronica (anche .p7m firmato)
async function voceDaXml(file) {
  let xml;
  if (/\.p7m$/i.test(file.name)) {
    const byte = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < byte.length; i += 8192) bin += String.fromCharCode(...byte.subarray(i, i + 8192));
    // alcune buste .p7m contengono l'XML in base64
    xml = xmlDaP7m(bin) || (() => { try { return xmlDaP7m(atob(bin.replace(/[^A-Za-z0-9+/=]/g, ''))); } catch { return ''; } })();
  } else {
    xml = await file.text();
  }
  return { ...leggiFatturaXml(xml || ''), stato: 'pagato', origine: file.name };
}

async function voceDaPdf(file) {
  if (/\.(xml|p7m)$/i.test(file.name)) return voceDaXml(file);
  const doc = await apriPdfjs(file);
  try {
    const { items } = await (await doc.getPage(1)).getTextContent();
    const r = leggiProformaPdf(items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })));
    return { ...r, stato: 'pagato', origine: file.name };
  } finally {
    doc.destroy?.();
  }
}

function apriImportazione() {
  let voci = [];
  const dlg = h('dialog', { class: 'assistente importa' });
  const chiudi = () => { dlg.close(); dlg.remove(); };
  const corpo = h('div', { class: 'imp-anteprima' });
  const esito = h('p', { class: 'assist-esito' });
  const btnImporta = h('button', { type: 'button', class: 'btn primary', disabled: true }, 'Importa');
  // numeri già nel registro, per tipo di documento (proforma e fatture hanno numerazioni separate)
  const gruppoDi = (t) => (t === 'fattura' ? 'F' : 'P');
  const giaUsati = new Set(pf.elenco.filter((x) => x.tipo !== 'entrata').map((x) => `${gruppoDi(x.tipo)}/${x.anno}/${String(x.numero).trim()}`));
  const controllaDoppio = (v) => {
    const anno = String(v.data || '').slice(0, 4);
    const chiave = `${gruppoDi(v.tipo)}/${anno}/${String(v.numero).trim()}`;
    v.doppio = giaUsati.has(chiave) || voci.some((x) => x !== v && `${gruppoDi(x.tipo)}/${String(x.data).slice(0, 4)}/${String(x.numero).trim()}` === chiave);
  };
  const disegna = () => {
    const scelte = voci.filter((v) => v.scelta);
    btnImporta.disabled = !scelte.length;
    btnImporta.textContent = scelte.length ? `Importa ${scelte.length} ${scelte.length === 1 ? 'documento' : 'documenti'}` : 'Importa';
    if (!voci.length) return corpo.replaceChildren();
    const campo = (v, k, tipo = 'text') => h('input', { type: tipo === 'date' ? 'date' : 'text', value: k === 'totale' ? (v.totale ? String(v.totale).replace('.', ',') : '') : v[k] || '', oninput: (e) => { v[k] = k === 'totale' ? importoDa(e.target.value) : e.target.value; } });
    corpo.replaceChildren(h('table', { class: 'tab imp' },
      h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Tipo'), h('th', {}, 'N.'), h('th', {}, 'Data'), h('th', {}, 'Cliente'), h('th', {}, 'Descrizione'), h('th', {}, 'Totale €'), h('th', {}, 'Stato'))),
      h('tbody', {}, voci.map((v) => h('tr', { class: v.scelta ? '' : 'esclusa', title: [v.origine, ...v.avvisi].filter(Boolean).join(' · ') },
        h('td', {}, h('input', { type: 'checkbox', checked: v.scelta, onchange: (e) => { v.scelta = e.target.checked; disegna(); } })),
        h('td', { class: 't' }, h('select', { onchange: (e) => { v.tipo = e.target.value; controllaDoppio(v); v.scelta = !v.doppio && v.scelta; disegna(); } },
          h('option', { value: 'importato', selected: v.tipo !== 'fattura' }, 'Proforma'), h('option', { value: 'fattura', selected: v.tipo === 'fattura' }, 'Fattura'))),
        h('td', { class: 'n' }, campo(v, 'numero')),
        h('td', { class: 'd' }, campo(v, 'data', 'date')),
        h('td', {}, campo(v, 'cliente')),
        h('td', {}, campo(v, 'descrizione')),
        h('td', { class: 'e' }, campo(v, 'totale')),
        h('td', {}, h('select', { onchange: (e) => { v.stato = e.target.value; } }, h('option', { value: 'pagato', selected: v.stato === 'pagato' }, 'Pagato'), h('option', { value: 'emesso', selected: v.stato !== 'pagato' }, 'Da incassare'))))))),
    ...(voci.some((v) => v.doppio) ? [h('p', { class: 'nota-campo' }, 'Le righe non spuntate hanno un numero già presente nel registro per quell’anno (proforma e fatture hanno numerazioni separate).')] : []),
    ...(voci.some((v) => v.avvisi.length) ? [h('p', { class: 'nota-campo' }, 'Passa con il mouse su una riga per vedere cosa non è stato letto; puoi correggere ogni campo qui sopra.')] : []));
  };
  const aggiungi = (nuove) => {
    for (const v of nuove) {
      v.tipo = v.tipo === 'fattura' ? 'fattura' : 'importato';
      controllaDoppio(v);
      v.scelta = !v.doppio && Boolean(v.numero && v.data && v.totale);
      voci.push(v);
    }
    voci.sort((a, b) => String(a.data).localeCompare(String(b.data)) || Number(a.numero) - Number(b.numero));
    disegna();
  };
  const inputPdf = h('input', { type: 'file', accept: 'application/pdf,.pdf,.xml,text/xml,.p7m', multiple: true, hidden: true,
    onchange: async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      esito.textContent = `Lettura di ${files.length} file…`;
      esito.className = 'assist-esito';
      const lette = [];
      for (const f of files) {
        try { lette.push(await voceDaPdf(f)); } catch { lette.push({ tipo: 'importato', numero: '', data: '', cliente: '', descrizione: '', totale: 0, stato: 'pagato', origine: f.name, avvisi: ['file non leggibile'] }); }
      }
      aggiungi(lette);
      const dubbi = lette.filter((v) => v.avvisi.length).length;
      const nf = lette.filter((v) => v.tipo === 'fattura').length;
      esito.textContent = `${lette.length} file letti (${lette.length - nf} proforma, ${nf} fatture)${dubbi ? ` · ${dubbi} da controllare` : ''}. Controlla i dati e il tipo qui sotto prima di importare.`;
    } });
  const incolla = h('textarea', { rows: 5, placeholder: 'Incolla qui le righe copiate da Excel: numero, data, cliente, descrizione, importo, stato (con o senza riga di intestazione)…' });
  btnImporta.addEventListener('click', async () => {
    const scelte = voci.filter((v) => v.scelta);
    btnImporta.disabled = true;
    try {
      const r = await api('api/proforme/importa', { method: 'POST', body: JSON.stringify({ voci: scelte }) });
      chiudi();
      await caricaRegistro();
      pf.corrente = null;
      pf.sporco = false;
      renderRegistro();
      const np = r.importati - r.fatture;
      toast([`Importati ${np} proforma e ${r.fatture} fatture`, r.collegate.length ? `collegate: ${r.collegate.join(', ')}` : '', r.saltati.length ? `saltati: ${r.saltati.join(', ')}` : '', `prossimo proforma n. ${pf.prossimo}`].filter(Boolean).join(' · '), Boolean(r.saltati.length), r.collegate.length || r.saltati.length ? { label: 'Ho capito', fn: () => {} } : null);
    } catch (err) {
      esito.textContent = err.message;
      esito.className = 'assist-esito err';
      btnImporta.disabled = false;
    }
  });
  dlg.append(
    h('div', { class: 'testa' }, h('div', { class: 'assist-titolo' }, h('span', { class: 'mod-icona', html: icona('scarica', 18) }), h('div', {}, h('strong', {}, sezioneRegistro === 'fatture' ? 'Importa fatture' : 'Importa proforma già emessi'), h('span', {}, 'Restano nel registro con numero, cliente e totale: la numerazione prosegue e gli incassi sono completi'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: chiudi }, 'Chiudi')),
    h('ol', { class: 'assist-passi' },
      h('li', {}, h('div', {}, h('strong', {}, 'Dai file'), h('span', {}, 'Seleziona i PDF dei proforma e delle fatture, anche tutti insieme, oppure gli XML delle fatture elettroniche (.xml o .xml.p7m, i più precisi). Numero, data, cliente, descrizione e totale vengono letti sul PC; il tipo (proforma o fattura) si riconosce da solo.')),
        h('div', { class: 'assist-azioni' }, h('button', { type: 'button', class: 'btn primary', onclick: () => inputPdf.click() }, 'Scegli i file…'), inputPdf)),
      h('li', {}, h('div', {}, h('strong', {}, 'Oppure da Excel'), h('span', {}, 'Copia le righe dal foglio (anche con l’intestazione) e incollale qui.')),
        incolla,
        h('div', { class: 'assist-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => {
          const righe = leggiIncolla(incolla.value);
          if (!righe.length) return toast('Incolla prima le righe da Excel', true);
          aggiungi(righe.map((r) => ({ ...r, origine: 'Excel' })));
          incolla.value = '';
          esito.textContent = `${righe.length} righe lette da Excel. Controlla i dati qui sotto prima di importare.`;
          esito.className = 'assist-esito';
        } }, 'Leggi le righe'))),
      h('li', { class: 'imp-passo' }, h('div', {}, h('strong', {}, 'Controlla e importa'), h('span', {}, 'Solo le righe spuntate vengono importate. Lo stato proposto è "Pagato": cambialo per i proforma ancora da incassare. Ogni fattura viene collegata al proforma dello stesso cliente e importo, che diventa pagato: così l’incasso non si conta due volte.')),
        esito, corpo,
        h('div', { class: 'assist-azioni' }, btnImporta))));
  document.body.append(dlg);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  dlg.showModal();
}

// Proforma → fattura: una volta fatturato, si conferma dalla scheda del proforma; la fattura compare nella sezione Fatture
function barraFatturazione(c) {
  if (!c.id) return [];
  if (c.fattura_id) {
    const f = pf.elenco.find((x) => x.id === c.fattura_id);
    return [h('div', { class: 'fatturazione fatto' },
      h('span', { class: 'mod-icona', html: icona('spunta', 16) }),
      h('div', {}, h('strong', {}, `Fatturato${f ? ` con la fattura n. ${f.numero} del ${giorno(f.data)}` : ''}`), h('span', {}, 'Il proforma è pagato; l’incasso è contato nella fattura.')),
      h('button', { type: 'button', class: 'btn nero small', onclick: () => apriFattura(c.fattura_id) }, 'Vai alla fattura'))];
  }
  return [h('div', { class: 'fatturazione' },
    h('span', { class: 'mod-icona', html: icona('euro', 16) }),
    h('div', {}, h('strong', {}, 'Hai emesso la fattura?'), h('span', {}, 'Confermalo qui: la fattura compare nella sezione Fatture, collegata a questo proforma, che diventa pagato.')),
    h('button', { type: 'button', class: 'btn nero small', onclick: () => confermaFatturazione() }, 'Conferma fatturazione'))];
}

async function confermaFatturazione() {
  const c = pf.corrente;
  if (pf.sporco && !(await salvaProforma(null, { silenzioso: true }))) return;
  const oggi = oggiIso();
  let prossima = pf.prossimaFattura;
  try { prossima = (await api(`api/proforme/prossimo?anno=${oggi.slice(0, 4)}&gruppo=fattura`)).prossimo; } catch {}
  const totale = pf.elenco.find((x) => x.id === c.id)?.totale ?? 0;
  const numero = h('input', { type: 'text', id: 'cfNumero', value: String(prossima), autocomplete: 'off' });
  const data = h('input', { type: 'date', id: 'cfData', value: oggi });
  const importoF = h('input', { type: 'text', id: 'cfTotale', inputmode: 'decimal', value: String(totale).replace('.', ','), autocomplete: 'off' });
  const esito = h('p', { class: 'assist-esito' });
  data.addEventListener('change', async () => {
    try { numero.value = String((await api(`api/proforme/prossimo?anno=${data.value.slice(0, 4)}&gruppo=fattura`)).prossimo); } catch {}
  });
  const dlg = h('dialog', { class: 'cartelle quota' });
  const chiudi = () => { dlg.close(); dlg.remove(); };
  const conferma = async (forza = false) => {
    try {
      const r = await api(`api/proforme/${c.id}/fattura${forza ? '?forza=1' : ''}`, { method: 'POST', body: JSON.stringify({ numero: numero.value.trim(), data: data.value, totale: importoDa(importoF.value) }) });
      chiudi();
      await caricaRegistro();
      pf.corrente = r.proforma;
      pf.sporco = false;
      renderRegistro();
      toast(`Fattura n. ${r.fattura.numero} registrata: il proforma n. ${c.numero} è pagato`, false, { label: 'Vai alla fattura', fn: () => apriFattura(r.fattura.id) });
    } catch (err) {
      if (err.status === 409 && !forza && /già nel registro/.test(err.message)) {
        const ok = await chiediConferma({ titolo: 'Numero di fattura già usato', messaggio: `${err.message}. Registrare lo stesso?`, ok: 'Registra lo stesso', pericolo: true });
        if (ok) return conferma(true);
        return;
      }
      esito.textContent = err.message;
      esito.className = 'assist-esito err';
    }
  };
  dlg.append(
    h('div', { class: 'testa' }, h('strong', {}, `Fattura del proforma n. ${c.numero}`), h('button', { type: 'button', class: 'btn small ghost', onclick: chiudi }, 'Annulla')),
    h('div', { class: 'quota-corpo' },
      h('p', { class: 'nota-campo' }, `${c.destinatario?.nome || 'Cliente non indicato'} · il numero proposto è il primo libero tra le fatture dell’anno.`),
      h('div', { class: 'grid' },
        h('div', { class: 'f s4' }, h('label', { for: 'cfNumero' }, 'Numero fattura'), numero),
        h('div', { class: 'f s4' }, h('label', { for: 'cfData' }, 'Data fattura'), data),
        h('div', { class: 'f s4' }, h('label', { for: 'cfTotale' }, 'Totale €'), importoF)),
      esito),
    h('div', { class: 'piede' }, h('span', { class: 'hint' }, 'Il PDF della fattura resta quello del tuo programma di fatturazione.'),
      h('button', { type: 'button', class: 'btn primary', onclick: () => conferma() }, 'Conferma fatturazione')));
  document.body.append(dlg);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  dlg.showModal();
  numero.focus();
}

// apre una fattura (o un proforma) nella sua sezione
async function apriFattura(id) {
  pf.corrente = null;
  pf.sporco = false;
  await vai('fatture');
  await apriProforma(id);
}
async function apriProformaDaFattura(id) {
  pf.corrente = null;
  pf.sporco = false;
  await vai('proforma');
  await apriProforma(id);
}

function controllaProforma() {
  const c = pf.corrente;
  const mancano = [];
  if (c.tipo === 'importato' || c.tipo === 'entrata' || c.tipo === 'fattura') {
    if (c.tipo !== 'entrata' && !String(c.numero ?? '').trim()) mancano.push('il numero');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.data || ''))) mancano.push('la data');
    if (!importoDa(c.totale)) mancano.push("l'importo");
    return mancano.length ? `Manca ${mancano.join(', ')}` : '';
  }
  if (!String(c.numero ?? '').trim()) mancano.push('il numero');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.data || ''))) mancano.push('la data');
  if (!String(c.destinatario?.nome || '').trim()) mancano.push('il destinatario');
  if (c.righe.some((r) => !String(r.testo || '').trim() || !String(r.prezzo || '').trim())) mancano.push('descrizione e prezzo di ogni prestazione');
  if (c.spese.some((x) => String(x.testo || '').trim() && !String(x.importo || '').trim())) mancano.push("l'importo delle spese non imponibili");
  return mancano.length ? `Manca ${mancano.join(', ')}` : '';
}

async function salvaProforma(btn, { silenzioso = false } = {}) {
  const avviso = controllaProforma();
  if (avviso) { toast(avviso, true); return false; }
  const c = pf.corrente;
  if (btn) btn.disabled = true;
  try {
    const invia = (forza) => api(`${c.id ? `api/proforme/${c.id}` : 'api/proforme'}${forza ? '?forza=1' : ''}`, { method: c.id ? 'PUT' : 'POST', body: JSON.stringify({ proforma: c }) });
    let salvato;
    try {
      salvato = await invia(false);
    } catch (err) {
      if (err.status !== 409) throw err;
      const ok = await chiediConferma({ titolo: 'Numero già usato', messaggio: `${err.message}. Vuoi salvare lo stesso con questo numero?`, ok: 'Salva lo stesso', pericolo: true });
      if (!ok) return false;
      salvato = await invia(true);
    }
    pf.corrente = salvato;
    pf.sporco = false;
    await caricaRegistro();
    // anche il riquadro Numerazione: il prossimo numero è cambiato
    renderRegistro();
    if (!silenzioso) toast(salvato.tipo === 'entrata' ? `Entrata di ${euro(importoDa(salvato.totale))} salvata nel registro`
      : salvato.tipo === 'fattura' ? `Fattura n. ${salvato.numero} salvata${salvato.proforma_id ? ` · salda il proforma n. ${pf.elenco.find((x) => x.id === salvato.proforma_id)?.numero || '?'}` : ''}`
        : `Proforma n. ${salvato.numero} salvato nel registro`);
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function pdfProforma(archivia) {
  const res = await fetch(`api/proforme/pdf${archivia ? '?archivia=1' : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proforma: pf.corrente }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore nella generazione del proforma');
  const dec = (k) => decodeURIComponent(res.headers.get(k) || '');
  return { blob: await res.blob(), nome: dec('X-Nome-File') || 'Proforma.pdf', archiviato: res.headers.get('X-Archivio') === '1', percorso: dec('X-Archivio-Percorso'), erroreArchivio: dec('X-Archivio-Errore') };
}

function anteprimaProforma() {
  const avviso = controllaProforma();
  if (avviso) toast(avviso, true);
  return mostraAnteprima(`Proforma n. ${pf.corrente.numero}`, () => pdfProforma(false));
}

// il PDF si scarica solo dopo aver salvato il proforma nel registro (così il numero resta occupato)
async function scaricaProforma(btn) {
  if (!(await salvaProforma(null, { silenzioso: true }))) return;
  btn.disabled = true;
  try {
    const r = await pdfProforma(true);
    if (r.archiviato) {
      const anno = String(pf.corrente.data).slice(0, 4);
      toast(`Proforma n. ${pf.corrente.numero} salvato in ${r.percorso}`, false,
        { label: 'Apri cartella', fn: () => api('api/apri-cartella', { method: 'POST', body: JSON.stringify({ cartella: pf.corrente.cartella || `00_PROFORMA/${anno}` }) }).catch((err) => toast(err.message, true)) });
    } else {
      scaricaBlob(r.blob, r.nome);
      toast(`Proforma n. ${pf.corrente.numero} scaricato in Download${pf.condiviso ? '' : ' · imposta la cartella principale (Opzioni) per salvarlo direttamente lì'}`);
    }
    if (r.erroreArchivio) setTimeout(() => toast(r.erroreArchivio, true), 2500);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function eliminaProforma() {
  const c = pf.corrente;
  const voce = c.tipo === 'entrata' ? 'l’entrata' : c.tipo === 'fattura' ? `la fattura n. ${c.numero}` : `il proforma n. ${c.numero}`;
  const ok = await chiediConferma({ titolo: `Eliminare ${voce}?`, messaggio: c.tipo === 'entrata' ? `L'entrata di ${c.destinatario?.nome || 'cliente non indicato'} viene tolta dal registro e dagli incassi.` : `Il proforma di ${c.destinatario?.nome || 'destinatario non indicato'} viene tolto dal registro e il suo numero torna libero. I PDF già scaricati restano.`, ok: 'Elimina', pericolo: true });
  if (!ok) return;
  try {
    await api(`api/proforme/${c.id}`, { method: 'DELETE' });
    pf.corrente = null;
    pf.sporco = false;
    await caricaRegistro();
    renderRegistro();
    toast(c.tipo === 'entrata' ? 'Entrata eliminata' : c.tipo === 'fattura' ? `Fattura n. ${c.numero} eliminata` : `Proforma n. ${c.numero} eliminato`);
  } catch (err) {
    toast(err.message, true);
  }
}
// ---------------------------------------------------------------------------
// Avvio: si riprende la copia di lavoro e si apre la vista indicata nell'indirizzo (di solito la Home)
// ---------------------------------------------------------------------------
state = (await leggiBozza()) || state;
SECTIONS = sezioniPratica();
{
  const { nome, sezione } = vistaDaHash();
  try {
    const ultima = localStorage.getItem('gestionale-sezione');
    sezioneAttiva = idSezioni().includes(sezione) ? sezione : idSezioni().includes(ultima) ? ultima : idSezioni()[0];
  } catch {
    sezioneAttiva = idSezioni()[0];
  }
  render();
  updateStatus();
  // la pratica si riapre direttamente solo se c'è davvero qualcosa in corso
  await vai(nome === 'pratica' && !(pratica.id || pratica.dirty) ? 'home' : nome);
}
