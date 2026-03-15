# Modello Formale della Pipeline di Sviluppo Software — v2.0

---

# Vincoli di Progettazione

- **V.1 — Modello mono-utente**: la pipeline è progettata per un singolo utente che interagisce con l'orchestratore. Non sono supportati gestione ruoli, permessi o interazioni multi-utente.
- **V.2 — Agenti stateless**: tutti gli agenti (incluso l'orchestratore) sono stateless. Il contesto viene ricostruito ad ogni invocazione dagli artefatti committati e dal manifesto della pipeline. Non esiste memoria implicita tra le invocazioni. Quando lo stesso agente è invocato in stadi consecutivi (es. Prompt Refiner in C2→C3→C4), tutte le informazioni rilevanti dalle invocazioni precedenti DEVONO essere completamente codificate negli artefatti di output — l'agente non può fare affidamento sulla memoria conversazionale degli stadi precedenti.
- **V.3 — Git come fonte di verità**: il repository Git è l'unica fonte di verità. Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati.

---

# Agenti

La pipeline utilizza i seguenti agenti specializzati:

| Agente | Stadi | Responsabilità |
|--------|-------|----------------|
| Orchestratore (diretto) | C1, O9, O10 | Infrastruttura pipeline, coordinamento rilascio, chiusura |
| Prompt Refiner | C2, C3, C4 | Chiarimento intento, formalizzazione problema, estrazione requisiti |
| Analista | C5 | Analisi sorgenti esterne |
| Architetto | C6, C7, C9 | Vincoli, modellazione dominio, sintesi architetturale, pianificazione implementazione |
| Validatore | C8, O4, O5 | Validazione architettura, validazione sistema, audit sicurezza |
| Builder | O1, O2, O3, O7, O8 | Setup ambiente, scaffold, generazione codice, documentazione, CI/CD |
| Debugger | O6 | Debug runtime e smoke testing |
| Auditor | B1, C-ADO1 | Audit di continuità, audit di conformità |

Gli stadi marcati "Orchestratore (diretto)" sono eseguiti dall'orchestratore stesso senza invocare un agente esterno. L'orchestratore segue comunque R.1 per commit, aggiornamento manifesto e tracciabilità.

---

# Pipeline Cognitiva

Obiettivo: trasformare progressivamente un'idea utente ambigua in un piano di implementazione completo e validato.

---

## C1 — Inizializzazione

- **Agente**: Orchestratore (diretto)
- **Scopo**: configurare l'infrastruttura della pipeline e stabilire un punto di partenza tracciabile per il progetto.
- **Input**:
  - `user_request` — richiesta utente per avviare un nuovo progetto (linguaggio naturale)
- **Output**:
  - `pipeline-state/manifest.json` — manifesto iniziale della pipeline (stato: `C1_INITIALIZED`)
  - `logs/session-init-1.md` — log della sessione di inizializzazione
  - struttura directory: `docs/`, `logs/`, `pipeline-state/`, `archive/`
- **Trasformazione**: una richiesta informale viene convertita in una struttura repository tracciabile con un manifesto di stato.
- **Criteri di validazione**:
  - il repository Git è inizializzato e accessibile
  - le directory `docs/`, `logs/`, `pipeline-state/`, `archive/` esistono
  - `manifest.json` contiene lo stato `C1_INITIALIZED` con timestamp
  - il commit iniziale è stato eseguito
- **Stato risultante**: `C1_INITIALIZED`

---

## C2 — Chiarimento dell'Intento

- **Agente**: Prompt Refiner
- **Scopo**: interpretare e disambiguare l'idea originale dell'utente, stabilendo terminologia, contesto e assunzioni.
- **Input**:
  - `user_request` — descrizione del progetto in linguaggio naturale
  - `pipeline-state/manifest.json` — stato corrente della pipeline
- **Output**:
  - `docs/intent.md` — intento interpretato: obiettivo, contesto di sistema, assunzioni, terminologia chiarita. Questo artefatto DEVE codificare tutte le informazioni conversazionali rilevanti affinché gli stadi successivi possano operare senza perdita di contesto (vedi V.2).
  - `logs/prompt-refiner-c2-conversation-1.md` — log della conversazione
- **Trasformazione**: un'idea espressa informalmente viene analizzata per identificare l'obiettivo reale, il contesto d'uso e le assunzioni implicite, producendo un documento di intento strutturato.
- **Criteri di validazione**:
  - `intent.md` contiene sezioni per: obiettivo interpretato, contesto di sistema, assunzioni, terminologia
  - l'utente ha confermato che l'interpretazione è corretta (gate utente superato)
  - il log della conversazione è stato committato
- **Gate utente**: conferma dell'intento interpretato
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e lo stadio si ripete
- **Stato risultante**: `C2_INTENT_CLARIFIED`

---

## C3 — Formalizzazione del Problema

- **Agente**: Prompt Refiner
- **Scopo**: produrre una definizione tecnica concisa del sistema dall'intento chiarito.
- **Input**:
  - `docs/intent.md`
  - `logs/prompt-refiner-c2-conversation-<N>.md` — ultimo log della conversazione C2 (per ricostruzione contesto da V.2)
- **Output**:
  - `docs/problem-statement.md` — definizione tecnica del sistema: obiettivo del sistema, input attesi, output attesi, comportamento ad alto livello
  - `logs/prompt-refiner-c3-conversation-1.md` — log della conversazione
- **Trasformazione**: l'intento chiarito viene tradotto in una definizione tecnica strutturata, passando dal linguaggio del dominio utente al linguaggio del dominio tecnico.
- **Criteri di validazione**:
  - `problem-statement.md` contiene: obiettivo del sistema, input attesi, output attesi, comportamento ad alto livello
  - la definizione è coerente con `intent.md`
  - l'utente ha confermato la formalizzazione (gate utente superato)
- **Gate utente**: conferma della formalizzazione del problema
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e lo stadio si ripete
- **Stato risultante**: `C3_PROBLEM_FORMALIZED`

---

## C4 — Estrazione dei Requisiti

- **Agente**: Prompt Refiner
- **Scopo**: estrarre requisiti funzionali, requisiti non funzionali e criteri di accettazione dalla definizione del problema.
- **Input**:
  - `docs/intent.md`
  - `docs/problem-statement.md`
  - `logs/prompt-refiner-c3-conversation-<N>.md` — ultimo log della conversazione C3 (per ricostruzione contesto da V.2)
- **Output**:
  - `docs/project-spec.md` — specifica completa del progetto: requisiti funzionali, requisiti non funzionali, ambito, vincoli, criteri di accettazione
  - `logs/prompt-refiner-c4-conversation-1.md` — log della conversazione
- **Trasformazione**: la definizione tecnica del problema viene decomposta in requisiti discreti, verificabili e tracciabili con criteri di accettazione espliciti.
- **Criteri di validazione**:
  - `docs/project-spec.md` contiene sezioni per: requisiti funzionali (numerati), requisiti non funzionali (numerati), vincoli, criteri di accettazione
  - ogni requisito è tracciabile a `problem-statement.md`
  - l'utente ha confermato la completezza del documento (gate utente superato)
- **Gate utente**: conferma della completezza dei requisiti
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e lo stadio si ripete
- **Stato risultante**: `C4_REQUIREMENTS_EXTRACTED`

---

## C5 — Analisi Sorgenti Esterne [condizionale]

- **Agente**: Analista
- **Scopo**: analizzare codice esterno e architetture rilevanti per il progetto, estraendo pattern e logica riutilizzabili.
- **Condizione di ingresso**: `docs/project-spec.md` contiene riferimenti a sorgenti di codice esterne (decisione dell'orchestratore confermata dall'utente)
- **Input**:
  - `docs/project-spec.md` — riferimenti a sorgenti esterne
- **Output**:
  - `docs/upstream-analysis.md` — analisi dettagliata delle sorgenti esterne (logica estratta, modelli di configurazione, pattern architetturali, licenze)
  - `logs/analyst-conversation-1.md` — log della conversazione
- **Trasformazione**: i riferimenti a sorgenti esterne vengono convertiti in un documento di analisi strutturato focalizzato sugli elementi rilevanti per il progetto corrente.
- **Criteri di validazione**:
  - ogni sorgente referenziata in `docs/project-spec.md` è stata analizzata o documentata come inaccessibile
  - `upstream-analysis.md` collega ogni elemento estratto alla sua sorgente originale
  - l'utente ha confermato la qualità dell'analisi (gate utente superato)
- **Gestione errori di accesso**: se una sorgente esterna è inaccessibile (autenticazione, rete, URL non valido), l'Analista documenta il fallimento nel report con: sorgente, tipo di errore, impatto stimato sul progetto, e richiede istruzioni all'utente per procedere (sorgente alternativa, skip, credenziali).
- **Bypass**: se non esistono sorgenti esterne, lo stadio viene saltato e `upstream-analysis.md` non viene prodotto. Gli stadi successivi devono funzionare con o senza questo artefatto.
- **Stato risultante**: `C5_EXTERNAL_ANALYZED` (o `C5_SKIPPED`)

---

## C6 — Analisi dei Vincoli e Modellazione del Dominio

- **Agente**: Architetto
- **Scopo**: identificare i vincoli operativi del sistema e costruire il modello concettuale del dominio.
- **Input**:
  - `docs/project-spec.md`
  - `docs/upstream-analysis.md` (opzionale)
- **Output**:
  - `docs/constraints.md` — vincoli di prestazioni, sicurezza, ambiente, scalabilità
  - `docs/domain-model.md` — entità del dominio, relazioni, operazioni
- **Trasformazione**: requisiti e analisi esterna vengono analizzati per estrarre vincoli espliciti e impliciti e per costruire il modello concettuale del dominio applicativo.
- **Criteri di validazione**:
  - ogni vincolo è classificato per categoria (prestazioni, sicurezza, ambiente, scalabilità)
  - il modello di dominio copre tutte le entità menzionate nei requisiti
  - nessun vincolo è in conflitto con gli altri
- **Nota**: non è richiesto un gate utente in questo stadio. Errori nei vincoli o nel modello di dominio vengono intercettati da C8 (Validazione Architettura), che esegue un cross-referencing sistematico e può innescare un ritorno a C7 con note di revisione.
- **Stato risultante**: `C6_DOMAIN_MODELED`

---

## C7 — Sintesi dell'Architettura

- **Agente**: Architetto
- **Scopo**: definire l'architettura del sistema, le API, i contratti di interfaccia e il modello di configurazione.
- **Input**:
  - `docs/project-spec.md`
  - `docs/upstream-analysis.md` (opzionale)
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture.md` — architettura del sistema (struttura, componenti, dipendenze, pattern di interazione)
  - `docs/api.md` — definizione delle API
  - `docs/configuration.md` — modello di configurazione (parametri, formato file di configurazione, valori predefiniti, variabili d'ambiente)
  - `docs/interface-contracts.md` — contratti di interfaccia tra componenti
- **Trasformazione**: requisiti, vincoli e modello di dominio vengono sintetizzati in una struttura architetturale coerente con responsabilità dei componenti, contratti e sequenza di implementazione.
- **Criteri di validazione**:
  - ogni requisito funzionale è mappato su almeno un componente architetturale
  - ogni vincolo è indirizzato nell'architettura
  - i contratti di interfaccia sono non ambigui
  - l'utente ha confermato l'architettura (gate utente superato)
- **Gate utente**: conferma dell'architettura
- **Stato risultante**: `C7_ARCHITECTURE_SYNTHESIZED`

---

## C8 — Validazione dell'Architettura

- **Agente**: Validatore
- **Scopo**: verificare la consistenza dell'architettura rispetto a requisiti, vincoli e modello di dominio prima di procedere all'implementazione.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/project-spec.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture-review.md` — report di validazione dell'architettura (copertura requisiti, conformità vincoli, rischi identificati, proposte di mitigazione)
- **Trasformazione**: cross-referencing sistematico tra architettura, requisiti e vincoli per produrre una valutazione di conformità strutturata.
- **Criteri di validazione**:
  - ogni requisito è tracciato su almeno un componente
  - nessun vincolo è violato
  - i rischi identificati hanno proposte di mitigazione
- **Regola decisionale**:
  - se l'architettura è invalida → ritorno a C7 con note di revisione
  - se l'architettura è valida → proseguire
- **Stato risultante**: `C8_ARCHITECTURE_VALIDATED`

---

## C9 — Pianificazione dell'Implementazione

- **Agente**: Architetto
- **Scopo**: decomporre l'architettura in task implementabili, definire il grafo delle dipendenze, la sequenza di esecuzione e la strategia di test.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/task-graph.md` — grafo dei task con dipendenze
  - `docs/implementation-plan.md` — piano di implementazione con ordine di esecuzione e specifiche per modulo
  - `docs/module-map.md` — mappa dei moduli con responsabilità e interfacce
  - `docs/test-strategy.md` — strategia di test: tipi di test (unit, integration, e2e), criteri di copertura, soglie minime, criteri di accettazione per modulo
- **Trasformazione**: l'architettura viene decomposta in unità di lavoro implementabili con le loro dipendenze, priorità e criteri di verifica.
- **Criteri di validazione**:
  - ogni componente architetturale è mappato su almeno un task
  - il grafo delle dipendenze è aciclico
  - ogni modulo ha responsabilità, interfacce e dipendenze dichiarate
  - la strategia di test definisce almeno: tipi di test, soglia di copertura, criteri per modulo
  - l'utente ha confermato il piano (gate utente superato)
- **Gate utente**: conferma del piano e della strategia di test
- **Stato risultante**: `C9_IMPLEMENTATION_PLANNED`

---

## Output della Pipeline Cognitiva

Artefatti finali prodotti:

```
docs/intent.md
docs/problem-statement.md
docs/project-spec.md
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
docs/test-strategy.md
```

**Handoff Cognitivo-Operativo**: prima di procedere a O1, l'orchestratore esegue un controllo di integrità automatico verificando che: (1) tutti gli artefatti cognitivi attesi elencati sopra siano presenti nel repository (escludendo quelli condizionali marcati come saltati), (2) il manifesto rifletta lo stato `C9_IMPLEMENTATION_PLANNED`, e (3) nessun riferimento ad artefatti sia rotto (ogni artefatto referenziato come input da un altro artefatto esiste). Se il controllo fallisce, l'orchestratore segnala gli artefatti mancanti o inconsistenti e si arresta, richiedendo l'intervento dell'utente.

Questi artefatti vengono consumati dalla Pipeline Operativa.

---

# Pipeline Operativa

Obiettivo: eseguire il piano di implementazione e produrre software funzionante, testato, sicuro, documentato e rilasciabile.

---

## O1 — Setup dell'Ambiente

- **Agente**: Builder
- **Scopo**: configurare l'ambiente di sviluppo del progetto basandosi sulle specifiche architetturali e sul modello di configurazione.
- **Input**:
  - `docs/architecture.md`
  - `docs/configuration.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/environment.md` — specifica dell'ambiente: runtime richiesti (linguaggio, versione), dipendenze (con lockfile), variabili d'ambiente, strumenti di build, strumenti esterni raccomandati (linter, scanner SAST, auditor dipendenze) per uso negli stadi successivi (O5, O8)
  - file di configurazione dell'ambiente (`package.json`, `requirements.txt`, `Dockerfile`, o equivalente per il linguaggio scelto)
- **Trasformazione**: le specifiche architetturali e il modello di configurazione vengono tradotti nella configurazione concreta dell'ambiente di sviluppo, includendo raccomandazioni di strumenti per gli stadi di qualità e sicurezza.
- **Criteri di validazione**:
  - ogni dipendenza è specificata con versione
  - un lockfile è presente per la riproducibilità
  - le variabili d'ambiente richieste sono documentate in `environment.md`
  - l'ambiente può essere ricreato da zero usando gli artefatti (portabilità)
- **Stato risultante**: `O1_ENVIRONMENT_READY`

---

## O2 — Scaffold del Repository

- **Agente**: Builder
- **Scopo**: creare la struttura del progetto basandosi sul piano architetturale, la mappa dei moduli e il modello di configurazione.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/architecture.md`
  - `docs/configuration.md`
- **Output**:
  - `docs/repository-structure.md` — struttura documentata del repository
  - struttura fisica di directory e file placeholder
  - file di configurazione del progetto basati su `configuration.md`
- **Trasformazione**: il piano di implementazione, la mappa dei moduli e il modello di configurazione vengono convertiti nella struttura fisica del progetto.
- **Criteri di validazione**:
  - ogni modulo in `module-map.md` ha una directory corrispondente
  - la struttura riflette le dipendenze dichiarate nell'architettura
  - i file di configurazione sono coerenti con `configuration.md`
  - il commit è stato eseguito
- **Stato risultante**: `O2_SCAFFOLD_CREATED`

---

## O3 — Generazione Moduli (Builder)

- **Agente**: Builder
- **Scopo**: implementare il codice modulo per modulo seguendo il piano di implementazione e il grafo delle dipendenze, producendo codice e test congiuntamente per ogni modulo.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/task-graph.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `docs/environment.md`
- **Output** (per modulo):
  - `src/<modulo>/` — codice sorgente del modulo
  - `tests/<modulo>/` — test del modulo (conformi a `test-strategy.md`)
  - `logs/builder-report-module-<nome-modulo>-<N>.md` — report per modulo con sotto-sezioni:
    - specifica modulo confermata
    - codice implementato (file prodotti)
    - test implementati (file prodotti)
    - risultati esecuzione test
    - problemi riscontrati
- **Output** (al completamento):
  - `logs/builder-cumulative-report-1.md` — report cumulativo
- **Trasformazione**: le specifiche di ogni modulo vengono convertite in codice funzionante con test associati, seguendo l'ordine del grafo dei task e la strategia di test.
- **Criteri di validazione**:
  - ogni modulo dichiarato nel piano è implementato
  - ogni modulo ha test conformi alla strategia definita in `test-strategy.md`
  - i test del modulo passano prima di procedere al modulo successivo
  - un commit è stato eseguito per ogni modulo completato
- **Ciclo interno**: il Builder itera su ogni modulo. Il feedback all'utente è solo informativo e non richiede conferma.
- **Gestione errori**: se un modulo fallisce, l'orchestratore notifica l'utente e attende istruzioni (riprova, salta, ferma). Se l'utente sceglie **salta**, l'orchestratore controlla il grafo delle dipendenze (`docs/task-graph.md`) e riporta tutti i moduli a valle che dipendono dal modulo saltato, chiedendo all'utente se saltare anche quelli o fermarsi.
- **Stato risultante**: `O3_MODULES_GENERATED`

---

## O4 — Validazione del Sistema (Validatore)

- **Agente**: Validatore
- **Scopo**: verificare la conformità complessiva del sistema rispetto all'architettura, ai requisiti e ai contratti di interfaccia, con gate di qualità espliciti.
- **Input**:
  - `src/` — codice sorgente completo
  - `tests/` — suite di test completa
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `docs/project-spec.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/validator-report.md` — report di validazione con sotto-sezioni indipendenti:
    - **Conformità architetturale**: risultato (PASS/FAIL), dettagli non conformità
    - **Risultati test**: risultato (PASS/FAIL), test superati/falliti, percentuale copertura
    - **Analisi statica**: risultato (PASS/FAIL), violazioni linting, complessità ciclomatica
    - **Gate di qualità**: risultato complessivo (PASS/FAIL) con verifica soglie da `test-strategy.md`
- **Trasformazione**: il codice prodotto viene confrontato sistematicamente con le specifiche architetturali, i requisiti e le soglie di qualità, producendo una valutazione strutturata per categoria.
- **Criteri di validazione**:
  - tutti i test passano
  - ogni requisito funzionale è coperto da almeno un test
  - nessuna violazione dei contratti di interfaccia
  - copertura codice ≥ soglia definita in `test-strategy.md`
  - complessità ciclomatica entro i limiti definiti
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note (loop di correzione, vedi R.7)
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati (loop di correzione, vedi R.7)
  - **c)** nessuna correzione → proseguire
- **Stato risultante**: `O4_SYSTEM_VALIDATED`

---

## O5 — Audit di Sicurezza

- **Agente**: Validatore
- **Scopo**: verificare la sicurezza dell'applicazione attraverso analisi delle vulnerabilità, audit delle dipendenze e verifica dei pattern di sicurezza.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/constraints.md` — vincoli di sicurezza
  - `docs/architecture.md`
  - `docs/environment.md` — strumenti esterni raccomandati (scanner SAST, auditor dipendenze)
  - file di configurazione delle dipendenze (lockfile)
- **Output**:
  - `docs/security-audit-report.md` — report di sicurezza con sotto-sezioni:
    - **Analisi OWASP**: verifica dei rischi Top 10 applicabili (revisione codice basata su LLM)
    - **Audit dipendenze**: vulnerabilità note nelle dipendenze (CVE). Se strumenti esterni sono disponibili (come raccomandato in `docs/environment.md`), il loro output è incluso; altrimenti, l'LLM esegue un'analisi best-effort con limitazioni annotate.
    - **Pattern di sicurezza**: verifica dei pattern di autenticazione, autorizzazione, sanitizzazione input
    - **Risultati strumenti esterni**: output da strumenti SAST/audit dipendenze se disponibili, o nota esplicita che nessuno strumento esterno è stato usato
    - **Limitazioni**: dichiarazione esplicita delle limitazioni dell'analisi (es. nessun test dinamico, nessuna analisi runtime, attualità database CVE)
    - **Raccomandazioni**: azioni correttive ordinate per severità
- **Trasformazione**: codice e dipendenze vengono analizzati sistematicamente rispetto a pattern di sicurezza noti e vincoli dichiarati, usando l'analisi LLM come metodo primario e strumenti esterni (se configurati in `docs/environment.md`) come validazione supplementare.
- **Criteri di validazione**:
  - ogni dipendenza è stata verificata per vulnerabilità note (tramite strumento o analisi LLM)
  - i rischi OWASP applicabili sono stati verificati
  - ogni vulnerabilità trovata ha una severità e una raccomandazione
  - le limitazioni dell'analisi sono documentate esplicitamente
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note di sicurezza (loop di correzione, vedi R.7)
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati (loop di correzione, vedi R.7)
  - **c)** nessuna correzione necessaria → proseguire
- **Stato risultante**: `O5_SECURITY_AUDITED`

---

## O6 — Debug e Smoke Test (Debugger)

- **Agente**: Debugger
- **Scopo**: esercitare l'applicazione in un ambiente controllato, catturare log e identificare bug runtime non trovati durante la validazione.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/architecture.md`
  - `docs/validator-report.md`
  - `docs/test-strategy.md`
  - `docs/security-audit-report.md` (opzionale — se O5 è stato eseguito)
- **Output**:
  - `docs/debugger-report.md` — report con sotto-sezioni:
    - **Smoke test**: scenari eseguiti, risultati (PASS/FAIL per scenario)
    - **Bug trovati**: per ogni bug: scenario di riproduzione, log associati, severità, componente coinvolto
    - **Analisi log**: anomalie rilevate durante l'esecuzione
  - `logs/runtime-logs/` — log catturati durante l'esecuzione
- **Trasformazione**: l'applicazione viene eseguita in scenari realistici e i risultati vengono analizzati per identificare comportamenti anomali non rivelati durante la validazione.
- **Criteri di validazione**:
  - tutti gli smoke test definiti sono stati eseguiti
  - i log sono stati catturati e analizzati
  - ogni bug trovato è documentato con: scenario, log, severità
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note (loop di correzione, vedi R.7)
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati (loop di correzione, vedi R.7)
  - **c)** nessun bug → proseguire
- **Stato risultante**: `O6_DEBUG_COMPLETED`

---

## O7 — Generazione Documentazione

- **Agente**: Builder
- **Scopo**: produrre documentazione utente e sviluppatore per il progetto.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/project-spec.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/configuration.md`
  - `docs/environment.md`
- **Output**:
  - `README.md` — documentazione del progetto: descrizione, requisiti, installazione, utilizzo, configurazione
  - `docs/api-reference.md` — documentazione API per sviluppatori (generata dal codice e da `api.md`)
  - `docs/installation-guide.md` — guida all'installazione e configurazione
- **Trasformazione**: artefatti architetturali, specifica del progetto e codice sorgente vengono sintetizzati in documentazione orientata a utenti finali e sviluppatori.
- **Criteri di validazione**:
  - `README.md` contiene: descrizione, prerequisiti, istruzioni di installazione, istruzioni d'uso
  - `api-reference.md` copre tutte le API pubbliche
  - `installation-guide.md` è sufficiente per riprodurre l'ambiente da zero
- **Stato risultante**: `O7_DOCUMENTATION_GENERATED`

---

## O8 — Configurazione CI/CD

- **Agente**: Builder
- **Scopo**: configurare la pipeline di integrazione continua e deployment automatizzato.
- **Input**:
  - `docs/architecture.md`
  - `docs/test-strategy.md`
  - `docs/environment.md`
  - `docs/repository-structure.md`
- **Output**:
  - file di configurazione CI/CD (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, o equivalente)
  - `docs/cicd-configuration.md` — documentazione della configurazione CI/CD: passaggi, trigger, ambienti
- **Trasformazione**: la strategia di test, la struttura del repository e le specifiche dell'ambiente vengono tradotte in una pipeline CI/CD configurata.
- **Criteri di validazione**:
  - la pipeline CI/CD è configurata e documentata
  - i trigger sono definiti (push, PR, tag)
  - i passaggi includono almeno: install, lint, test, build
  - la configurazione è coerente con `test-strategy.md`
- **Stato risultante**: `O8_CICD_CONFIGURED`

---

## O9 — Rilascio e Deployment

- **Agente**: Orchestratore (diretto)
- **Scopo**: preparare il rilascio del software con versionamento semantico e, se applicabile, configurazione del deployment.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/architecture.md`
  - `docs/environment.md`
  - `pipeline-state/manifest.json`
- **Output**:
  - tag Git con versione semantica (es. `v1.0.0`)
  - `CHANGELOG.md` — changelog delle modifiche
  - `docs/release-notes.md` — note di rilascio
  - configurazione deployment (se applicabile: `Dockerfile`, script di deploy, configurazione cloud)
- **Trasformazione**: il progetto completato viene preparato per la distribuzione con metadati di versione e (opzionalmente) configurazione di deployment.
- **Criteri di validazione**:
  - il tag di versione segue il versionamento semantico
  - il changelog è completo e traccia le modifiche
  - le note di rilascio sono coerenti con il changelog
- **Gate utente**: conferma del rilascio
- **Stato risultante**: `O9_RELEASED`

---

## O10 — Chiusura e Report Finale

- **Agente**: Orchestratore (diretto)
- **Scopo**: verificare l'integrità del repository, consolidare lo stato della pipeline e fornire un report finale all'utente.
- **Input**:
  - tutti gli artefatti prodotti dalla pipeline (cognitivi + operativi)
  - `pipeline-state/manifest.json`
- **Output**:
  - `docs/final-report.md` — report finale cumulativo
  - `pipeline-state/manifest.json` — manifesto aggiornato con stato `COMPLETED`
- **Trasformazione**: tutti gli artefatti vengono inventariati, verificati per integrità e sintetizzati in un report finale.
- **Criteri di validazione**:
  - ogni artefatto dichiarato nel manifesto è presente nel repository
  - nessun file non tracciato rimane fuori dal manifesto
  - il manifesto è aggiornato con stato finale e timestamp
- **Gate utente**: l'utente sceglie tra:
  - **Iterazione**: rientro in un punto specifico della pipeline (C2–O9) fornendo istruzioni. Al rientro viene applicato il **Protocollo di Rientro** (R.5). Il punto di rientro viene validato dall'orchestratore (vedi S.1 sotto Macchina a Stati).
  - **Chiusura**: la pipeline viene conclusa
- **Stato risultante**: `COMPLETED`

---

# Flusso B — Ripresa Progetto

---

## B1 — Audit di Continuità

- **Agente**: Auditor
- **Scopo**: analizzare un repository esistente per determinare se il progetto può essere ripreso dal punto di interruzione.
- **Input**:
  - contenuti del repository
  - `pipeline-state/manifest.json` (se presente)
- **Output**:
  - `docs/audit-report.md` — report di audit con sotto-sezioni:
    - **Inventario artefatti**: artefatti trovati, classificati per stadio di origine
    - **Analisi di consistenza**: cross-referencing tra artefatti e struttura pipeline attesa
    - **Stato pipeline**: ultimo stato valido identificato
    - **Punto di interruzione**: stadio in cui il progetto si è fermato
    - **Raccomandazione**: ripresa (con punto di rientro) o adozione (con giustificazione)
  - `logs/auditor-analysis-1.md` — log dell'analisi
- **Trasformazione**: gli artefatti presenti nel repository vengono confrontati con la struttura pipeline attesa per determinare stato e consistenza del progetto.
- **Criteri di validazione**:
  - ogni artefatto trovato è stato classificato rispetto al suo stadio di origine
  - il punto di interruzione è stato identificato univocamente
  - il report contiene una raccomandazione esplicita (ripresa o adozione)
  - se `manifest.json` esiste, la sua `schema_version` è verificata per compatibilità
- **Criteri soglia RIPRESA/ADOZIONE**:
  - **RIPRISTINABILE** se: `manifest.json` esiste ED è valido E la sua `schema_version` è compatibile E tutti gli artefatti referenziati nel manifesto sono presenti E l'ultimo stadio completato è univocamente identificabile
  - **ADOZIONE** se: `manifest.json` è assente O corrotto O versione schema incompatibile O artefatti non corrispondono al manifesto O l'ultimo stadio completato non può essere determinato univocamente
- **Gate utente**: l'utente conferma il risultato dell'audit
- **Esito**:
  - **Ripristinabile**: rientro nel flusso principale (C/O) al punto identificato. L'orchestratore ricostruisce il contesto leggendo: manifesto, artefatti dall'ultimo stadio completato, log delle conversazioni.
  - **Non ripristinabile**: raccomandazione di passare al Flusso C (Adozione)
- **Stato risultante**: stato dell'ultimo stadio completato (come determinato dall'audit)

---

# Flusso C — Adozione Progetto

---

## C-ADO1 — Audit di Conformità

- **Agente**: Auditor
- **Scopo**: analizzare un repository non conforme per produrre un piano di adozione che lo renda compatibile con la pipeline.
- **Input**:
  - contenuti del repository
  - artefatti di audit precedenti (se presenti)
- **Output**:
  - `docs/adoption-report.md` — report di adozione con sotto-sezioni:
    - **Inventario**: artefatti esistenti mappati sugli stadi della pipeline
    - **Analisi gap**: artefatti mancanti per stadio, con stadio responsabile
    - **Piano di conformità**: azioni ordinate per colmare i gap, con agente responsabile per azione
    - **Punto di ingresso**: stadio in cui rientrare, con giustificazione
- **Trasformazione**: i contenuti del repository vengono confrontati con la struttura pipeline attesa, identificando i gap e producendo un piano operativo per colmarli.
- **Criteri di validazione**:
  - ogni gap è stato documentato con l'artefatto mancante e lo stadio responsabile
  - il piano di conformità specifica le azioni necessarie in ordine, con l'agente responsabile
  - il punto di ingresso nella pipeline è giustificato
- **Gate utente**: l'utente deve confermare il piano di adozione
- **Esecuzione del piano**: l'orchestratore esegue le azioni del piano di conformità invocando gli agenti appropriati per ogni artefatto mancante, nell'ordine specificato dal piano. Ogni artefatto prodotto segue il pattern standard (R.1).
- **Transizione**: una volta completato il piano, rientro nel flusso principale al punto identificato
- **Stato risultante**: stato dello stadio di rientro identificato

---

# Regole Trasversali

## R.1 — Pattern di Interazione Standard

Ogni stadio segue il pattern:

1. L'orchestratore ricostruisce il proprio contesto leggendo: `manifest.json` (stato pipeline), artefatti dagli stadi corrente e precedenti, ultimi log delle conversazioni rilevanti
2. L'orchestratore assegna il task all'agente specializzato (come dichiarato nel campo **Agente** di ogni stadio), trasmettendo come input: artefatti formali dello stadio, un brief di contesto che riassume la conversazione rilevante, eventuali note di feedback dell'utente
3. L'agente produce gli artefatti e restituisce il risultato all'orchestratore
4. L'orchestratore esegue un commit con messaggio nel formato `[<stage-id>] <descrizione>`
5. L'orchestratore aggiorna `manifest.json` con: stadio completato, timestamp, artefatti prodotti, hash del commit, agente responsabile, metriche di progresso (vedi R.8)
6. L'orchestratore scrive nella chat un **sommario esecutivo** del report dell'agente, indicando la posizione del report completo nel repository (es. "Report completo: `docs/validator-report.md`")
7. Se è richiesto un gate utente: attende conferma o feedback
8. Se il feedback è negativo: il ciclo si ripete dal punto 2 con le note dell'utente

## R.2 — Atomicità e Stop

- Ogni operazione dell'agente è un'unità atomica di lavoro: completamento invocazione + produzione artefatti + commit
- **Trigger di stop**:
  - Comando esplicito dell'utente (sempre disponibile)
  - Errore fatale dell'agente (automatico)
  - Nessun timeout automatico o stop basati su budget — l'utente deve fermare esplicitamente
- Su richiesta di stop: le modifiche in corso vengono scartate e rollback all'ultimo commit
- **Stop durante commit**: se lo stop avviene durante l'operazione di commit, rollback al commit precedente (pre-operazione). Il commit parziale viene scartato.
- **Stop durante ciclo Builder (O3)**: ogni modulo committato è indipendente. Lo stop interrompe il modulo in corso (scartato) e preserva i moduli già committati.
- Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati

## R.3 — Tracciabilità

- Ogni invocazione produce un log in `logs/`
- **Convenzione di denominazione dei log**: i file di log includono un suffisso incrementale per prevenire sovrascritture nelle ri-esecuzioni: `logs/<agente>-<stage-id>-<descrizione>-<N>.md` dove `<N>` è un intero che parte da 1, incrementato per ogni ri-esecuzione dello stesso stadio. Esempi: `logs/prompt-refiner-c2-conversation-1.md`, `logs/prompt-refiner-c2-conversation-2.md` (dopo ciclo di revisione).
- **Formato log**: Markdown, con struttura:
  ```
  # Log [stage-id] — [timestamp]
  ## Agente: [nome agente]
  ## Stadio: [nome stadio]
  ### Conversazione
  - **[ruolo]** [timestamp]: [contenuto]
  ```
- Il manifesto (`pipeline-state/manifest.json`) viene aggiornato a ogni commit con:
  - stadio completato
  - timestamp
  - artefatti prodotti (percorsi)
  - hash del commit
  - agente responsabile
- Le conversazioni sono serializzate in formato Markdown e committate in `logs/`

## R.4 — Portabilità

- Il manifesto e gli artefatti sono sufficienti per determinare lo stato della pipeline su un workspace diverso
- Percorsi assoluti o configurazioni locali non tracciate non sono ammessi
- Tutte le dipendenze runtime sono specificate con versioni in `docs/environment.md`
- Tutte le variabili d'ambiente richieste sono documentate in `docs/environment.md` e `docs/configuration.md`
- Un lockfile è presente per la riproducibilità delle dipendenze

## R.5 — Protocollo di Rientro

Quando l'utente sceglie di rientrare nella pipeline in un punto precedente (da O10/COMPLETED, o da B1/C-ADO1):

1. **Archiviazione**: gli artefatti prodotti dagli stadi successivi al punto di rientro vengono spostati in `archive/<timestamp>/`, preservando la struttura originale
2. **Aggiornamento manifesto**: `manifest.json` viene aggiornato per riflettere il nuovo stato (lo stato dello stadio di rientro), con riferimento all'archivio per tracciabilità
3. **Commit**: il rientro viene committato con messaggio `[RE-ENTRY] Ritorno a <stage-id> — artefatti archiviati in archive/<timestamp>/`
4. **Ripresa**: l'esecuzione riprende dallo stadio indicato con gli artefatti degli stadi precedenti intatti

**Ambito**: R.5 si applica SOLO al rientro iniziato dall'utente (da COMPLETED o dai flussi ausiliari B1/C-ADO1). I loop di correzione (O4→O3, O5→O3, O6→O3) sono governati da R.7 e NON innescano archiviazione.

**Politica archivio**: l'archivio non viene mai cancellato automaticamente. Tutti gli artefatti archiviati sono conservati per la completa tracciabilità. La pulizia manuale da parte dell'utente è permessa ma non richiesta.

## R.6 — Convenzioni Git

- **Branch**: l'esecuzione della pipeline avviene sul branch `pipeline/<nome-progetto>`
- **Messaggi di commit**: formato `[<stage-id>] <descrizione>` (es. `[C7] Sintesi architetturale completata`)
- **Tag**: al completamento della pipeline, tag con versione semantica (es. `v1.0.0`)
- **Merge**: al completamento e conferma dell'utente, merge su `main`

## R.7 — Loop di Correzione

Quando uno stadio di validazione (O4, O5 o O6) identifica problemi e l'utente sceglie la correzione (opzione a o b):

1. **Ritorno a O3**: le note di correzione dallo stadio originante vengono passate al Builder
2. **Ri-esecuzione da O4**: dopo che O3 completa le correzioni, il flusso riprende da O4 (Validazione Sistema) e procede sequenzialmente attraverso tutti gli stadi di validazione successivi fino a raggiungere lo stadio che ha originato la correzione
3. **Nessuna archiviazione**: i loop di correzione non innescano R.5. I report di validazione (`validator-report.md`, `security-audit-report.md`, `debugger-report.md`) vengono sovrascritti alla prossima esecuzione dei rispettivi stadi

**Esempi**:
- Correzione O4→O3: O3 → O4 (ri-valida)
- Correzione O5→O3: O3 → O4 → O5 (ri-valida poi ri-audita)
- Correzione O6→O3: O3 → O4 → O5 → O6 (catena di ri-validazione completa)

## R.8 — Protocollo di Escalation

Quando un agente incontra un problema che non può risolvere autonomamente:

1. **Livello 1 — Chiarimento in contesto**: l'agente richiede un chiarimento all'utente nel contesto dello stadio corrente. L'orchestratore inoltra la domanda e fornisce la risposta all'agente. Lo stadio continua.
2. **Livello 2 — Revisione upstream**: l'agente segnala che un artefatto upstream è ambiguo, inconsistente o incompleto. L'orchestratore riporta il problema all'utente e propone il rientro allo stadio upstream appropriato (seguendo R.5). L'utente conferma o sovrascrive.
3. **Livello 3 — Blocco fatale**: l'agente non può procedere e nessuna revisione upstream risolverebbe il problema. L'orchestratore applica R.2 (stop), documentando il blocco nel log.

## R.9 — Metriche di Progresso

L'orchestratore mantiene le informazioni di progresso nel manifesto e le comunica nei sommari esecutivi:

- **Progresso a livello pipeline**: `manifest.json` registra `progress.current_stage`, `progress.current_stage_index` (base 1) e `progress.total_stages` (conteggio stadi nel flusso attivo)
- **Progresso sotto-stadio** (solo O3): durante la generazione moduli, il manifesto registra inoltre `progress.modules_completed` e `progress.modules_total`
- **Sommario esecutivo**: ogni sommario esecutivo (R.1 punto 6) include il progresso corrente (es. "Stadio 12/19 — Modulo 3/8 completato")

---

# Schema del Manifesto

Il file `pipeline-state/manifest.json` segue questo schema:

```json
{
  "schema_version": "2.0",
  "pipeline_id": "<identificatore-univoco-pipeline>",
  "project_name": "<nome-progetto>",
  "created_at": "<timestamp-ISO-8601>",
  "current_state": "<state-id>",
  "progress": {
    "current_stage": "<stage-id>",
    "current_stage_index": 0,
    "total_stages": 0,
    "modules_completed": 0,
    "modules_total": 0
  },
  "stages_completed": [
    {
      "stage_id": "<stage-id>",
      "state": "<stato-risultante>",
      "agent": "<nome-agente>",
      "timestamp": "<timestamp-ISO-8601>",
      "commit_hash": "<hash-commit-git>",
      "artifacts": ["<percorso1>", "<percorso2>"],
      "execution_index": 1
    }
  ],
  "re_entries": [
    {
      "timestamp": "<timestamp-ISO-8601>",
      "from_state": "<stato-prima-del-rientro>",
      "to_stage": "<stage-id-rientro>",
      "archive_path": "archive/<timestamp>/",
      "commit_hash": "<hash-commit-git>",
      "reason": "<motivo-fornito-dall-utente>"
    }
  ],
  "corrections": [
    {
      "timestamp": "<timestamp-ISO-8601>",
      "originating_stage": "<O4|O5|O6>",
      "correction_type": "full|selective",
      "notes_summary": "<breve-descrizione>"
    }
  ]
}
```

**Descrizione dei campi**:
- `schema_version`: versione dello schema del manifesto, verificata da B1 per compatibilità
- `pipeline_id`: identificatore univoco per questa esecuzione della pipeline
- `project_name`: nome leggibile del progetto, usato nella denominazione del branch (R.6)
- `current_state`: lo stato corrente dalla macchina a stati
- `progress`: tracciamento progresso in tempo reale (vedi R.9)
- `stages_completed`: array ordinato di tutti i record di stadi completati. `execution_index` viene incrementato quando uno stadio viene ri-eseguito (ciclo di revisione o loop di correzione)
- `re_entries`: storico di tutti gli eventi di rientro (R.5)
- `corrections`: storico di tutti i loop di correzione (R.7)

---

# Macchina a Stati della Pipeline

## Stati Validi

```
C1_INITIALIZED
C2_INTENT_CLARIFIED
C3_PROBLEM_FORMALIZED
C4_REQUIREMENTS_EXTRACTED
C5_EXTERNAL_ANALYZED (o C5_SKIPPED)
C6_DOMAIN_MODELED
C7_ARCHITECTURE_SYNTHESIZED
C8_ARCHITECTURE_VALIDATED
C9_IMPLEMENTATION_PLANNED
O1_ENVIRONMENT_READY
O2_SCAFFOLD_CREATED
O3_MODULES_GENERATED
O4_SYSTEM_VALIDATED
O5_SECURITY_AUDITED
O6_DEBUG_COMPLETED
O7_DOCUMENTATION_GENERATED
O8_CICD_CONFIGURED
O9_RELEASED
COMPLETED
STOPPED
B1_AUDITING
C_ADO1_AUDITING
```

## Transizioni Valide

```
C1_INITIALIZED           → C2_INTENT_CLARIFIED
C2_INTENT_CLARIFIED      → C3_PROBLEM_FORMALIZED
C3_PROBLEM_FORMALIZED    → C4_REQUIREMENTS_EXTRACTED
C4_REQUIREMENTS_EXTRACTED → C5_EXTERNAL_ANALYZED | C5_SKIPPED
C5_EXTERNAL_ANALYZED     → C6_DOMAIN_MODELED
C5_SKIPPED               → C6_DOMAIN_MODELED
C6_DOMAIN_MODELED        → C7_ARCHITECTURE_SYNTHESIZED
C7_ARCHITECTURE_SYNTHESIZED → C8_ARCHITECTURE_VALIDATED
C8_ARCHITECTURE_VALIDATED → C7_ARCHITECTURE_SYNTHESIZED    [architettura invalida]
C8_ARCHITECTURE_VALIDATED → C9_IMPLEMENTATION_PLANNED
C9_IMPLEMENTATION_PLANNED → O1_ENVIRONMENT_READY           [dopo controllo handoff]
O1_ENVIRONMENT_READY     → O2_SCAFFOLD_CREATED
O2_SCAFFOLD_CREATED      → O3_MODULES_GENERATED
O3_MODULES_GENERATED     → O4_SYSTEM_VALIDATED
O4_SYSTEM_VALIDATED      → O3_MODULES_GENERATED            [correzione — R.7]
O4_SYSTEM_VALIDATED      → O5_SECURITY_AUDITED
O5_SECURITY_AUDITED      → O3_MODULES_GENERATED            [correzione — R.7]
O5_SECURITY_AUDITED      → O6_DEBUG_COMPLETED
O6_DEBUG_COMPLETED       → O3_MODULES_GENERATED            [correzione — R.7]
O6_DEBUG_COMPLETED       → O7_DOCUMENTATION_GENERATED
O7_DOCUMENTATION_GENERATED → O8_CICD_CONFIGURED
O8_CICD_CONFIGURED       → O9_RELEASED
O9_RELEASED              → COMPLETED
COMPLETED                → qualsiasi stato C2–O9           [rientro — R.5, validato]
qualsiasi stato          → STOPPED                         [stop utente o errore fatale]
STOPPED                  → B1_AUDITING                     [richiesta ripresa]
STOPPED                  → C_ADO1_AUDITING                 [richiesta adozione]
B1_AUDITING              → qualsiasi stato C1–O9           [ripristinabile — risultato audit]
B1_AUDITING              → C_ADO1_AUDITING                 [non ripristinabile — adozione]
C_ADO1_AUDITING          → qualsiasi stato C1–O9           [piano di conformità completato]
```

## Regole di Ambito della Macchina a Stati (S.1)

**Validazione del rientro**: quando l'utente richiede il rientro da COMPLETED, l'orchestratore valida il punto di rientro:
- Il rientro in uno **stadio cognitivo** (C2–C9) invalida automaticamente tutti gli stadi operativi (O1–O10). Tutti gli artefatti operativi vengono archiviati secondo R.5.
- Il rientro in uno **stadio operativo** (O1–O9) preserva gli artefatti cognitivi e archivia solo gli artefatti operativi dal punto di rientro in avanti.
- L'orchestratore riporta l'impatto all'utente prima di eseguire il rientro.

**Loop di correzione vs rientro**: i loop di correzione (O4/O5/O6→O3) sono governati da R.7 e NON innescano R.5. Sono cicli operativi interni, non rientri.

## Invarianti

- Lo stato corrente è sempre registrato in `manifest.json`
- Solo uno stato è attivo in qualsiasi momento
- Le transizioni all'indietro iniziate dall'utente (rientro) attivano R.5 (Protocollo di Rientro)
- I loop di correzione attivano R.7 (Loop di Correzione) — nessuna archiviazione
- Lo stato `STOPPED` preserva l'ultimo stato valido nel manifesto per consentire la ripresa
- Gli stati dei flussi ausiliari (`B1_AUDITING`, `C_ADO1_AUDITING`) sono transitori — si risolvono in uno stato principale della pipeline

---

# Riepilogo della Pipeline

```
PIPELINE COGNITIVA

C1  Inizializzazione                 (Orchestratore)
C2  Chiarimento Intento              (Prompt Refiner)
C3  Formalizzazione Problema         (Prompt Refiner)
C4  Estrazione Requisiti             (Prompt Refiner)
C5  Analisi Sorgenti Esterne         (Analista)         [condizionale]
C6  Analisi Vincoli e Dominio        (Architetto)
C7  Sintesi Architettura             (Architetto)
C8  Validazione Architettura         (Validatore)
C9  Pianificazione Implementazione   (Architetto)

    [Controllo Handoff Cognitivo-Operativo]

↓

PIPELINE OPERATIVA

O1  Setup Ambiente                   (Builder)
O2  Scaffold Repository             (Builder)
O3  Generazione Moduli              (Builder)
O4  Validazione Sistema             (Validatore)
O5  Audit Sicurezza                 (Validatore)
O6  Debug e Smoke Test              (Debugger)
O7  Generazione Documentazione      (Builder)
O8  Configurazione CI/CD            (Builder)
O9  Rilascio e Deployment           (Orchestratore)
O10 Chiusura e Report Finale        (Orchestratore)

FLUSSI AUSILIARI

B1      Audit di Continuità          (Auditor)          [Ripresa]
C-ADO1  Audit di Conformità          (Auditor)          [Adozione]
```

---

*Fine del modello formale della pipeline v2.0.*
