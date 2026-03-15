# Analisi Pendente — Problemi Aperti sulla Pipeline Formale

Questo documento raccoglie tutti i problemi individuati nelle analisi precedenti (`raw_user_pipeline_analysis.md` e `normalized_user_pipeline_analysis.md`) e ne verifica lo stato di risoluzione nella versione formale `pipeline.md`.

Ogni problema è classificato come:
- **RISOLTO** — il problema è stato indirizzato in `pipeline.md`
- **PARZIALE** — il problema è stato mitigato ma non completamente risolto
- **APERTO** — il problema non è stato affrontato in `pipeline.md`

---

## 1. Problemi da `raw_user_pipeline_analysis.md` — Assunzioni Implicite

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| AI-01 | Modello mono-utente non dichiarato | **APERTO** | `pipeline.md` non menziona il modello utente. La pipeline continua ad assumere implicitamente un singolo utente senza ruoli o permessi. |
| AI-02 | Repository Git preesistente e configurata | **RISOLTO** | C1 (Inizializzazione) verifica/inizializza la repository Git. |
| AI-03 | Contesto persistente dell'orchestratore | **PARZIALE** | `manifest.json` traccia lo stato della pipeline e R.3 definisce la serializzazione delle conversazioni. Tuttavia, il meccanismo tecnico con cui l'orchestratore (LLM stateless) ricostruisce il proprio contesto a partire dagli artefatti non è definito. |
| AI-04 | Statefulness degli agenti | **APERTO** | Il meccanismo tecnico con cui un agente riceve, mantiene e restituisce il contesto non è definito. `pipeline.md` descrive *cosa* gli agenti ricevono (input formali) ma non *come* il contesto viene trasmesso. |
| AI-05 | Commit come checkpoint — nessuna branch strategy | **PARZIALE** | R.2 definisce l'unità atomica di lavoro e il rollback. Mancano: convenzioni per messaggi di commit, branch strategy, tagging, gestione della history Git. |
| AI-06 | Convenzioni di nomenclatura degli artefatti | **RISOLTO** | Ogni artefatto in `pipeline.md` ha un percorso esplicito (es. `docs/architecture.md`, `logs/builder-report-module-N.md`). |
| AI-07 | Meccanismo di tracciamento delle chat | **PARZIALE** | R.3 stabilisce che le conversazioni vengono serializzate e committate; i log hanno directory dedicata (`logs/`). Mancano: formato di serializzazione, schema del log, dimensione massima, rotazione. |
| AI-08 | Atomicità delle operazioni e stop | **RISOLTO** | R.2 definisce l'unità atomica come: completamento invocazione + produzione artefatti + commit. Il rollback è definito. |
| AI-09 | Builder conosce i confini dei moduli | **RISOLTO** | C7 produce `module-map.md`, `task-graph.md` e `implementation-plan.md` che definiscono esplicitamente moduli, confini, dipendenze e ordine di implementazione. Il Builder (O2) li riceve come input. |
| AI-10 | Accesso alle fonti esterne | **APERTO** | C3 descrive l'analisi delle fonti esterne ma non definisce: meccanismi di autenticazione, limiti di accesso, gestione degli errori di rete, timeout, fallback in caso di fonte inaccessibile. |
| AI-11 | Distinzione Validatore/Debugger | **RISOLTO** | O3 (Validatore) è definito come: conformità architetturale + esecuzione test + analisi statica. O4 (Debugger) è definito come: esecuzione runtime + smoke test + cattura log. I confini sono chiari. |
| AI-12 | Portabilità del workspace | **PARZIALE** | R.4 stabilisce che il manifesto e gli artefatti devono essere sufficienti e vieta dipendenze da percorsi assoluti. Mancano: gestione delle dipendenze runtime (lockfile, versioni), configurazioni di ambiente, variabili d'ambiente. |

---

## 2. Problemi da `raw_user_pipeline_analysis.md` — Fasi Mancanti

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| FM-01 | Setup dell'ambiente di sviluppo | **APERTO** | Nessuno stage è dedicato all'installazione di dipendenze, configurazione di runtime/interpreti, setup del tooling. |
| FM-02 | Definizione della strategia di test | **PARZIALE** | O3 menziona "esecuzione della suite di test" e O2 richiede "almeno un test per modulo", ma non esiste una definizione esplicita della strategia di test (unitari vs integrazione vs e2e, criteri di copertura, soglie). |
| FM-03 | Esecuzione formale dei test isolata | **RISOLTO** | O3 include un'esecuzione formale della suite di test con report strutturato, separata dall'implementazione (O2). |
| FM-04 | Audit di sicurezza | **APERTO** | Nessuno stage prevede analisi OWASP, vulnerability scanning o audit delle dipendenze. |
| FM-05 | Generazione della documentazione | **APERTO** | Nessuno stage produce documentazione utente/sviluppatore (README, guide API, guide di installazione). `docs/api.md` è un artefatto architetturale, non documentazione utente. |
| FM-06 | Configurazione CI/CD | **APERTO** | Nessuno stage prevede la configurazione di pipeline di integrazione continua o deployment. |
| FM-07 | Quality gate formale | **PARZIALE** | O3 include "analisi statica del codice" ma non definisce gate di qualità espliciti: linting, formattazione, complessità ciclomatica, copertura minima del codice, soglie numeriche. |
| FM-08 | Fase di rilascio/deployment | **APERTO** | La pipeline termina con O5 (report finale) senza meccanismo di rilascio, versionamento semantico o deployment. |
| FM-09 | Inventario/manifesto degli artefatti | **RISOLTO** | `pipeline-state/manifest.json` è inizializzato in C1, aggiornato ad ogni commit (R.3), e verificato in O5. |
| FM-10 | Gestione conflitti in caso di re-ingresso | **APERTO** | Quando l'utente in O5 sceglie di iterare reinserendosi a un punto precedente (C2–O4), non è definito come vengono gestiti gli artefatti prodotti nelle fasi successive che diventano potenzialmente incoerenti. |

---

## 3. Problemi da `raw_user_pipeline_analysis.md` — Transizioni Ambigue

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| TA-01 | Chi decide se l'Analista è necessario | **RISOLTO** | C3 definisce esplicitamente: condizione di ingresso = `PROMPT.md` contiene riferimenti a fonti esterne, decisione dell'orchestratore confermata dall'utente. |
| TA-02 | Fallimento del Builder su un modulo | **RISOLTO** | O2 definisce: il Builder segnala il fallimento all'orchestratore, che notifica l'utente e attende istruzioni (riprovare, saltare, fermarsi). |
| TA-03 | Opzioni a* e b* ambigue (Validatore) | **RISOLTO** | In O3 e O4 le opzioni sono ora chiaramente distinte: a) passa tutte le note, b) passa solo i punti selezionati dall'utente. La differenza è nel filtraggio delle note, non nel meccanismo. |
| TA-04 | Re-ingresso dal report finale | **PARZIALE** | O5 definisce che l'utente può reinserirsi tra C2 e O4, ma non specifica: come vengono invalidati gli artefatti delle fasi successive al punto di re-ingresso, se il manifesto viene aggiornato per riflettere il parziale rollback, se gli artefatti obsoleti vengono eliminati o archiviati. |
| TA-05 | Transizione RESUME → AVVIO | **PARZIALE** | B1 determina il punto di re-ingresso e classifica gli artefatti. Mancano: il meccanismo di ricostruzione dello stato dell'orchestratore, la gestione di artefatti parzialmente completi (es. un modulo implementato a metà). |
| TA-06 | Soglia RESUME / ADOZIONE | **APERTO** | B1 produce una "raccomandazione esplicita (resume o adozione)" ma i criteri per determinare la soglia non sono definiti con regole concrete. La decisione resta basata su "coerenza" valutata dall'Auditor senza metriche o checklist. |
| TA-07 | Punto di re-ingresso dell'ADOZIONE | **PARZIALE** | C-ADO1 produce un piano di conformazione con azioni ordinate e punto di ingresso giustificato. Tuttavia, le operazioni di conformazione non sono definite come uno stage autonomo: chi le esegue? L'Auditor? L'Orchestratore? Un agente dedicato? |
| TA-08 | Feedback informativo del Builder | **RISOLTO** | O2 dichiara esplicitamente "informativo e non richiede conferma". R.2 garantisce che l'utente possa stoppare in qualsiasi momento. |
| TA-09 | Meccanismo di stop | **PARZIALE** | R.2 definisce il comportamento su stop (scarto + rollback) ma non il trigger: comando utente esplicito? Errore critico automatico? Timeout di inattività? Non è definito se esistano stop automatici (es. budget di token esaurito, errore fatale). |
| TA-10 | Riscrittura dei report da parte dell'orchestratore | **APERTO** | R.1 punto 4 dice "l'orchestratore riscrive il report nella chat con l'utente" ma non definisce: se si tratta di una sintesi, una trasformazione, o una trasposizione verbatim; quale livello di dettaglio; se il report originale dell'agente è comunque accessibile all'utente. |

---

## 4. Problemi da `raw_user_pipeline_analysis.md` — Fasi Sovradimensionate

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| FS-01 | Prompt Refiner (raccolta requisiti monolitica) | **APERTO** | C2 rimane un unico stage che aggrega: raccolta requisiti funzionali, definizione scope, identificazione vincoli, criteri di accettazione, produzione PROMPT.md. Le sotto-azioni sono elencate ma non sono sotto-fasi con artefatti intermedi. |
| FS-02 | Architetto (domini eterogenei aggregati) | **RISOLTO** | La fase architetturale è stata decomposta in C4 (vincoli + dominio), C5 (sintesi architetturale), C6 (validazione architetturale). |
| FS-03 | Builder (progresso interno opaco) | **PARZIALE** | O2 ha un ciclo interno esplicito con sotto-azioni enumerate (lettura specifica, implementazione, test, report) e un commit per modulo. Tuttavia, le sotto-azioni non sono sotto-fasi indipendenti con artefatti intermedi verificabili. |
| FS-04 | Validatore (attività aggregate) | **PARZIALE** | O3 elenca 4 sotto-azioni (conformità, test, analisi statica, report) ma rimane un unico stage. Non è possibile diagnosticare se un fallimento è dovuto a test falliti, non-conformità architetturale, o problemi statici. |
| FS-05 | Debugger (metodologie diverse aggregate) | **PARZIALE** | O4 elenca sotto-azioni (esecuzione, smoke test, cattura log, report) ma rimane un unico stage. Attività con output diversi (log vs report vs risultati test) sono aggregate. |
| FS-06 | Auditor (attività logicamente separabili) | **APERTO** | B1 e C-ADO1 aggregano ancora: scoperta artefatti, analisi coerenza, determinazione stato, identificazione punto di re-ingresso, e (per C-ADO1) pianificazione conformazione. |

---

## 5. Problemi da `raw_user_pipeline_analysis.md` — Osservazioni Trasversali

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| OT-01 | Pattern ciclico non formalizzato | **RISOLTO** | R.1 formalizza il pattern di interazione standard come regola trasversale riutilizzabile. |
| OT-02 | Assenza di un modello di stato della pipeline | **PARZIALE** | `manifest.json` traccia lo stato complessivo. Tuttavia, non esiste una macchina a stati formale con transizioni, stati validi e invarianti. Lo stato è derivato dagli artefatti, non definito a priori. |
| OT-03 | Dualità stop/rollback non risolta | **PARZIALE** | R.2 definisce l'unità atomica e il rollback. Manca: cosa accade se lo stop avviene durante il commit stesso; come si garantisce che il rollback non distrugga artefatti di uno stage precedente; interazione con commit incrementali del Builder (un modulo committato, il successivo interrotto). |
| OT-04 | Tracciabilità dichiarata ma non strutturata | **RISOLTO** | R.3 definisce: log per invocazione, manifesto aggiornato ad ogni commit, serializzazione conversazioni, registrazione artefatti con autore/timestamp/fase/hash. |

---

## 6. Problemi da `normalized_user_pipeline_analysis.md` — Raccomandazioni

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| NR-01 | Decomposizione di C2 per separare intent da requirements | **APERTO** | Il reference (`reference_pipeline.md`) separa Intent Clarification, Problem Formalization e Requirements Extraction in 3 stage distinti (C1, C2, C3). La pipeline formale li aggrega in un unico C2 con output `PROMPT.md`. Questo riduce la tracciabilità intermedia: non è possibile verificare la correttezza della chiarificazione dell'intent indipendentemente dall'estrazione dei requisiti. |
| NR-02 | Separazione dei test da O2 | **APERTO** | Il reference separa Code Generation (O3) da Test Synthesis (O4). La pipeline formale li unifica in O2 (per-modulo). Questa aggregazione impedisce la generazione indipendente di test (utile per progetti legacy o per strategie test-first) e rende impossibile validare la qualità dei test separatamente dalla qualità del codice. |
| NR-03 | `docs/configuration.md` è un artefatto orfano | **APERTO** | Prodotto da C5, non è consumato da nessuno stage operativo come input. Non è input di O1 (scaffold), O2 (builder), né di nessun altro stage. È un artefatto terminale non giustificato come output finale. |

---

## 7. Problemi da `normalized_user_pipeline_analysis.md` — Confronto con Reference

| ID | Problema | Stato | Dettaglio |
|----|----------|:-----:|-----------|
| CR-01 | C2 aggrega 3 stage del reference (C1+C2+C3 → C2) | **APERTO** | Impatto medio: la tracciabilità tra intent interpretato e requisiti estratti è persa. Non è possibile validare separatamente la comprensione dell'intent (C1 ref) rispetto alla formalizzazione del problema (C2 ref) rispetto all'estrazione dei requisiti (C3 ref). Correlato a NR-01. |
| CR-02 | O2 aggrega 3 stage del reference (O2+O3+O4 → O2) | **APERTO** | Impatto medio: codice e test sono generati insieme per-modulo, il che è pragmatico per un LLM ma impedisce la generazione indipendente di test e rende più opaco il progresso interno. Correlato a NR-02. |
| CR-03 | Repair Loop come transizione vs stage dedicato | **RISOLTO** | La pipeline formale implementa il repair come transizione da O3/O4 a O2, con decisione esplicita dell'utente (a/b/c). Funzionalmente equivalente al O6 del reference, con il vantaggio di rendere esplicita la decisione umana. |

---

## 8. Riepilogo Complessivo

### Per stato

| Stato | Conteggio | Percentuale |
|-------|:---------:|:-----------:|
| RISOLTO | 16 | 40% |
| PARZIALE | 14 | 35% |
| APERTO | 10 | 25% |
| **Totale** | **40** | **100%** |

### Problemi APERTI — Indice di priorità

| ID | Problema | Impatto |
|----|----------|---------|
| AI-01 | Modello mono-utente non dichiarato | Basso — accettabile se dichiarato come vincolo esplicito |
| AI-04 | Statefulness degli agenti non definita | Alto — fondamentale per l'implementazione tecnica |
| AI-10 | Accesso fonti esterne (autenticazione, errori) | Medio — rischio operativo concreto |
| FM-01 | Setup ambiente di sviluppo assente | Medio — rischio di non-riproducibilità |
| FM-04 | Audit di sicurezza assente | Medio — rischio OWASP |
| FM-05 | Generazione documentazione assente | Basso — non critico per il funzionamento della pipeline |
| FM-06 | Configurazione CI/CD assente | Basso — fuori scope della pipeline di generazione |
| FM-08 | Fase di rilascio/deployment assente | Basso — fuori scope della pipeline di generazione |
| FM-10 | Gestione conflitti al re-ingresso | Alto — rischio di stato incoerente |
| TA-06 | Soglia RESUME/ADOZIONE senza criteri concreti | Medio — decisione arbitraria dell'Auditor |
| TA-10 | Riscrittura report non definita | Basso — questione di forma |
| FS-01 | C2 monolitico (Prompt Refiner) | Medio — riduce tracciabilità intermedia |
| FS-06 | Auditor monolitico | Basso — complessità gestibile |
| NR-01 | Decomposizione C2 (allineamento reference) | Medio — tracciabilità cognitiva |
| NR-02 | Separazione test da O2 (allineamento reference) | Medio — modularità operativa |
| NR-03 | `docs/configuration.md` artefatto orfano | Basso — richiede solo routing |
| CR-01 | C2 aggrega 3 stage reference | Medio — correlato a NR-01 |
| CR-02 | O2 aggrega 3 stage reference | Medio — correlato a NR-02 |

### Problemi PARZIALI — Prossime azioni necessarie

| ID | Problema | Cosa manca |
|----|----------|-----------|
| AI-03 | Contesto persistente orchestratore | Definire come l'orchestratore ricostruisce il contesto da manifesto + artefatti |
| AI-05 | Branch strategy e convenzioni commit | Definire: branch naming, commit message format, tagging policy |
| AI-07 | Formato tracciamento chat | Definire: schema del log, formato di serializzazione, policy di rotazione |
| AI-12 | Portabilità — dipendenze runtime | Definire: gestione lockfile, versioni runtime, variabili d'ambiente |
| FM-02 | Strategia di test | Aggiungere definizione esplicita in C5 o C7: tipi di test, criteri di copertura, soglie |
| FM-07 | Quality gate formale | Definire soglie numeriche per: copertura, complessità, linting in O3 |
| TA-04 | Gestione artefatti al re-ingresso | Definire: invalidazione, archiviazione o eliminazione degli artefatti obsoleti |
| TA-05 | Ricostruzione stato nel RESUME | Definire: come l'orchestratore ricostruisce il contesto da artefatti parziali |
| TA-07 | Esecuzione operazioni di conformazione | Definire: chi esegue le operazioni di conformazione del piano di adozione |
| TA-09 | Trigger dello stop | Definire: trigger espliciti (comando utente, errore fatale, timeout, budget) |
| OT-02 | Modello di stato formale | Definire una macchina a stati con: stati validi, transizioni, invarianti |
| OT-03 | Edge case dello stop/rollback | Definire: stop durante commit, interazione con commit incrementali Builder |
| FS-03 | Builder — sotto-fasi opache | Valutare se introdurre artefatti intermedi verificabili nel ciclo del Builder |
| FS-04 | Validatore — diagnostica aggregata | Valutare se separare analisi statica, esecuzione test e conformità in sotto-report |

---

*Fine del documento di analisi pendente.*
