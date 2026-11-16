// PDF vettoriale nel browser: la pagina HTML già impaginata (Paged.js, nell'iframe nascosto) viene "ridisegnata" con
// pdf-lib leggendo dal browser posizione, colori e bordi di ogni elemento e la posizione di ogni parola.
// Risultato: testo vero (con i font Roboto/Figtree incorporati, selezionabile e nitido a ogni ingrandimento),
// riquadri e linee vettoriali, immagini incorporate come sono. Niente "foto" della pagina.
//
// Cosa sa disegnare (è quello che usano i modelli dei documenti dello studio):
// - sfondi e bordi (anche arrotondati, tratteggiati o diversi per lato), con ritaglio dei riquadri arrotondati
// - testo orizzontale e verticale (writing-mode), maiuscolo/minuscolo (text-transform), spaziatura (letter-spacing),
//   sottolineato
// - immagini <img> (JPEG e PNG; gli altri formati passano da un canvas), con object-fit: contain
// - caselle spuntate (.cb.on: la X è fatta con ::before/::after) e numeri/punti degli elenchi (::marker)
import { rgb, degrees, StandardFonts, pushGraphicsState, popGraphicsState, clip, endPath, moveTo, lineTo, appendBezierCurve, closePath } from '../vendor/pdf-lib.esm.min.js';
import fontkit from '../vendor/fontkit.es.min.js';

const BASE = new URL('..', import.meta.url).href;
const W = 595.28, H = 841.89; // A4 in punti

// ---------------------------------------------------------------------------
// Colori e misure CSS
// ---------------------------------------------------------------------------
function colore(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s || '');
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const a = p.length > 3 ? p[3] : 1;
  if (!(a > 0.004)) return null;
  return { c: rgb(p[0] / 255, p[1] / 255, p[2] / 255), a };
}
const px = (s) => parseFloat(s) || 0;
// raggio d'angolo: "12px", "50%" (della dimensione) o "12px 8px" (si usa il primo valore)
const raggio = (s, lato) => {
  const v = String(s || '').trim().split(/\s+/)[0];
  return v.endsWith('%') ? (parseFloat(v) / 100) * lato : px(v);
};

// ---------------------------------------------------------------------------
// Font: le regole @font-face dei fogli di stile del documento (famiglia, peso, stile, unicode-range, file).
// I file .woff2 si usano nella versione .ttf in vendor/ttf (pdf-lib si blocca incorporando i woff2).
// ---------------------------------------------------------------------------
const bytesCache = new Map();
const scarica = (url) => {
  if (!bytesCache.has(url)) bytesCache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); }).then((b) => new Uint8Array(b)));
  return bytesCache.get(url);
};
const fileTtf = (url) => (/\.woff2(\?|$)/i.test(url) ? new URL(`vendor/ttf/${url.split('/').pop().replace(/\.woff2.*$/i, '.ttf')}`, BASE).href : url);

function intervalli(testo) {
  const t = String(testo || '').trim();
  if (!t) return null;
  return t.split(',').map((x) => {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(x.trim());
    if (!m) return null;
    if (m[1].includes('?')) return [parseInt(m[1].replace(/\?/g, '0'), 16), parseInt(m[1].replace(/\?/g, 'F'), 16)];
    const a = parseInt(m[1], 16);
    return [a, m[2] ? parseInt(m[2], 16) : a];
  }).filter(Boolean);
}

function regoleFont(doc) {
  const out = [];
  for (const sh of doc.styleSheets) {
    let regole;
    try { regole = sh.cssRules; } catch { continue; }
    for (const r of regole) {
      if (r.constructor.name !== 'CSSFontFaceRule') continue;
      const s = r.style;
      const src = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(s.getPropertyValue('src'))?.[1];
      if (!src) continue;
      out.push({
        fam: s.getPropertyValue('font-family').replace(/["']/g, '').trim().toLowerCase(),
        peso: parseInt(s.getPropertyValue('font-weight'), 10) || 400,
        stile: /italic|oblique/.test(s.getPropertyValue('font-style')) ? 'italic' : 'normal',
        url: fileTtf(new URL(src, doc.baseURI).href),
        range: intervalli(s.getPropertyValue('unicode-range')),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contesto di un documento PDF: font e immagini incorporati una volta sola
// ---------------------------------------------------------------------------
export function nuovoContesto(pdf) {
  pdf.registerFontkit(fontkit);
  return { pdf, fonts: new Map(), immagini: new Map(), helvetica: null, regole: null };
}

async function fontDa(ctx, url) {
  if (!ctx.fonts.has(url)) {
    ctx.fonts.set(url, (async () => {
      const bytes = await scarica(url);
      const fk = fontkit.create(bytes);
      const pdfFont = await ctx.pdf.embedFont(bytes, { subset: true });
      const upm = fk.unitsPerEm;
      return { pdf: pdfFont, fk, asc: fk.ascent / upm, desc: -fk.descent / upm };
    })());
  }
  return ctx.fonts.get(url);
}
async function helvetica(ctx) {
  ctx.helvetica ||= ctx.pdf.embedFont(StandardFonts.Helvetica).then((f) => ({ pdf: f, fk: null, asc: 0.718, desc: 0.207, helv: true }));
  return ctx.helvetica;
}

// facce (una per sottoinsieme di caratteri) adatte a uno stile calcolato; null se la famiglia non ha @font-face
function facce(ctx, st) {
  const peso = parseInt(st.fontWeight, 10) || 400;
  const stile = /italic|oblique/.test(st.fontStyle) ? 'italic' : 'normal';
  for (const fam of st.fontFamily.split(',').map((x) => x.replace(/["']/g, '').trim().toLowerCase())) {
    let cand = ctx.regole.filter((r) => r.fam === fam);
    if (!cand.length) continue;
    if (cand.some((r) => r.stile === stile)) cand = cand.filter((r) => r.stile === stile);
    // peso più vicino (a parità, il più pesante se si chiede un grassetto)
    const pesi = [...new Set(cand.map((r) => r.peso))].sort((a, b) => Math.abs(a - peso) - Math.abs(b - peso) || (peso >= 500 ? b - a : a - b));
    return cand.filter((r) => r.peso === pesi[0]);
  }
  return null;
}

// divide un testo in pezzi, ognuno con il font che ha quei caratteri
async function pezzi(ctx, st, testo) {
  const lista = facce(ctx, st);
  const out = [];
  for (const ch of testo) {
    const cp = ch.codePointAt(0);
    let f = null;
    if (lista) {
      for (const r of lista) {
        if (r.range && !r.range.some(([a, b]) => cp >= a && cp <= b)) continue;
        const ff = await fontDa(ctx, r.url);
        if (ff.fk.hasGlyphForCodePoint(cp)) { f = ff; break; }
      }
    }
    let c = ch;
    if (!f) {
      f = await helvetica(ctx);
      c = String(SOSTITUTI[ch] ?? ch).replace(WINANSI, '');
      if (!c) continue;
    }
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.f === f) ultimo.t += c;
    else out.push({ f, t: c });
  }
  return out;
}
// Helvetica (ultima risorsa) scrive solo i caratteri europei occidentali
const SOSTITUTI = { '☐': '[ ]', '☒': '[X]', '☑': '[X]', '−': '-', ' ': ' ', ' ': ' ', ' ': ' ' };
const WINANSI = /[^\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;

async function immagineDa(ctx, img) {
  const src = img.currentSrc || img.src;
  if (!ctx.immagini.has(src)) {
    ctx.immagini.set(src, (async () => {
      let bytes;
      try {
        bytes = src.startsWith('data:')
          ? Uint8Array.from(atob(src.slice(src.indexOf(',') + 1)), (c) => c.charCodeAt(0))
          : await scarica(src);
      } catch { bytes = null; }
      if (bytes && bytes[0] === 0xff && bytes[1] === 0xd8) return ctx.pdf.embedJpg(bytes);
      if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50) return ctx.pdf.embedPng(bytes);
      // altri formati (webp, svg…): si passa da un canvas
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1;
      c.height = img.naturalHeight || 1;
      c.getContext('2d').drawImage(img, 0, 0);
      const b = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      return ctx.pdf.embedPng(new Uint8Array(await b.arrayBuffer()));
    })());
  }
  return ctx.immagini.get(src);
}

// ---------------------------------------------------------------------------
// Disegno di una pagina
// ---------------------------------------------------------------------------
export async function disegnaPagina(ctx, el) {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  ctx.regole ||= regoleFont(doc);
  const pagina = ctx.pdf.addPage([W, H]);
  const base = el.getBoundingClientRect();
  const k = W / base.width; // da px CSS a punti
  // rettangolo di un elemento in px, rispetto all'angolo in alto a sinistra della pagina
  const rel = (r) => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
  const X = (x) => x * k;
  const Y = (y) => H - y * k;
  const range = doc.createRange();

  // percorso di un rettangolo arrotondato (px) in sintassi SVG, in punti con y verso il basso (per drawSvgPath)
  const percorsoSvg = (r, rr) => {
    const [tl, tr, br, bl] = rr.map((v) => v * k);
    const x = X(r.x), y = r.y * k, w = r.w * k, h = r.h * k;
    const c = 0.5523;
    return `M${x + tl},${y} L${x + w - tr},${y} C${x + w - tr + tr * c},${y} ${x + w},${y + tr - tr * c} ${x + w},${y + tr}`
      + ` L${x + w},${y + h - br} C${x + w},${y + h - br + br * c} ${x + w - br + br * c},${y + h} ${x + w - br},${y + h}`
      + ` L${x + bl},${y + h} C${x + bl - bl * c},${y + h} ${x},${y + h - bl + bl * c} ${x},${y + h - bl}`
      + ` L${x},${y + tl} C${x},${y + tl - tl * c} ${x + tl - tl * c},${y} ${x + tl},${y} Z`;
  };
  // lo stesso percorso come operatori PDF (y verso l'alto), per il ritaglio
  const percorsoOp = (r, rr) => {
    const [tl, tr, br, bl] = rr.map((v) => v * k);
    const x = X(r.x), w = r.w * k, h = r.h * k, yt = Y(r.y), yb = yt - h;
    const c = 0.5523;
    return [
      moveTo(x + tl, yt), lineTo(x + w - tr, yt), appendBezierCurve(x + w - tr + tr * c, yt, x + w, yt - tr + tr * c, x + w, yt - tr),
      lineTo(x + w, yb + br), appendBezierCurve(x + w, yb + br - br * c, x + w - br + br * c, yb, x + w - br, yb),
      lineTo(x + bl, yb), appendBezierCurve(x + bl - bl * c, yb, x, yb + bl - bl * c, x, yb + bl),
      lineTo(x, yt - tl), appendBezierCurve(x, yt - tl + tl * c, x + tl - tl * c, yt, x + tl, yt), closePath(),
    ];
  };
  const raggi = (st, r) => {
    const v = [st.borderTopLeftRadius, st.borderTopRightRadius, st.borderBottomRightRadius, st.borderBottomLeftRadius].map((s) => raggio(s, Math.min(r.w, r.h)));
    const max = Math.min(r.w, r.h) / 2;
    return v.map((x) => Math.max(0, Math.min(x, max)));
  };
  const tratto = (stile, w) => (stile === 'dashed' ? [3 * w * k, 2.2 * w * k] : stile === 'dotted' ? [w * k, w * k] : undefined);

  // sfondo e bordi
  // parti: si può disegnare solo lo sfondo o solo il bordo (nei riquadri arrotondati il bordo va disegnato per ultimo,
  // sopra al contenuto, così le righe grigie e le linee interne non lo coprono)
  function riquadro(st, r, collassato, { sfondo: conSfondo = true, bordo: conBordo = true } = {}) {
    if (r.w <= 0 || r.h <= 0) return;
    const rr = raggi(st, r);
    const tondo = rr.some((v) => v > 0.3);
    const sfondo = conSfondo ? colore(st.backgroundColor) : null;
    if (sfondo) {
      if (tondo) pagina.drawSvgPath(percorsoSvg(r, rr), { x: 0, y: H, color: sfondo.c, opacity: sfondo.a, borderWidth: 0 });
      else pagina.drawRectangle({ x: X(r.x), y: Y(r.y + r.h), width: r.w * k, height: r.h * k, color: sfondo.c, opacity: sfondo.a, borderWidth: 0 });
    }
    if (!conBordo) return;
    const lati = ['Top', 'Right', 'Bottom', 'Left'].map((l) => ({
      w: st[`border${l}Style`] === 'none' || st[`border${l}Style`] === 'hidden' ? 0 : px(st[`border${l}Width`]),
      s: st[`border${l}Style`], c: colore(st[`border${l}Color`]),
    }));
    if (!lati.some((l) => l.w > 0 && l.c)) return;
    const colori = [st.borderTopColor, st.borderRightColor, st.borderBottomColor, st.borderLeftColor];
    const uguali = lati[0].c && lati.every((l, i) => l.w === lati[0].w && l.s === lati[0].s && colori[i] === colori[0]);
    if (uguali && tondo && !collassato) {
      const l = lati[0];
      const ri = { x: r.x + l.w / 2, y: r.y + l.w / 2, w: r.w - l.w, h: r.h - l.w };
      pagina.drawSvgPath(percorsoSvg(ri, rr.map((v) => Math.max(0, v - l.w / 2))), { x: 0, y: H, borderColor: l.c.c, borderOpacity: l.c.a, borderWidth: l.w * k, borderDashArray: tratto(l.s, l.w) });
      return;
    }
    // un lato alla volta (nelle tabelle "collassate" il bordo è a cavallo del bordo della cella)
    const [t, d, b, s] = lati;
    const off = (l) => (collassato ? 0 : l.w / 2);
    const linea = (l, x1, y1, x2, y2) => {
      if (!(l.w > 0) || !l.c) return;
      pagina.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: l.w * k, color: l.c.c, opacity: l.c.a, dashArray: tratto(l.s, l.w) });
    };
    // angoli arrotondati tra due lati con bordo: le linee si accorciano e l'angolo diventa una curva
    const ha = (l) => l.w > 0 && l.c;
    const [tl, tr, br, bl] = tondo ? rr : [0, 0, 0, 0];
    const cTL = ha(t) && ha(s) ? tl : 0, cTR = ha(t) && ha(d) ? tr : 0, cBR = ha(b) && ha(d) ? br : 0, cBL = ha(b) && ha(s) ? bl : 0;
    linea(t, r.x + cTL, r.y + off(t), r.x + r.w - cTR, r.y + off(t));
    linea(b, r.x + cBL, r.y + r.h - off(b), r.x + r.w - cBR, r.y + r.h - off(b));
    linea(s, r.x + off(s), r.y + cTL, r.x + off(s), r.y + r.h - cBL);
    linea(d, r.x + r.w - off(d), r.y + cTR, r.x + r.w - off(d), r.y + r.h - cBR);
    const c = 0.5523;
    const arco = (l, x1, y1, cx1, cy1, cx2, cy2, x2, y2) => pagina.drawSvgPath(
      `M${X(x1)},${y1 * k} C${X(cx1)},${cy1 * k} ${X(cx2)},${cy2 * k} ${X(x2)},${y2 * k}`,
      { x: 0, y: H, borderColor: l.c.c, borderOpacity: l.c.a, borderWidth: l.w * k, borderDashArray: tratto(l.s, l.w) });
    if (cTR) { const o = off(t), q = cTR - o; arco(t, r.x + r.w - cTR, r.y + o, r.x + r.w - cTR + q * c, r.y + o, r.x + r.w - o, r.y + cTR - q * c, r.x + r.w - o, r.y + cTR); }
    if (cBR) { const o = off(b), q = cBR - o; arco(b, r.x + r.w - o, r.y + r.h - cBR, r.x + r.w - o, r.y + r.h - cBR + q * c, r.x + r.w - cBR + q * c, r.y + r.h - o, r.x + r.w - cBR, r.y + r.h - o); }
    if (cBL) { const o = off(b), q = cBL - o; arco(b, r.x + cBL, r.y + r.h - o, r.x + cBL - q * c, r.y + r.h - o, r.x + o, r.y + r.h - cBL + q * c, r.x + o, r.y + r.h - cBL); }
    if (cTL) { const o = off(t), q = cTL - o; arco(t, r.x + o, r.y + cTL, r.x + o, r.y + cTL - q * c, r.x + cTL - q * c, r.y + o, r.x + cTL, r.y + o); }
  }

  // casella spuntata: la X è fatta con ::before e ::after (due linee ruotate che vanno da un angolo all'altro)
  function crocetta(e, st, r) {
    const pb = win.getComputedStyle(e, '::before');
    const c = colore(pb.backgroundColor) || colore(st.color);
    if (!c) return;
    const bw = px(st.borderTopWidth);
    const spess = Math.max(px(pb.height), 0.5);
    const x1 = r.x + bw, y1 = r.y + bw, x2 = r.x + r.w - bw, y2 = r.y + r.h - bw;
    pagina.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: spess * k, color: c.c, opacity: c.a });
    pagina.drawLine({ start: { x: X(x1), y: Y(y2) }, end: { x: X(x2), y: Y(y1) }, thickness: spess * k, color: c.c, opacity: c.a });
  }

  async function immagine(img, st, r) {
    if (!img.complete || !(img.naturalWidth > 0)) return;
    const emb = await immagineDa(ctx, img);
    let { x, y, w, h } = r;
    // contenuto: dentro bordi e padding
    const pl = px(st.paddingLeft) + px(st.borderLeftWidth), pt = px(st.paddingTop) + px(st.borderTopWidth);
    x += pl; y += pt;
    w -= pl + px(st.paddingRight) + px(st.borderRightWidth);
    h -= pt + px(st.paddingBottom) + px(st.borderBottomWidth);
    if (st.objectFit === 'contain' || st.objectFit === 'scale-down') {
      const s = Math.min(w / img.naturalWidth, h / img.naturalHeight, st.objectFit === 'scale-down' ? 1 : Infinity);
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      x += (w - iw) / 2; y += (h - ih) / 2; w = iw; h = ih;
    }
    pagina.drawImage(emb, { x: X(x), y: Y(y + h), width: w * k, height: h * k });
  }

  // testo: ogni parola (o ogni lettera, se c'è spaziatura tra le lettere) nella posizione misurata dal browser
  async function scrivi(t, x, y, ruota, st, size) {
    const colTesto = colore(st.color);
    if (!colTesto) return 0;
    let dx = 0;
    for (const p of await pezzi(ctx, st, t)) {
      const opz = { font: p.f.pdf, size, color: colTesto.c, opacity: colTesto.a };
      if (ruota === 90) pagina.drawText(p.t, { ...opz, x, y: y + dx, rotate: degrees(90) });
      else if (ruota === -90) pagina.drawText(p.t, { ...opz, x, y: y - dx, rotate: degrees(-90) });
      else pagina.drawText(p.t, { ...opz, x: x + dx, y });
      dx += p.f.pdf.widthOfTextAtSize(p.t, size);
    }
    return dx;
  }
  const trasforma = (t, st) => (st.textTransform === 'uppercase' ? t.toUpperCase() : st.textTransform === 'lowercase' ? t.toLowerCase() : t);
  const sottolineato = (e) => {
    for (let a = e, i = 0; a && i < 4; a = a.parentElement, i++) {
      const s = win.getComputedStyle(a);
      if (/underline/.test(s.textDecorationLine)) return s;
      if (!/inline/.test(s.display)) break;
    }
    return null;
  };
  // metriche del font principale (per trovare la linea di base dentro il rettangolo della parola)
  async function metriche(st) {
    const lista = facce(ctx, st);
    return lista ? fontDa(ctx, lista[0].url) : helvetica(ctx);
  }

  async function testo(n, st) {
    const t0 = n.nodeValue;
    if (!t0 || !t0.trim()) return;
    if (!colore(st.color)) return;
    const fs = px(st.fontSize) || 12;
    const size = fs * k;
    const m = await metriche(st);
    const alto = (m.asc + m.desc) * fs;
    const verticale = /^vertical/.test(st.writingMode);
    const spaziatura = st.letterSpacing !== 'normal' && Math.abs(px(st.letterSpacing)) > 0.05;
    const sott = sottolineato(n.parentElement);
    const rettangolo = (a, b) => {
      range.setStart(n, a);
      range.setEnd(n, b);
      const rs = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      return rs;
    };
    const disegna = async (txt, r, ultimo) => {
      const q = rel(r);
      if (!verticale) {
        const base = q.y + (q.h - alto) / 2 + m.asc * fs;
        const w = await scrivi(trasforma(txt, st), X(q.x), Y(base), 0, st, size);
        if (sott) {
          const c = colore(sott.textDecorationColor) || colore(st.color);
          const fine = ultimo ? X(q.x) + w : X(q.x + q.w);
          pagina.drawLine({ start: { x: X(q.x), y: Y(base + fs * 0.1) }, end: { x: fine, y: Y(base + fs * 0.1) }, thickness: Math.max(0.4, fs * 0.06 * k), color: c.c, opacity: c.a });
        }
        return;
      }
      // verticale: il verso (dall'alto in basso o dal basso in alto) è quello della parola intera
      if (txt.suGiu) {
        const bx = q.x + q.w - (q.w - alto) / 2 - m.asc * fs;
        await scrivi(trasforma(txt.t, st), X(bx), Y(q.y), -90, st, size);
      } else {
        const bx = q.x + (q.w - alto) / 2 + m.asc * fs;
        await scrivi(trasforma(txt.t, st), X(bx), Y(q.y + q.h), 90, st, size);
      }
    };
    for (const p of t0.matchAll(/\S+/g)) {
      const a = p.index, b = a + p[0].length;
      const rs = rettangolo(a, b);
      if (!rs.length) continue;
      // verso delle scritte verticali: dalla posizione della prima e dell'ultima lettera della parola
      let suGiu = true;
      if (verticale && p[0].length > 1) {
        const prima = rettangolo(a, a + 1)[0], ultima = rettangolo(b - 1, b)[0];
        suGiu = !(prima && ultima) || prima.top <= ultima.top;
      }
      if (spaziatura || rs.length > 1) {
        // una lettera alla volta
        let i = a;
        for (const ch of p[0]) {
          const j = i + ch.length;
          const r = rettangolo(i, j)[0];
          if (r) await disegna(verticale ? { t: ch, suGiu } : ch, r, true);
          i = j;
        }
      } else {
        await disegna(verticale ? { t: p[0], suGiu } : p[0], rs[0], true);
      }
    }
  }

  // numero o punto degli elenchi (::marker), a sinistra della prima riga
  async function segno(li, st) {
    if (li.hasAttribute('data-split-from')) return; // continuazione di un elemento iniziato nella pagina prima
    const tipo = st.listStyleType;
    if (!tipo || tipo === 'none' || st.listStylePosition === 'inside') return;
    const fratelli = [...li.parentElement.children].filter((x) => x.tagName === 'LI');
    const inizio = Number(li.parentElement.getAttribute('start')) || 1;
    const n = inizio + fratelli.indexOf(li);
    const testoSegno = tipo === 'decimal' ? `${n}.` : tipo === 'lower-alpha' ? `${String.fromCharCode(96 + n)}.` : tipo === 'upper-alpha' ? `${String.fromCharCode(64 + n)}.` : tipo === 'circle' ? '◦' : tipo === 'square' ? '▪' : '•';
    // prima riga di testo dell'elemento
    const giro = doc.createTreeWalker(li, win.NodeFilter.SHOW_TEXT);
    let primo = null;
    for (let t = giro.nextNode(); t; t = giro.nextNode()) {
      const i = t.nodeValue.search(/\S/);
      if (i < 0) continue;
      range.setStart(t, i); range.setEnd(t, i + 1);
      const r = range.getClientRects()[0];
      if (r) { primo = r; break; }
    }
    if (!primo) return;
    const pm = win.getComputedStyle(li, '::marker');
    const stM = { color: pm.color || st.color, fontFamily: pm.fontFamily || st.fontFamily, fontWeight: pm.fontWeight || st.fontWeight, fontStyle: pm.fontStyle || st.fontStyle };
    const fs = px(pm.fontSize || st.fontSize) || 12;
    const size = fs * k;
    const m = await metriche(stM);
    const alto = (m.asc + m.desc) * fs;
    const q = rel(primo);
    const base = q.y + (q.h - alto) / 2 + m.asc * fs;
    let largo = 0;
    for (const p of await pezzi(ctx, stM, `${testoSegno} `)) largo += p.f.pdf.widthOfTextAtSize(p.t, size);
    const sinistra = rel(li.getBoundingClientRect()).x; // il segno sta fuori, a sinistra dell'elemento
    await scrivi(testoSegno, X(sinistra) - largo, Y(base), 0, stM, size);
  }

  async function nodo(e) {
    const st = win.getComputedStyle(e);
    if (st.display === 'none') return;
    const visibile = st.visibility !== 'hidden' && Number(st.opacity) !== 0;
    if (Number(st.opacity) === 0) return;
    const r = rel(e.getBoundingClientRect());
    const collassato = st.borderCollapse === 'collapse' && /^table/.test(st.display);
    // riquadro arrotondato con overflow nascosto (le card della grafica nuova): il contenuto si ritaglia dentro il bordo
    const rr = raggi(st, r);
    const ritaglia = st.overflow !== 'visible' && st.overflowX !== 'visible' && rr.some((v) => v > 0.3);
    if (visibile) {
      if (/inline/.test(st.display) && st.display !== 'inline-block' && st.display !== 'inline-flex' && st.display !== 'inline-grid') {
        for (const cr of e.getClientRects()) riquadro(st, rel(cr), false);
      } else riquadro(st, r, collassato, { bordo: !ritaglia });
      if (e.classList?.contains('cb') && e.classList.contains('on')) crocetta(e, st, r);
      if (e.tagName === 'IMG') await immagine(e, st, r);
      if (st.display === 'list-item') await segno(e, st);
    }
    // contenuto ritagliato all'interno del bordo, con la curva interna degli angoli (raggio meno spessore del bordo)
    if (ritaglia) {
      const bt = px(st.borderTopWidth), bd = px(st.borderRightWidth), bb = px(st.borderBottomWidth), bs = px(st.borderLeftWidth);
      const dentro = { x: r.x + bs, y: r.y + bt, w: r.w - bs - bd, h: r.h - bt - bb };
      const rrDentro = [Math.max(0, rr[0] - Math.max(bt, bs)), Math.max(0, rr[1] - Math.max(bt, bd)), Math.max(0, rr[2] - Math.max(bb, bd)), Math.max(0, rr[3] - Math.max(bb, bs))];
      pagina.pushOperators(pushGraphicsState(), ...percorsoOp(dentro, rrDentro), clip(), endPath());
    }
    for (const c of e.childNodes) {
      if (c.nodeType === 3) { if (visibile) await testo(c, st); }
      else if (c.nodeType === 1) await nodo(c);
    }
    if (ritaglia) {
      pagina.pushOperators(popGraphicsState());
      if (visibile) riquadro(st, r, collassato, { sfondo: false }); // il bordo sopra a tutto
    }
  }

  await nodo(el);
  return pagina;
}
