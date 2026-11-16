// Estrae i dati anagrafici dal testo OCR di documenti d'identità italiani
// (carta d'identità cartacea ed elettronica, patente, passaporto, tessera sanitaria).
import { trovaComuneInRiga, capDelComune } from './comuni.js';

const ODD = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
const MESI_CF = 'ABCDEHLMPRST';
const OMOCODIA = 'LMNPQRSTUV'; // cifre sostituite da lettere nei codici omocodici
const CF_DIGIT_POS = [6, 7, 9, 10, 12, 13, 14];

export function cfCheckChar(cf15) {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf15[i];
    sum += i % 2 === 0 ? ODD[c] : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65;
  }
  return String.fromCharCode(65 + (sum % 26));
}

const CF_RE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
export const isValidCf = (cf) => CF_RE.test(cf) && cfCheckChar(cf) === cf[15];

// Corregge gli scambi tipici dell'OCR (O/0, I/1, S/5, …) in base alla posizione del carattere.
// Nelle posizioni numeriche alcune lettere sono ammesse (omocodia), quindi si provano entrambe le letture
// e si tiene quella con il carattere di controllo corretto.
const TO_DIGIT = { O: '0', D: '0', Q: '0', U: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8', T: '7' };
const TO_LETTER = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 6: 'G', 8: 'B', 7: 'T', 4: 'A' };
const isLetterPos = (i) => !CF_DIGIT_POS.includes(i);

function cfVariants(raw) {
  const base = raw.split('').map((ch, i) => (isLetterPos(i) && /\d/.test(ch) && TO_LETTER[ch] ? TO_LETTER[ch] : ch));
  const ambigue = CF_DIGIT_POS.filter((i) => /[A-Z]/.test(base[i]) && TO_DIGIT[base[i]]);
  const out = [];
  for (let mask = 0; mask < 1 << ambigue.length; mask++) {
    const c = [...base];
    ambigue.forEach((pos, k) => { if (mask & (1 << k)) c[pos] = TO_DIGIT[c[pos]]; });
    out.push(c.join(''));
  }
  return out;
}

// quanti caratteri sono già del tipo atteso (lettera/cifra) prima delle correzioni
const shapeScore = (t) => t.split('').filter((ch, i) => (isLetterPos(i) ? /[A-Z]/.test(ch) : /[0-9LMNPQRSTUV]/.test(ch))).length;

function findCf(text) {
  const candidates = [];
  for (const line of text.toUpperCase().split('\n')) {
    const words = line.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    // parola di 16 caratteri, oppure parole adiacenti separate da spazi spuri dell'OCR
    for (let i = 0; i < words.length; i++) {
      let acc = '';
      for (let j = i; j < Math.min(words.length, i + 4); j++) {
        acc += words[j];
        if (acc.length === 16) candidates.push({ t: acc, vicino: /FISCAL/.test(line) });
        if (acc.length >= 16) break;
      }
    }
  }
  let fallback = '';
  for (const { t } of candidates.filter((c) => shapeScore(c.t) >= 12)) {
    const ok = cfVariants(t).find(isValidCf);
    if (ok) return ok;
    if (!fallback && shapeScore(t) >= 15 && CF_RE.test(cfVariants(t)[cfVariants(t).length - 1])) fallback = cfVariants(t).at(-1);
  }
  return fallback;
}

function cfInfo(cf) {
  if (!CF_RE.test(cf)) return {};
  const num = (s) => Number(s.replace(/[LMNPQRSTUV]/g, (ch) => OMOCODIA.indexOf(ch)));
  const yy = num(cf.slice(6, 8));
  const mm = MESI_CF.indexOf(cf[8]) + 1;
  let dd = num(cf.slice(9, 11));
  const sesso = dd > 40 ? 'F' : 'M';
  if (dd > 40) dd -= 40;
  const year = yy + (yy > new Date().getFullYear() % 100 ? 1900 : 2000);
  const pad = (n) => String(n).padStart(2, '0');
  return { sesso, data_nascita: mm ? `${pad(dd)}/${pad(mm)}/${year}` : '' };
}

// --- Zona MRZ (CIE e passaporti) ---
function parseMrz(lines) {
  const mrz = lines.map((l) => l.replace(/\s+/g, '').replace(/[«‹]/g, '<')).filter((l) => /<</.test(l) && l.length >= 20);
  for (const l of mrz) {
    const m = l.match(/^(?:P<ITA|P<[A-Z]{3})?([A-Z]+(?:<[A-Z]+)*)<<([A-Z]+(?:<[A-Z]+)*)/);
    if (m && !/\d/.test(m[1]) && m[1].length > 1 && !/^(ID|CI|C<)ITA/.test(l)) {
      return { cognome: m[1].replace(/</g, ' '), nome: m[2].replace(/</g, ' ') };
    }
  }
  return {};
}

// Tipi di strada, anche come li legge spesso l'OCR (V1A, VLA, P.ZZA senza punto…)
const STREET = "(?:VIA|V[1IL]A|VIALE|V\\.?\\s?LE|PIAZZA|P\\.?\\s?ZZA|PIAZZALE|P\\.?\\s?LE|PIAZZETTA|CORSO|C\\.?\\s?SO|LARGO|VICOLO|V\\.?\\s?LO|STRADA|STR\\.|STRADELLA|LOCALIT[AÀ]'?|LOC\\.|CONTRADA|C\\.?\\s?DA|BORGO|FRAZIONE|FRAZ\\.|SALITA|RIVIERA|LUNGOMARE|LUNGOLAGO|LUNGOTEVERE|CALLE|CAMPO|FONDAMENTA|RIO TER[AÀ]'?|SESTIERE|CASTELLO|CANNAREGIO|DORSODURO|SAN MARCO|SAN POLO|SANTA CROCE|GIUDECCA)";
const STREET_RE = new RegExp(`(?:^|[^A-Z])(${STREET})(?=[\\s.,]|$)`);
// via, civico (12, 12A, 12/B, N. 12, 12 BIS) e resto della riga
const VIA_CIVICO_RE = new RegExp(`^(${STREET}(?:[\\s.,]+[A-ZÀ-Ù'’.§0-9 ]*?[A-ZÀ-Ù'’.])?)[\\s,]*(?:N[.°R]*\\s*|NUM\\.?\\s*)?(\\d{1,5}(?:\\s?[A-Z](?![A-Z]))?(?:\\s*\\/\\s*[0-9A-Z]{1,3})?(?:\\s?BIS)?)(?![0-9])(.*)$`);
const MESI = 'GENNAIO|FEBBRAIO|MARZO|APRILE|MAGGIO|GIUGNO|LUGLIO|AGOSTO|SETTEMBRE|OTTOBRE|NOVEMBRE|DICEMBRE';

function parseComune(s) {
  s = s.replace(/\b\d{5}\b/, '').replace(/^[\s,\-–]+|[\s,\-–]+$/g, '');
  const m = s.match(/^(.*?)\s*\(?\b([A-Z]{2})\)?$/);
  if (m && m[1].length > 1) return { comune: m[1].trim(), provincia: m[2] };
  return s.length > 1 ? { comune: s.trim() } : {};
}

// "VIA 4 NOVEMBRE 12": il numero seguito da un mese fa parte del nome della via
const proteggiDate = (s) => s.replace(new RegExp(`\\b(\\d{1,2})\\s+(${MESI})\\b`, 'g'), '$1§$2');
const ripristinaDate = (s) => s.replace(/§/g, ' ');

// Via e civico da una riga che contiene un tipo di strada
function viaCivico(riga) {
  const m0 = riga.match(STREET_RE);
  if (!m0) return null;
  const da = m0.index + m0[0].indexOf(m0[1]);
  const s = proteggiDate(riga.slice(da)).replace(/^V[1IL]A\b/, 'VIA');
  const m = s.match(VIA_CIVICO_RE);
  if (m) return { via: ripristinaDate(m[1]).replace(/[\s,.]+$/, ''), civico: m[2].replace(/\s+/g, ''), resto: ripristinaDate(m[3]), prima: riga.slice(0, da) };
  return { via: ripristinaDate(s).replace(/\b\d{5}\b.*$/, '').trim(), civico: '', resto: '', prima: riga.slice(0, da) };
}

// Comune (con provincia e CAP) nelle righe indicate, controllato sull'elenco dei comuni italiani
// nelle parole fatte di lettere l'OCR scambia spesso I/1, O/0, S/5 (TREV1SO)
const lettereOcr = (r) => r.replace(/\b[A-Z0-9]*[A-Z]{2}[A-Z0-9]*\b/g, (w) => w.replace(/1/g, 'I').replace(/0/g, 'O').replace(/5/g, 'S'));

function comuneNelleRighe(righe) {
  for (const r of righe.map(lettereOcr)) {
    const t = trovaComuneInRiga(r);
    if (t) {
      const capLetto = (r.match(/\b(\d{5})\b/) || [])[1];
      const c = t.comune;
      return { comune: c.nome, provincia: c.sigla, cap: capLetto && c.cap.includes(capLetto) ? capLetto : capDelComune(c) };
    }
  }
  return null;
}

const ETICHETTA_RESIDENZA = /INDIRIZZO|RESIDEN[ZC][AE]|ADDRESS|DOMICILIO/;
const ETICHETTA_NASCITA = /NASCITA|BIRTH|NATO|NATA\b/;

// Residenza: blocco dopo l'etichetta (CIE: "INDIRIZZO DI RESIDENZA / RESIDENCE"; cartacea: "Residenza" e "Via"),
// altrimenti la prima riga con via e numero civico
function leggiResidenza(lines) {
  const out = {};
  const blocchi = [];
  lines.forEach((l, i) => {
    if (ETICHETTA_RESIDENZA.test(l) && !ETICHETTA_NASCITA.test(l)) blocchi.push(lines.slice(i, i + 4));
  });
  const conCivico = lines.findIndex((l) => { const v = viaCivico(l); return v && v.civico; });
  if (conCivico >= 0) blocchi.push(lines.slice(Math.max(0, conCivico - 2), conCivico + 3));

  for (const blocco of blocchi) {
    const righe = blocco.map((l) => clean(l.replace(/^(\d{1,2}\.\s+)/, '')));
    const iVia = righe.findIndex((r) => viaCivico(r));
    if (iVia < 0) continue;
    const v = viaCivico(righe[iVia]);
    out.indirizzo_via = v.via.replace(/^(?:INDIRIZZO|RESIDENZA|VIA\s+(?=VIA\b))\s*/, '');
    out.indirizzo_civico = v.civico;
    // il comune segue il civico o sta nelle righe successive; nella carta cartacea "Residenza" viene prima della via
    const c = comuneNelleRighe([v.resto, ...righe.slice(iVia + 1), v.prima, ...righe.slice(0, iVia).reverse()]
      .map((r) => r.replace(ETICHETTA_RESIDENZA, ' ')));
    if (c) Object.assign(out, c);
    else if (v.resto.trim()) Object.assign(out, parseComune(v.resto));
    if (!out.cap) out.cap = (righe.slice(iVia).join(' ').match(/\b(\d{5})\b/) || [])[1] || '';
    if (out.indirizzo_via && (out.indirizzo_civico || out.comune)) return out;
  }

  // solo il comune: "Residenza TREVISO", "COMUNE DI RESIDENZA", intestazione "COMUNE DI TREVISO"
  for (const re of [/RESIDEN[ZC][AE]/, /COMUNE DI\b/]) {
    const i = lines.findIndex((l) => re.test(l) && !ETICHETTA_NASCITA.test(l));
    if (i < 0) continue;
    const c = comuneNelleRighe([lines[i].slice(lines[i].search(re)).replace(re, ' ').replace(/^.*?\bDI\b/, ' '), ...lines.slice(i + 1, i + 3)]);
    if (c) return { ...out, ...c };
  }
  return out;
}

const clean = (s) => (s || '').replace(/[|_=~*"“”<>{}[\]]/g, ' ').replace(/\s+/g, ' ').trim();
const LABEL = /(COGNOME|SURNAME|NOME|NAME|NASCITA|BIRTH|DATA|DATE|LUOGO|PLACE|PROVINCIA|RESIDENZA|RESIDENCE|INDIRIZZO|ADDRESS|CITTADINANZA|NATIONALITY|SESSO|SEX|STATURA|HEIGHT|CODICE FISCALE|FISCAL CODE|EMISSIONE|ISSUING|SCADENZA|EXPIRY|COMUNE|FIRMA|SIGNATURE|STATO CIVILE|PROFESSIONE)/;

// Valore associato a un'etichetta: il resto della riga oppure la riga successiva
function valueAfter(lines, re) {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    let rest = clean(lines[i].slice(m.index + m[0].length).replace(/^[\s:/.\-]+/, ''));
    rest = rest.replace(/^(\/\s*)?(SURNAME|NAME|GIVEN NAMES?|RESIDENCE|ADDRESS|PLACE AND DATE OF BIRTH)\b[\s:/.]*/, '');
    if (rest.length > 1 && !LABEL.test(rest.split(' ')[0])) return rest;
    for (let j = i + 1; j < Math.min(lines.length, i + 3); j++) {
      const next = clean(lines[j]);
      if (next.length > 1 && !LABEL.test(next)) return next;
    }
  }
  return '';
}

const onlyLetters = (s) => clean(s).replace(/[^A-ZÀ-ÙÉÈ' ]/g, ' ').replace(/\s+/g, ' ').trim();

function tipoDocumento(t) {
  if (/CARTA D.?IDENTIT|IDENTITY CARD|CARTE D.IDENTIT/.test(t)) return /ELETTRONICA|\bCIE\b|<<</.test(t) ? "Carta d'identità elettronica" : "Carta d'identità";
  if (/PATENTE|DRIVING LICEN/.test(t)) return 'Patente di guida';
  if (/PASSAPORTO|PASSPORT/.test(t)) return 'Passaporto';
  if (/TESSERA SANITARIA|TESSERA EUROPEA|CODICE FISCALE/.test(t)) return 'Tessera sanitaria / codice fiscale';
  return '';
}

export function parseIdentity(texts) {
  const text = texts.join('\n').toUpperCase();
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out = {
    tipo_documento: tipoDocumento(text),
    nome: '', cognome: '', codice_fiscale: '', sesso: '', data_nascita: '', luogo_nascita: '',
    numero_documento: '', scadenza: '', indirizzo_via: '', indirizzo_civico: '', comune: '', provincia: '', cap: '',
  };

  out.codice_fiscale = findCf(text);

  const mrz = parseMrz(lines);
  out.cognome = mrz.cognome || onlyLetters(valueAfter(lines, /(^|\b)(1\.\s*)?COGNOME|SURNAME/));
  out.nome = mrz.nome || onlyLetters(valueAfter(lines, /(^|[^A-Z])(2\.\s*)?NOME(?!\s*\/?\s*E COGNOME)|GIVEN NAMES?/));
  // patente: righe "1. COGNOME" / "2. NOME" senza etichetta
  if (!out.cognome) out.cognome = onlyLetters((lines.find((l) => /^1\.\s+[A-Z]/.test(l)) || '').slice(2));
  if (!out.nome) out.nome = onlyLetters((lines.find((l) => /^2\.\s+[A-Z]/.test(l)) || '').slice(2));

  // nascita: "LUOGO E DATA DI NASCITA" → "PADOVA (PD) 12.03.1985"
  let nascita = valueAfter(lines, /(?<!ATTO DI )NASCITA|PLACE AND DATE OF BIRTH|NATO\/?A?\s+(IL|A)/);
  // patente: riga "3. 05/06/1990 TREVISO (TV)"
  if (!nascita) nascita = clean((lines.find((l) => /^3\.\s+\d/.test(l)) || '').slice(2));
  // carta cartacea: "nato il …" seguito da "a VENEZIA (VE)"
  const aLuogo = lines.find((l) => /^A\s+[A-ZÀ-Ù' ]{3,}(\(?[A-Z]{2}\)?)?$/.test(l));
  if (aLuogo && !/[A-Z]{3}/.test(nascita.replace(/\d/g, ''))) nascita += ` ${aLuogo.slice(2)}`;
  const dataN = nascita.match(/\b(\d{2})[./\- ](\d{2})[./\- ](\d{4})\b/);
  if (dataN) out.data_nascita = `${dataN[1]}/${dataN[2]}/${dataN[3]}`;
  const luogo = clean(nascita.replace(/\b\d{2}[./\- ]\d{2}[./\- ]\d{4}\b/, ''));
  if (luogo.length > 1 && /[A-Z]{2}/.test(luogo)) out.luogo_nascita = luogo;

  // residenza
  Object.assign(out, Object.fromEntries(Object.entries(leggiResidenza(lines)).filter(([, v]) => v)));

  // numero documento (CIE: CA12345AB) e scadenza
  const numero = text.match(/\b([A-Z]{2}\s?\d{5}\s?[A-Z]{2})\b/) || text.match(/\b([A-Z]{2}\s?\d{7})\b/);
  if (numero) out.numero_documento = numero[1].replace(/\s/g, '');
  // scadenza: in genere è la data più lontana stampata sul documento
  const date = [...text.matchAll(/\b(\d{2})[./\-](\d{2})[./\-](\d{4})\b/g)].map((m) => ({ s: `${m[1]}/${m[2]}/${m[3]}`, k: m[3] + m[2] + m[1] }));
  const ultima = date.sort((a, b) => b.k.localeCompare(a.k))[0];
  if (ultima && date.length > 1 && /SCADENZA|EXPIRY|VALID|4B\./.test(text)) out.scadenza = ultima.s;

  // dal codice fiscale si ricavano sesso e data di nascita, se mancanti
  const info = cfInfo(out.codice_fiscale);
  out.sesso ||= info.sesso || '';
  out.data_nascita ||= info.data_nascita || '';
  return out;
}
