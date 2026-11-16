// Generazione dei PDF nel browser (al posto di Chrome sul PC). Dalla v3.8 le pagine si ridisegnano in vettoriale
// (web/vettoriale.js); la "foto" della pagina descritta qui sotto resta solo come riserva.
// Il documento HTML (gli stessi modelli della versione per PC) si impagina in un iframe nascosto con Paged.js,
// ogni pagina A4 si fotografa ad alta risoluzione e le foto diventano le pagine del PDF (pdf-lib). Sopra ogni foto c'è
// il testo della pagina, invisibile ma nella stessa posizione (come nei PDF scansionati con l'OCR): si seleziona e si cerca.
// Intestazioni e piè di pagina "come Chrome" (headerTemplate/footerTemplate) si aggiungono a ogni pagina prima della foto.
import { PDFDocument, StandardFonts, rgb } from '../vendor/pdf-lib.esm.min.js';
import { nuovoContesto, disegnaPagina } from './vettoriale.js';

const BASE = new URL('..', import.meta.url).href; // radice del sito, per i file di vendor/
const MM = 96 / 25.4; // px CSS per millimetro
const A4 = { w: 210 * MM, h: 297 * MM };
const DPI = 200;
const SCALA = DPI / 96;
const QUALITA = 0.82;

let coda = Promise.resolve(); // un documento alla volta (un solo iframe)
export function inCoda(fn) {
  const job = coda.then(fn, fn);
  coda = job.catch(() => {});
  return job;
}

function apriIframe(larghezza) {
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = `position:fixed;left:-20000px;top:0;width:${Math.ceil(larghezza)}px;height:${Math.ceil(A4.h)}px;border:0;visibility:hidden`;
  document.body.append(f);
  return f;
}

// Scrive l'HTML nell'iframe e aspetta immagini e font
async function carica(f, html) {
  const doc = f.contentDocument;
  doc.open();
  // geometricPrecision: misure dei caratteri senza arrotondamenti dello schermo, come nella stampa (e nella foto)
  doc.write(html.replace(/<head>/i, `<head><base href="${BASE}"><style>*{text-rendering:geometricPrecision !important}</style>`));
  doc.close();
  await new Promise((ok) => (doc.readyState === 'complete' ? ok() : f.contentWindow.addEventListener('load', ok, { once: true })));
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; }))));
  // i font si scaricano solo quando servono: si caricano tutti subito, così l'impaginazione usa già quelli giusti
  await Promise.all([...doc.fonts].map((f) => f.load().catch(() => null)));
  await doc.fonts.ready;
  return doc;
}

function script(doc, src) {
  return new Promise((ok, ko) => {
    const s = doc.createElement('script');
    s.src = new URL(src, BASE).href;
    s.onload = ok;
    s.onerror = () => ko(new Error(`${src} non caricato`));
    doc.head.append(s);
  });
}

const eseguiScript = (f, codice) => codice && f.contentWindow.eval(codice);

// Testo della pagina: righe con posizione (px CSS, rispetto alla pagina) e corpo del carattere.
// Ogni nodo di testo si divide in parole; le parole consecutive sulla stessa riga formano un pezzo di riga.
function testoDi(f, el) {
  const doc = f.contentDocument;
  const w = f.contentWindow;
  const base = el.getBoundingClientRect();
  const righe = [];
  const giro = doc.createTreeWalker(el, w.NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  for (let n = giro.nextNode(); n; n = giro.nextNode()) {
    const t = n.nodeValue;
    if (!t || !t.trim()) continue;
    const st = w.getComputedStyle(n.parentElement);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0 || /^vertical/.test(st.writingMode)) continue;
    const corpo = parseFloat(st.fontSize) || 12;
    let cur = null;
    for (const m of t.matchAll(/\S+/g)) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || !r.width) continue;
      const x = r.left - base.left, y = r.bottom - base.top;
      if (cur && Math.abs(cur.y - y) < corpo * 0.35 && x >= cur.x2 - 1 && x - cur.x2 < corpo * 1.5) {
        cur.t += ` ${m[0]}`;
        cur.x2 = r.right - base.left;
      } else {
        if (cur) righe.push(cur);
        cur = { t: m[0], x, y, x2: r.right - base.left, h: r.height, corpo };
      }
    }
    if (cur) righe.push(cur);
  }
  return righe;
}

// Scritte verticali (writing-mode, es. "COMMITTENTE" a lato delle tabelle): html2canvas non le sa disegnare.
// Per la foto diventano scritte orizzontali ruotate di 90°, al centro della loro cella, che mantiene le sue misure.
function scriteVerticali(f, el) {
  const w = f.contentWindow;
  const fatti = [];
  for (const v of el.querySelectorAll('*')) {
    const st = w.getComputedStyle(v);
    if (!/^vertical/.test(st.writingMode)) continue;
    const cella = v.parentElement;
    const rc = cella.getBoundingClientRect();
    const rv = v.getBoundingClientRect();
    const prima = { v: v.getAttribute('style'), c: cella.getAttribute('style') };
    fatti.push(() => { prima.v == null ? v.removeAttribute('style') : v.setAttribute('style', prima.v); prima.c == null ? cella.removeAttribute('style') : cella.setAttribute('style', prima.c); });
    const cs = w.getComputedStyle(cella);
    cella.style.width = cs.width;
    cella.style.height = cs.height;
    cella.style.position = 'relative';
    // da orizzontale la scritta è larga quanto era alta in verticale: così le scritte lunghe vanno a capo come prima
    v.style.cssText += `;writing-mode:horizontal-tb;position:absolute;inline-size:auto;width:${Math.ceil(rv.height) + 1}px;white-space:${st.whiteSpace === 'nowrap' ? 'nowrap' : 'normal'};text-align:center;margin:0;left:${rv.left - rc.left + rv.width / 2}px;top:${rv.top - rc.top + rv.height / 2}px;transform:translate(-50%,-50%) rotate(-90deg)`;
  }
  return () => fatti.reverse().forEach((fn) => fn());
}

// Foto di un elemento A4 → JPEG (dati binari) + il suo testo. html2canvas ridisegna la pagina leggendo posizioni e
// caratteri dalla pagina vera (stessi font già caricati): foto e testo invisibile coincidono.
async function foto(f, el) {
  const testo = testoDi(f, el);
  const w = f.contentWindow;
  if (!w.html2canvas) await script(f.contentDocument, 'vendor/html2canvas.min.js');
  // l'iframe alto quanto tutto il documento: html2canvas disegna solo ciò che sta nella sua finestra
  const doc = f.contentDocument;
  f.style.height = `${Math.ceil(doc.documentElement.scrollHeight) + 10}px`;
  const ripristina = scriteVerticali(f, el);
  let canvas;
  try {
    canvas = await w.html2canvas(el, {
      scale: SCALA, backgroundColor: '#ffffff', logging: false, useCORS: true,
      width: Math.round(A4.w), height: Math.round(A4.h),
      windowWidth: doc.documentElement.scrollWidth, windowHeight: doc.documentElement.scrollHeight,
    });
  } finally {
    ripristina();
  }
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', QUALITA));
  return { jpg: new Uint8Array(await blob.arrayBuffer()), testo };
}

// Helvetica scrive solo i caratteri europei occidentali (WinAnsi): gli altri si sostituiscono o si tolgono
const SOSTITUTI = { '☐': '[ ]', '☒': '[X]', '☑': '[X]', '−': '-', ' ': ' ', ' ': ' ', ' ': ' ' };
const WINANSI = /[^\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;
const senzaSimboli = (t) => String(t).replace(/./gu, (c) => SOSTITUTI[c] ?? c).replace(WINANSI, '');
async function pdfDaFoto(immagini, titolo) {
  const out = await PDFDocument.create();
  if (titolo) out.setTitle(titolo);
  out.setCreator('Gestionale Studio');
  const W = 595.28, H = 841.89; // A4 in punti
  // Helvetica (font standard dei PDF): basta per cercare e copiare il testo, non va incorporato
  const font = await out.embedFont(StandardFonts.Helvetica);
  const k = W / A4.w; // da px CSS a punti
  for (const { jpg, testo } of immagini) {
    const img = await out.embedJpg(jpg);
    const pag = out.addPage([W, H]);
    pag.drawImage(img, { x: 0, y: 0, width: W, height: H });
    // testo invisibile: stessa posizione e larghezza delle parole nella foto
    for (const r0 of testo) {
      const r = { ...r0, t: senzaSimboli(r0.t) };
      if (!r.t.trim()) continue;
      let size = r.corpo * k;
      try {
        const largo = font.widthOfTextAtSize(r.t, 1);
        const voluto = (r.x2 - r.x) * k;
        if (largo > 0) size = Math.min(Math.max(voluto / largo, size * 0.6), size * 1.5);
        pag.drawText(r.t, { x: r.x * k, y: H - r.y * k + r.h * k * 0.2, size, font, opacity: window.TESTO_VISIBILE ? 0.7 : 0, ...(window.TESTO_VISIBILE ? { color: rgb(1, 0, 0) } : {}) });
      } catch {
        // carattere che il font non sa scrivere: la parola resta solo nella foto
      }
    }
  }
  return out.save();
}

// PDF delle pagine: vettoriale (testo vero, riquadri e linee, vedi vettoriale.js). Se qualcosa va storto si usa
// la vecchia strada, la "foto" di ogni pagina con il testo invisibile sopra (anche con window.PDF_FOTO = true).
async function pdfDaPagine(f, elenco, titolo) {
  if (!window.PDF_FOTO) {
    try {
      const out = await PDFDocument.create();
      if (titolo) out.setTitle(titolo);
      out.setCreator('Gestionale Studio');
      const ctx = nuovoContesto(out);
      for (const p of elenco) await disegnaPagina(ctx, p);
      return await out.save();
    } catch (err) {
      console.warn('PDF vettoriale non riuscito: si usa la foto delle pagine', err);
    }
  }
  const foto_ = [];
  for (const p of elenco) foto_.push(await foto(f, p));
  return pdfDaFoto(foto_, titolo);
}

// Riquadri fissi aggiunti a ogni pagina (come headerTemplate/footerTemplate di Chrome): HTML posizionato in alto o in basso
function aggiungiRiquadri(doc, pagina, i, n, { intestazione, piede }) {
  const metti = (html, dove) => {
    if (!html) return;
    const d = doc.createElement('div');
    d.style.cssText = `position:absolute;left:0;width:${A4.w}px;${dove}:0;z-index:10;font-size:10pt`;
    d.innerHTML = typeof html === 'function' ? html(i, n) : html;
    d.querySelectorAll('.pageNumber').forEach((x) => (x.textContent = String(i + 1)));
    d.querySelectorAll('.totalPages').forEach((x) => (x.textContent = String(n)));
    pagina.append(d);
  };
  pagina.style.position = 'relative';
  metti(intestazione, 'top');
  metti(piede, 'bottom');
}

// Documento che scorre su più pagine: margini come in Chrome (cm), intestazione e piè di pagina facoltativi
// (stringa HTML, oppure funzione (indice, totale) → HTML). prima: script da eseguire prima dell'impaginazione.
export function pdfImpaginato(html, { margini, intestazione, piede, prima, titolo } = {}) {
  return inCoda(async () => {
    const m = { top: 2.54, right: 1.905, bottom: 2.54, left: 1.905, ...margini };
    const f = apriIframe((210 - (m.left + m.right) * 10) * MM);
    try {
      const pagine = `@page { size: A4; margin: ${m.top}cm ${m.right}cm ${m.bottom}cm ${m.left}cm; }`;
      const doc = await carica(f, html.replace(/<\/head>/i, `<style>${pagine}</style></head>`));
      eseguiScript(f, prima);
      // impaginazione: Paged.js sostituisce il body con le pagine
      f.contentWindow.PagedConfig = { auto: false };
      await script(doc, 'vendor/paged.polyfill.js');
      f.style.width = `${Math.ceil(A4.w) + 40}px`;
      await f.contentWindow.PagedPolyfill.preview();
      await doc.fonts.ready;
      const elenco = [...doc.querySelectorAll('.pagedjs_page')];
      for (const [i, p] of elenco.entries()) aggiungiRiquadri(doc, p, i, elenco.length, { intestazione, piede });
      await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; }))));
      return { pdf: await pdfDaPagine(f, elenco, titolo), pagine: elenco.length };
    } finally {
      f.remove();
    }
  });
}

// Documento già diviso in pagine A4 fisse (".pagina": informativa, lettere di incarico)
export function pdfPagineFisse(html, { selettore = '.pagina', prima, titolo } = {}) {
  return inCoda(async () => {
    const f = apriIframe(A4.w);
    try {
      const doc = await carica(f, html);
      doc.body.style.margin = '0';
      eseguiScript(f, prima);
      await doc.fonts.ready;
      const elenco = [...doc.querySelectorAll(selettore)];
      return { pdf: await pdfDaPagine(f, elenco, titolo), pagine: elenco.length };
    } finally {
      f.remove();
    }
  });
}
