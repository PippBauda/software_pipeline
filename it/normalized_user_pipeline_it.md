# Pipeline Normalizzata di Sviluppo Software

## Legenda

- **Gate utente**: punto in cui l'utente deve confermare per procedere.
- **Gate automatico**: punto in cui l'orchestratore valuta autonomamente se procedere.
- **Ciclo di revisione**: pattern iterativo agente → orchestratore → utente → eventuale riciclo.
- **Artefatti**: ogni fase dichiara esplicitamente i propri output.

---

## Flusso A — AVVIO PROGETTO

### A.0 — Inizializzazione
- **Attore**: Orchestratore
- **Input**: Richiesta dell'utente di avviare un nuovo progetto
- **Azioni**:
  1. Verifica/inizializza la repository Git
  2. Crea la struttura delle directory per gli artefatti della pipeline (`docs/`, `logs/`, `pipeline-state/`)
  3. Inizializza il manifesto della pipeline (`pipeline-state/manifest.json`)
  4. Registra la sessione nel log di tracciamento
- **Artefatti**: struttura directory, manifest iniziale, log di sessione
- **Commit**: sì
- **Transizione**: → A.1

### A.1 — Raccolta Requisiti (Prompt Refiner)
- **Attore**: Prompt Refiner (via Orchestratore)
- **Input**: Conversazione con l'utente
- **Azioni**:
  1. Raccolta dei requisiti funzionali e non funzionali
  2. Definizione dello scope e dei vincoli
  3. Identificazione dei criteri di accettazione
  4. Produzione del documento PROMPT.md
- **Artefatti**: `PROMPT.md`, log della conversazione
- **Commit**: sì
- **Gate utente**: l'utente deve confermare la completezza del PROMPT.md
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e si ripete la fase
- **Transizione**: → A.2

### A.2 — Analisi Fonti Esterne (Analista) [condizionale]
- **Attore**: Analista (via Orchestratore)
- **Condizione di ingresso**: il PROMPT.md contiene riferimenti a fonti di codice esterno (decisione dell'orchestratore confermata dall'utente)
- **Input**: riferimenti dal PROMPT.md
- **Azioni**:
  1. Accesso e clonazione/analisi delle fonti esterne
  2. Estrazione della logica rilevante, dei modelli di configurazione, del comportamento del proxy
  3. Produzione del documento di analisi
- **Artefatti**: `docs/upstream-analysis.md`, log della conversazione
- **Commit**: sì
- **Gate utente**: l'utente deve confermare la qualità dell'analisi
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato all'Analista e si ripete la fase
- **Bypass**: se non ci sono fonti esterne, si salta direttamente a → A.3
- **Transizione**: → A.3

### A.3 — Progettazione Architetturale (Architetto)
- **Attore**: Architetto (via Orchestratore)
- **Input**: PROMPT.md, eventuale upstream-analysis.md
- **Azioni**:
  1. Definizione dell'architettura del sistema (struttura, componenti, dipendenze)
  2. Definizione delle API e dei contratti di interfaccia
  3. Definizione del modello di configurazione
  4. Definizione della sequenza di implementazione dei moduli
- **Artefatti**: `docs/architecture.md`, `docs/api.md`, `docs/configuration.md`, `docs/interface-contracts.md`
- **Commit**: sì
- **Gate utente**: l'utente deve confermare l'architettura proposta
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato all'Architetto e si ripete la fase
- **Transizione**: → A.4

### A.4 — Implementazione Modulare (Builder)
- **Attore**: Builder (via Orchestratore)
- **Input**: tutti i documenti architetturali, sequenza dei moduli
- **Azioni** (ciclo per ogni modulo):
  1. Lettura della specifica del modulo corrente
  2. Implementazione del codice
  3. Scrittura dei test per il modulo
  4. Esecuzione dei test del modulo
  5. Report del modulo all'orchestratore
- **Artefatti**: codice sorgente, test, `logs/builder-report-module-N.md`
- **Commit**: sì (uno per modulo completato)
- **Gate utente**: nessuno (feedback solo informativo per ogni modulo)
- **Gestione errore modulo**: se un modulo fallisce, il Builder segnala il fallimento all'orchestratore che notifica l'utente e attende istruzioni (riprovare, saltare, fermarsi)
- **Al completamento di tutti i moduli**: report cumulativo, commit finale
- **Transizione**: → A.5

### A.5 — Validazione (Validatore)
- **Attore**: Validatore (via Orchestratore)
- **Input**: codice sorgente, test, documenti architetturali
- **Azioni**:
  1. Verifica di conformità del codice rispetto all'architettura
  2. Esecuzione della suite di test
  3. Analisi statica del codice
  4. Produzione del report di validazione
- **Artefatti**: `docs/validator-report.md`
- **Commit**: sì
- **Gate utente**: l'utente sceglie tra:
  - **a)** Correzione completa: tutte le note del validatore vengono passate al Builder → reinserimento in A.4
  - **b)** Correzione selettiva: l'utente seleziona i punti da correggere, che vengono passati al Builder → reinserimento in A.4
  - **c)** Nessuna correzione necessaria → proseguimento
- **Transizione**: → A.6

### A.6 — Debug e Smoke Test (Debugger)
- **Attore**: Debugger (via Orchestratore)
- **Input**: applicazione completa, documenti architetturali
- **Azioni**:
  1. Esecuzione dell'applicazione in ambiente controllato
  2. Esecuzione degli smoke test
  3. Cattura e analisi dei log
  4. Produzione del report di debug
- **Artefatti**: `docs/debugger-report.md`, log catturati
- **Commit**: sì
- **Gate utente**: l'utente sceglie tra:
  - **a)** Correzione completa → reinserimento in A.4
  - **b)** Correzione selettiva → reinserimento in A.4
  - **c)** Nessun bug → proseguimento
- **Transizione**: → A.7

### A.7 — Chiusura e Report Finale
- **Attore**: Orchestratore
- **Input**: tutti gli artefatti prodotti dalla pipeline
- **Azioni**:
  1. Verifica di integrità della repository
  2. Aggiornamento del manifesto della pipeline con stato finale
  3. Produzione del report finale cumulativo
  4. Presentazione del report all'utente
- **Artefatti**: `docs/final-report.md`, `pipeline-state/manifest.json` aggiornato
- **Commit**: sì
- **Gate utente**: l'utente sceglie tra:
  - **Iterazione**: reinserimento a un punto specifico della pipeline (A.1–A.6) fornendo indicazioni
  - **Chiusura**: la pipeline è conclusa

---

## Flusso B — RESUME PROGETTO

### B.0 — Richiesta di Resume
- **Attore**: Orchestratore
- **Input**: Richiesta dell'utente di riprendere un progetto esistente

### B.1 — Audit di Continuità (Auditor)
- **Attore**: Auditor (via Orchestratore)
- **Input**: contenuto della repository
- **Azioni**:
  1. Scoperta degli artefatti presenti nella repository
  2. Verifica di coerenza degli artefatti rispetto alla struttura della pipeline
  3. Verifica dell'integrità del manifesto della pipeline
  4. Determinazione dello stato della pipeline e del punto di interruzione
  5. Produzione del report di audit
- **Artefatti**: `docs/audit-report.md`
- **Commit**: sì
- **Gate utente**: l'utente conferma il risultato dell'audit
- **Risultato**:
  - **Resumabile**: gli artefatti sono coerenti, lo stato è determinabile → reinserimento nel Flusso A al punto identificato dall'Auditor
  - **Non resumabile**: la coerenza non è verificabile → raccomandazione di passare al Flusso C (Adozione)

---

## Flusso C — ADOZIONE PROGETTO

### C.0 — Richiesta di Adozione
- **Attore**: Orchestratore
- **Input**: Richiesta dell'utente di adottare un progetto esistente

### C.1 — Audit di Conformità (Auditor)
- **Attore**: Auditor (via Orchestratore)
- **Input**: contenuto della repository
- **Azioni**:
  1. Scoperta degli artefatti presenti (inclusi eventuali artefatti di audit precedenti)
  2. Analisi delle lacune rispetto alla struttura della pipeline
  3. Produzione del piano di conformazione con le operazioni necessarie
  4. Identificazione del punto di ingresso ottimale nella pipeline
  5. Produzione del report di adozione
- **Artefatti**: `docs/adoption-report.md`
- **Commit**: sì
- **Gate utente**: l'utente deve confermare il piano di adozione
- **Transizione**: reinserimento nel Flusso A al punto identificato dall'Auditor

---

## Regole Trasversali

### R.1 — Pattern di interazione standard
Ogni fase segue il pattern:
1. L'orchestratore assegna il compito all'agente specializzato
2. L'agente produce gli artefatti e restituisce il risultato all'orchestratore
3. L'orchestratore effettua un commit
4. L'orchestratore riscrive il report nella chat con l'utente
5. Se previsto un gate utente: attende conferma o feedback
6. Se il feedback è negativo: il ciclo si ripete dal punto 1 con le note dell'utente

### R.2 — Atomicità e stop
- Ogni operazione di un agente è un'unità atomica di lavoro
- L'unità atomica è definita come il completamento di una singola invocazione di un agente con la produzione dei relativi artefatti e commit
- Su richiesta di stop dell'utente: le modifiche in corso vengono scartate e si esegue un rollback all'ultimo commit
- Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati

### R.3 — Tracciabilità
- Ogni invocazione di un agente produce un log nella directory `logs/`
- Il manifesto della pipeline (`pipeline-state/manifest.json`) viene aggiornato ad ogni commit
- Le conversazioni degli agenti vengono serializzate e committate
- Ogni artefatto è registrato nel manifesto con: autore (agente), timestamp, fase della pipeline, hash del commit

### R.4 — Portabilità
- Il manifesto e gli artefatti devono essere sufficienti a determinare lo stato della pipeline su un workspace diverso
- Non sono ammesse dipendenze da percorsi assoluti o configurazioni locali non tracciate

---

*Fine della pipeline normalizzata.*
