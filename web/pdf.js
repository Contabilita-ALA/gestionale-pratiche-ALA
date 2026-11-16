// Generazione dei PDF nel browser (al posto di Chrome sul PC).
// Il documento HTML (gli stessi modelli della versione per PC) si impagina in un iframe nascosto con Paged.js,
// ogni pagina A4 si fotografa ad alta risoluzione (300 dpi) e le foto diventano le pagine del PDF (pdf-lib).
// Intestazioni e piè di pagina "come Chrome" (headerTemplate/footerTemplate) si aggiungono a ogni pagina prima della foto.
import { PDFDocument } from '../vendor/pdf-lib.esm.min.js';

const BASE = new URL('..', import.meta.url).href; // radice del sito, per i file di vendor/
const MM = 96 / 25.4; // px CSS per millimetro
const A4 = { w: 210 * MM, h: 297 * MM };
const DPI = 250;
const SCALA = DPI / 96;
const QUALITA = 0.85;

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
  doc.write(html.replace(/<head>/i, `<head><base href="${BASE}">`));
  doc.close();
  await new Promise((ok) => (doc.readyState === 'complete' ? ok() : f.contentWindow.addEventListener('load', ok, { once: true })));
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; }))));
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

// Foto di un elemento A4 → JPEG (dati binari)
async function foto(f, el) {
  const w = f.contentWindow;
  if (!w.htmlToImage) await script(f.contentDocument, 'vendor/html-to-image.min.js');
  const canvas = await w.htmlToImage.toCanvas(el, {
    width: Math.round(A4.w), height: Math.round(A4.h), pixelRatio: SCALA, backgroundColor: '#ffffff', cacheBust: false,
    style: { margin: '0', transform: 'none', boxShadow: 'none' },
  });
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', QUALITA));
  return new Uint8Array(await blob.arrayBuffer());
}

async function pdfDaFoto(immagini, titolo) {
  const out = await PDFDocument.create();
  if (titolo) out.setTitle(titolo);
  out.setCreator('Gestionale Studio');
  const W = 595.28, H = 841.89; // A4 in punti
  for (const jpg of immagini) {
    const img = await out.embedJpg(jpg);
    out.addPage([W, H]).drawImage(img, { x: 0, y: 0, width: W, height: H });
  }
  return out.save();
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
      const out = [];
      for (const [i, p] of elenco.entries()) {
        aggiungiRiquadri(doc, p, i, elenco.length, { intestazione, piede });
        out.push(await foto(f, p));
      }
      return { pdf: await pdfDaFoto(out, titolo), pagine: elenco.length };
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
      const out = [];
      for (const p of doc.querySelectorAll(selettore)) out.push(await foto(f, p));
      return { pdf: await pdfDaFoto(out, titolo), pagine: out.length };
    } finally {
      f.remove();
    }
  });
}
