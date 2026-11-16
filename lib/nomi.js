// Nomi dei file, uguali per i download e per la cartella di archivio (Google Drive), e modulo di ogni pratica.
//   APE FVG:     SOPRALLUOGO DEL 20-10-2026 RIF. ZAMPOLLO.json / .pdf   (data della visita)
//   APE Veneto:  PRATICA APE RIF. ZAMPOLLO.json
//   Catasto:     PRATICA CATASTO RIF. ZAMPOLLO.json
//   Pratiche:    PRATICA CILA IN SANATORIA RIF. ZAMPOLLO.json           (titolo breve della pratica)
//   INFORMATIVA / LETTERA INCARICO / LETTERA INCARICO CATASTO / OFFERTA INCARICO [DEL <data firma>] RIF. ZAMPOLLO.pdf
//   PROFORMA N. 17 DEL 20-10-2026 RIF. ZAMPOLLO.pdf                     (numero e data del proforma)
// Usato dal server e dal browser.

// Modulo della pratica: 'ape' (versione 'veneto' o 'fvg'), 'catasto', 'pratica'.
// Le pratiche salvate con le app precedenti non hanno il campo: sopralluoghi → APE FVG; "Incarichi e Proforma" → APE Veneto o catasto.
export function moduloDi(d) {
  if (['ape', 'catasto', 'pratica'].includes(d?.modulo)) return d.modulo;
  return d?.informativa?.pratica === 'catasto' ? 'catasto' : 'ape';
}
export function versioneDi(d) {
  if (moduloDi(d) !== 'ape') return '';
  if (d?.versione === 'veneto' || d?.versione === 'fvg') return d.versione;
  return d?.app === 'incarichi' ? 'veneto' : 'fvg';
}
export const MODULI = { ape: 'APE', catasto: 'Catasto', pratica: 'Pratiche' };
export const etichettaModulo = (d) => {
  const m = moduloDi(d);
  return m === 'ape' ? `APE ${versioneDi(d) === 'fvg' ? 'FVG' : 'Veneto'}` : m === 'catasto' ? 'Catasto' : 'Pratica';
};

const PARTICELLE = new Set(['DE', 'DI', 'DA', 'DAL', 'DEL', 'DELLA', 'DELLE', 'DEI', 'DEGLI', 'LA', 'LO', 'LE', 'LI', 'VAN', 'VON', "D'"]);
const SOCIETA = /\b(S\.?R\.?L\.?S?|S\.?P\.?A|S\.?N\.?C|S\.?A\.?S|SOCIET[AÀ]|STUDIO|IMMOBILIARE|CONDOMINIO)\b/i;

// caratteri non ammessi nei nomi di file (Windows e Mac)
export const pulisciNome = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();

// Cognome del committente ("Mario De Luca" → "DE LUCA"); per le società la ragione sociale
export function riferimento(nome) {
  const parole = pulisciNome(nome).toUpperCase().split(' ').filter(Boolean);
  if (!parole.length) return '';
  if (SOCIETA.test(nome)) return parole.slice(0, 4).join(' ').slice(0, 50);
  let i = parole.length - 1;
  while (i > 1 && PARTICELLE.has(parole[i - 1])) i--;
  return parole.slice(i).join(' ');
}

// "2026-10-20" o Date → "20-10-2026"
export function dataNome(d) {
  if (d instanceof Date) {
    return d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

const rif = (d) => riferimento(d?.committente?.nome) || 'SENZA COMMITTENTE';

// nome base (senza estensione) del documento di sopralluogo (APE FVG)
export function nomeSopralluogo(d) {
  const data = dataNome(d?.visita?.data);
  return pulisciNome(`SOPRALLUOGO${data ? ` DEL ${data}` : ''} RIF. ${rif(d)}`);
}

// nome base (senza estensione) del file .json con i dati della pratica
export function nomePratica(d) {
  const m = moduloDi(d);
  if (m === 'ape') return versioneDi(d) === 'fvg' ? nomeSopralluogo(d) : pulisciNome(`PRATICA APE RIF. ${rif(d)}`);
  if (m === 'catasto') return pulisciNome(`PRATICA CATASTO RIF. ${rif(d)}`);
  const titolo = pulisciNome(d?.offerta?.titolo || '').toUpperCase().slice(0, 50);
  return pulisciNome(`PRATICA${titolo ? ` ${titolo}` : ''} RIF. ${rif(d)}`);
}

// Proforma del registro: numero e data sono quelli del proforma
export function nomeProforma(pf) {
  const numero = String(pf?.numero ?? '').trim() || 'SENZA NUMERO';
  const r = riferimento(pf?.destinatario?.nome) || 'SENZA DESTINATARIO';
  return pulisciNome(`PROFORMA N. ${numero} DEL ${dataNome(pf?.data) || dataNome(new Date())} RIF. ${r}`);
}

// lettere di incarico: una per pratica; la data, se indicata, è quella della firma
function nomeDocumentoIncarico(titolo, d, data = d?.informativa?.data) {
  const g = dataNome(data);
  return pulisciNome(`${titolo}${g ? ` DEL ${g}` : ''} RIF. ${rif(d)}`);
}
export const nomeInformativa = (d) => nomeDocumentoIncarico('INFORMATIVA', d);
export const nomeLettera = (d) => nomeDocumentoIncarico('LETTERA INCARICO', d);
export const nomeLetteraCatasto = (d) => nomeDocumentoIncarico('LETTERA INCARICO CATASTO', d);
export const nomeOfferta = (d) => nomeDocumentoIncarico('OFFERTA INCARICO', d, d?.offerta?.data);

// Nome proposto per la cartella di una pratica: "CAORLE VIA PINEDA 26 RIF ZAMPOLLO" (civico 7/A → 7-A)
export function nomeCartella(d) {
  const m = d?.immobile || {};
  const comune = String(m.citta || '').replace(/\s*\([A-Za-z]{2}\)\s*$/, '');
  const civico = String(m.civ || '').replace(/\//g, '-');
  const parti = [comune, m.via, civico].map((x) => String(x || '').trim()).filter(Boolean);
  const r = riferimento(d?.committente?.nome);
  return pulisciNome([...parti, r && `RIF ${r}`].filter(Boolean).join(' ').toUpperCase());
}

// pagina della Visita da stampare e far firmare (poi si carica la versione controfirmata)
export function nomeVisitaDaFirmare(d) {
  const data = dataNome(d?.visita?.data);
  return pulisciNome(`VISITA DA FIRMARE${data ? ` DEL ${data}` : ''} RIF. ${rif(d)}`);
}
