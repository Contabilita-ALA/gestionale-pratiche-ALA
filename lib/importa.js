// Registro dei proforma: importazione di proforma e fatture già emessi fuori dall'app.
// - dai PDF (questa app oppure il programma di fatturazione: "#12", "€ 446,08"…, copia di cortesia della fattura elettronica);
// - dall'XML della fattura elettronica (FatturaPA, anche .xml.p7m firmato);
// - da righe copiate da Excel (o da un CSV): numero, data, cliente, descrizione, importo, stato.
// Usato dal browser (lettura) e dal server (controlli). Le voci importate hanno solo i totali, non le righe.

const EURO = /(?:€\s*)?(-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|-?\d+(?:,\d{1,2})?)(?:\s*€)?/;
const SOLO_EURO = /^(?:€\s*)?-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*€?$|^(?:€\s*)?-?\d+(?:,\d{1,2})?\s*€?$/;
const DATA = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;

// "1.562,08 €" / "€ 446,08" / "446.08" / 446.08 → 446.08
export function importo(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
  let t = String(v ?? '').replace(/[€\s]/g, '').replace(/eur(o)?/i, '');
  if (!t) return 0;
  // "1.234,56" (italiano) oppure "1,234.56" / "1234.56" (inglese)
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{1,2}$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(/[.,]/g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// "07/05/2026", "7.5.26", "2026-05-07" → "2026-05-07" ('' se non è una data)
export function dataIso(v) {
  const s = String(v ?? '').trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const m = DATA.exec(s);
  if (!m) return '';
  const anno = m[3].length === 2 ? `20${m[3]}` : m[3];
  const g = Number(m[1]);
  const me = Number(m[2]);
  if (g < 1 || g > 31 || me < 1 || me > 12) return '';
  return `${anno}-${String(me).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}

// Testo di un proforma in PDF: items = [{ str, x, y, w }] della prima pagina (coordinate PDF: y cresce verso l'alto)
// Tipo di documento dal testo: il proforma dice "non costituisce fattura", quindi si guarda prima "proforma"
export function tipoDocumento(testo) {
  if (/pro\s*-?\s*forma/i.test(testo)) return 'importato';
  if (/fattura|nota\s+di\s+credito|TD0[1-6]\b|cessionario/i.test(testo)) return 'fattura';
  return 'importato';
}

export function leggiProformaPdf(items) {
  const voci = items.map((i) => ({ ...i, str: String(i.str || '').trim() })).filter((i) => i.str).sort((a, b) => b.y - a.y || a.x - b.x);
  const testo = voci.map((i) => i.str).join('\n');
  const tipo = tipoDocumento(testo);
  const out = { tipo, numero: '', data: '', cliente: '', descrizione: '', totale: 0, avvisi: [] };
  if (!/proforma|fattura|nota di credito/i.test(testo)) out.avvisi.push('non sembra né un proforma né una fattura');

  // numero: "#12" oppure "N. 12" vicino al titolo; in alternativa "PROFORMA N. 12" / "Fattura n. 12/2026" / "Numero documento 12" nel testo
  const titolo = voci.find((i) => /^(proforma|fattura( elettronica)?|nota di credito)$/i.test(i.str));
  const vicino = (i) => !titolo || (i.y <= titolo.y + 4 && i.y >= titolo.y - 60);
  const num = voci.find((i) => vicino(i) && /^(?:#|n\.?\s*|nr\.?\s*|n°\s*|numero\s*)\s*(\d+(?:[/-]\d+)?[a-z]*)$/i.test(i.str));
  out.numero = num ? /(\d+(?:[/-]\d+)?[a-z]*)$/i.exec(num.str)[1]
    : ((/(?:proforma|fattura(?:\s+elettronica)?|nota di credito)\s*(?:n\.?|nr\.?|n°|numero|#)\s*(\d+(?:[/-]\d+)?)/i.exec(testo)
      || /numero\s+(?:documento|fattura)\s*:?\s*\n?\s*(\d+(?:[/-]\d+)?)/i.exec(testo)
      || /\bN\.?\s*documento\s*:?\s*(\d+(?:[/-]\d+)?)/i.exec(testo) || [])[1] || '');

  // data: la prima data in alto (quella del documento)
  const data = voci.find((i) => DATA.test(i.str) && vicino(i)) || voci.find((i) => DATA.test(i.str));
  if (data) out.data = dataIso(DATA.exec(data.str)[0]);

  // cliente: la prima riga sotto "DESTINATARIO" (o "Cliente", "Spett.le", "Cessionario/committente"), nella stessa colonna
  const dest = voci.find((i) => /^(destinatario|cliente|spett\.?le|spettabile|cessionario\s*\/?\s*committente|intestatario)\s*:?$/i.test(i.str));
  // copia di cortesia dell'Agenzia delle Entrate: "Denominazione: …" o "Cognome nome: …" nel blocco del cessionario
  // (nella stessa colonna del titolo del cessionario: accanto c'è il blocco del fornitore, cioè lo studio)
  const cess = voci.find((i) => /cessionario/i.test(i.str));
  if (cess) {
    const den = voci.find((i) => i.y < cess.y && i.y > cess.y - 80 && Math.abs(i.x - cess.x) < 40 && /^(denominazione|cognome\s*nome|nome\s*e?\s*cognome)\s*:?\s*\S/i.test(i.str));
    if (den) out.cliente = den.str.replace(/^[^:]*:\s*/, '').trim();
  }
  // tabella "Numero documento" / "Data documento" (copia di cortesia): il valore è sotto l'intestazione
  const sottoA = (re) => {
    const t = voci.find((i) => re.test(i.str));
    if (!t) return '';
    const v = voci.find((i) => i.y < t.y - 2 && i.y > t.y - 30 && Math.abs(i.x - t.x) < 30);
    return v ? v.str : '';
  };
  if (!out.numero) out.numero = (/^\d+(?:[/-]\d+)?[a-z]*$/i.exec(sottoA(/^numero\s+(documento|fattura)$/i)) || [])[0] || '';
  const dataTab = dataIso(sottoA(/^data\s+(documento|fattura)$/i));
  if (dataTab) out.data = dataTab;
  if (dest) {
    const destra = dest.x + (dest.w || 0);
    const sotto = voci.filter((i) => i.y < dest.y - 2 && i.y > dest.y - 40 && (Math.abs(i.x + (i.w || 0) - destra) < 25 || Math.abs(i.x - dest.x) < 25));
    if (sotto.length && !out.cliente) out.cliente = sotto[0].str.replace(/^[^:]*:\s*/, '');
  }
  if (!out.cliente) {
    const spett = /spett\.?le\s+([^\n]+)/i.exec(testo);
    if (spett) out.cliente = spett[1].trim();
  }
  // il cliente non può essere lo studio stesso (blocco del fornitore letto per errore)
  if (stessoCliente(out.cliente, 'Agnese Lorenzon') || /lorenzon\s+agnese|agnese\s+lorenzon/i.test(out.cliente)) {
    out.cliente = '';
  }

  // descrizione: le righe sotto l'intestazione "Descrizione" della tabella, nella sua colonna
  const intest = voci.find((i) => /^descrizione$/i.test(i.str));
  if (intest) {
    const righe = voci.filter((i) => i.y < intest.y - 4 && i.y > intest.y - 90 && Math.abs(i.x - intest.x) < 8 && !SOLO_EURO.test(i.str));
    const testoRighe = [];
    let ultimaY = null;
    for (const r of righe) {
      if (ultimaY != null && ultimaY - r.y > 20) break; // fine della prima prestazione
      testoRighe.push(r.str);
      ultimaY = r.y;
    }
    out.descrizione = testoRighe.join(' ').replace(/\s+/g, ' ').trim();
  }

  // totale: l'importo più alto del documento (il totale da pagare comprende tutte le altre voci)
  const importi = voci.filter((i) => SOLO_EURO.test(i.str) && /€|,\d{2}/.test(i.str)).map((i) => importo(i.str));
  out.totale = importi.length ? Math.max(...importi) : 0;

  // nota di credito: importo negativo
  if (/nota\s+di\s+credito|TD04/i.test(testo) && tipo === 'fattura') out.totale = -Math.abs(out.totale);
  if (!out.numero) out.avvisi.push('numero non trovato');
  if (!out.data) out.avvisi.push('data non trovata');
  if (!out.cliente) out.avvisi.push('cliente non trovato');
  if (!out.totale) out.avvisi.push('totale non trovato');
  return out;
}

// Fattura elettronica (FatturaPA): testo XML, anche estratto da un .p7m firmato
const tag = (xml, nome) => {
  const m = new RegExp(`<(?:[\\w-]+:)?${nome}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${nome}>`, 'i').exec(xml);
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim() : '';
};
const blocco = (xml, nome) => {
  const m = new RegExp(`<(?:[\\w-]+:)?${nome}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${nome}>`, 'i').exec(xml);
  return m ? m[1] : '';
};
// .p7m: busta firmata con dentro l'XML in chiaro; i byte di servizio che spezzano il testo si tolgono
export function xmlDaP7m(binario) {
  const t = String(binario);
  const inizio = t.search(/<\?xml|<(?:[\w-]+:)?FatturaElettronica\b/);
  const fine = t.search(/<\/(?:[\w-]+:)?FatturaElettronica>/);
  if (inizio < 0 || fine < 0) return '';
  const fineTag = t.indexOf('>', fine) + 1;
  // spezzoni della codifica BER (es. 0x04 0x82 0x03 0xE8 ogni 1000 byte): via i caratteri di controllo
  return t.slice(inizio, fineTag).replace(/\x04[\x81\x82][\s\S]{1,2}(?=[<\w\s/=".:-])/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}
export function leggiFatturaXml(xml) {
  const out = { tipo: 'fattura', numero: '', data: '', cliente: '', descrizione: '', totale: 0, avvisi: [] };
  const gen = blocco(xml, 'DatiGeneraliDocumento');
  if (!gen) { out.avvisi.push('non è una fattura elettronica leggibile'); return out; }
  out.numero = tag(gen, 'Numero');
  out.data = dataIso(tag(gen, 'Data'));
  const cess = blocco(xml, 'CessionarioCommittente');
  out.cliente = tag(cess, 'Denominazione') || [tag(cess, 'Nome'), tag(cess, 'Cognome')].filter(Boolean).join(' ');
  out.descrizione = tag(blocco(xml, 'DettaglioLinee'), 'Descrizione');
  let tot = importo(tag(gen, 'ImportoTotaleDocumento').replace('.', ','));
  if (!tot) {
    // senza il totale: imponibile + imposta dei riepiloghi, più bollo
    const riep = [...xml.matchAll(/<(?:[\w-]+:)?DatiRiepilogo\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?DatiRiepilogo>/gi)].map((m) => m[1]);
    tot = riep.reduce((s, r) => s + importo(tag(r, 'ImponibileImporto').replace('.', ',')) + importo(tag(r, 'Imposta').replace('.', ',')), 0);
    tot += importo(tag(blocco(gen, 'DatiBollo'), 'ImportoBollo').replace('.', ','));
    tot = Math.round(tot * 100) / 100;
  }
  out.totale = /TD04/.test(tag(gen, 'TipoDocumento')) ? -Math.abs(tot) : tot;
  if (!out.numero) out.avvisi.push('numero non trovato');
  if (!out.data) out.avvisi.push('data non trovata');
  if (!out.cliente) out.avvisi.push('cliente non trovato');
  if (!out.totale) out.avvisi.push('totale non trovato');
  return out;
}

// Stessa persona? Confronto dei nomi senza maiuscole, accenti, punteggiatura e ordine delle parole ("Rossi Mario" = "MARIO ROSSI")
export function stessoCliente(a, b) {
  const parole = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((p) => p.length > 1);
  const x = parole(a);
  const y = parole(b);
  if (!x.length || !y.length) return false;
  const [corta, lunga] = x.length <= y.length ? [x, y] : [y, x];
  return corta.every((p) => lunga.includes(p));
}

// Incassi (Home e registro): le fatture e le entrate sono soldi incassati; un proforma conta finché non ha la sua
// fattura (pagato = incassato, emesso = da incassare). Così proforma e fattura dello stesso pagamento non si sommano.
export function incassiDi(voci) {
  let incassato = 0;
  let daIncassare = 0;
  for (const v of voci) {
    const t = v.tipo || 'proforma';
    if (t === 'fattura' || t === 'entrata') {
      if (v.stato === 'emesso') daIncassare += v.totale; else incassato += v.totale;
    } else if (!v.fattura_id) {
      if (v.stato === 'pagato') incassato += v.totale; else daIncassare += v.totale;
    }
  }
  const r = (n) => Math.round(n * 100) / 100;
  return { incassato: r(incassato), daIncassare: r(daIncassare), totale: r(incassato + daIncassare) };
}

// Righe incollate da Excel (separate da tabulazioni) o da un CSV (; o ,).
// Con l'intestazione, le colonne si riconoscono dal nome; senza, l'ordine è: numero, data, cliente, descrizione, importo, stato.
const COLONNE = {
  numero: /^(n\.?|nr\.?|num(ero)?|n°|#|proforma)$/i,
  data: /^(data|giorno|emesso il|data proforma)$/i,
  cliente: /^(cliente|committente|destinatario|nome|ragione sociale)$/i,
  descrizione: /^(descrizione|oggetto|prestazione|pratica|causale)$/i,
  totale: /^(importo|totale|totale da pagare|imponibile|euro|€|valore)$/i,
  stato: /^(stato|pagato|incassato|pagamento)$/i,
};
export function leggiIncolla(testo) {
  const righe = String(testo || '').replace(/\r/g, '').split('\n').filter((r) => r.trim());
  if (!righe.length) return [];
  const sep = righe[0].includes('\t') ? '\t' : righe[0].split(';').length > 2 ? ';' : ',';
  const celle = righe.map((r) => r.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')));
  let ordine = ['numero', 'data', 'cliente', 'descrizione', 'totale', 'stato'];
  const testa = celle[0].map((c) => Object.keys(COLONNE).find((k) => COLONNE[k].test(c)) || '');
  if (testa.filter(Boolean).length >= 2) {
    ordine = testa;
    celle.shift();
  }
  return celle.map((c) => {
    const v = Object.fromEntries(ordine.map((k, i) => [k, c[i] ?? '']).filter(([k]) => k));
    const stato = String(v.stato || '').toLowerCase();
    const r = {
      numero: String(v.numero || '').replace(/^(n\.?|#)\s*/i, '').trim(),
      data: dataIso(v.data),
      cliente: String(v.cliente || '').trim(),
      descrizione: String(v.descrizione || '').trim(),
      totale: importo(v.totale),
      // "pagato", "sì", "x", "incassato" → pagato; vuoto → pagato (sono proforma già emessi); "no", "da incassare" → emesso
      stato: /^(no|n|da incassare|aperto|emesso|non pagato|0)$/.test(stato) ? 'emesso' : 'pagato',
      avvisi: [],
    };
    if (!r.data) r.avvisi.push('data non riconosciuta');
    if (!r.totale) r.avvisi.push('importo non riconosciuto');
    return r;
  });
}
