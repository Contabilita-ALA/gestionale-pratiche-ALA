// I documenti PDF dello studio, come nella versione per PC (server.js), generati nel browser.
import { PDFDocument, rgb } from '../vendor/pdf-lib.esm.min.js';
import fontkit from '../vendor/fontkit.es.min.js';
import { renderDocument, renderBody, ADATTA_CELLE } from '../lib/template.js';
import { renderProforma, piePaginaProforma, nomeFile as nomeProforma, tipoPratica } from '../lib/proforma.js';
import { nomeSopralluogo, nomeInformativa, nomeLettera, nomeLetteraCatasto, nomeOfferta, nomeVisitaDaFirmare } from '../lib/nomi.js';
import { renderInformativa, ADATTA_SCRIPT } from '../lib/informativa.js';
import { renderLetteraCatasto, ADATTA_CATASTO } from '../lib/catasto.js';
import { renderParti, intestazione } from '../lib/offerta.js';
import { pdfImpaginato, pdfPagineFisse } from './pdf.js';

const BASE = new URL('..', import.meta.url).href;
const url = (p) => new URL(p, BASE).href;

// Font Roboto (gli stessi file della versione per PC), caricati dal sito
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const face = (file, weight, range, style = 'normal') =>
  `@font-face{font-family:'Roboto';font-weight:${weight};font-style:${style};src:url(${url(`vendor/roboto/files/${file}`)}) format('woff2');unicode-range:${range};}`;
export const FONTS_CSS = [
  face('roboto-latin-400-normal.woff2', 400, LATIN), face('roboto-latin-ext-400-normal.woff2', 400, LATIN_EXT),
  face('roboto-latin-700-normal.woff2', 700, LATIN), face('roboto-latin-ext-700-normal.woff2', 700, LATIN_EXT),
].join('\n');
const INFORMATIVA_CSS = `${FONTS_CSS}\n${face('roboto-latin-400-italic.woff2', 400, LATIN, 'italic')}\n${face('roboto-latin-ext-400-italic.woff2', 400, LATIN_EXT, 'italic')}`;

const LOGO = url('assets/logo.png');
const TIMBRO = url('assets/timbro.png');
const FOOTER = url('assets/footer.png');

const binario = async (p) => new Uint8Array(await (await fetch(url(p))).arrayBuffer());
let risorse;
const risorsePie = () => (risorse ||= Promise.all([binario('vendor/roboto/files/roboto-latin-400-normal.woff'), binario('assets/footer.png')]));

// Chrome lasciava circa mezzo centimetro sopra l'intestazione: qui si aggiunge a mano (padding-top)
const headerLogo = `<div style="width:100%;margin:0;padding:0.48cm 0 0 1.905cm;"><img src="${LOGO}" style="width:2.78cm;height:2.77cm;margin-top:0.48cm;display:block"></div>`;

// --- Documento dei sopralluoghi (APE FVG) ---
const parte = (data, p) => pdfImpaginato(renderDocument(data, { parte: p, fontsCss: FONTS_CSS, timbro: TIMBRO }), {
  margini: { top: 4.24, bottom: data?.opzioni?.footer ? 3.7 : 2.54, left: 1.905, right: 1.905 },
  intestazione: headerLogo, prima: ADATTA_CELLE,
}).then((r) => r.pdf);

const NOMI_PAGINE = { visita: 'Visita', documenti: 'Documenti', rilievo: 'Rilievo' };
const daBase64 = (b64) => Uint8Array.from(atob(String(b64 || '')), (c) => c.charCodeAt(0));
async function caricaPdf(base64, chiave) {
  try {
    return await PDFDocument.load(daBase64(base64), { ignoreEncryption: true });
  } catch {
    throw new Error(`Il PDF caricato in "${NOMI_PAGINE[chiave] || chiave}" non è leggibile`);
  }
}

export async function pdfSopralluogo(data) {
  const caricate = data?.pagine || {};
  const immaginiRilievo = (data?.rilievo || []).some((r) => r && r.src);
  const sequenza = [
    caricate.visita?.data ? { chiave: 'visita' } : { parte: 'visita' },
    { parte: 'documenti' },
    ...(immaginiRilievo ? [{ parte: 'rilievo' }] : caricate.rilievo?.data ? [{ chiave: 'rilievo' }] : []),
    ...(renderBody(data || {}, 'schede').includes('<section') ? [{ parte: 'schede' }] : []),
  ];
  const out = await PDFDocument.create();
  const generate = [];
  out.setTitle('Documento riportante i dati di ingresso e i sopralluoghi effettuati');
  out.setAuthor(data?.certificatore?.nome || '');
  for (const voce of sequenza) {
    const src = voce.parte ? await PDFDocument.load(await parte(data, voce.parte)) : await caricaPdf(caricate[voce.chiave].data, voce.chiave);
    const indici = voce.parte ? src.getPageIndices() : [0];
    for (const p of await out.copyPages(src, indici)) {
      out.addPage(p);
      generate.push(Boolean(voce.parte));
    }
  }
  await piePagina(out, generate, Boolean(data?.opzioni?.footer));
  return { pdf: await out.save(), nome: `${nomeSopralluogo(data || {})}.pdf` };
}

export async function pdfVisitaDaFirmare(data) {
  const pdf = await PDFDocument.load(await parte(data, 'visita'));
  await piePagina(pdf, [true], Boolean(data?.opzioni?.footer));
  return { pdf: await pdf.save(), nome: `${nomeVisitaDaFirmare(data)}.pdf` };
}

// --- Piè di pagina: numero di pagina, recapiti dello studio, data di esportazione (come nella versione per PC) ---
const CM = 72 / 2.54;
const dataOraEsportazione = () => {
  const now = new Date();
  const opt = { timeZone: 'Europe/Rome' };
  const giorno = now.toLocaleDateString('it-IT', { ...opt, day: '2-digit', month: '2-digit', year: 'numeric' });
  const ora = now.toLocaleTimeString('it-IT', { ...opt, hour: '2-digit', minute: '2-digit' });
  return `Documento esportato il ${giorno} alle ore ${ora}`;
};
export async function piePagina(doc, generate, conRecapiti, { conEsportazione = true } = {}) {
  const [woff, png] = await risorsePie();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(woff, { subset: true });
  const logo = conRecapiti ? await doc.embedPng(png) : null;
  const esportazione = dataOraEsportazione();
  const ultima = doc.getPageCount() - 1;
  const grigio = rgb(0.35, 0.35, 0.35);
  const centrato = (page, testo, y, size) => {
    const { width } = page.getSize();
    page.drawText(testo, { x: (width - font.widthOfTextAtSize(testo, size)) / 2, y, size, font, color: grigio });
  };
  doc.getPages().forEach((page, i) => {
    if (page.getRotation().angle % 360 !== 0) return;
    const { width } = page.getSize();
    if (logo && generate[i]) {
      const w = 16.5 * CM;
      const h = (w * logo.height) / logo.width;
      page.drawImage(logo, { x: (width - w) / 2, y: 1.5 * CM, width: w, height: h });
    }
    if (conEsportazione && i === ultima) centrato(page, esportazione, 1.15 * CM, 7.5);
    centrato(page, String(i + 1), 0.55 * CM, 9);
  });
}

// --- Lettera di incarico (APE: informativa + lettera; catasto: lettera su due pagine) ---
export async function pdfIncarico(data, studio) {
  const catasto = tipoPratica(data) === 'catasto';
  const opzioni = { fontsCss: INFORMATIVA_CSS, timbro: TIMBRO, footer: FOOTER, studio };
  const html = catasto ? renderLetteraCatasto(data, opzioni) : renderInformativa(data, opzioni);
  const { pdf } = await pdfPagineFisse(html, { prima: catasto ? ADATTA_CATASTO : ADATTA_SCRIPT, titolo: catasto ? 'Lettera di incarico' : 'Informativa e lettera di incarico' });
  return catasto
    ? { pdf, nome: `${nomeLetteraCatasto(data)}.pdf`, catasto }
    : { pdf, nome: `${nomeInformativa(data)}.pdf`, nomiPagine: [`${nomeInformativa(data)}.pdf`, `${nomeLettera(data)}.pdf`], catasto };
}

const TITOLI_PAGINE = ['Informativa', 'Lettera di incarico'];
export async function dividiPagine(pdf, nomi) {
  const src = await PDFDocument.load(pdf);
  const file = [];
  for (const i of src.getPageIndices()) {
    const out = await PDFDocument.create();
    out.setTitle(TITOLI_PAGINE[i] || `Pagina ${i + 1}`);
    const [pagina] = await out.copyPages(src, [i]);
    out.addPage(pagina);
    file.push({ nome: nomi[i] || `Pagina ${i + 1}.pdf`, pdf: await out.save() });
  }
  return file;
}

// --- Nota tecnica e offerta economica (modulo Pratiche): "Spett." solo sulla prima pagina di ogni parte ---
export async function pdfOfferta(data, studio) {
  const parti = renderParti(data, { fontsCss: INFORMATIVA_CSS, studio });
  const out = await PDFDocument.create();
  out.setTitle('Offerta economica incarico professionale');
  out.setAuthor(studio?.firma || '');
  for (const p of parti) {
    const committente = p.spett ? data?.committente || {} : null;
    const { pdf } = await pdfImpaginato(p.html, {
      margini: { top: 4.5, bottom: 3.6, left: 1.905, right: 1.905 },
      intestazione: (i) => `<div style="padding-top:0.48cm">${intestazione(LOGO, FONTS_CSS, i === 0 ? committente : null)}</div>`,
    });
    const src = await PDFDocument.load(pdf);
    for (const pag of await out.copyPages(src, src.getPageIndices())) out.addPage(pag);
  }
  await piePagina(out, out.getPages().map(() => true), true, { conEsportazione: false });
  return { pdf: await out.save(), nome: `${nomeOfferta(data)}.pdf` };
}

// --- Proforma ---
export async function pdfProforma(pf, studio) {
  const { pdf } = await pdfImpaginato(renderProforma(pf, { fontsCss: FONTS_CSS, logo: LOGO, studio }), {
    margini: { top: 1.9, bottom: 1.5, left: 0.68, right: 0.68 },
    piede: `<div style="padding-bottom:0.55cm">${piePaginaProforma(pf, FONTS_CSS, studio)}</div>`,
    titolo: 'Proforma',
  });
  return { pdf, nome: nomeProforma(pf) };
}
