# Analisi della Pipeline Normalizzata

Report dei check e delle analisi eseguiti durante la trasformazione da `normalized_user_pipeline.md` a `pipeline.md`, incluso il confronto con l'architettura di riferimento `reference_pipeline.md`.

---

## 1. Check: Input e Output Espliciti per ogni Stage

| Stage | Input espliciti | Output espliciti | Esito |
|-------|:-:|:-:|:-:|
| C1 — Inizializzazione | ✅ | ✅ | PASS |
| C2 — Raccolta Requisiti | ✅ | ✅ | PASS |
| C3 — Analisi Fonti Esterne | ✅ | ✅ | PASS |
| C4 — Analisi Vincoli e Dominio | ✅ | ✅ | PASS |
| C5 — Sintesi Architetturale | ✅ | ✅ | PASS |
| C6 — Validazione Architetturale | ✅ | ✅ | PASS |
| C7 — Pianificazione Implementazione | ✅ | ✅ | PASS |
| O1 — Scaffold del Repository | ✅ | ✅ | PASS |
| O2 — Generazione Moduli | ✅ | ✅ | PASS |
| O3 — Validazione Sistema | ✅ | ✅ | PASS |
| O4 — Debug e Smoke Test | ✅ | ✅ | PASS |
| O5 — Chiusura e Report Finale | ✅ | ✅ | PASS |
| B1 — Audit di Continuità | ✅ | ✅ | PASS |
| C-ADO1 — Audit di Conformità | ✅ | ✅ | PASS |

**Risultato**: tutti gli stage hanno input e output espliciti.

### Modifiche rispetto alla versione normalizzata

La versione normalizzata presentava le seguenti carenze nei confronti di questo check:

- **A.0 (ora C1)**: gli output erano descritti genericamente ("struttura directory, manifest iniziale"). Nella versione formale ogni output ha un percorso esplicito.
- **A.1 (ora C2)**: l'input "conversazione con l'utente" era informale. Nella versione formale è stato formalizzato come `user_request`.
- **A.4 (ora O2)**: gli output per modulo erano descritti come "codice sorgente, test" senza struttura. Nella versione formale hanno percorsi espliciti (`src/<module>/`, `tests/<module>/`).
- **A.7 (ora O5)**: l'input "tutti gli artefatti prodotti" era generico. Nella versione formale si riferisce esplicitamente al manifesto come indice.

---

## 2. Check: Nessuno Stage Richieda Troppe Decisioni

| Stage | Decisioni richieste | Complessità decisionale | Esito |
|-------|-----|:-:|:-:|
| C1 | 0 decisioni | Bassa | PASS |
| C2 | 1 (conferma PROMPT.md) | Bassa | PASS |
| C3 | 2 (necessità analisi + conferma qualità) | Media | PASS |
| C4 | 0 decisioni (automatico) | Bassa | PASS |
| C5 | 1 (conferma architettura) | Bassa | PASS |
| C6 | 1 (valido/invalido → prosegui o torna) | Bassa | PASS |
| C7 | 1 (conferma piano) | Bassa | PASS |
| O1 | 0 decisioni | Bassa | PASS |
| O2 | 0–1 (solo in caso di errore: riprova/salta/ferma) | Bassa | PASS |
| O3 | 1 (correggi tutto / selettivo / nulla) | Media | PASS |
| O4 | 1 (correggi tutto / selettivo / nulla) | Media | PASS |
| O5 | 1 (itera / chiudi) | Bassa | PASS |
| B1 | 1 (conferma audit) | Bassa | PASS |
| C-ADO1 | 1 (conferma piano adozione) | Bassa | PASS |

**Risultato**: nessuno stage supera le 2 decisioni. La complessità decisionale massima è media (O3, O4) ma le opzioni sono chiaramente enumerate (a/b/c).

### Modifiche rispetto alla versione normalizzata

La versione normalizzata aggregava le fasi A.3 (Architetto) e A.4 (Builder) in modo che richiedessero implicitamente più decisioni:

- **A.3 (Architetto)**: nella versione normalizzata produceva architettura, API, configurazione e contratti in un unico stage con un unico gate utente. Nella versione formale è stato decomposto in C4 (vincoli + dominio, automatico), C5 (sintesi architetturale, 1 gate) e C6 (validazione, 1 decisione automatica), distribuendo la complessità.
- **A.5/A.6 (Validatore/Debugger)**: le opzioni a* e b* della versione normalizzata erano ambigue. Nella versione formale, a) e b) sono chiaramente distinte: a) passa tutte le note, b) passa solo i punti selezionati dall'utente.

---

## 3. Check: Pipeline Chiusa (Ogni Output Serve Stage Successivi)

### Matrice di consumo degli artefatti

| Artefatto | Prodotto da | Consumato da |
|-----------|------------|-------------|
| `pipeline-state/manifest.json` | C1 | C2, O5, B1 (e aggiornato ad ogni commit) |
| `PROMPT.md` | C2 | C3, C4, C5, O3 |
| `docs/upstream-analysis.md` | C3 | C4, C5 |
| `docs/constraints.md` | C4 | C5, C6 |
| `docs/domain-model.md` | C4 | C5, C6 |
| `docs/architecture.md` | C5 | C6, C7, O1, O2, O3, O4 |
| `docs/api.md` | C5 | C6, C7, O2 |
| `docs/configuration.md` | C5 | (documentazione — non consumato direttamente da stage successivi) |
| `docs/interface-contracts.md` | C5 | C6, C7, O2, O3 |
| `docs/architecture-review.md` | C6 | (record di validazione — non consumato direttamente) |
| `docs/task-graph.md` | C7 | O2 |
| `docs/implementation-plan.md` | C7 | O1, O2 |
| `docs/module-map.md` | C7 | O1, O2 |
| `docs/repository-structure.md` | O1 | (documentazione — non consumato direttamente) |
| `src/<module>/` | O2 | O3, O4 |
| `tests/<module>/` | O2 | O3 |
| `docs/validator-report.md` | O3 | O4 |
| `docs/debugger-report.md` | O4 | O5 |
| `docs/final-report.md` | O5 | (terminale) |
| `docs/audit-report.md` | B1 | (decisionale — determina punto di re-ingresso) |
| `docs/adoption-report.md` | C-ADO1 | (decisionale — determina punto di re-ingresso) |
| `logs/*` | tutti | B1, C-ADO1, O5 (per tracciabilità) |

### Artefatti terminali (non consumati da stage successivi)

1. `docs/configuration.md` — artefatto di documentazione, non input di nessuno stage
2. `docs/architecture-review.md` — record di validazione interna
3. `docs/repository-structure.md` — documentazione strutturale
4. `docs/final-report.md` — output terminale della pipeline

**Valutazione**: gli artefatti terminali sono tutti giustificati:
- 1, 3 sono documentazione di progetto (utile per l'utente e per l'Auditor in fase di Resume/Adozione)
- 2 è un record di audit interno
- 4 è l'output finale della pipeline

**Risultato**: PASS — la pipeline è chiusa. Ogni artefatto non terminale è consumato da almeno uno stage successivo.

---

## 4. Identificazione degli Stage Cognitivi

Gli stage cognitivi trasformano progressivamente un prompt ambiguo in un piano di implementazione completo. Operano esclusivamente su artefatti testuali/concettuali e non producono codice eseguibile.

| Stage | Nome | Giustificazione |
|-------|------|-----------------|
| C1 | Inizializzazione | Predispone l'infrastruttura logica per il progetto |
| C2 | Raccolta Requisiti | Trasforma linguaggio naturale in specifica strutturata |
| C3 | Analisi Fonti Esterne | Estrae conoscenza da codice esterno (analisi, non implementazione) |
| C4 | Analisi Vincoli e Dominio | Modella il dominio concettuale e i vincoli applicativi |
| C5 | Sintesi Architetturale | Sintetizza struttura, API e contratti dal dominio e dai requisiti |
| C6 | Validazione Architetturale | Verifica coerenza interna del piano (cross-referencing) |
| C7 | Pianificazione Implementazione | Decompone l'architettura in unità implementabili |

---

## 5. Identificazione degli Stage Operativi

Gli stage operativi eseguono il piano prodotto dalla pipeline cognitiva e producono artefatti eseguibili (codice, test, log di esecuzione).

| Stage | Nome | Giustificazione |
|-------|------|-----------------|
| O1 | Scaffold del Repository | Crea la struttura fisica del progetto |
| O2 | Generazione dei Moduli | Produce codice sorgente e test |
| O3 | Validazione del Sistema | Esegue test e verifica conformità a runtime |
| O4 | Debug e Smoke Test | Esegue l'applicazione e cattura log runtime |
| O5 | Chiusura e Report Finale | Consolida lo stato e produce il report finale |

### Stage ausiliari

| Stage | Nome | Classificazione |
|-------|------|-----------------|
| B1 | Audit di Continuità | Operativo (analizza artefatti concreti nel repository) |
| C-ADO1 | Audit di Conformità | Operativo (analizza artefatti concreti e produce piano operativo) |

---

## 6. Check: Stage Cognitivi Non Dipendono da Artefatti Operativi

| Stage Cognitivo | Input | Contiene artefatti operativi? | Esito |
|----------------|-------|:-:|:-:|
| C1 | `user_request` | No | PASS |
| C2 | `user_request`, `manifest.json` | No (*) | PASS |
| C3 | `PROMPT.md` | No | PASS |
| C4 | `PROMPT.md`, `upstream-analysis.md` | No | PASS |
| C5 | `PROMPT.md`, `upstream-analysis.md`, `constraints.md`, `domain-model.md` | No | PASS |
| C6 | `architecture.md`, `api.md`, `interface-contracts.md`, `PROMPT.md`, `constraints.md`, `domain-model.md` | No | PASS |
| C7 | `architecture.md`, `api.md`, `interface-contracts.md` | No | PASS |

(*) `manifest.json` è un artefatto infrastrutturale, non operativo. Il suo ruolo in C2 è limitato al tracciamento di stato della pipeline, non contiene codice eseguibile né risultati di esecuzione.

**Risultato**: PASS — nessuno stage cognitivo dipende da artefatti operativi (codice sorgente, test, log di esecuzione, report di validazione/debug). La separazione è netta.

---

## 7. Confronto con l'Architettura di Riferimento (`reference_pipeline.md`)

### 7.1 Mapping Stage-per-Stage

| Reference | Pipeline Formale | Note |
|-----------|-----------------|------|
| C1 — Intent Clarification | C2 — Raccolta Requisiti (parte) | Il reference separa intent da requirements; la pipeline formale li aggrega in C2 con output unico `PROMPT.md` |
| C2 — Problem Formalization | C2 — Raccolta Requisiti (parte) | Aggregato in C2 |
| C3 — Requirements Extraction | C2 — Raccolta Requisiti (parte) | Aggregato in C2 |
| C4 — Constraint Analysis | C4 — Analisi Vincoli e Dominio (parte) | Corrispondenza diretta per la parte vincoli |
| C5 — Domain Modeling | C4 — Analisi Vincoli e Dominio (parte) | Aggregato con i vincoli in C4 |
| C6 — Architecture Synthesis | C5 — Sintesi Architetturale | Corrispondenza diretta |
| C7 — Architecture Validation | C6 — Validazione Architetturale | Corrispondenza diretta |
| C8 — Task Graph Generation | C7 — Pianificazione Implementazione (parte) | Aggregato nella pianificazione |
| C9 — Implementation Planning | C7 — Pianificazione Implementazione (parte) | Aggregato nella pianificazione |
| O1 — Repository Scaffold | O1 — Scaffold del Repository | Corrispondenza diretta |
| O2 — Module Generation | O2 — Generazione Moduli (parte) | Nella pipeline formale O2 include anche il codice |
| O3 — Code Generation | O2 — Generazione Moduli (parte) | Aggregato in O2 |
| O4 — Test Synthesis | O2 — Generazione Moduli (parte) | Aggregato in O2 (test scritti per-modulo) |
| O5 — System Validation | O3 — Validazione del Sistema | Corrispondenza diretta |
| O6 — Repair Loop | O3/O4 → O2 (loop) | Implementato come loop di ritorno a O2 anziché come stage dedicato |

### 7.2 Stage presenti nella pipeline formale ma assenti nel reference

| Stage | Motivazione |
|-------|------------|
| C1 — Inizializzazione | Il reference non prevede setup infrastrutturale; necessario per tracciabilità e portabilità |
| C3 — Analisi Fonti Esterne | Il reference è autosufficiente; la pipeline prevede analisi di codice upstream |
| O4 — Debug e Smoke Test | Il reference non distingue tra validazione statica e debug runtime |
| O5 — Chiusura e Report Finale | Il reference non ha una fase di chiusura esplicita |
| B1 — Audit di Continuità | Il reference non prevede resume di progetto |
| C-ADO1 — Audit di Conformità | Il reference non prevede adozione di progetto |

### 7.3 Stage presenti nel reference ma aggregati nella pipeline formale

| Stage Reference | Aggregato in | Impatto |
|----------------|-------------|---------|
| C1 Intent Clarification | C2 | **Basso**: il ciclo di feedback con l'utente in C2 copre la chiarificazione dell'intent |
| C2 Problem Formalization | C2 | **Basso**: la formalizzazione del problema è parte naturale della redazione di `PROMPT.md` |
| C3 Requirements Extraction | C2 | **Medio**: nella pipeline formale, requisiti funzionali/non funzionali sono estratti direttamente in `PROMPT.md`. Una separazione esplicita migliorerebbe la tracciabilità tra requisiti e architettura |
| C8 Task Graph Generation | C7 | **Basso**: logicamente collegato alla pianificazione |
| C9 Implementation Planning | C7 | **Basso**: logicamente collegato alla pianificazione |
| O2 Module Generation | O2 | **N/A**: corrispondenza diretta |
| O3 Code Generation | O2 | **Medio**: aggregare generazione codice e test in un unico stage è coerente con l'approccio per-modulo, ma riduce la possibilità di generare test indipendentemente |
| O4 Test Synthesis | O2 | Vedi sopra |

### 7.4 Differenze strutturali significative

1. **Granularità cognitiva**: il reference ha 9 stage cognitivi, la pipeline formale ne ha 7. La differenza principale è l'aggregazione dei primi 3 stage del reference (Intent, Problem, Requirements) in un unico stage C2. Questo è giustificato dal pattern di interazione iterativa con l'utente (il Prompt Refiner gestisce l'intero ciclo) ma riduce la tracciabilità intermedia.

2. **Repair Loop**: il reference ha un O6 dedicato. La pipeline formale lo implementa come transizione di ritorno da O3/O4 a O2. L'effetto è equivalente ma la pipeline formale è più esplicita sulla decisione dell'utente.

3. **Test come stage separato**: il reference separa O4 (Test Synthesis) da O3 (Code Generation). La pipeline formale li unifica in O2 (per-modulo). L'approccio della pipeline formale è più pragmatico per un LLM (genera codice+test insieme per contesto) ma meno modulare.

4. **Human-in-the-loop**: la pipeline formale ha gate utente espliciti e cicli di revisione in quasi ogni stage cognitivo. Il reference non menziona l'interazione umana, operando come un flusso completamente automatizzato.

5. **Flussi ausiliari**: la pipeline formale include Resume e Adozione, totalmente assenti nel reference. Questi sono necessari per l'obiettivo di portabilità e adottabilità dichiarato dall'utente.

---

## 8. Riepilogo Complessivo

| Check | Esito | Note |
|-------|:-----:|------|
| Input/Output espliciti per ogni stage | ✅ PASS | Tutti gli stage hanno I/O dichiarati con percorsi espliciti |
| Nessuno stage con troppe decisioni | ✅ PASS | Massimo 2 decisioni per stage, opzioni enumerate |
| Pipeline chiusa | ✅ PASS | Ogni output non-terminale è consumato da almeno uno stage successivo |
| Stage cognitivi identificati | ✅ PASS | C1–C7 |
| Stage operativi identificati | ✅ PASS | O1–O5, B1, C-ADO1 |
| Separazione cognitivo/operativo | ✅ PASS | Nessuno stage cognitivo dipende da artefatti operativi |
| Conformità al reference | ⚠️ PARZIALE | Copertura completa ma con aggregazioni; vedi sezione 7 per dettagli |

### Raccomandazioni

1. **Valutare la decomposizione di C2**: separare la chiarificazione dell'intent dall'estrazione dei requisiti migliorerebbe la tracciabilità e l'allineamento con il reference.
2. **Valutare la separazione dei test in O2**: separare la sintesi dei test dalla generazione del codice permetterebbe la generazione indipendente di test, utile per progetti legacy.
3. **`docs/configuration.md` è un artefatto orfano**: non è consumato da nessuno stage operativo. Valutare se includerlo negli input di O1 (scaffold) o di O2 (generazione moduli).

---

*Fine del report di analisi.*
