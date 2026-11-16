// Estrae i dati di un impianto dal testo di un PDF: libretto di impianto (DM 10/02/2014),
// rapporto di controllo (RCEE), scheda prodotto/etichetta ErP o scheda tecnica del costruttore.

const MARCHE = [
  // caldaie e generatori
  'Vaillant', 'Baxi', 'Immergas', 'Ariston', 'Riello', 'Beretta', 'Viessmann', 'Ferroli', 'Hermann Saunier Duval', 'Saunier Duval',
  'Hermann', 'Junkers', 'Bosch', 'Buderus', 'Sime', 'Unical', 'Chaffoteaux', 'De Dietrich', 'Fondital', 'Lamborghini', 'Biasi',
  'Cosmogas', 'Radiant', 'Savio', 'Wolf', 'Elco', 'Ygnis', 'Ecoflam', 'Nova Florida', 'Italtherm', 'Fer', 'Tiemme', 'Thermital',
  'Rotex', 'Atag', 'Remeha', 'Hoval', 'Weishaupt', 'Clivet', 'Aermec', 'Robur', 'Stiebel Eltron', 'Nibe', 'Dimplex', 'Templari',
  // climatizzatori e pompe di calore
  'Daikin', 'Mitsubishi Electric', 'Mitsubishi Heavy Industries', 'Mitsubishi', 'Toshiba', 'LG', 'Samsung', 'Panasonic', 'Fujitsu',
  'Hitachi', 'Haier', 'Hisense', 'Midea', 'Gree', 'Olimpia Splendid', 'Argo', 'De\'Longhi', 'Hokkaido', 'Electrolux', 'Sharp',
  'Carrier', 'Trane', 'York', 'Galletti', 'Sabiana', 'Innova', 'Comfee', 'Tcl', 'Aux', 'Kaysun', 'Mitsubishi',
  // stufe, caminetti, biomassa
  'MCZ', 'Edilkamin', 'Palazzetti', 'Piazzetta', 'Extraflame', 'La Nordica', 'Nordica', 'Ravelli', 'Jotul', 'Thermorossi',
  'Cadel', 'Kalor', 'Ungaro', 'Eva Calor', 'Solarfocus', 'Red', 'Laminox', 'Caminetti Montegrappa', 'Montegrappa', 'Moretti Design',
  'Sergio Leoni', 'Superior', 'Italiana Camini', 'Clam', 'Royal', 'Freepoint', 'Ecofire', 'Rika', 'Hase', 'Austroflamm', 'Wamsler',
  // acqua calda e solare
  'Thermor', 'Atlantic', 'Ariston Thermo', 'Kloben', 'Cordivari', 'Sonnenkraft', 'Paradigma', 'Velux',
  // fotovoltaico
  'SunPower', 'Jinko', 'JA Solar', 'Trina', 'Longi', 'Canadian Solar', 'REC', 'Q Cells', 'Huawei', 'SMA', 'Fronius', 'SolarEdge', 'Zcs', 'Azzurro',
];

const norm = (t) => t.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
const num = (s) => s.replace(/\s/g, '');

// Primo numero dopo un'etichetta (entro una finestra di testo), preferendo quello seguito dall'unità indicata
function numberAfter(text, labelRe, { unit, min = -Infinity, max = Infinity, window = 160 } = {}) {
  const re = new RegExp(labelRe.source, labelRe.flags.includes('g') ? labelRe.flags : `${labelRe.flags}g`);
  for (const m of text.matchAll(re)) {
    const seg = text.slice(m.index + m[0].length, m.index + m[0].length + window);
    const nums = [...seg.matchAll(/(?<![\w.,])(\d{1,4}(?:[.,]\d{1,3})?)(?![\d])\s*(kWp|kW|%|W)?/gi)]
      .map((x) => ({ v: x[1], u: (x[2] || '').toLowerCase(), n: Number(x[1].replace(',', '.')) }))
      .filter((x) => x.n >= min && x.n <= max);
    const conUnita = unit ? nums.find((x) => x.u === unit.toLowerCase()) : null;
    const pick = conUnita || nums[0];
    if (pick) return num(pick.v);
  }
  return '';
}

// Testo dopo un'etichetta, fino a fine riga
function textAfter(text, labelRe, maxLen = 60) {
  const m = text.match(labelRe);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length).split('\n')[0].replace(/^[\s:.\-–]+/, '');
  const v = rest.split(/\s{2,}|\t| - |;/)[0].trim();
  return v.length > 1 && v.length <= maxLen && !/^\(?(kw|%)\)?$/i.test(v) ? v : '';
}

function marca(text) {
  const labelled = textAfter(text, /\b(?:fabbricante|costruttore|produttore|marca|marchio|nome o marchio (?:del|commerciale)[^:\n]*|brand|manufacturer)\b\s*[:.]?/i, 40);
  if (labelled && /[a-z]/i.test(labelled)) {
    const known = MARCHE.find((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, 'i').test(labelled));
    return known || labelled;
  }
  // marca nota più citata nel testo
  let best = '';
  let count = 0;
  for (const b of MARCHE) {
    const n = (text.match(new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, b.length <= 3 ? 'g' : 'gi')) || []).length;
    if (n > count) { best = b; count = n; }
  }
  return best;
}

function modello(text, brand) {
  const m = textAfter(text, /\b(?:modello|identificativo del modello|mod\.|model(?:lo)?(?: name)?|tipo apparecchio)\b\s*[:.]?/i, 50)
    .replace(/^(?:del modello|del fornitore)\s*/i, '');
  if (m || !brand) return m;
  // senza etichetta: quello che segue la marca sulla stessa riga (es. "DAIKIN Perfera FTXM35R")
  const line = text.split('\n').find((l) => new RegExp(`^\\s*${brand.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, 'i').test(l));
  const rest = line ? line.trim().slice(brand.length).replace(/^[\s:\-–]+/, '').trim() : '';
  return rest.length > 1 && rest.length <= 50 ? rest : '';
}

function anno(text) {
  const m = text.match(/(?:data (?:di )?installazione|anno (?:di )?installazione|installat[oa] (?:il|nel)|data (?:di )?(?:prima )?messa in servizio)[^0-9\n]{0,30}(?:(\d{1,2})[./-](\d{1,2})[./-])?((?:19|20)\d{2})/i);
  if (m) return m[3];
  const f = text.match(/anno (?:di )?(?:fabbricazione|costruzione)[^0-9\n]{0,20}((?:19|20)\d{2})/i);
  return f ? f[1] : '';
}

function catasto(text) {
  const m = text.match(/\b(?:codice (?:catasto|catastale)(?: (?:dell')?impianto)?|codice impianto|targa (?:impianto|dell'impianto)|codice targa)\b[^A-Z0-9\n]{0,15}((?=[A-Z0-9\-/]*\d)[A-Z0-9][A-Z0-9\-/]{3,24}[A-Z0-9])/i);
  return m ? m[1] : '';
}

const has = (text, re) => re.test(text);

export function parseRiscaldamento(raw) {
  const t = norm(raw);
  const out = {
    anno: anno(t),
    catasto: catasto(t),
    marca: marca(t),
    modello: '',
    potNom: numberAfter(t, /pot(?:enza|\.)\s*(?:termica\s*)?(?:utile\s*)?(?:nominale|massima|max)(?:\s*\(?\s*P\s*n\s*(?:max)?\)?)?|P\s*rated|P\s*n\s*max|\bP4\b/i, { unit: 'kW', min: 1, max: 2000 }),
    potInt: numberAfter(t, /(?:potenza[^\n]{0,40}(?:30\s*%|carico (?:parziale|intermedio|ridotto)))|\bP1\b|pot(?:enza)?\s*min(?:ima)?/i, { unit: 'kW', min: 0.5, max: 2000 }),
    rend100: numberAfter(t, /(?:rendimento|efficienza)[^\n]{0,40}(?:100\s*%|potenza (?:termica )?nominale|pieno carico)|(?:^|\s)η\s*4(?!\d)|\beta\s*4\b|rendimento utile a pn/im, { unit: '%', min: 60, max: 115 }),
    rendInt: numberAfter(t, /(?:rendimento|efficienza)[^\n]{0,40}(?:30\s*%|carico (?:parziale|intermedio|ridotto))|(?:^|\s)η\s*1(?!\d)|\beta\s*1\b/im, { unit: '%', min: 60, max: 115 }),
  };
  if (has(t, /condensazione/i)) out.generatore = 'condensazione';
  else if (has(t, /ibrid/i)) out.generatore = 'ibrido';
  else if (has(t, /biomassa|pellet|cippato|legna/i)) out.generatore = 'biomassa';
  else if (has(t, /caldaia|generatore di calore/i)) out.generatore = 'standard';
  if (has(t, /centralizzat/i)) out.impianto = 'centralizzato';
  else if (has(t, /autonom|unit[aà] immobiliare singola|singola unit[aà]/i)) out.impianto = 'autonomo';
  if (has(t, /centrale termica|locale caldaia/i)) out.ubicazione = 'centrale';
  else if (has(t, /installazione (?:all')?estern|per esterno|da esterno/i)) out.ubicazione = 'esterno';
  else if (has(t, /installazione (?:all')?intern|per interno|da interno/i)) out.ubicazione = 'interno';
  if (has(t, /combinat|produzione (?:di )?acs\s*[:]?\s*(?:si|sì|x)|riscaldamento\s*\+\s*acs|sanitario istantaneo|soddisfare[^\n]*(?:acs|acqua calda sanitaria)/i)) out.acs = 'combinato';
  const reg = [];
  if (has(t, /sonda (?:climatica|esterna)|regolazione climatica/i)) reg.push('sonda');
  if (has(t, /valvol[ea] termostatic/i)) reg.push('valvole');
  if (has(t, /cronotermostato|termostato (?:ambiente|d'ambiente)/i)) reg.push('ambiente');
  if (has(t, /termostato di zona|zone/i)) reg.push('zona');
  if (reg.length) out.regolazione = reg;
  const ter = [];
  if (has(t, /radiator|termosifon/i)) ter.push('radiatori');
  if (has(t, /pannelli radianti|pavimento radiante|radiante a pavimento|impianto a pavimento/i)) ter.push('pavimento');
  if (has(t, /fan\s*-?\s*coil|ventilconvettor/i)) ter.push('fancoil');
  if (has(t, /termoconvettor/i)) ter.push('termoconvettori');
  if (ter.length) out.terminali = ter;
  if (has(t, /collettor[ei] (?:di )?distribuzione|distribuzione a collettore/i)) out.distribuzione = 'collettore';
  else if (has(t, /monotubo/i)) out.distribuzione = 'monotubo';
  return out;
}

export function parseRaffrescamento(raw) {
  const t = norm(raw);
  const out = {
    anno: anno(t),
    catasto: catasto(t),
    marca: marca(t),
    modello: '',
    potRaff: numberAfter(t, /(?:potenza|capacit[aà]|resa)\s*(?:frigorifera|di raffreddamento|di raffrescamento|in raffreddamento|in raffrescamento|refrigerante)(?:\s*nominale)?|raffreddamento\s*(?:nominale)?\s*\(?kW|P\s*design\s*c|Pdesignc|cooling capacity/i, { unit: 'kW', min: 0.5, max: 2000 }),
    potRisc: numberAfter(t, /(?:potenza|capacit[aà]|resa)\s*(?:termica|di riscaldamento|in riscaldamento)(?:\s*nominale)?|riscaldamento\s*(?:nominale)?\s*\(?kW|P\s*design\s*h|Pdesignh|heating capacity/i, { unit: 'kW', min: 0.5, max: 2000 }),
    eer: numberAfter(t, /(?<!S)\bEER\b(?:\s*\(o GUE\))?|\bGUE\b/, { min: 1, max: 12, window: 60 }),
    cop: numberAfter(t, /(?<!S)\bCOP\b/, { min: 1, max: 12, window: 60 }),
    nEsterne: numberAfter(t, /(?:n(?:umero|\.)?\s*(?:di\s*)?)?unit[àa] estern[ae]/i, { min: 1, max: 50, window: 30 }),
    nSplit: numberAfter(t, /(?:n(?:umero|\.)?\s*(?:di\s*)?)?(?:unit[àa] intern[ae]|split)/i, { min: 1, max: 50, window: 30 }),
  };
  if (has(t, /centrale termica|centrale frigorifera/i)) out.ubicazione = 'centrale';
  else if (has(t, /unit[àa] esterna|motocondensante|installazione estern/i)) out.ubicazione = 'esterno';
  return out;
}

export function parseAltro(raw) {
  const t = norm(raw);
  const out = { anno: anno(t), marca: marca(t), modello: '' };
  if (has(t, /fotovoltaic|moduli? fv|inverter/i)) out.tipo = 'fotovoltaico';
  else if (has(t, /solare termico|collettor[ei] solar/i)) out.tipo = 'solare';
  else if (has(t, /pompa di calore[^\n]{0,40}(?:acs|acqua calda sanitaria)|scaldacqua a pompa di calore/i)) out.tipo = 'pdc_acs';
  else if (has(t, /termocamino|caminetto|inserto/i)) out.tipo = 'caminetto';
  else if (has(t, /stufa[^\n]{0,30}pellet|pellet/i)) out.tipo = 'stufa_pellet';
  else if (has(t, /stufa[^\n]{0,30}legna|legna/i)) out.tipo = 'stufa_legna';
  else if (has(t, /stufa[^\n]{0,30}(?:gas|gpl|metano)/i)) out.tipo = 'stufa_gas';
  else if (has(t, /scaldacqua|scaldabagno|bollitore/i)) out.tipo = has(t, /elettric/i) ? 'scaldacqua_el' : 'scaldacqua_gas';
  else if (has(t, /ventilazione meccanica|\bVMC\b|recuperatore di calore/i)) out.tipo = 'vmc';
  out.potenza = out.tipo === 'fotovoltaico'
    ? numberAfter(t, /potenza (?:di picco|nominale|totale)(?: dell'impianto)?|potenza installata/i, { unit: 'kWp', min: 0.1, max: 2000 })
    : numberAfter(t, /pot(?:enza|\.)\s*(?:termica\s*)?(?:utile\s*)?(?:nominale|resa|massima)|potenza termica|P\s*nom|\bPn\b/i, { unit: 'kW', min: 0.5, max: 500 });
  const alim = t.match(/\b(pellet|legna|cippato|metano|gas naturale|gpl|gasolio|elettric[ao])\b/i);
  if (alim) out.alimentazione = alim[1].toLowerCase().replace('gas naturale', 'metano').replace(/elettric[ao]/, 'elettrica');
  if (has(t, /installazione (?:all')?estern|per esterno/i)) out.ubicazione = 'esterno';
  else if (has(t, /installazione (?:all')?intern|per interno/i)) out.ubicazione = 'interno';
  return out;
}

export const PARSERS = { riscaldamento: parseRiscaldamento, raffrescamento: parseRaffrescamento, altri: parseAltro };

// restituisce solo i campi trovati
export function parseImpianto(tipo, text) {
  const parser = PARSERS[tipo];
  if (!parser) throw new Error(`Tipo di impianto sconosciuto: ${tipo}`);
  const out = parser(text || '');
  out.modello = modello(norm(text || ''), out.marca);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => (Array.isArray(v) ? v.length : v)));
}
