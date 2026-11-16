// Avvio della versione web: accesso con Google, scelta della cartella principale (la prima volta), poi l'app.
import * as G from './gdrive.js';
import { installa } from './backend.js';
import { impostazioni, idDaLink, verificaRadice, percorsoLeggibile } from './archivio.js';

installa();

const el = (tag, attr = {}, ...figli) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : e.setAttribute(k, v);
  e.append(...figli.flat().filter((x) => x != null));
  return e;
};

const stile = el('style', {}, `
.gs-velo{position:fixed;inset:0;z-index:9999;background:#F7F1E6;display:grid;place-items:center;padding:16px;font-family:Figtree,Roboto,sans-serif}
.gs-velo.sopra{background:rgba(20,20,20,.45)}
.gs-box{background:#fff;border-radius:28px;padding:34px 32px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.12);text-align:left}
.gs-box img{width:64px;height:64px;border-radius:16px;display:block;margin-bottom:18px}
.gs-box h1{font-size:26px;margin:0 0 8px;font-weight:600;letter-spacing:-.02em}
.gs-box p{color:#555;line-height:1.5;margin:0 0 18px;font-size:15px}
.gs-box input{width:100%;box-sizing:border-box;border:1.5px dashed #bbb;border-radius:14px;padding:12px 14px;font:inherit;margin:0 0 14px}
.gs-btn{display:inline-flex;align-items:center;gap:10px;background:#111;color:#fff;border:0;border-radius:999px;padding:12px 22px;font:inherit;font-weight:600;cursor:pointer}
.gs-btn[disabled]{opacity:.5;cursor:default}
.gs-btn.chiaro{background:#F1ECE2;color:#111}
.gs-err{color:#b3261e;font-size:14px;min-height:1.2em;margin-top:12px}
.gs-piccolo{font-size:13px;color:#777;margin-top:16px}
`);
document.head.append(stile);

const LOGO_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function velo(contenuto, { sopra = false } = {}) {
  const v = el('div', { class: `gs-velo${sopra ? ' sopra' : ''}` }, el('div', { class: 'gs-box' }, ...contenuto));
  document.body.append(v);
  return v;
}

// 1. Accesso con Google
function chiediAccesso({ testo, sopra = false } = {}) {
  return new Promise((ok) => {
    const errore = el('div', { class: 'gs-err' });
    const btn = el('button', { class: 'gs-btn', type: 'button' });
    btn.innerHTML = `${LOGO_G}<span>Entra con Google</span>`;
    const altro = el('button', { class: 'gs-btn chiaro', type: 'button', style: 'margin-left:8px' }, 'Altro account');
    const v = velo([
      el('img', { src: 'assets/logo.png', alt: '' }),
      el('h1', {}, sopra ? 'Ricollega Google' : 'Gestionale Studio'),
      el('p', {}, testo || 'Entra con il tuo account Google: pratiche, proforma e documenti vengono salvati nel tuo Google Drive e li ritrovi uguali su ogni computer.'),
      el('div', {}, btn, G.giaAutorizzato() ? altro : null),
      errore,
      sopra ? null : el('p', { class: 'gs-piccolo' }, 'La prima volta Google chiede il permesso di usare il Drive: è necessario perché l’app salvi lì i documenti. Se compare “Google non ha verificato questa app”, scegli Avanzate → Vai a … (l’app è tua).'),
    ], { sopra });
    const vai = async (scegliAccount) => {
      btn.disabled = altro.disabled = true;
      errore.textContent = '';
      try {
        await G.accedi({ scegliAccount });
        v.remove();
        ok();
      } catch (err) {
        errore.textContent = err.message;
        btn.disabled = altro.disabled = false;
      }
    };
    btn.addEventListener('click', () => vai(false));
    altro.addEventListener('click', () => vai(true));
  });
}

// 2. Cartella principale (una volta per browser): il link della cartella di Google Drive
function chiediCartella() {
  return new Promise((ok) => {
    const input = el('input', { type: 'text', placeholder: 'https://drive.google.com/drive/folders/…', autocomplete: 'off' });
    const errore = el('div', { class: 'gs-err' });
    const btn = el('button', { class: 'gs-btn', type: 'button' }, 'Usa questa cartella');
    const v = velo([
      el('img', { src: 'assets/logo.png', alt: '' }),
      el('h1', {}, 'Cartella dello studio'),
      el('p', {}, 'Incolla il link della cartella principale dello studio in Google Drive (quella che contiene le cartelle delle pratiche, 00_APE…). In Drive: apri la cartella e copia l’indirizzo dalla barra del browser.'),
      input, btn, errore,
    ]);
    btn.addEventListener('click', async () => {
      const id = idDaLink(input.value);
      if (!id) { errore.textContent = 'Questo non sembra il link di una cartella di Google Drive'; return; }
      btn.disabled = true;
      errore.textContent = '';
      try {
        await verificaRadice(id);
        impostazioni.imposta({ radice: id, nome: await percorsoLeggibile(id).catch(() => 'Google Drive') });
        v.remove();
        ok();
      } catch (err) {
        errore.textContent = err.status === 404 ? 'Cartella non trovata: controlla il link' : err.message;
        btn.disabled = false;
      }
    });
  });
}

// Accesso scaduto durante il lavoro (dopo circa un'ora): finestra per ricollegarsi, poi la richiesta riparte
let ricollegamento = null;
G.impostaSuAccessoScaduto(() => (ricollegamento ||= chiediAccesso({ sopra: true, testo: 'Il collegamento con Google Drive è scaduto (succede dopo circa un’ora). Ricollegati: quello che stavi facendo riprende da solo.' }).finally(() => { ricollegamento = null; })));

// Rinnovo silenzioso prima della scadenza, approfittando di un clic (Google lo permette solo durante un clic)
document.addEventListener('pointerdown', () => {
  if (G.scadeTraPoco() && !ricollegamento) G.accedi().catch(() => {});
}, true);

async function avvia() {
  if (!G.collegato()) await chiediAccesso();
  if (!impostazioni.radice) await chiediCartella();
  await import('../app.js');
}
avvia().catch((err) => {
  console.error(err);
  velo([el('h1', {}, 'Avvio non riuscito'), el('p', {}, err.message)]);
});
