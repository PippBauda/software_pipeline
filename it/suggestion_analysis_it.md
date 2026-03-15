# Suggerimenti di Miglioramento — pipeline_1.0.md

Questo documento raccoglie spunti di miglioramento identificati nella versione 1.0 del modello formale della pipeline. Nessuna modifica è stata apportata al file sorgente.

I suggerimenti sono organizzati per categoria e classificati per impatto:
- **Alto** — rischio di incongruenza, blocco o ambiguità operativa
- **Medio** — lacuna che riduce chiarezza, tracciabilità o robustezza
- **Basso** — raffinamento di forma o completezza che non impatta il funzionamento

---

## Categoria 1 — Assegnazione degli Agenti

### S-01 | Stage senza agente dichiarato
**Impatto**: Alto

Il riepilogo finale assegna un agente solo a 6 stage su 21 (C2–C4 → Prompt Refiner, C5 → Analista, C7 → Architetto, O3 → Builder, O4 → Validatore, O6 → Debugger, B1/C-ADO1 → Auditor). I seguenti stage non dichiarano chi li esegue:

| Stage | Descrizione |
|-------|-------------|
| C1 | Inizializzazione |
| C6 | Analisi Vincoli e Modellazione Dominio |
| C8 | Validazione Architetturale |
| C9 | Pianificazione dell'Implementazione |
| O1 | Setup dell'Ambiente |
| O2 | Scaffold del Repository |
| O5 | Audit di Sicurezza |
| O7 | Generazione della Documentazione |
| O8 | Configurazione CI/CD |
| O9 | Rilascio e Deployment |
| O10 | Chiusura e Report Finale |

R.1 stabilisce che "l'orchestratore assegna il compito all'agente specializzato" ma senza dichiarare quale agente, l'orchestratore non ha istruzioni su chi invocare. Questo crea ambiguità implementativa e rende il riepilogo finale incompleto.

**Suggerimento**: per ogni stage dichiarare l'agente responsabile (agente esistente o nuovo), oppure dichiarare esplicitamente che lo stage è eseguito dall'orchestratore stesso.

---

### S-02 | Continuità di contesto nel Prompt Refiner (C2→C3→C4)
**Impatto**: Medio

Tre stage consecutivi (C2, C3, C4) invocano lo stesso agente (Prompt Refiner), ma V.2 dichiara gli agenti stateless. Alla seconda invocazione (C3), il Prompt Refiner perde tutto il contesto della conversazione avvenuta in C2. Questo è particolarmente critico perché C2 è l'unico stage in cui l'utente interagisce direttamente per chiarire l'intent — informazioni che si perdono nel passaggio a C3 a meno che non siano interamente catturate in `intent.md`.

**Suggerimento**: rafforzare la specifica chiarendo che ogni informazione rilevante della conversazione C2 DEVE essere codificata nell'artefatto `intent.md` (output di C2 / input di C3), in modo che il Prompt Refiner in C3 possa operare senza perdita di contesto. Valutare se il context brief di R.1 punto 2 è sufficiente o se serve un meccanismo più esplicito (es. il log della conversazione C2 come input formale di C3).

---

## Categoria 2 — Coerenza Input/Output

### S-03 | O3 (Builder) non riceve `docs/environment.md`
**Impatto**: Alto

O3 genera codice sorgente ma non riceve `docs/environment.md` come input. Il Builder ha bisogno di sapere quale runtime, framework e versioni usare per generare codice corretto. Attualmente il Builder dovrebbe dedurre queste informazioni da `docs/architecture.md`, ma `environment.md` è l'artefatto dedicato.

**Suggerimento**: aggiungere `docs/environment.md` tra gli input di O3.

---

### S-04 | O4 (Validatore) non riceve `docs/constraints.md`
**Impatto**: Medio

O4 deve verificare la conformità del sistema, ma tra i suoi input non c'è `docs/constraints.md`. Senza vincoli, il Validatore non può verificare la conformità a vincoli di performance, sicurezza o scalabilità.

**Suggerimento**: aggiungere `docs/constraints.md` tra gli input di O4.

---

### S-05 | O6 (Debugger) non riceve `docs/test-strategy.md`
**Impatto**: Medio

O6 deve eseguire smoke test, ma non riceve `docs/test-strategy.md`.  La strategia di test potrebbe contenere la definizione degli scenari di smoke test o i criteri per la loro creazione.

**Suggerimento**: aggiungere `docs/test-strategy.md` tra gli input di O6.

---

### S-06 | O6 (Debugger) non riceve `docs/security-audit-report.md`
**Impatto**: Basso

Se O5 ha prodotto un report di sicurezza prima di O6, il Debugger potrebbe usare le informazioni sulle vulnerabilità per costruire scenari di smoke test mirati. Attualmente il report di sicurezza non è tra gli input.

**Suggerimento**: aggiungere `docs/security-audit-report.md` come input opzionale di O6.

---

### S-07 | O7 (Documentazione) non riceve `PROMPT.md`
**Impatto**: Medio

O7 genera `README.md` e documentazione utente ma non riceve `PROMPT.md`, che contiene la descrizione del progetto, i requisiti e lo scope. Senza questo artefatto, la documentazione potrebbe omettere informazioni essenziali sulla finalità del progetto.

**Suggerimento**: aggiungere `PROMPT.md` tra gli input di O7.

---

### S-08 | C9 non riceve `docs/domain-model.md`
**Impatto**: Basso

C9 (Pianificazione dell'Implementazione) decompone l'architettura in task ma non riceve il modello di dominio. Per progetti complessi, la conoscenza delle entità di dominio potrebbe influenzare la decomposizione in moduli.

**Suggerimento**: aggiungere `docs/domain-model.md` come input di C9.

---

## Categoria 3 — Macchina a Stati

### S-09 | Flussi B1 e C-ADO1 senza stati nella macchina a stati
**Impatto**: Alto

La macchina a stati elenca 20 stati validi, ma non include stati per i flussi ausiliari. Quando la pipeline è in fase di audit (B1) o di conformazione (C-ADO1), non esiste uno stato che lo rappresenti. La transizione `STOPPED → qualsiasi stato [resume/adozione]` implica che dall'arresto si passi direttamente allo stato di destinazione, ma l'audit è un'operazione non istantanea che dovrebbe avere un proprio stato.

**Suggerimento**: aggiungere almeno due stati: `B1_AUDITING` e `C_ADO1_AUDITING` (o equivalenti) con le relative transizioni. In alternativa, dichiarare esplicitamente che i flussi ausiliari sono fuori dalla macchina a stati principale e seguono un protocollo separato.

---

### S-10 | Transizione `COMPLETED → qualsiasi stato C2–O9` troppo permissiva
**Impatto**: Medio

La transizione di re-ingresso da `COMPLETED` consente il ritorno a qualsiasi stato da C2 a O9, ma nella pratica alcuni reinserimenti non hanno senso logico (es. da COMPLETED tornare direttamente a O2 senza passare da C9). Non ci sono vincoli sulla coerenza del punto di re-ingresso scelto dall'utente.

**Suggerimento**: specificare che il punto di re-ingresso deve essere validato dall'orchestratore per coerenza (es. non è possibile reinserirsi a O2 se si è modificato un requisito in fase cognitiva, perché tutti gli artefatti operativi dipendono dai cognitivi). In alternativa, dichiarare che qualsiasi re-ingresso a uno stage cognitivo invalida automaticamente tutti gli stage operativi.

---

### S-11 | Re-ingresso e R.5 — scoping del protocollo
**Impatto**: Medio

R.5 copre il re-ingresso dall'utente (da O10/COMPLETED e da B1/C-ADO1). Tuttavia, le transizioni di correzione (O4→O3, O5→O3, O6→O3) sono anch'esse transizioni all'indietro. L'invariante dichiara che "le transizioni all'indietro attivano il Protocollo di Re-Ingresso (R.5)", ma i loop di correzione O4/O5/O6→O3 non dovrebbero archiviare gli artefatti di O4/O5/O6 — sono cicli di fix, non re-ingressi.

**Suggerimento**: distinguere due tipi di transizioni all'indietro: (a) **correzione** (loop O4/O5/O6→O3): nessuna archiviazione, gli artefatti di validazione vengono sovrascritti alla successiva ri-esecuzione; (b) **re-ingresso** (da COMPLETED o da flussi ausiliari): archiviazione secondo R.5.

---

## Categoria 4 — Cicli di Validazione e Correzione

### S-12 | Dopo correzione O3, quali stage vanno ri-eseguiti?
**Impatto**: Alto

Se O4 (Validazione) trova problemi e rimanda a O3, dopo la correzione in O3 è chiaro che si torna a O4. Ma se O5 (Sicurezza) rimanda a O3, dopo la correzione si deve ri-eseguire O4 prima di O5? E se O6 (Debug) rimanda a O3, si devono ri-eseguire O4 e O5?

La macchina a stati consente O3→O4 ma non definisce se dopo un loop O5→O3 il flusso riprende da O3→O4→O5 (ri-validazione completa) o da O3→O5 (salto diretto).

**Suggerimento**: dichiarare esplicitamente la regola: dopo qualsiasi correzione in O3, il flusso riprende dal punto immediatamente successivo (O4), passando per tutti gli stage di validazione successivi prima di tornare allo stage che ha originato la correzione. Esempio: O6→O3 implica ri-esecuzione O3→O4→O5→O6.

---

### S-13 | O3 skip di un modulo — impatto sulle dipendenze
**Impatto**: Medio

O3 prevede che se un modulo fallisce, l'utente possa scegliere "saltare". Ma se il modulo saltato è una dipendenza di moduli successivi nel grafo dei task, i moduli dipendenti falliranno a loro volta. La pipeline non definisce come gestire questo scenario (cascata di skip? interruzione? segnalazione?).

**Suggerimento**: documentare la gestione: se l'utente sceglie di saltare un modulo, l'orchestratore deve verificare il grafo delle dipendenze e segnalare i moduli dipendenti, chiedendo all'utente se vuole saltare anche quelli o fermarsi.

---

## Categoria 5 — Robustezza Operativa

### S-14 | Schema di `manifest.json` non definito
**Impatto**: Alto

`manifest.json` è l'artefatto più critico della pipeline (V.3, R.1, R.3, R.5, R.6, B1 lo usano tutti), ma il suo schema non è definito nel documento. Non è documentato:
- quali campi contiene
- quale struttura ha (piatto? annidato? array di stage?)
- come vengono registrate le iterazioni e i re-ingressi
- quale versione di schema segue

**Suggerimento**: aggiungere una sezione dedicata con lo schema JSON di `manifest.json`, includendo almeno: versione dello schema, pipeline ID, stato corrente, array degli stage completati (con timestamp, artefatti, commit hash, agente), cronologia dei re-ingressi.

---

### S-15 | Log naming per ri-esecuzioni
**Impatto**: Medio

I log hanno nomi fissi legati allo stage (es. `logs/prompt-refiner-c2-conversation.md`). Se uno stage viene ri-eseguito (per ciclo di revisione o per re-ingresso), il log precedente viene sovrascritto. Questo viola lo spirito di R.3 (tracciabilità).

**Suggerimento**: adottare una convenzione di naming che includa un suffisso incrementale o un timestamp: `logs/prompt-refiner-c2-conversation-<N>.md` oppure `logs/prompt-refiner-c2-conversation-<timestamp>.md`.

---

### S-16 | Politica di cleanup dell'archivio
**Impatto**: Basso

R.5 archivia artefatti in `archive/<timestamp>/` senza limite. In progetti con molte iterazioni, l'archivio potrebbe crescere significativamente. Non è definita una politica di pulizia (manuale, dopo N iterazioni, mai).

**Suggerimento**: dichiarare esplicitamente la politica: l'archivio non viene mai cancellato automaticamente (tracciabilità), oppure definire un meccanismo di compattazione/pulizia opzionale.

---

### S-17 | Versione dello schema del manifesto
**Impatto**: Basso

Il manifesto non dichiara una versione di schema. Se la pipeline evolve (es. da v1.0 a v2.0), un manifesto vecchio non sarà riconoscibile come compatibile o incompatibile.

**Suggerimento**: aggiungere un campo `schema_version` al manifesto, verificato da B1 durante l'audit di continuità.

---

## Categoria 6 — Transizione Cognitiva → Operativa

### S-18 | Assenza di un gate di handoff tra pipeline cognitiva e operativa
**Impatto**: Alto

La transizione da C9 a O1 è diretta: completata la pianificazione, si passa al setup dell'ambiente. Non esiste un checkpoint esplicito che verifichi la completezza e la coerenza di tutti gli artefatti cognitivi prima di avviare l'implementazione. Se un artefatto cognitivo è mancante o incoerente, il problema emerge solo durante l'esecuzione operativa.

**Suggerimento**: inserire un gate di transizione (implicito o esplicito) tra C9 e O1 che verifichi: tutti gli artefatti cognitivi attesi sono presenti, coerenti tra loro (cross-referencing), e il manifesto riflette lo stato `C9_IMPLEMENTATION_PLANNED`. Questo potrebbe essere un check automatico dell'orchestratore senza un nuovo stage.

---

## Categoria 7 — Gate Utente Mancanti

### S-19 | C6 senza gate utente
**Impatto**: Medio

C6 (Analisi Vincoli e Modellazione Dominio) produce due artefatti critici (`constraints.md`, `domain-model.md`) che fondano l'intera architettura (C7). Un errore nei vincoli o nel modello di dominio si propaga a catena fino alla pipeline operativa. Tuttavia C6 non prevede un gate utente per confermare la correttezza degli artefatti.

**Suggerimento**: aggiungere un gate utente a C6 per conferma dei vincoli e del modello di dominio, o documentare esplicitamente perché non è necessario.

---

### S-20 | O1 e O2 senza gate utente
**Impatto**: Basso

O1 (Ambiente) e O2 (Scaffold) non prevedono gate utente. Per la maggior parte dei progetti questo è accettabile, ma per progetti con requisiti di ambiente particolari (es. versioni specifiche, vincoli di licensing) una conferma potrebbe prevenire rework.

**Suggerimento**: valutare se aggiungere un gate utente opzionale a O1, documentando il criterio di attivazione.

---

## Categoria 8 — Chiarezza e Completezza

### S-21 | Naming dell'artefatto `PROMPT.md`
**Impatto**: Basso

`PROMPT.md` è posizionato nella root del repository ed è un artefatto della pipeline (output di C4). Il nome potrebbe creare confusione con il concetto di "prompt" in contesti LLM e collidere con convenzioni di altri strumenti. Inoltre, tutti gli altri artefatti cognitivi risiedono in `docs/`, creando un'inconsistenza di collocazione.

**Suggerimento**: valutare un rename (es. `docs/requirements-spec.md` o `docs/project-spec.md`) per coerenza con la collocazione degli altri artefatti, oppure documentare la motivazione della scelta attuale (visibilità nella root come punto di riferimento principale).

---

### S-22 | O5 — Definizione degli strumenti di security audit
**Impatto**: Basso

O5 richiede "analisi OWASP", "dependency audit (CVE)", "verifica pattern di sicurezza", ma non indica se questi controlli richiedono strumenti specifici (SAST, DAST, `npm audit`, `pip-audit`, etc.) o se sono eseguiti dall'agente LLM senza strumenti. In un contesto LLM-only, l'audit di sicurezza ha limitazioni intrinseche che andrebbero dichiarate.

**Suggerimento**: documentare se l'audit è LLM-only (con le relative limitazioni) o se richiede integrazione con strumenti esterni, e in tal caso come vengono configurati (in O1? in O8?).

---

### S-23 | Assenza di un meccanismo di escalation
**Impatto**: Medio

Quando un agente incontra un problema che non può risolvere (es. un requisito ambiguo emerso durante O3, o un conflitto tra vincoli scoperto dal Validatore), l'unico meccanismo è "notifica all'utente". Non è definito un protocollo di escalation strutturato che distingua tra: blocco risolvibile dall'agente con più contesto, blocco risolvibile dall'utente, blocco che richiede revisione di artefatti a monte.

**Suggerimento**: definire un protocollo di escalation con livelli: (1) l'agente richiede chiarimenti all'utente nel contesto dello stage corrente; (2) l'agente segnala la necessità di revisione di un artefatto a monte (l'orchestratore propone il re-ingresso); (3) blocco fatale (stop con R.2).

---

### S-24 | Assenza di metriche di progresso
**Impatto**: Basso

L'utente non ha visibilità strutturata sul progresso della pipeline oltre alla notifica per-stage. Per progetti con molti moduli (O3), non è definito un meccanismo che indichi il progresso complessivo (es. "modulo 3/12 completato").

**Suggerimento**: aggiungere al manifesto un campo di progresso (es. `progress: { current_stage, total_stages, substage_progress }`) e richiedere all'orchestratore di comunicare il progresso nel context brief delle sintesi esecutive.

---

---

## Riepilogo

| ID | Categoria | Impatto | Sintesi |
|----|-----------|:-------:|---------|
| S-01 | Agenti | Alto | 11 stage senza agente dichiarato |
| S-02 | Agenti | Medio | Perdita contesto Prompt Refiner tra C2/C3/C4 |
| S-03 | I/O | Alto | O3 manca `environment.md` in input |
| S-04 | I/O | Medio | O4 manca `constraints.md` in input |
| S-05 | I/O | Medio | O6 manca `test-strategy.md` in input |
| S-06 | I/O | Basso | O6 manca `security-audit-report.md` opzionale |
| S-07 | I/O | Medio | O7 manca `PROMPT.md` in input |
| S-08 | I/O | Basso | C9 manca `domain-model.md` in input |
| S-09 | Macchina a Stati | Alto | B1/C-ADO1 senza stati nella macchina |
| S-10 | Macchina a Stati | Medio | Re-ingresso senza validazione coerenza |
| S-11 | Macchina a Stati | Medio | R.5 invocato anche per loop di correzione |
| S-12 | Correzione | Alto | Ri-esecuzione post-correzione non definita |
| S-13 | Correzione | Medio | Skip modulo senza gestione dipendenze |
| S-14 | Robustezza | Alto | Schema `manifest.json` non definito |
| S-15 | Robustezza | Medio | Log sovrascritti nelle ri-esecuzioni |
| S-16 | Robustezza | Basso | Nessuna politica di cleanup archivio |
| S-17 | Robustezza | Basso | Manifesto senza versione schema |
| S-18 | Handoff | Alto | Nessun gate tra pipeline cognitiva e operativa |
| S-19 | Gate | Medio | C6 senza gate utente |
| S-20 | Gate | Basso | O1/O2 senza gate utente |
| S-21 | Chiarezza | Basso | `PROMPT.md` naming e collocazione |
| S-22 | Chiarezza | Basso | O5 senza definizione strumenti |
| S-23 | Chiarezza | Medio | Nessun protocollo di escalation |
| S-24 | Chiarezza | Basso | Nessuna metrica di progresso |

### Per impatto

| Impatto | Conteggio |
|---------|:---------:|
| Alto | 6 |
| Medio | 10 |
| Basso | 8 |
| **Totale** | **24** |

---

*Fine dei suggerimenti di miglioramento.*
