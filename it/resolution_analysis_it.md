# Analisi di Risoluzione — da pipeline.md a pipeline_1.0.md

Questo documento traccia la risoluzione di tutti i 40 problemi identificati nelle analisi precedenti (`raw_user_pipeline_analysis.md`, `normalized_user_pipeline_analysis.md`, `pending_analysis.md`) e documenta le decisioni strutturali dell'utente che hanno guidato la versione 1.0.

---

## Decisioni Strutturali dell'Utente

Prima della stesura di `pipeline_1.0.md`, sono state poste 4 domande all'utente su scelte di design con impatto architetturale. Le risposte hanno determinato la struttura della versione 1.0.

### D1 — Decomposizione di C2 (FS-01, NR-01, CR-01)

> **Domanda**: separare C2 in sotto-stage con artefatti intermedi?

**Opzioni presentate**:
- a) Tre stage separati: C2 Intent Clarification → C3 Problem Formalization → C4 Requirements Extraction, con artefatti intermedi (`intent.md`, `problem-statement.md`, `requirements.md`)
- b) Stage unico con sotto-fasi interne e artefatti intermedi
- c) Stage unico senza modifiche

**Risposta dell'utente**: **Opzione a)** — Tre stage separati con artefatti intermedi.

**Impatto su pipeline_1.0**: C2 è stato decomposto in C2 (Chiarificazione dell'Intent), C3 (Formalizzazione del Problema), C4 (Estrazione dei Requisiti). Tutti gli stage successivi sono stati rinumerati di conseguenza (C3→C5, C4→C6, C5→C7, C6→C8, C7→C9).

### D2 — Aggregazione di O2 (NR-02, CR-02)

> **Domanda**: separare la generazione di codice dalla sintesi dei test?

**Opzioni presentate**:
- a) Separare in stage distinti (Code Generation + Test Synthesis)
- b) Mantenere aggregato (codice + test per-modulo)

**Risposta dell'utente**: **Opzione b)** — Mantenere aggregato per pragmatismo LLM.

**Impatto su pipeline_1.0**: O3 (Generazione dei Moduli) mantiene codice e test congiunti per ogni modulo. NR-02 e CR-02 sono chiusi come CHIUSO PER DESIGN.

### D3 — Stage nuovi (FM-01, FM-04, FM-05, FM-06, FM-08)

> **Domanda**: quali stage mancanti aggiungere?

**Opzioni presentate**: FM-01 (env setup), FM-04 (security audit), FM-05 (documentazione), FM-06 (CI/CD), FM-08 (rilascio/deployment)

**Risposta dell'utente**: **Tutti** — Aggiungere tutti e 5 gli stage.

**Impatto su pipeline_1.0**: aggiunti O1 (Setup Ambiente), O5 (Audit di Sicurezza), O7 (Generazione Documentazione), O8 (Configurazione CI/CD), O9 (Rilascio e Deployment). La pipeline operativa passa da 5 a 10 stage.

### D4 — Riscrittura report in chat (TA-10)

> **Domanda**: come deve l'orchestratore presentare i report all'utente nella chat?

**Opzioni presentate**:
- a) Trasposizione verbatim (rischio prolissità)
- b) Sintesi compressa senza riferimento al report originale
- c) Sintesi esecutiva + link al report completo nella repository

**Risposta dell'utente**: **Opzione c)** — Sintesi + link al report nella repository.

**Impatto su pipeline_1.0**: R.1 punto 6 definisce che l'orchestratore scrive una "sintesi esecutiva" indicando la posizione del report completo.

---

## Tabella di Risoluzione Completa

Legenda degli stati:
- **RISOLTO** — problema completamente indirizzato in `pipeline_1.0.md`
- **CHIUSO PER DESIGN** — problema esplicitamente mantenuto per decisione dell'utente
- **GIÀ RISOLTO** — problema già risolto in `pipeline.md`, mantenuto in `pipeline_1.0.md`

### 1. Assunzioni Implicite (AI-01 — AI-12)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| AI-01 | Modello mono-utente non dichiarato | APERTO | **RISOLTO** | Aggiunto vincolo esplicito V.1: "la pipeline è progettata per un singolo utente". |
| AI-02 | Repository Git preesistente | GIÀ RISOLTO | **RISOLTO** | Mantenuto in C1: la repository viene inizializzata dallo stage. |
| AI-03 | Contesto persistente orchestratore | PARZIALE | **RISOLTO** | R.1 punto 1 definisce il meccanismo: l'orchestratore ricostruisce il contesto leggendo `manifest.json`, artefatti dello stage corrente e precedenti, ultimi log di conversazione. R.1 punto 2 definisce la trasmissione: artefatti formali + context brief + note utente. V.2 dichiara gli agenti stateless. |
| AI-04 | Statefulness degli agenti | APERTO | **RISOLTO** | V.2 dichiara gli agenti stateless. R.1 punto 2 definisce il meccanismo di trasmissione del contesto: artefatti formali dello stage + context brief sintetizzato dall'orchestratore + note di feedback. Nessuna memoria implicita tra invocazioni. |
| AI-05 | Branch strategy / convenzioni commit | PARZIALE | **RISOLTO** | Aggiunta R.6 (Convenzioni Git): branch `pipeline/<nome-progetto>`, messaggi di commit `[<stage-id>] <descrizione>`, tag con versione semantica, merge su `main`. |
| AI-06 | Nomenclatura artefatti | GIÀ RISOLTO | **RISOLTO** | Mantenuto: ogni artefatto ha percorso esplicito. |
| AI-07 | Formato tracciamento chat | PARZIALE | **RISOLTO** | R.3 definisce formato log Markdown con schema: timestamp, agente, stage, ruolo, contenuto. Directory `logs/`. Nessuna rotazione necessaria (le conversazioni si accumulano per sessione, non per pipeline completa). |
| AI-08 | Atomicità operazioni e stop | GIÀ RISOLTO | **RISOLTO** | Mantenuto in R.2. |
| AI-09 | Builder — confini dei moduli | GIÀ RISOLTO | **RISOLTO** | Mantenuto: C9 produce `module-map.md`, `task-graph.md`, `implementation-plan.md`. O3 li riceve come input. |
| AI-10 | Accesso fonti esterne — errori | APERTO | **RISOLTO** | C5 aggiunge gestione errori esplicita: l'Analista documenta il fallimento con fonte, tipo di errore, impatto stimato, e richiede istruzioni all'utente (fonte alternativa, skip, credenziali). |
| AI-11 | Distinzione Validatore/Debugger | GIÀ RISOLTO | **RISOLTO** | Mantenuto: O4 (validazione sistema) vs O6 (debug + smoke test). |
| AI-12 | Portabilità workspace | PARZIALE | **RISOLTO** | R.4 esteso: lockfile obbligatorio, dipendenze runtime con versione in `docs/environment.md`, variabili d'ambiente documentate in `environment.md` e `configuration.md`. O1 produce `docs/environment.md` come artefatto concreto. |

### 2. Fasi Mancanti (FM-01 — FM-10)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| FM-01 | Setup ambiente di sviluppo | APERTO | **RISOLTO** | Aggiunto O1 (Setup dell'Ambiente) con output: `docs/environment.md`, file di configurazione (lockfile, package manager, Dockerfile). |
| FM-02 | Strategia di test | PARZIALE | **RISOLTO** | C9 produce `docs/test-strategy.md` come output esplicito: tipi di test, criteri di copertura, soglie minime, criteri di accettazione per modulo. O3 e O4 lo ricevono come input. |
| FM-03 | Esecuzione formale dei test | GIÀ RISOLTO | **RISOLTO** | Mantenuto in O4 (Validazione del Sistema). |
| FM-04 | Audit di sicurezza | APERTO | **RISOLTO** | Aggiunto O5 (Audit di Sicurezza) con: analisi OWASP, dependency audit CVE, verifica pattern di sicurezza, raccomandazioni per severità. |
| FM-05 | Generazione documentazione | APERTO | **RISOLTO** | Aggiunto O7 (Generazione della Documentazione) con output: `README.md`, `docs/api-reference.md`, `docs/installation-guide.md`. |
| FM-06 | Configurazione CI/CD | APERTO | **RISOLTO** | Aggiunto O8 (Configurazione CI/CD) con output: file di configurazione CI/CD, `docs/cicd-configuration.md`. |
| FM-07 | Quality gate formale | PARZIALE | **RISOLTO** | O4 ha sotto-sezione esplicita "Quality gate" con verifica soglie da `test-strategy.md`: copertura codice, complessità ciclomatica, linting. I criteri di validazione specificano le soglie. |
| FM-08 | Rilascio/deployment | APERTO | **RISOLTO** | Aggiunto O9 (Rilascio e Deployment) con output: tag semantico, `CHANGELOG.md`, `docs/release-notes.md`, configurazione di deployment. |
| FM-09 | Inventario/manifesto artefatti | GIÀ RISOLTO | **RISOLTO** | Mantenuto: `manifest.json` tracciato da C1 a O10. |
| FM-10 | Gestione conflitti re-ingresso | APERTO | **RISOLTO** | Aggiunta R.5 (Protocollo di Re-Ingresso): artefatti archiviati in `archive/<timestamp>/`, manifesto aggiornato, commit con messaggio `[RE-ENTRY]`, ripresa con artefatti precedenti intatti. |

### 3. Transizioni Ambigue (TA-01 — TA-10)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| TA-01 | Chi decide se l'Analista è necessario | GIÀ RISOLTO | **RISOLTO** | Mantenuto in C5: decisione orchestratore + conferma utente. |
| TA-02 | Fallimento Builder su modulo | GIÀ RISOLTO | **RISOLTO** | Mantenuto in O3: notifica utente, attende istruzioni. |
| TA-03 | Opzioni a/b Validatore | GIÀ RISOLTO | **RISOLTO** | Mantenuto in O4: opzioni a) completa, b) selettiva, c) nessuna. |
| TA-04 | Gestione artefatti al re-ingresso | PARZIALE | **RISOLTO** | R.5 (Protocollo di Re-Ingresso) definisce: archiviazione degli artefatti in `archive/<timestamp>/`, aggiornamento manifesto, commit dedicato. |
| TA-05 | Ricostruzione stato nel RESUME | PARZIALE | **RISOLTO** | B1 definisce che l'orchestratore ricostruisce il contesto leggendo: manifesto, artefatti dell'ultimo stage completato, log delle conversazioni. Combinato con R.1 punto 1 che definisce il pattern standard di ricostruzione contesto. |
| TA-06 | Soglia RESUME/ADOZIONE | APERTO | **RISOLTO** | B1 definisce criteri concreti: RESUMABILE se manifest.json esiste ED è valido E tutti gli artefatti referenziati sono presenti E l'ultimo stage è identificabile univocamente. ADOZIONE se qualsiasi condizione fallisce. |
| TA-07 | Esecuzione piano di conformazione | PARZIALE | **RISOLTO** | C-ADO1 definisce esplicitamente: l'orchestratore esegue le azioni invocando gli agenti appropriati per ogni artefatto mancante, nell'ordine specificato dal piano. Ogni artefatto segue R.1. |
| TA-08 | Feedback informativo Builder | GIÀ RISOLTO | **RISOLTO** | Mantenuto in O3. |
| TA-09 | Trigger dello stop | PARZIALE | **RISOLTO** | R.2 definisce i trigger: comando esplicito dell'utente (sempre disponibile), errore fatale dell'agente (automatico). Nessuno stop per timeout o budget — l'utente deve stoppare esplicitamente. Stop durante commit = rollback al commit precedente. |
| TA-10 | Riscrittura report | APERTO | **RISOLTO** | R.1 punto 6: l'orchestratore scrive una "sintesi esecutiva" del report indicando la posizione del report completo nella repository. Decisione utente D4. |

### 4. Fasi Sovradimensionate (FS-01 — FS-06)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| FS-01 | C2 monolitico (Prompt Refiner) | APERTO | **RISOLTO** | C2 decomposto in C2 (Intent) + C3 (Problema) + C4 (Requisiti), ciascuno con gate utente e artefatti intermedi (`intent.md`, `problem-statement.md`, `PROMPT.md`). Decisione utente D1. |
| FS-02 | Architetto (domini aggregati) | GIÀ RISOLTO | **RISOLTO** | Mantenuto: C6 (vincoli+dominio) + C7 (sintesi) + C8 (validazione). |
| FS-03 | Builder (progresso opaco) | PARZIALE | **RISOLTO** | O3 definisce report per-modulo (`logs/builder-report-module-N.md`) con sotto-sezioni: specifica confermata, codice implementato, test implementati, risultati test, problemi. Commit per modulo. Report cumulativo al completamento. |
| FS-04 | Validatore (diagnostica aggregata) | PARZIALE | **RISOLTO** | O4 produce `validator-report.md` con sotto-sezioni indipendenti ciascuna con esito PASS/FAIL: conformità architetturale, risultati test, analisi statica, quality gate. La diagnostica per categoria è ora possibile. |
| FS-05 | Debugger (metodologie aggregate) | PARZIALE | **RISOLTO** | O6 produce `debugger-report.md` con sotto-sezioni strutturate: smoke test (con PASS/FAIL per scenario), bug trovati (ciascuno con scenario, log, severità, componente), analisi dei log. |
| FS-06 | Auditor (attività aggregabili) | APERTO | **RISOLTO** | B1 e C-ADO1 producono report con sotto-sezioni strutturate e indipendenti: inventario artefatti, analisi coerenza, stato pipeline, punto di interruzione, raccomandazione. Per C-ADO1: inventario, gap analysis, piano di conformazione, punto di ingresso. Le sotto-sezioni sono diagnosticabili indipendentemente. |

### 5. Osservazioni Trasversali (OT-01 — OT-04)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| OT-01 | Pattern ciclico non formalizzato | GIÀ RISOLTO | **RISOLTO** | Mantenuto in R.1. |
| OT-02 | Assenza macchina a stati | PARZIALE | **RISOLTO** | Aggiunta sezione "Macchina a Stati della Pipeline" con: 20 stati validi, tutte le transizioni (inclusi loop di correzione, re-ingresso, stop), 4 invarianti. |
| OT-03 | Edge case stop/rollback | PARZIALE | **RISOLTO** | R.2 copre: stop durante commit = rollback al commit precedente. Stop durante il ciclo Builder = modulo in corso scartato, moduli già committati preservati. |
| OT-04 | Tracciabilità non strutturata | GIÀ RISOLTO | **RISOLTO** | Mantenuto in R.3, con aggiunta di formato/schema esplicito per i log. |

### 6. Raccomandazioni da Analisi Normalizzata (NR-01 — NR-03)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| NR-01 | Decomposizione C2 | APERTO | **RISOLTO** | C2 decomposto in C2+C3+C4. Correlato a D1. |
| NR-02 | Separazione test da O2 | APERTO | **CHIUSO PER DESIGN** | Mantenuto aggregato per decisione utente (D2). Motivazione: pragmatismo operativo per LLM. |
| NR-03 | `configuration.md` orfano | APERTO | **RISOLTO** | `docs/configuration.md` è ora input esplicito di O1 (Setup Ambiente), O2 (Scaffold Repository), e O7 (Generazione Documentazione). Non è più un artefatto terminale. |

### 7. Confronto con Reference (CR-01 — CR-03)

| ID | Problema | Stato precedente | Stato 1.0 | Risoluzione |
|----|----------|:----------------:|:---------:|-------------|
| CR-01 | C2 aggrega 3 stage reference | APERTO | **RISOLTO** | Risolto dalla decomposizione D1: C2 (Intent) + C3 (Problema) + C4 (Requisiti) corrispondono a C1+C2+C3 del reference. |
| CR-02 | O2 aggrega 3 stage reference | APERTO | **CHIUSO PER DESIGN** | Mantenuto per decisione utente (D2). Documentato come scelta di design. |
| CR-03 | Repair Loop come transizione | GIÀ RISOLTO | **RISOLTO** | Mantenuto: repair come transizioni O4→O3, O5→O3, O6→O3 con decisione utente a/b/c. |

---

## Riepilogo Complessivo

### Per stato finale

| Stato | Conteggio | Percentuale |
|-------|:---------:|:-----------:|
| RISOLTO | 38 | 95% |
| CHIUSO PER DESIGN | 2 | 5% |
| PARZIALE | 0 | 0% |
| APERTO | 0 | 0% |
| **Totale** | **40** | **100%** |

### Confronto con versione precedente

| Metrica | pipeline.md | pipeline_1.0.md | Δ |
|---------|:-----------:|:---------------:|:-:|
| Risolti | 16 (40%) | 38 (95%) | +22 |
| Chiusi per design | 0 | 2 (5%) | +2 |
| Parziali | 14 (35%) | 0 (0%) | −14 |
| Aperti | 10 (25%) | 0 (0%) | −10 |

### Modifiche strutturali principali

| Modifica | Dettaglio |
|----------|-----------|
| Decomposizione C2 | 1 stage → 3 stage (C2 Intent, C3 Problema, C4 Requisiti) |
| Stage cognitivi | 7 → 9 (+C2, +C3 dalla decomposizione) |
| Stage operativi | 5 → 10 (+O1 Ambiente, +O5 Sicurezza, +O7 Documentazione, +O8 CI/CD, +O9 Rilascio) |
| Regole trasversali | 4 → 6 (+R.5 Protocollo Re-Ingresso, +R.6 Convenzioni Git) |
| Vincoli di design | 0 → 3 (V.1 mono-utente, V.2 agenti stateless, V.3 Git come source of truth) |
| Macchina a stati | assente → 20 stati, transizioni complete, 4 invarianti |
| Artefatti intermedi | `intent.md`, `problem-statement.md` (nuovi), `test-strategy.md` (nuovo), `environment.md` (nuovo) |

---

## Appendice — Mappa di Corrispondenza Stage

| pipeline.md | pipeline_1.0.md | Note |
|:-----------:|:---------------:|------|
| C1 | C1 | Invariato |
| C2 | C2 + C3 + C4 | Decomposto (D1) |
| C3 | C5 | Rinumerato |
| C4 | C6 | Rinumerato |
| C5 | C7 | Rinumerato |
| C6 | C8 | Rinumerato |
| C7 | C9 | Rinumerato, aggiunto output `test-strategy.md` |
| — | O1 | Nuovo (FM-01) |
| O1 | O2 | Rinumerato |
| O2 | O3 | Rinumerato, report per-modulo strutturato |
| O3 | O4 | Rinumerato, quality gate espliciti |
| — | O5 | Nuovo (FM-04) |
| O4 | O6 | Rinumerato, sotto-sezioni strutturate |
| — | O7 | Nuovo (FM-05) |
| — | O8 | Nuovo (FM-06) |
| — | O9 | Nuovo (FM-08) |
| O5 | O10 | Rinumerato, protocollo re-ingresso |
| B1 | B1 | Mantenuto, criteri soglia aggiunti |
| C-ADO1 | C-ADO1 | Mantenuto, esecuzione piano definita |

---

*Fine dell'analisi di risoluzione.*
