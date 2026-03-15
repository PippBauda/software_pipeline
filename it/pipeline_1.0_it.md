# Modello Formale della Pipeline di Sviluppo Software — v1.0

---

# Vincoli di Design

- **V.1 — Modello mono-utente**: la pipeline è progettata per un singolo utente che interagisce con l'orchestratore. Non è prevista gestione di ruoli, permessi o interazioni multi-utente.
- **V.2 — Agenti stateless**: tutti gli agenti (incluso l'orchestratore) sono stateless. Il contesto viene ricostruito ad ogni invocazione a partire dagli artefatti committati e dal manifesto della pipeline. Non esiste memoria implicita tra invocazioni.
- **V.3 — Git come source of truth**: il repository Git è l'unica fonte di verità. Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati.

---

# Pipeline Cognitiva

Obiettivo: trasformare progressivamente un'idea ambigua dell'utente in un piano di implementazione completo e validato.

---

## C1 — Inizializzazione

- **Scopo**: predisporre l'infrastruttura della pipeline e stabilire il punto di partenza tracciabile per il progetto.
- **Input**:
  - `user_request` — richiesta dell'utente di avviare un nuovo progetto (linguaggio naturale)
- **Output**:
  - `pipeline-state/manifest.json` — manifesto iniziale della pipeline (stato: `C1_INITIALIZED`)
  - `logs/session-init.md` — log della sessione di inizializzazione
  - struttura directory: `docs/`, `logs/`, `pipeline-state/`, `archive/`
- **Trasformazione**: una richiesta informale viene convertita in una struttura di repository tracciabile con manifesto di stato.
- **Criteri di validazione**:
  - la repository Git è inizializzata e accessibile
  - le directory `docs/`, `logs/`, `pipeline-state/`, `archive/` esistono
  - `manifest.json` contiene lo stato `C1_INITIALIZED` con timestamp
  - il commit iniziale è stato eseguito
- **Stato risultante**: `C1_INITIALIZED`

---

## C2 — Chiarificazione dell'Intent

- **Scopo**: interpretare e disambiguare l'idea originale dell'utente, stabilendo terminologia, contesto e assunzioni.
- **Input**:
  - `user_request` — descrizione del progetto in linguaggio naturale
  - `pipeline-state/manifest.json` — stato corrente della pipeline
- **Output**:
  - `docs/intent.md` — intent interpretato: obiettivo, contesto del sistema, assunzioni, terminologia chiarita
  - `logs/prompt-refiner-c2-conversation.md` — log della conversazione
- **Trasformazione**: un'idea espressa in modo informale viene analizzata per identificare l'obiettivo reale, il contesto d'uso e le assunzioni implicite, producendo un documento strutturato di intent.
- **Criteri di validazione**:
  - `intent.md` contiene sezioni per: obiettivo interpretato, contesto del sistema, assunzioni, terminologia
  - l'utente ha confermato che l'interpretazione dell'intent è corretta (gate utente superato)
  - il log della conversazione è stato committato
- **Gate utente**: conferma dell'intent interpretato
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e si ripete la fase
- **Stato risultante**: `C2_INTENT_CLARIFIED`

---

## C3 — Formalizzazione del Problema

- **Scopo**: produrre una definizione tecnica concisa del sistema a partire dall'intent chiarito.
- **Input**:
  - `docs/intent.md`
- **Output**:
  - `docs/problem-statement.md` — definizione tecnica del sistema: obiettivo di sistema, input attesi, output attesi, comportamento ad alto livello
  - `logs/prompt-refiner-c3-conversation.md` — log della conversazione
- **Trasformazione**: l'intent chiarito viene tradotto in una definizione tecnica strutturata, passando dal linguaggio del dominio utente al linguaggio del dominio tecnico.
- **Criteri di validazione**:
  - `problem-statement.md` contiene: obiettivo di sistema, input attesi, output attesi, comportamento ad alto livello
  - la definizione è coerente con `intent.md`
  - l'utente ha confermato la formalizzazione (gate utente superato)
- **Gate utente**: conferma della formalizzazione del problema
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e si ripete la fase
- **Stato risultante**: `C3_PROBLEM_FORMALIZED`

---

## C4 — Estrazione dei Requisiti

- **Scopo**: estrarre requisiti funzionali, non funzionali e criteri di accettazione dalla definizione del problema.
- **Input**:
  - `docs/intent.md`
  - `docs/problem-statement.md`
- **Output**:
  - `PROMPT.md` — specifica completa del progetto: requisiti funzionali, requisiti non funzionali, scope, vincoli, criteri di accettazione
  - `logs/prompt-refiner-c4-conversation.md` — log della conversazione
- **Trasformazione**: la definizione tecnica del problema viene decomposta in requisiti discreti, verificabili e tracciabili, con criteri di accettazione espliciti.
- **Criteri di validazione**:
  - `PROMPT.md` contiene sezioni per: requisiti funzionali (numerati), requisiti non funzionali (numerati), vincoli, criteri di accettazione
  - ogni requisito è tracciabile a `problem-statement.md`
  - l'utente ha confermato la completezza del documento (gate utente superato)
- **Gate utente**: conferma della completezza dei requisiti
- **Ciclo di revisione**: se l'utente non è soddisfatto, il feedback viene passato al Prompt Refiner e si ripete la fase
- **Stato risultante**: `C4_REQUIREMENTS_EXTRACTED`

---

## C5 — Analisi Fonti Esterne [condizionale]

- **Scopo**: analizzare codice e architetture esterne rilevanti per il progetto, estraendo pattern e logiche riutilizzabili.
- **Condizione di ingresso**: `PROMPT.md` contiene riferimenti a fonti di codice esterno (decisione dell'orchestratore confermata dall'utente)
- **Input**:
  - `PROMPT.md` — riferimenti alle fonti esterne
- **Output**:
  - `docs/upstream-analysis.md` — analisi dettagliata delle fonti esterne (logica estratta, modelli di configurazione, pattern architetturali, licenze)
  - `logs/analyst-conversation.md` — log della conversazione
- **Trasformazione**: riferimenti a sorgenti esterne vengono convertiti in un documento di analisi strutturato con focus sugli elementi rilevanti per il progetto corrente.
- **Criteri di validazione**:
  - ogni fonte referenziata in `PROMPT.md` è stata analizzata o documentata come inaccessibile
  - `upstream-analysis.md` lega ogni elemento estratto alla fonte originale
  - l'utente ha confermato la qualità dell'analisi (gate utente superato)
- **Gestione errori di accesso**: se una fonte esterna è inaccessibile (autenticazione, rete, URL invalido), l'Analista documenta il fallimento nel report con: fonte, tipo di errore, impatto stimato sul progetto, e richiede all'utente indicazioni per procedere (fonte alternativa, skip, credenziali).
- **Bypass**: se non ci sono fonti esterne, lo stage viene saltato e `upstream-analysis.md` non viene prodotto. Gli stage successivi devono funzionare con o senza questo artefatto.
- **Stato risultante**: `C5_EXTERNAL_ANALYZED` (o `C5_SKIPPED`)

---

## C6 — Analisi Vincoli e Modellazione Dominio

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
- **Stato risultante**: `C6_DOMAIN_MODELED`

---

## C7 — Sintesi Architetturale

- **Scopo**: definire l'architettura del sistema, le API, i contratti di interfaccia e il modello di configurazione.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (opzionale)
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture.md` — architettura del sistema (struttura, componenti, dipendenze, pattern di interazione)
  - `docs/api.md` — definizione delle API
  - `docs/configuration.md` — modello di configurazione (parametri, formato file di configurazione, valori di default, variabili d'ambiente)
  - `docs/interface-contracts.md` — contratti di interfaccia tra componenti
- **Trasformazione**: i requisiti, i vincoli e il modello di dominio vengono sintetizzati in una struttura architetturale coerente con responsabilità componenziali, contratti e sequenza di implementazione.
- **Criteri di validazione**:
  - ogni requisito funzionale è mappato ad almeno un componente architetturale
  - ogni vincolo è indirizzato nell'architettura
  - i contratti di interfaccia sono privi di ambiguità
  - l'utente ha confermato l'architettura (gate utente superato)
- **Gate utente**: conferma dell'architettura
- **Stato risultante**: `C7_ARCHITECTURE_SYNTHESIZED`

---

## C8 — Validazione Architetturale

- **Scopo**: verificare la coerenza dell'architettura rispetto a requisiti, vincoli e modello di dominio prima di procedere all'implementazione.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture-review.md` — report di validazione architetturale (copertura requisiti, conformità vincoli, rischi identificati, proposte di mitigazione)
- **Trasformazione**: cross-referencing sistematico tra architettura, requisiti e vincoli per produrre un giudizio strutturato di conformità.
- **Criteri di validazione**:
  - ogni requisito è tracciato ad almeno un componente
  - nessun vincolo è violato
  - i rischi identificati hanno proposte di mitigazione
- **Regola di decisione**:
  - se l'architettura è invalida → ritorno a C7 con note di revisione
  - se l'architettura è valida → proseguimento
- **Stato risultante**: `C8_ARCHITECTURE_VALIDATED`

---

## C9 — Pianificazione dell'Implementazione

- **Scopo**: decomporre l'architettura in task implementabili, definire il grafo delle dipendenze, la sequenza di esecuzione e la strategia di test.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/task-graph.md` — grafo dei task con dipendenze
  - `docs/implementation-plan.md` — piano di implementazione con ordine di esecuzione e specifica per modulo
  - `docs/module-map.md` — mappa dei moduli con responsabilità e interfacce
  - `docs/test-strategy.md` — strategia di test: tipi di test (unitari, integrazione, e2e), criteri di copertura, soglie minime, criteri di accettazione per ogni modulo
- **Trasformazione**: l'architettura viene decomposta in unità di lavoro implementabili con le relative dipendenze, priorità e criteri di verifica.
- **Criteri di validazione**:
  - ogni componente architetturale è mappato ad almeno un task
  - il grafo delle dipendenze è aciclico
  - ogni modulo ha responsabilità, interfacce e dipendenze dichiarate
  - la strategia di test definisce almeno: tipi di test, soglia di copertura, criteri per ogni modulo
  - l'utente ha confermato il piano (gate utente superato)
- **Gate utente**: conferma del piano e della strategia di test
- **Stato risultante**: `C9_IMPLEMENTATION_PLANNED`

---

## Output della Pipeline Cognitiva

Artefatti finali prodotti:

```
docs/intent.md
docs/problem-statement.md
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
docs/test-strategy.md
```

Questi artefatti sono consumati dalla Pipeline Operativa.

---

# Pipeline Operativa

Obiettivo: eseguire il piano di implementazione e produrre software funzionante, testato, sicuro, documentato e rilasciabile.

---

## O1 — Setup dell'Ambiente

- **Scopo**: configurare l'ambiente di sviluppo del progetto sulla base delle specifiche architetturali e del modello di configurazione.
- **Input**:
  - `docs/architecture.md`
  - `docs/configuration.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/environment.md` — specifica dell'ambiente: runtime richiesti (linguaggio, versione), dipendenze (con lockfile), variabili d'ambiente, strumenti di build
  - file di configurazione dell'ambiente (`package.json`, `requirements.txt`, `Dockerfile`, o equivalenti per il linguaggio scelto)
- **Trasformazione**: le specifiche architetturali e il modello di configurazione vengono tradotti nella configurazione concreta dell'ambiente di sviluppo.
- **Criteri di validazione**:
  - ogni dipendenza è specificata con versione
  - un lockfile è presente per la riproducibilità
  - le variabili d'ambiente richieste sono documentate in `environment.md`
  - l'ambiente può essere ricreato da zero a partire dagli artefatti (portabilità)
- **Stato risultante**: `O1_ENVIRONMENT_READY`

---

## O2 — Scaffold del Repository

- **Scopo**: creare la struttura del progetto sulla base del piano architetturale, della mappa dei moduli e del modello di configurazione.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/architecture.md`
  - `docs/configuration.md`
- **Output**:
  - `docs/repository-structure.md` — struttura del repository documentata
  - struttura fisica delle directory e dei file placeholder
  - file di configurazione del progetto basati su `configuration.md`
- **Trasformazione**: il piano di implementazione, la mappa dei moduli e il modello di configurazione vengono convertiti nella struttura fisica del progetto.
- **Criteri di validazione**:
  - ogni modulo in `module-map.md` ha una directory corrispondente
  - la struttura rispecchia le dipendenze dichiarate nell'architettura
  - i file di configurazione sono coerenti con `configuration.md`
  - il commit è stato eseguito
- **Stato risultante**: `O2_SCAFFOLD_CREATED`

---

## O3 — Generazione dei Moduli (Builder)

- **Scopo**: implementare il codice modulo per modulo seguendo il piano di implementazione e il grafo delle dipendenze, producendo codice e test congiuntamente per ogni modulo.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/task-graph.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
- **Output** (per ogni modulo):
  - `src/<module>/` — codice sorgente del modulo
  - `tests/<module>/` — test del modulo (conformi a `test-strategy.md`)
  - `logs/builder-report-module-N.md` — report per modulo con sotto-sezioni:
    - specifica del modulo confermata
    - codice implementato (file prodotti)
    - test implementati (file prodotti)
    - risultati esecuzione test
    - problemi incontrati
- **Output** (al completamento):
  - `logs/builder-cumulative-report.md` — report cumulativo
- **Trasformazione**: le specifiche di ogni modulo vengono convertite in codice funzionante con relativi test, seguendo l'ordine del grafo dei task e la strategia di test.
- **Criteri di validazione**:
  - ogni modulo dichiarato nel piano è implementato
  - ogni modulo ha test conformi alla strategia definita in `test-strategy.md`
  - i test del modulo passano prima di procedere al modulo successivo
  - un commit è stato eseguito per ogni modulo completato
- **Ciclo interno**: il Builder itera su ogni modulo. Il feedback all'utente è solo informativo e non richiede conferma.
- **Gestione errore**: se un modulo fallisce, l'orchestratore notifica l'utente e attende istruzioni (riprovare, saltare, fermarsi).
- **Stato risultante**: `O3_MODULES_GENERATED`

---

## O4 — Validazione del Sistema (Validatore)

- **Scopo**: verificare la conformità complessiva del sistema rispetto all'architettura, ai requisiti e ai contratti di interfaccia, con quality gate espliciti.
- **Input**:
  - `src/` — codice sorgente completo
  - `tests/` — suite di test completa
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `PROMPT.md`
- **Output**:
  - `docs/validator-report.md` — report di validazione con sotto-sezioni indipendenti:
    - **Conformità architetturale**: esito (PASS/FAIL), dettaglio non-conformità
    - **Risultati test**: esito (PASS/FAIL), test passati/falliti, copertura percentuale
    - **Analisi statica**: esito (PASS/FAIL), violazioni linting, complessità ciclomatica
    - **Quality gate**: esito complessivo (PASS/FAIL) con verifica delle soglie da `test-strategy.md`
- **Trasformazione**: il codice prodotto viene confrontato sistematicamente con le specifiche architetturali, i requisiti e le soglie di qualità, producendo un giudizio strutturato per categoria.
- **Criteri di validazione**:
  - tutti i test passano
  - ogni requisito funzionale è coperto da almeno un test
  - nessuna violazione dei contratti di interfaccia
  - copertura del codice ≥ soglia definita in `test-strategy.md`
  - complessità ciclomatica entro i limiti definiti
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati
  - **c)** nessuna correzione → proseguimento
- **Stato risultante**: `O4_SYSTEM_VALIDATED`

---

## O5 — Audit di Sicurezza

- **Scopo**: verificare la sicurezza dell'applicazione attraverso analisi delle vulnerabilità, controllo delle dipendenze e verifica dei pattern di sicurezza.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/constraints.md` — vincoli di sicurezza
  - `docs/architecture.md`
  - file di configurazione delle dipendenze (lockfile)
- **Output**:
  - `docs/security-audit-report.md` — report di sicurezza con sotto-sezioni:
    - **Analisi OWASP**: verifica dei Top 10 rischi applicabili
    - **Dependency audit**: vulnerabilità note nelle dipendenze (CVE)
    - **Pattern di sicurezza**: verifica dei pattern di autenticazione, autorizzazione, sanitizzazione input
    - **Raccomandazioni**: azioni correttive ordinate per severità
- **Trasformazione**: il codice e le dipendenze vengono analizzati sistematicamente rispetto ai pattern di sicurezza noti e ai vincoli dichiarati.
- **Criteri di validazione**:
  - ogni dipendenza è stata verificata per vulnerabilità note
  - i rischi OWASP applicabili sono stati verificati
  - ogni vulnerabilità trovata ha una severità e una raccomandazione
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note di sicurezza
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati
  - **c)** nessuna correzione necessaria → proseguimento
- **Stato risultante**: `O5_SECURITY_AUDITED`

---

## O6 — Debug e Smoke Test (Debugger)

- **Scopo**: esercitare l'applicazione in ambiente controllato, catturare log e identificare bug runtime non emersi dalla validazione.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/architecture.md`
  - `docs/validator-report.md`
- **Output**:
  - `docs/debugger-report.md` — report con sotto-sezioni:
    - **Smoke test**: scenari eseguiti, risultati (PASS/FAIL per scenario)
    - **Bug trovati**: per ogni bug: scenario di riproduzione, log associati, severità, componente coinvolto
    - **Analisi dei log**: anomalie rilevate durante l'esecuzione
  - `logs/runtime-logs/` — log catturati durante l'esecuzione
- **Trasformazione**: l'applicazione viene eseguita in scenari realistici e i risultati vengono analizzati per identificare comportamenti anomali non emersi dalla validazione.
- **Criteri di validazione**:
  - tutti gli smoke test definiti sono stati eseguiti
  - i log sono stati catturati e analizzati
  - ogni bug trovato è documentato con: scenario, log, severità
- **Gate utente**: l'utente sceglie tra:
  - **a)** correzione completa → ritorno a O3 con tutte le note
  - **b)** correzione selettiva → ritorno a O3 con punti selezionati
  - **c)** nessun bug → proseguimento
- **Stato risultante**: `O6_DEBUG_COMPLETED`

---

## O7 — Generazione della Documentazione

- **Scopo**: produrre la documentazione utente e sviluppatore del progetto.
- **Input**:
  - `src/` — codice sorgente completo
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/configuration.md`
  - `docs/environment.md`
- **Output**:
  - `README.md` — documentazione del progetto: descrizione, requisiti, installazione, utilizzo, configurazione
  - `docs/api-reference.md` — documentazione API per sviluppatori (generata dal codice e da `api.md`)
  - `docs/installation-guide.md` — guida di installazione e configurazione
- **Trasformazione**: gli artefatti architetturali e il codice sorgente vengono sintetizzati in documentazione orientata all'utente finale e allo sviluppatore.
- **Criteri di validazione**:
  - `README.md` contiene: descrizione, prerequisiti, istruzioni di installazione, istruzioni d'uso
  - `api-reference.md` copre tutte le API pubbliche
  - `installation-guide.md` è sufficiente per riprodurre l'ambiente da zero
- **Stato risultante**: `O7_DOCUMENTATION_GENERATED`

---

## O8 — Configurazione CI/CD

- **Scopo**: configurare la pipeline di integrazione continua e deployment automatizzato.
- **Input**:
  - `docs/architecture.md`
  - `docs/test-strategy.md`
  - `docs/environment.md`
  - `docs/repository-structure.md`
- **Output**:
  - file di configurazione CI/CD (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, o equivalente)
  - `docs/cicd-configuration.md` — documentazione della configurazione CI/CD: step, trigger, ambienti
- **Trasformazione**: la strategia di test, la struttura del repository e le specifiche dell'ambiente vengono tradotte in una pipeline CI/CD configurata.
- **Criteri di validazione**:
  - la pipeline CI/CD è configurata e documentata
  - i trigger sono definiti (push, PR, tag)
  - gli step includono almeno: install, lint, test, build
  - la configurazione è coerente con `test-strategy.md`
- **Stato risultante**: `O8_CICD_CONFIGURED`

---

## O9 — Rilascio e Deployment

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
  - configurazione di deployment (se applicabile: `Dockerfile`, script di deploy, configurazione cloud)
- **Trasformazione**: il progetto completato viene preparato per la distribuzione con metadati di versione e (opzionalmente) configurazione di deployment.
- **Criteri di validazione**:
  - il tag di versione segue il versionamento semantico
  - il changelog è completo e traccia le modifiche
  - le note di rilascio sono coerenti con il changelog
- **Gate utente**: conferma del rilascio
- **Stato risultante**: `O9_RELEASED`

---

## O10 — Chiusura e Report Finale

- **Scopo**: verificare l'integrità del repository, consolidare lo stato della pipeline e fornire un report finale all'utente.
- **Input**:
  - tutti gli artefatti prodotti dalla pipeline (cognitiva + operativa)
  - `pipeline-state/manifest.json`
- **Output**:
  - `docs/final-report.md` — report finale cumulativo
  - `pipeline-state/manifest.json` — manifesto aggiornato con stato `COMPLETED`
- **Trasformazione**: tutti gli artefatti vengono inventariati, verificati per integrità e sintetizzati in un report finale.
- **Criteri di validazione**:
  - ogni artefatto dichiarato nel manifesto è presente nel repository
  - nessun file non tracciato è rimasto fuori dal manifesto
  - il manifesto è aggiornato con stato finale e timestamp
- **Gate utente**: l'utente sceglie tra:
  - **Iterazione**: reinserimento a un punto specifico della pipeline (C2–O9) fornendo indicazioni. Al re-ingresso si applica il **Protocollo di Re-Ingresso** (R.5).
  - **Chiusura**: la pipeline è conclusa
- **Stato risultante**: `COMPLETED`

---

# Flusso B — Resume Progetto

---

## B1 — Audit di Continuità

- **Scopo**: analizzare una repository esistente per determinare se il progetto può essere ripreso dal punto di interruzione.
- **Input**:
  - contenuto della repository
  - `pipeline-state/manifest.json` (se presente)
- **Output**:
  - `docs/audit-report.md` — report di audit con sotto-sezioni:
    - **Inventario artefatti**: artefatti trovati, classificati per stage di origine
    - **Analisi di coerenza**: cross-referencing tra artefatti e struttura attesa della pipeline
    - **Stato della pipeline**: ultimo stato valido identificato
    - **Punto di interruzione**: stage al quale il progetto si è fermato
    - **Raccomandazione**: resume (con punto di re-ingresso) o adozione (con motivazioni)
  - `logs/auditor-analysis.md` — log dell'analisi
- **Trasformazione**: gli artefatti presenti nella repository vengono confrontati con la struttura attesa della pipeline per determinare lo stato e la coerenza del progetto.
- **Criteri di validazione**:
  - ogni artefatto trovato è stato classificato rispetto allo stage che lo ha prodotto
  - il punto di interruzione è stato identificato in modo univoco
  - il report contiene una raccomandazione esplicita (resume o adozione)
- **Criteri di soglia RESUME/ADOZIONE**:
  - **RESUMABILE** se: `manifest.json` esiste ED è valido E tutti gli artefatti referenziati nel manifesto sono presenti E l'ultimo stage completato è identificabile in modo univoco
  - **ADOZIONE** se: `manifest.json` è assente O corrotto O gli artefatti non corrispondono al manifesto O non è possibile determinare univocamente l'ultimo stage completato
- **Gate utente**: l'utente conferma il risultato dell'audit
- **Esito**:
  - **Resumabile**: reinserimento nel flusso principale (C/O) al punto identificato. L'orchestratore ricostruisce il contesto leggendo: manifesto, artefatti dell'ultimo stage completato, log delle conversazioni.
  - **Non resumabile**: raccomandazione di passare al Flusso C (Adozione)
- **Stato risultante**: stato dell'ultimo stage completato (come determinato dall'audit)

---

# Flusso C — Adozione Progetto

---

## C-ADO1 — Audit di Conformità

- **Scopo**: analizzare una repository non conforme alla pipeline per produrre un piano di adozione che la renda compatibile.
- **Input**:
  - contenuto della repository
  - artefatti di audit precedenti (se presenti)
- **Output**:
  - `docs/adoption-report.md` — report di adozione con sotto-sezioni:
    - **Inventario**: artefatti esistenti mappati agli stage della pipeline
    - **Gap analysis**: artefatti mancanti per ogni stage, con stage responsabile
    - **Piano di conformazione**: azioni ordinate per colmare le lacune, con agente responsabile per ogni azione
    - **Punto di ingresso**: stage dal quale reinserirsi, con giustificazione
- **Trasformazione**: il contenuto della repository viene confrontato con la struttura attesa della pipeline, identificando le lacune e producendo un piano operativo per colmarle.
- **Criteri di validazione**:
  - ogni lacuna è stata documentata con l'artefatto mancante e lo stage responsabile
  - il piano di conformazione specifica le azioni necessarie in ordine, con l'agente responsabile
  - il punto di ingresso nella pipeline è giustificato
- **Gate utente**: l'utente deve confermare il piano di adozione
- **Esecuzione del piano**: l'orchestratore esegue le azioni del piano di conformazione invocando gli agenti appropriati per ogni artefatto mancante, nell'ordine specificato dal piano. Ogni artefatto prodotto segue il pattern standard (R.1).
- **Transizione**: completato il piano, reinserimento nel flusso principale al punto identificato
- **Stato risultante**: stato dello stage di re-ingresso identificato

---

# Regole Trasversali

## R.1 — Pattern di Interazione Standard

Ogni stage segue il pattern:

1. L'orchestratore ricostruisce il proprio contesto leggendo: `manifest.json` (stato pipeline), artefatti dello stage corrente e precedenti, ultimi log di conversazione rilevanti
2. L'orchestratore assegna il compito all'agente specializzato, trasmettendo come input: gli artefatti formali dello stage, un context brief che sintetizza la conversazione rilevante, eventuali note di feedback dell'utente
3. L'agente produce gli artefatti e restituisce il risultato all'orchestratore
4. L'orchestratore effettua un commit con messaggio nel formato `[<stage-id>] <descrizione>`
5. L'orchestratore aggiorna `manifest.json` con: stage completato, timestamp, artefatti prodotti, hash del commit
6. L'orchestratore scrive nella chat una **sintesi esecutiva** del report dell'agente, indicando la posizione del report completo nella repository (es. "Report completo: `docs/validator-report.md`")
7. Se previsto un gate utente: attende conferma o feedback
8. Se il feedback è negativo: il ciclo si ripete dal punto 2 con le note dell'utente

## R.2 — Atomicità e Stop

- Ogni operazione di un agente è un'unità atomica di lavoro: completamento dell'invocazione + produzione artefatti + commit
- **Trigger di stop**:
  - Comando esplicito dell'utente (sempre disponibile)
  - Errore fatale di un agente (automatico)
  - Non sono previsti stop automatici per timeout o budget — l'utente deve stoppare esplicitamente
- Su richiesta di stop: le modifiche in corso vengono scartate e rollback all'ultimo commit
- **Stop durante il commit**: se lo stop avviene durante l'operazione di commit, si esegue rollback al commit precedente (pre-operazione). Il commit parziale viene scartato.
- **Stop durante il ciclo del Builder (O3)**: ogni modulo committato è indipendente. Lo stop interrompe il modulo in corso (scartato) e preserva i moduli già committati.
- Lo stato della pipeline è sempre determinabile dal manifesto e dagli artefatti committati

## R.3 — Tracciabilità

- Ogni invocazione produce un log in `logs/`
- **Formato log**: Markdown, con struttura:
  ```
  # Log [stage-id] — [timestamp]
  ## Agente: [nome agente]
  ## Stage: [nome stage]
  ### Conversazione
  - **[ruolo]** [timestamp]: [contenuto]
  ```
- Il manifesto (`pipeline-state/manifest.json`) è aggiornato ad ogni commit con:
  - stage completato
  - timestamp
  - artefatti prodotti (percorsi)
  - hash del commit
  - agente responsabile
- Le conversazioni vengono serializzate in formato Markdown e committate in `logs/`

## R.4 — Portabilità

- Il manifesto e gli artefatti sono sufficienti a determinare lo stato della pipeline su un workspace diverso
- Non sono ammesse dipendenze da percorsi assoluti o configurazioni locali non tracciate
- Tutte le dipendenze runtime sono specificate con versione in `docs/environment.md`
- Tutte le variabili d'ambiente richieste sono documentate in `docs/environment.md` e `docs/configuration.md`
- Un lockfile è presente per la riproducibilità delle dipendenze

## R.5 — Protocollo di Re-Ingresso

Quando l'utente sceglie di reinserirsi nella pipeline a un punto precedente (da O10, o da B1/C-ADO1):

1. **Archiviazione**: gli artefatti prodotti da stage successivi al punto di re-ingresso vengono spostati in `archive/<timestamp>/`, preservando la struttura originale
2. **Aggiornamento manifesto**: `manifest.json` viene aggiornato per riflettere il nuovo stato (quello dello stage di re-ingresso), con riferimento all'archivio per tracciabilità
3. **Commit**: il re-ingresso viene committato con messaggio `[RE-ENTRY] Ritorno a <stage-id> — artefatti archiviati in archive/<timestamp>/`
4. **Ripresa**: l'esecuzione riprende dallo stage indicato con gli artefatti degli stage precedenti intatti

## R.6 — Convenzioni Git

- **Branch**: l'esecuzione della pipeline avviene sul branch `pipeline/<nome-progetto>`
- **Messaggi di commit**: formato `[<stage-id>] <descrizione>` (es. `[C7] Sintesi architetturale completata`)
- **Tag**: al completamento della pipeline, tag con versione semantica (es. `v1.0.0`)
- **Merge**: al completamento e conferma dell'utente, merge su `main`

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
C9_IMPLEMENTATION_PLANNED → O1_ENVIRONMENT_READY
O1_ENVIRONMENT_READY     → O2_SCAFFOLD_CREATED
O2_SCAFFOLD_CREATED      → O3_MODULES_GENERATED
O3_MODULES_GENERATED     → O4_SYSTEM_VALIDATED
O4_SYSTEM_VALIDATED      → O3_MODULES_GENERATED            [correzione]
O4_SYSTEM_VALIDATED      → O5_SECURITY_AUDITED
O5_SECURITY_AUDITED      → O3_MODULES_GENERATED            [correzione sicurezza]
O5_SECURITY_AUDITED      → O6_DEBUG_COMPLETED
O6_DEBUG_COMPLETED       → O3_MODULES_GENERATED            [correzione bug]
O6_DEBUG_COMPLETED       → O7_DOCUMENTATION_GENERATED
O7_DOCUMENTATION_GENERATED → O8_CICD_CONFIGURED
O8_CICD_CONFIGURED       → O9_RELEASED
O9_RELEASED              → COMPLETED
COMPLETED                → qualsiasi stato C2–O9           [re-ingresso utente]
qualsiasi stato          → STOPPED                         [stop utente o errore fatale]
STOPPED                  → qualsiasi stato                 [resume/adozione]
```

## Invarianti

- Lo stato corrente è sempre registrato in `manifest.json`
- Un solo stato è attivo in ogni momento
- Le transizioni all'indietro (correzione, re-ingresso) attivano il Protocollo di Re-Ingresso (R.5)
- Lo stato `STOPPED` preserva l'ultimo stato valido nel manifesto per consentire il resume

---

# Riepilogo della Pipeline

```
PIPELINE COGNITIVA

C1  Inizializzazione
C2  Chiarificazione dell'Intent     (Prompt Refiner)
C3  Formalizzazione del Problema    (Prompt Refiner)
C4  Estrazione dei Requisiti        (Prompt Refiner)
C5  Analisi Fonti Esterne           (Analista)        [condizionale]
C6  Analisi Vincoli e Dominio
C7  Sintesi Architetturale          (Architetto)
C8  Validazione Architetturale
C9  Pianificazione Implementazione

↓

PIPELINE OPERATIVA

O1  Setup dell'Ambiente
O2  Scaffold del Repository
O3  Generazione dei Moduli          (Builder)
O4  Validazione del Sistema         (Validatore)
O5  Audit di Sicurezza
O6  Debug e Smoke Test              (Debugger)
O7  Generazione Documentazione
O8  Configurazione CI/CD
O9  Rilascio e Deployment
O10 Chiusura e Report Finale

FLUSSI AUSILIARI

B1      Audit di Continuità         (Auditor)         [Resume]
C-ADO1  Audit di Conformità         (Auditor)         [Adozione]
```

---

*Fine del modello formale della pipeline v1.0.*
