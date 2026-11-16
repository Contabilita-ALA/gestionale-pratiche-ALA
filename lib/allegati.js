// Allegati da caricare sul portale FVGEnergia, nell'ordine richiesto. Usato dal browser (controllo nella sezione
// Documenti), dal PDF del sopralluogo (elenco ALLEGATI) e dal server (zip con i file rinominati).
import { pulisciNome, riferimento } from './nomi.js';

// fonte: 'caricato' = file caricato nella pratica; 'generato' = creato dall'app.
// Valgono le versioni firmate: l'informativa è quella firmata dal cliente (caricata); il documento di sopralluogo è
// generato dall'app ma è pronto solo con la pagina della Visita controfirmata (caricata nella scheda Visita).
export const ALLEGATI_FVG = [
  { k: 'scheda', titolo: 'Scheda catastale', fonte: 'caricato' },
  // una sola immagine (di solito l'esterno dell'edificio): quella del portale e della prima pagina dell'APE
  { k: 'foto', titolo: 'Foto immobile', fonte: 'caricato', immagine: true },
  { k: 'sopralluogo', titolo: "Documento d'ingresso e sopralluogo", fonte: 'generato' },
  { k: 'informativa', titolo: 'Informativa APE', fonte: 'caricato', firmata: true },
  { k: 'libretto', titolo: 'Libretto impianto', fonte: 'caricato' },
  { k: 'rcee', titolo: 'RCEE', fonte: 'caricato' },
];

// file caricato per un allegato: la scheda catastale è la planimetria della sezione Immobile
export function fileAllegato(d, k) {
  const f = k === 'scheda' ? d?.immobile?.planimetria : d?.allegatiFvg?.[k];
  return f && f.data ? f : null;
}

// Stato di ogni allegato: presente, come (caricato / generato dall'app) e con quale file
export function statoAllegati(d) {
  return ALLEGATI_FVG.map((a) => {
    const file = fileAllegato(d, a.k);
    if (file) return { ...a, presente: true, come: 'caricato', file };
    if (a.k === 'sopralluogo') {
      const visita = d?.pagine?.visita;
      return visita?.data ? { ...a, presente: true, come: 'generato', visita } : { ...a, presente: false, come: '' };
    }
    if (a.fonte === 'generato') return { ...a, presente: true, come: 'generato' };
    return { ...a, presente: false, come: '' };
  });
}

const estensione = (nome, tipo) => {
  const m = /\.([a-z0-9]{2,5})$/i.exec(String(nome || ''));
  if (m) return `.${m[1].toLowerCase()}`;
  return /pdf/.test(tipo || '') ? '.pdf' : /png/.test(tipo || '') ? '.png' : /jpe?g/.test(tipo || '') ? '.jpg' : '.pdf';
};

// "1. Scheda catastale rif. ZAMPOLLO.pdf"
export function nomeAllegato(d, i, file) {
  const a = ALLEGATI_FVG[i];
  const rif = riferimento(d?.committente?.nome) || 'SENZA COMMITTENTE';
  return `${pulisciNome(`${i + 1}. ${a.titolo} rif. ${rif}`)}${file ? estensione(file.nome, file.tipo) : '.pdf'}`;
}

export const nomeCartellaAllegati = (d) => pulisciNome(`ALLEGATI FVG RIF. ${riferimento(d?.committente?.nome) || 'SENZA COMMITTENTE'}`);
export const nomeZipAllegati = (d) => `${nomeCartellaAllegati(d)}.zip`;
