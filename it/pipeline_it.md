# Modello Formale della Pipeline di Sviluppo Software

---

# Pipeline Cognitiva

Obiettivo: trasformare progressivamente un'idea ambigua dell'utente in un piano di implementazione completo e validato.

---

## C1 — Inizializzazione

- **Scopo**: predisporre l'infrastruttura della pipeline e stabilire il punto di partenza tracciabile per il progetto.
- **Input**:
  - `user_request` — richiesta dell'utente di avviare un nuovo progetto (linguaggio naturale)
- **Output**:
  - `pipeline-state/manifest.json` — manifesto iniziale della pipeline (stato: inizializzato)
  - `logs/session-init.md` — log della sessione di inizializzazione
  - struttura directory: `docs/`, `logs/`, `pipeline-state/`
- **Trasformazione**: una richiesta informale viene convertita in una struttura di repository tracciabile con manifesto di stato.
- **Criteri di validazione**:
  - la repository Git è inizializzata e accessibile
  - le directory `docs/`, `logs/`, `pipeline-state/` esistono
  - `manifest.json` contiene lo stato `initialized` con timestamp
  - il commit iniziale è stato eseguito

---

## C2 — Raccolta Requisiti

- **Scopo**: catturare e formalizzare i requisiti del progetto attraverso conversazione iterativa con l'utente.
- **Input**:
  - `user_request` — conversazione in linguaggio naturale con l'utente
  - `pipeline-state/manifest.json` — stato corrente della pipeline
- **Output**:
  - `PROMPT.md` — specifica completa del progetto (requisiti funzionali, non funzionali, scope, vincoli, criteri di accettazione)
  - `logs/prompt-refiner-conversation.md` — log della conversazione
- **Trasformazione**: un'idea espressa in linguaggio naturale viene progressivamente raffinata in un documento di specifica strutturato attraverso cicli di feedback utente.
- **Criteri di validazione**:
  - `PROMPT.md` contiene sezioni per: obiettivo, requisiti funzionali, requisiti non funzionali, vincoli, criteri di accettazione
  - l'utente ha confermato esplicitamente la completezza del documento (gate utente superato)
  - il log della conversazione è stato committato

---

## C3 — Analisi Fonti Esterne [condizionale]

- **Scopo**: analizzare codice e architetture esterne rilevanti per il progetto, estraendo pattern e logiche riutilizzabili.
- **Condizione di ingresso**: `PROMPT.md` contiene riferimenti a fonti di codice esterno (decisione dell'orchestratore confermata dall'utente)
- **Input**:
  - `PROMPT.md` — riferimenti alle fonti esterne
- **Output**:
  - `docs/upstream-analysis.md` — analisi dettagliata delle fonti esterne (logica estratta, modelli di configurazione, pattern architetturali, licenze)
  - `logs/analyst-conversation.md` — log della conversazione
- **Trasformazione**: riferimenti a sorgenti esterne vengono convertiti in un documento di analisi strutturato con focus sugli elementi rilevanti per il progetto corrente.
- **Criteri di validazione**:
  - ogni fonte referenziata in `PROMPT.md` è stata analizzata
  - `upstream-analysis.md` lega ogni elemento estratto alla fonte originale
  - l'utente ha confermato la qualità dell'analisi (gate utente superato)
- **Bypass**: se non ci sono fonti esterne, lo stage viene saltato e `upstream-analysis.md` non viene prodotto. Lo stage successivo deve funzionare con o senza questo artefatto.

---

## C4 — Analisi Vincoli e Modellazione Dominio

- **Scopo**: identificare i vincoli operativi del sistema e costruire il modello concettuale del dominio.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (opzionale)
- **Output**:
  - `docs/constraints.md` — vincoli di performance, sicurezza, ambiente, scalabilità
  - `docs/domain-model.md` — entità, relazioni, operazioni del dominio
- **Trasformazione**: i requisiti e l'analisi esterna vengono analizzati per estrarre vincoli espliciti e impliciti e per costruire il modello concettuale del dominio applicativo.
- **Criteri di validazione**:
  - ogni vincolo è classificato per categoria (performance, sicurezza, ambiente, scalabilità)
  - il modello di dominio copre tutte le entità menzionate nei requisiti
  - non ci sono vincoli in conflitto tra loro

---

## C5 — Sintesi Architetturale

- **Scopo**: definire l'architettura del sistema, le API, i contratti di interfaccia e il modello di configurazione.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (opzionale)
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture.md` — architettura del sistema (struttura, componenti, dipendenze, pattern di interazione)
  - `docs/api.md` — definizione delle API
  - `docs/configuration.md` — modello di configurazione
  - `docs/interface-contracts.md` — contratti di interfaccia tra componenti
- **Trasformazione**: i requisiti, i vincoli e il modello di dominio vengono sintetizzati in una struttura architetturale coerente con responsabilità componenziali, contratti e sequenza di implementazione.
- **Criteri di validazione**:
  - ogni requisito funzionale è mappato ad almeno un componente architetturale
  - ogni vincolo è indirizzato nell'architettura
  - i contratti di interfaccia sono privi di ambiguità
  - l'utente ha confermato l'architettura (gate utente superato)

---

## C6 — Validazione Architetturale

- **Scopo**: verificare la coerenza dell'architettura rispetto a requisiti, vincoli e modello di dominio prima di procedere all'implementazione.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture-review.md` — report di validazione architetturale (copertura requisiti, conformità vincoli, rischi identificati)
- **Trasformazione**: cross-referencing sistematico tra architettura, requisiti e vincoli per produrre un giudizio strutturato di conformità.
- **Criteri di validazione**:
  - ogni requisito è tracciato ad almeno un componente
  - nessun vincolo è violato
  - i rischi identificati hanno proposte di mitigazione
- **Regola di decisione**:
  - se l'architettura è invalida → ritorno a C5 con note di revisione
  - se l'architettura è valida → proseguimento

---

## C7 — Pianificazione dell'Implementazione

- **Scopo**: decomporre l'architettura in task implementabili, definire il grafo delle dipendenze e la sequenza di esecuzione.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
- **Output**:
  - `docs/task-graph.md` — grafo dei task con dipendenze
  - `docs/implementation-plan.md` — piano di implementazione con ordine di esecuzione e specifica per modulo
  - `docs/module-map.md` — mappa dei moduli con responsabilità e interfacce
- **Trasformazione**: l'architettura viene decomposta in unità di lavoro implementabili con le relative dipendenze e priorità.
- **Criteri di validazione**:
  - ogni componente architetturale è mappato ad almeno un task
  - il grafo delle dipendenze è aciclico
  - ogni modulo ha responsabilità, interfacce e dipendenze dichiarate
  - l'utente ha confermato il piano (gate utente superato)

---

## Output della Pipeline Cognitiva

Artefatti finali prodotti:

```
PROMPT.md
docs/upstream-analysis.md          (condizionale)
docs/constraints.md
docs/domain-model.md
docs/architecture.md
docs/api.md
docs/configuration.md
docs/interface-contracts.md
docs/architecture-review.md
docs/task-graph.md
docs/implementation-plan.md
docs/module-map.md
```

Questi artefatti sono consumati dalla Pipeline Operativa.

---

# Pipeline Operativa

Obiettivo: eseguire il piano di implementazione e produrre software funzionante, testato e validato.

---

## O1 — Scaffold del Repository

- **Scopo**: creare la struttura del progetto sulla base del piano architetturale e della mappa dei moduli.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/architecture.md`
- **Output**:
  - `docs/repository-structure.md` — struttura del repository documentata
  - struttura fisica delle directory e dei file placeholder
- **Trasformazione**: il piano di implementazione e la mappa dei moduli vengono convertiti nella struttura fisica del progetto.
- **Criteri di validazione**:
  - ogni modulo in `module-map.md` ha una directory corrispondente
  - la struttura rispecchia le dipendenze dichiarate nell'architettura
  - il commit è stato eseguito

---

## O2 — Generazione dei Moduli (Builder)

- **Scopo**: implementare il codice modulo per modulo seguendo il piano di implementazione e il grafo delle dipendenze.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/task-graph.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
- **Output** (per ogni modulo):
  - `src/<module>/` — codice sorgente del modulo
  - `tests/<module>/` — test del modulo
  - `logs/builder-report-module-N.md` — report per modulo
- **Output** (al completamento):
  - `logs/builder-cumulative-report.md` — report cumulativo
- **Trasformazione**: le specifiche di ogni modulo vengono convertite in codice funzionante con relativi test, seguendo l'ordine del grafo dei task.
- **Criteri di validazione**:
  - ogni modulo dichiarato nel piano è implementato
  - ogni modulo ha almeno un test associato
  - i test del modulo passano prima di procedere al modulo successivo
  - un commit è stato eseguito per ogni modulo completato
- **Ciclo interno**: il Builder itera su ogni modulo. Il feedback all'utente è solo informativo e non richiede conferma.
- **Gestione errore**: se un modulo fallisce, l'orchestratore notifica l'utente e attende istruzioni (riprovare, saltare, fermarsi).

---

## O3 — Validazione del Sistema (Validatore)

- **Scopo**: verificare la conformità complessiva del sistema rispetto all'architettura, ai requisiti e ai contratti di interfaccia.
- **Input**:
  - `src/` — codice sorgente completo
  - `tests/` — suite di test completa
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
- **Output**:
  - `docs/validator-report.md` — report di validazione (conformità architetturale, risultati test, analisi statica, non-conformità)
- **Trasformazione**: il codice prodotto viene confrontato sistematicamente con le specifiche architetturali e i requisiti, producendo un giudizio strutturato.
- **Criteri di validazione**:
  - tutti i test passano
  - ogni requisito funzionale è coperto da almeno un test
  - nessuna violazione dei contratti di interfaccia
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O2 con tutte le note
  - **b)** correzione selettiva → ritorno a O2 con punti selezionati
  - **c)** nessuna correzione → proseguimento

---

## O4 — Debug e Smoke Test (Debugger)

- **Scopo**: esercitare l'applicazione in ambiente controllato, catturare log e identificare bug runtime non emersi dalla validazione statica.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/architecture.md`
  - `docs/validator-report.md`
- **Output**:
  - `docs/debugger-report.md` — report dei bug trovati, log catturati, risultati degli smoke test
  - `logs/runtime-logs/` — log catturati durante l'esecuzione
- **Trasformazione**: l'applicazione viene eseguita in scenari realistici e i risultati vengono analizzati per identificare comportamenti anomali non emersi dalla validazione.
- **Criteri di validazione**:
  - tutti gli smoke test definiti sono stati eseguiti
  - i log sono stati catturati e analizzati
  - ogni bug trovato è documentato con: scenario di riproduzione, log associati, severità
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O2 con tutte le note
  - **b)** correzione selettiva → ritorno a O2 con punti selezionati
  - **c)** nessun bug → proseguimento

---

## O5 — Chiusura e Report Finale

- **Scopo**: verificare l'integrità del repository, consolidare lo stato della pipeline e fornire un report finale all'utente.
- **Input**:
  - tutti gli artefatti prodotti dalla pipeline (cognitiva + operativa)
  - `pipeline-state/manifest.json`
- **Output**:
  - `docs/final-report.md` — report finale cumulativo
  - `pipeline-state/manifest.json` — manifesto aggiornato con stato `completed`
- **Trasformazione**: tutti gli artefatti vengono inventariati, verificati per integrità e sintetizzati in un report finale.
- **Criteri di validazione**:
  - ogni artefatto dichiarato nel manifesto è presente nel repository
  - nessun file non tracciato è rimasto fuori dal manifesto
  - il manifesto è aggiornato con stato finale e timestamp
- **Gate utente**: l'utente sceglie tra:
  - **Iterazione**: reinserimento a un punto specifico della pipeline (C2–O4) fornendo indicazioni
  - **Chiusura**: la pipeline è conclusa

---

# Flusso B — Resume Progetto

---

## B1 — Audit di Continuità

- **Scopo**: analizzare una repository esistente per determinare se il progetto può essere ripreso dal punto di interruzione.
- **Input**:
  - contenuto della repository
  - `pipeline-state/manifest.json` (se presente)
- **Output**:
  - `docs/audit-report.md` — report di audit (artefatti trovati, stato della pipeline, punto di interruzione, raccomandazione)
- **Trasformazione**: gli artefatti presenti nella repository vengono confrontati con la struttura attesa della pipeline per determinare lo stato e la coerenza del progetto.
- **Criteri di validazione**:
  - ogni artefatto trovato è stato classificato rispetto allo stage che lo ha prodotto
  - il punto di interruzione è stato identificato in modo univoco
  - il report contiene una raccomandazione esplicita (resume o adozione)
- **Gate utente**: l'utente conferma il risultato dell'audit
- **Esito**:
  - **Resumabile**: reinserimento nel flusso principale (C/O) al punto identificato
  - **Non resumabile**: raccomandazione di passare al Flusso C (Adozione)

---

# Flusso C — Adozione Progetto

---

## C-ADO1 — Audit di Conformità

- **Scopo**: analizzare una repository non conforme alla pipeline per produrre un piano di adozione che la renda compatibile.
- **Input**:
  - contenuto della repository
  - artefatti di audit precedenti (se presenti)
- **Output**:
  - `docs/adoption-report.md` — report di adozione (gap analysis, piano di conformazione, punto di ingresso nella pipeline)
- **Trasformazione**: il contenuto della repository viene confrontato con la struttura attesa della pipeline, identificando le lacune e producendo un piano per colmarle.
- **Criteri di validazione**:
  - ogni lacuna è stata documentata con l'artefatto mancante e lo stage responsabile
  - il piano di conformazione specifica le azioni necessarie in ordine
  - il punto di ingresso nella pipeline è giustificato
- **Gate utente**: l'utente deve confermare il piano di adozione
- **Transizione**: reinserimento nel flusso principale al punto identificato

---

# Regole Trasversali

## R.1 — Pattern di Interazione Standard

Ogni stage segue il pattern:

1. L'orchestratore assegna il compito all'agente specializzato
2. L'agente produce gli artefatti e restituisce il risultato all'orchestratore
3. L'orchestratore effettua un commit
4. L'orchestratore riscrive il report nella chat con l'utente
5. Se previsto un gate utente: attende conferma o feedback
6. Se il feedback è negativo: il ciclo si ripete dal punto 1 con le note dell'utente

## R.2 — Atomicità e Stop

- Ogni operazione di un agente è un'unità atomica di lavoro: completamento dell'invocazione + produzione artefatti + commit
- Su richiesta di stop: le modifiche in corso vengono scartate e rollback all'ultimo commit
- Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati

## R.3 — Tracciabilità

- Ogni invocazione produce un log in `logs/`
- Il manifesto (`pipeline-state/manifest.json`) è aggiornato ad ogni commit
- Le conversazioni vengono serializzate e committate
- Ogni artefatto è registrato nel manifesto con: autore, timestamp, fase, hash del commit

## R.4 — Portabilità

- Il manifesto e gli artefatti sono sufficienti a determinare lo stato della pipeline su un workspace diverso
- Non sono ammesse dipendenze da percorsi assoluti o configurazioni locali non tracciate

---

# Riepilogo della Pipeline

```
PIPELINE COGNITIVA

C1  Inizializzazione
C2  Raccolta Requisiti              (Prompt Refiner)
C3  Analisi Fonti Esterne           (Analista)        [condizionale]
C4  Analisi Vincoli e Dominio
C5  Sintesi Architetturale          (Architetto)
C6  Validazione Architetturale
C7  Pianificazione Implementazione

↓

PIPELINE OPERATIVA

O1  Scaffold del Repository
O2  Generazione dei Moduli          (Builder)
O3  Validazione del Sistema         (Validatore)
O4  Debug e Smoke Test              (Debugger)
O5  Chiusura e Report Finale

FLUSSI AUSILIARI

B1  Audit di Continuità             (Auditor)         [Resume]
C-ADO1  Audit di Conformità         (Auditor)         [Adozione]
```

---

*Fine del modello formale della pipeline.*
