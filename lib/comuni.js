// Comuni italiani con sigla della provincia e CAP (dati ISTAT, da github.com/matteocontrini/comuni-json, licenza MIT).
// Servono a correggere il comune letto dall'OCR, a ricavarne la provincia e a proporre il CAP.
// nel browser l'elenco si scarica dal sito (una volta, poi resta nella cache del browser)
const DATI = await (await fetch(new URL('./comuni.json', import.meta.url))).json();

// forma di confronto: maiuscole, senza accenti, apostrofi e punti
export const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
// "S. DONA DI PIAVE", "S.ANNA" → come "SAN DONA DI PIAVE", "SANT ANNA"
const abbreviato = (k) => k.replace(/\bSAN(?:T[AO]?)?\b/g, 'S');

export const COMUNI = DATI.map(([nome, sigla, cap]) => ({ nome, sigla, cap: Array.isArray(cap) ? cap : [cap], k: norm(nome) }));
const PER_CHIAVE = new Map();
for (const c of COMUNI) {
  for (const k of new Set([c.k, abbreviato(c.k)])) {
    if (!PER_CHIAVE.has(k)) PER_CHIAVE.set(k, []);
    PER_CHIAVE.get(k).push(c);
  }
}
export const SIGLE = new Set(COMUNI.map((c) => c.sigla));
const MAX_PAROLE = Math.max(...COMUNI.map((c) => c.k.split(' ').length));

function distanza(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minRiga = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      minRiga = Math.min(minRiga, cur[j]);
    }
    if (minRiga > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Comune dal nome (anche con qualche errore di lettura) e, se nota, dalla sigla della provincia
export function cercaComune(nome, sigla) {
  const k = norm(nome);
  if (k.length < 2) return null;
  sigla = SIGLE.has(String(sigla || '').toUpperCase()) ? String(sigla).toUpperCase() : '';
  const esatti = PER_CHIAVE.get(k) || PER_CHIAVE.get(abbreviato(k)) || [];
  if (esatti.length) return esatti.find((c) => c.sigla === sigla) || (esatti.length === 1 || !sigla ? esatti[0] : null) || esatti[0];
  if (k.length < 4) return null;
  // con la sigla si tollerano più errori, perché i candidati sono pochi
  const max = sigla ? Math.max(1, Math.floor(k.length / 4)) : Math.max(1, Math.floor(k.length / 7));
  let migliore = null;
  let dMin = max + 1;
  for (const c of COMUNI) {
    if (sigla && c.sigla !== sigla) continue;
    const d = Math.min(distanza(k, c.k, max), distanza(abbreviato(k), abbreviato(c.k), max));
    if (d < dMin) {
      dMin = d;
      migliore = c;
    }
  }
  return migliore;
}

// "Torre di Mosto (VE)", "TREVISO TV", "Padova" → comune
export function comuneDaCitta(citta) {
  const s = String(citta || '').trim();
  const m = s.match(/^(.*?)[\s,]*\(?\b([A-Za-z]{2})\b\)?\s*$/);
  if (m && SIGLE.has(m[2].toUpperCase())) {
    const c = cercaComune(m[1], m[2]);
    if (c) return c;
  }
  return cercaComune(s.replace(/\(.*?\)/g, ''));
}

// Cerca un comune in una riga di testo (OCR). Restituisce il comune e la parte di riga che lo precede.
// Vale il nome seguito dalla sigla della provincia ("TREVISO (TV)"), oppure un nome esatto di almeno 4 lettere.
export function trovaComuneInRiga(riga) {
  const parole = [...String(riga || '').toUpperCase().matchAll(/[A-ZÀ-Ù0-9'’.]+/g)];
  let migliore = null;
  for (let i = 0; i < parole.length; i++) {
    for (let n = Math.min(MAX_PAROLE, parole.length - i); n >= 1; n--) {
      const ultima = parole[i + n - 1];
      const testo = riga.slice(parole[i].index, ultima.index + ultima[0].length);
      if (/\d/.test(testo)) continue;
      const dopo = riga.slice(ultima.index + ultima[0].length).match(/^[\s,\-]*\(?\s*([A-Z]{2})\b\s*\)?/i);
      const sigla = dopo && SIGLE.has(dopo[1].toUpperCase()) ? dopo[1].toUpperCase() : '';
      const k = norm(testo);
      let c = null;
      let punti = 0;
      if (sigla) {
        c = cercaComune(testo, sigla);
        if (c && c.sigla === sigla) punti = 100 + k.length - distanza(k, c.k, 9);
        else c = null;
      }
      if (!c && k.replace(/ /g, '').length >= 4 && (PER_CHIAVE.get(k) || PER_CHIAVE.get(abbreviato(k)))) {
        c = cercaComune(testo);
        punti = k.length;
      }
      if (c && (!migliore || punti > migliore.punti)) migliore = { comune: c, punti, inizio: parole[i].index, sigla };
    }
  }
  return migliore;
}

// CAP del comune: unico per la maggior parte dei comuni; per le città con più CAP serve l'indirizzo
export function capDelComune(c) {
  return c && c.cap.length === 1 ? c.cap[0] : '';
}

// Le città con più CAP hanno il codice "generico" con 00 finale (es. 31100) e quelli per zona
export const capMultipli = (c) => (c && c.cap.length > 1 ? c.cap : []);

export const formatoCitta = (c) => `${c.nome} (${c.sigla})`;
