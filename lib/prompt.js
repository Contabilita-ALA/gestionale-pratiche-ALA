// Modulo Pratiche: bozza di nota tecnica e offerta economica senza costi. L'app prepara un testo (prompt) da incollare in
// una chat con un'intelligenza artificiale (es. claude.ai, anche nel piano gratuito), insieme a foto e documenti della
// pratica; la risposta, in un formato fisso, si incolla di nuovo nell'app che riempie i campi da sola.
// Usato solo dal browser: niente viene inviato a servizi esterni dall'app.

// Esempio dello stile dello studio (una pratica reale, senza i dati del cliente)
const ESEMPIO = `### Esempio di appunti
CILA in sanatoria per opere interne, appartamento a Venezia, Cannaregio 3120, piano terra, Fg. 12 Mapp. 458 Sub. 1. Dal sopralluogo: tramezzi spostati rispetto all'ultima pratica del 04/11/1992 (prot. gen. 92.VE.138486, prot. Edilizia Privata 12151/92); la planimetria catastale invece è aggiornata. Differenze: cucina ora chiusa (era zona cottura aperta sul soggiorno), bagno in camera da 5,2 mq senza più la nicchia vasca, disimpegno e porte spostati. Niente strutture, prospetti, volumi, destinazione. Sanzione 1000 €, diritti di segreteria 100 €. Rilievo 300 €, pratica 1200 €. Acconto 50% alla firma, saldo alla trasmissione.

### Risposta attesa per quell'esempio
{
  "titolo": "CILA in sanatoria",
  "nota": "Con riferimento all’immobile sito in Venezia (VE), Sestiere Cannaregio n. 3120, piano terra, catastalmente censito al Foglio 12, Mappale 458, Subalterno 1, a seguito di un primo sopralluogo, è emersa la presenza di difformità interne rispetto all’ultima pratica edilizia presentata per l’unità immobiliare. In particolare, la distribuzione interna dei locali risulta modificata a seguito della rimozione e dell’inserimento di alcune tramezzature.\\n\\nL’ultimo titolo edilizio relativo a modifiche interne all’unità è stato depositato presso il Comune di Venezia in data 04/11/1992 (prot. gen. n. 92.VE.138486, prot. Edilizia Privata n. 12151/92).\\nLa planimetria catastale in atti rappresenta invece l’attuale distribuzione interna dell’unità.\\nDal confronto preliminare tra i due elaborati emergono le seguenti divergenze, riconducibili alla diversa posizione delle tramezzature interne e da **verificare puntualmente in sede di rilievo**:\\n- la zona cottura, prevista aperta sul soggiorno, risulta oggi un locale cucina autonomo, delimitato da tramezzi;\\n- il bagno di circa 5,2 mq previsto in camera non presenta più la nicchia per la vasca, con conseguente diversa conformazione della camera stessa;\\n- risultano modificati il disimpegno di collegamento tra soggiorno e camera e la posizione di alcune porte interne.\\n\\nLe opere riscontrate non interessano parti strutturali dell’edificio, non comportano aumento del numero delle unità immobiliari, né modifiche ai prospetti, alla sagoma o alla volumetria, né mutamento della destinazione d’uso. Si configurano pertanto come opere di minore entità, riconducibili agli interventi soggetti a Comunicazione di Inizio Lavori Asseverata (C.I.L.A.) ai sensi dell’art. 6-bis del D.P.R. 380/2001.\\nTrattandosi di opere già eseguite, la regolarizzazione avviene mediante presentazione di una **C.I.L.A. in sanatoria** (comunicazione tardiva). Ai sensi dell’art. 6-bis, comma 5, del D.P.R. 380/2001, la mancata comunicazione dell’inizio dei lavori comporta il versamento al Comune di una sanzione pecuniaria pari a **€ 1.000,00**.\\nAi fini della corretta predisposizione della pratica, si rende necessario un rilievo metrico specifico dello stato di fatto, finalizzato a produrre le dimostrazioni richieste dal Comune di Venezia. In particolare, il rilievo consentirà di verificare per ciascun locale le superfici utili, le altezze interne, i rapporti aeroilluminanti (con particolare riferimento al “nuovo” locale cucina) e l’aerazione dei servizi igienici, in relazione ai requisiti igienico-sanitari e al Regolamento Edilizio comunale vigente.",
  "oggetto": "alla regolarizzazione mediante C.I.L.A. in sanatoria di opere interne realizzate in un’unità residenziale sita in Venezia, Sestiere Cannaregio n. 3120, piano terra, catastalmente identificata al Fg. 12 Mapp. 458 Sub. 1",
  "prestazioni": [
    { "testo": "Sopralluogo per rilievo metrico specifico dello stato di fatto, relativa documentazione fotografica e restituzione grafica di quanto rilevato, finalizzato alla verifica di superfici utili, altezze interne e rapporti aeroilluminanti dei locali;", "prezzo": "300" },
    { "testo": "Verifica dello stato legittimo dell’unità sulla base della documentazione acquisita tramite accesso agli atti;\\nRedazione degli elaborati grafici (stato legittimo, stato di fatto, stato comparativo), comprensivi delle tavole dimostrative richieste dal Comune di Venezia, e relazione tecnica;\\nPredisposizione della relazione tecnica asseverata e della documentazione amministrativa richiesta;\\nCompilazione, sottoscrizione e trasmissione telematica della C.I.L.A. in sanatoria presso il Comune di Venezia;\\nEventuali interlocuzioni con l’ufficio istruttore per chiarimenti sulla pratica presentata.", "prezzo": "1200" }
  ],
  "esclusioni": [
    "Progetti richiesti da Enti diversi (es. Soprintendenza) e/o documentazione aggiuntiva a seguito di richieste di integrazione degli uffici preposti;",
    "Aggiornamento catastale (DOCFA) e Attestato di Prestazione Energetica (A.P.E.);",
    "Oneri, sanzioni amministrative, bolli, diritti di segreteria e catastali;",
    "Parcelle di altri professionisti o consulenti specialistici;",
    "Pratiche per bonus fiscali;",
    "Quanto non espressamente specificato nei punti precedenti."
  ],
  "pagamento": [
    "primo acconto (fondo spese) pari al 50% dell’onorario alla firma del presente incarico;",
    "il saldo, pari al 50% dell’onorario, alla trasmissione della C.I.L.A. in sanatoria."
  ],
  "speseCommittente": [
    { "testo": "sanzione pecuniaria dovuta al Comune di Venezia per la presentazione della C.I.L.A. in sanatoria (art. 6-bis, comma 5, del D.P.R. 380/2001);", "importo": "1000" },
    { "testo": "diritti di segreteria relativi alla presentazione della C.I.L.A. in sanatoria presso il Comune di Venezia.", "importo": "100" }
  ]
}`;

const REGOLE = `Sei l'assistente di un'architetta italiana (Dott.ssa Arch. Agnese Lorenzon, studio in provincia di Venezia). Prepara la bozza di due documenti per un cliente privato, a partire dagli appunti qui sotto e dalle foto o dai documenti che allego (planimetrie, titoli edilizi, visure, foto del sopralluogo): una "Nota tecnica esplicativa" e una "Offerta economica incarico professionale" per una pratica edilizia. La professionista rilegge e corregge sempre la bozza: dalle un testo già nel suo stile, corretto e prudente, su cui debba intervenire il meno possibile.

Come scrivere:
- Italiano tecnico-professionale, sobrio, in terza persona ("la Professionista", "il Committente"), con lo stesso registro e la stessa struttura dell'esempio.
- Usa solo i fatti presenti negli appunti, nei dati dell'immobile e negli allegati. Non inventare protocolli, date, superfici, importi, nomi di uffici o esiti di verifiche. Dove un'informazione serve ma manca, scrivi un segnaposto tra parentesi quadre, ad esempio "[da completare: estremi dell'ultimo titolo edilizio]".
- Cita norme (D.P.R. 380/2001, regolamenti, leggi regionali) solo quando sei sicuro dell'articolo e della sua pertinenza; altrimenti descrivi l'adempimento senza citare l'articolo, oppure metti "[da verificare: riferimento normativo]". Un riferimento sbagliato in una lettera firmata è peggio di un riferimento mancante.
- Importi: riporta solo quelli indicati, come numeri senza simbolo (es. "1200"). Se non è indicato lascia la stringa vuota.
- Nota tecnica: paragrafi separati da una riga vuota quando cambia argomento; elenchi con righe che iniziano con "- "; il grassetto, con parsimonia, tra doppi asterischi. Niente titolo, saluti, luogo, data o firma: li aggiunge l'applicazione.
- Offerta: raggruppa le attività in pochi punti (di solito da uno a tre), ciascuno con il suo importo se indicato; più attività dello stesso punto su righe separate, ognuna chiusa da punto e virgola (l'ultima dal punto).
- "oggetto" completa la frase «L’oggetto dell’incarico è inerente …»: inizia con la preposizione articolata (alla, al, all’…) e non termina con il punto.
- Se gli appunti non dicono nulla sul pagamento, proponi acconto 50% alla firma e saldo 50% alla conclusione della prestazione principale.
- Spese a carico del committente (sanzioni, diritti di segreteria, bolli): solo quelle che risultano dagli appunti o che sono certe per quel tipo di pratica; l'importo solo se indicato.

Formato della risposta (importante): rispondi SOLO con un blocco di codice JSON con queste chiavi, senza testo prima o dopo, perché verrà incollato in un programma:
{ "titolo": "titolo breve, 2-5 parole", "nota": "testo della nota tecnica (\\n per andare a capo)", "oggetto": "...", "prestazioni": [{ "testo": "...", "prezzo": "..." }], "esclusioni": ["..."], "pagamento": ["..."], "speseCommittente": [{ "testo": "...", "importo": "..." }] }`;

// Prompt completo. parti: ['nota', 'offerta'] (anche una sola); allegati: nomi dei file da allegare nella chat
export function creaPrompt({ appunti = '', immobile = {}, parti = ['nota', 'offerta'], allegati = [], attuale = '' } = {}) {
  const m = immobile || {};
  const dati = [
    m.citta && `Comune: ${m.citta}`,
    (m.via || m.civ) && `Indirizzo: ${[m.via, m.civ && `n. ${m.civ}`].filter(Boolean).join(' ')}`,
    (m.fg || m.mapp || m.sub) && `Catasto: ${[m.fg && `Fg. ${m.fg}`, m.mapp && `Mapp. ${m.mapp}`, m.sub && `Sub. ${m.sub}`].filter(Boolean).join(', ')}`,
  ].filter(Boolean).join('\n');
  const vuole = (k) => parti.includes(k);
  const cosa = vuole('nota') && vuole('offerta') ? 'la nota tecnica e l’offerta economica'
    : vuole('nota') ? 'solo la nota tecnica (lascia vuoti gli elenchi dell’offerta, ma compila titolo e oggetto)'
      : 'solo l’offerta economica (lascia vuota la nota)';
  return `${REGOLE}

${ESEMPIO}

### La pratica di oggi
Prepara ${cosa}.

Appunti:
${String(appunti).trim() || '(nessun appunto: usa gli allegati)'}

Immobile:
${dati || 'non indicato (usa quanto risulta dagli appunti e dagli allegati)'}
${allegati.length ? `\nAllegati a questo messaggio (usali come fonte, senza trascriverne i dati personali):\n${allegati.map((n) => `- ${n}`).join('\n')}\n` : ''}${attuale ? `\nTesti già scritti dalla professionista (mantienili, a meno che gli appunti non dicano altro):\n${attuale}\n` : ''}`;
}

// Risposta incollata dalla chat → oggetto con i campi. Accetta il JSON anche dentro un blocco ``` o con testo intorno.
export function leggiRisposta(testo) {
  const t = String(testo || '').trim();
  if (!t) throw new Error('Incolla prima la risposta della chat');
  const blocco = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  let json = blocco ? blocco[1] : t;
  const inizio = json.indexOf('{');
  const fine = json.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) throw new Error('Nella risposta non trovo il blocco di dati: chiedi alla chat di rispondere «solo con il blocco JSON» e incolla di nuovo');
  json = json.slice(inizio, fine + 1);
  let d;
  try {
    d = JSON.parse(json);
  } catch {
    // capita che la chat lasci virgole finali: si tolgono e si riprova
    try {
      d = JSON.parse(json.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      throw new Error('La risposta non è completa o non è nel formato atteso: copia tutto il blocco della chat (dalla prima all’ultima parentesi graffa)');
    }
  }
  const str = (v) => (v == null ? '' : String(v).trim());
  const lista = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? str(v).split('\n').map((x) => x.trim()).filter(Boolean) : []);
  const coppie = (v, k) => (Array.isArray(v) ? v : []).map((x) => (typeof x === 'string' ? { testo: x.trim(), [k]: '' } : { testo: str(x?.testo), [k]: str(x?.[k]).replace(/[^\d.,]/g, '') })).filter((x) => x.testo);
  return {
    titolo: str(d.titolo),
    nota: str(d.nota),
    oggetto: str(d.oggetto).replace(/[.;]\s*$/, ''),
    prestazioni: coppie(d.prestazioni, 'prezzo'),
    esclusioni: lista(d.esclusioni),
    pagamento: lista(d.pagamento),
    speseCommittente: coppie(d.speseCommittente, 'importo'),
  };
}
