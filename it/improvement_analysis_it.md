# Analisi dei Miglioramenti — pipeline_1.0 → pipeline_2.0

Questo documento traccia tutti i 24 suggerimenti da `suggestion_analysis_it.md` e il loro stato di implementazione in `pipeline_2.0_it.md`.

---

## Riepilogo

| Stato | Conteggio |
|-------|-----------|
| Implementato | 24 |
| Parziale | 0 |
| Differito | 0 |
| Rifiutato | 0 |
| **Totale** | **24** |

---

## Stato Dettagliato

### S-01 — Tabella di Mappatura Agente-Stadio
- **Impatto**: Alto
- **Decisione**: Mappatura confermata dall'utente
- **Stato**: ✅ Implementato
- **Posizione**: Nuova sezione "Agenti" aggiunta dopo i Vincoli di Progettazione, con tabella completa di mappatura agente-stadio
- **Dettagli**: Aggiunta tabella esplicita con colonne Agente, Stadi, Responsabilità. Gli stadi marcati "Orchestratore (diretto)" sono chiariti come eseguiti dall'orchestratore stesso. Ogni intestazione di stadio ora include `**Agente**: <nome>`.

### S-02 — Continuità di Contesto per il Prompt Refiner (C2→C3→C4)
- **Impatto**: Alto
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Vincolo V.2 aggiornato; liste input di C3 e C4; note output di C2
- **Dettagli**: Il vincolo V.2 ora affronta esplicitamente le invocazioni consecutive dello stesso agente. L'input di C3 include l'ultimo log della conversazione C2. L'input di C4 include l'ultimo log della conversazione C3. L'output `intent.md` di C2 porta una nota sulla codifica di tutte le informazioni per gli stadi successivi.

### S-03 — Aggiunta di `docs/environment.md` agli Input di O3
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di O3
- **Dettagli**: `docs/environment.md` aggiunto agli input di O3 affinché il Builder possa fare riferimento alle informazioni su runtime e dipendenze durante la generazione del codice.

### S-04 — Aggiunta di `docs/constraints.md` agli Input di O4
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di O4
- **Dettagli**: `docs/constraints.md` aggiunto affinché il Validatore possa verificare la conformità ai vincoli durante la validazione del sistema.

### S-05 — Aggiunta di `docs/test-strategy.md` agli Input di O6
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di O6
- **Dettagli**: `docs/test-strategy.md` aggiunto affinché il Debugger possa fare riferimento ai criteri di test nella progettazione degli smoke test.

### S-06 — Aggiunta di `docs/security-audit-report.md` come Input Opzionale di O6
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di O6
- **Dettagli**: `docs/security-audit-report.md` aggiunto come input opzionale, permettendo al Debugger di focalizzare gli smoke test sulle aree segnalate dall'audit di sicurezza.

### S-07 — Aggiunta di `docs/project-spec.md` agli Input di O7
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta, usa l'artefatto rinominato secondo S-21)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di O7
- **Dettagli**: `docs/project-spec.md` (rinominato da `PROMPT.md` secondo S-21) aggiunto agli input di O7 per la generazione della documentazione.

### S-08 — Aggiunta di `docs/domain-model.md` agli Input di C9
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Lista input di C9
- **Dettagli**: `docs/domain-model.md` aggiunto affinché l'Architetto possa fare riferimento ai concetti del dominio nella pianificazione dei task implementativi.

### S-09 — Aggiunta degli Stati B1_AUDITING e C_ADO1_AUDITING
- **Impatto**: Alto
- **Decisione**: Opzione a) — Aggiunta stati alla macchina a stati
- **Stato**: ✅ Implementato
- **Posizione**: Sezione Macchina a Stati — Stati Validi, Transizioni Valide, Invarianti
- **Dettagli**: `B1_AUDITING` e `C_ADO1_AUDITING` aggiunti come stati validi. Transizioni: `STOPPED → B1_AUDITING`, `STOPPED → C_ADO1_AUDITING`, `B1_AUDITING → qualsiasi C1-O9`, `B1_AUDITING → C_ADO1_AUDITING`, `C_ADO1_AUDITING → qualsiasi C1-O9`. Aggiunto invariante: gli stati ausiliari sono transitori e si risolvono in uno stato principale della pipeline.

### S-10 — Validazione di Coerenza del Rientro
- **Impatto**: Alto
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Regole di Ambito della Macchina a Stati (S.1)
- **Dettagli**: Nuova sottosezione che specifica che il rientro cognitivo invalida tutti gli stadi operativi (con archiviazione), e il rientro operativo archivia solo dal punto di rientro in avanti. L'orchestratore riporta l'impatto prima dell'esecuzione.

### S-11 — Chiarimento Loop di Correzione vs R.5
- **Impatto**: Alto
- **Decisione**: Confermato — i loop di correzione NON innescano R.5
- **Stato**: ✅ Implementato
- **Posizione**: Clausola di ambito R.5, R.7 (nuova regola), Regole di Ambito della Macchina a Stati
- **Dettagli**: R.5 ora ha un paragrafo esplicito "Ambito" che lo limita al rientro iniziato dall'utente. La nuova regola R.7 definisce il comportamento dei loop di correzione. Le Regole di Ambito della Macchina a Stati distinguono i loop di correzione dai rientri.

### S-12 — Ri-esecuzione Completa da O4 nei Loop di Correzione
- **Impatto**: Alto
- **Decisione**: Opzione a) — Ri-esecuzione completa da O4 in avanti
- **Stato**: ✅ Implementato
- **Posizione**: R.7 (Loop di Correzione)
- **Dettagli**: R.7 specifica che dopo le correzioni O3, il flusso riprende sempre da O4 e procede sequenzialmente. Esempi forniti: O4→O3→O4, O5→O3→O4→O5, O6→O3→O4→O5→O6.

### S-13 — Cascade di Dipendenze per Skip Modulo
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Sezione gestione errori di O3
- **Dettagli**: Quando l'utente sceglie "salta" per un modulo fallito, l'orchestratore controlla il grafo delle dipendenze e riporta tutti i moduli dipendenti a valle, chiedendo se saltare anche quelli o fermarsi.

### S-14 — Definizione Schema manifest.json
- **Impatto**: Medio
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: Nuova sezione "Schema del Manifesto" dopo le Regole Trasversali
- **Dettagli**: Schema JSON completo con descrizione dei campi. Include `schema_version`, `pipeline_id`, `project_name`, `current_state`, `progress`, array `stages_completed` (con `execution_index`), array `re_entries`, array `corrections`.

### S-15 — Suffisso Incrementale per i Log
- **Impatto**: Basso
- **Decisione**: Opzione a) — Suffisso incrementale `<N>`
- **Stato**: ✅ Implementato
- **Posizione**: R.3 (Tracciabilità)
- **Dettagli**: Convenzione di denominazione dei log aggiornata a `logs/<agente>-<stage-id>-<descrizione>-<N>.md` con esempi che mostrano l'incremento alla ri-esecuzione.

### S-16 — Politica di Conservazione dell'Archivio
- **Impatto**: Basso
- **Decisione**: Opzione a) — L'archivio non viene mai cancellato (tracciabilità completa)
- **Stato**: ✅ Implementato
- **Posizione**: R.5 (Protocollo di Rientro) — Paragrafo sulla politica dell'archivio
- **Dettagli**: Dichiarazione esplicita che l'archivio non viene mai cancellato automaticamente. La pulizia manuale da parte dell'utente è permessa ma non richiesta.

### S-17 — Versione Schema nel Manifesto
- **Impatto**: Basso
- **Decisione**: N/A (incluso in S-14)
- **Stato**: ✅ Implementato
- **Posizione**: Sezione Schema del Manifesto; criteri di validazione di B1
- **Dettagli**: Campo `schema_version` definito nello schema del manifesto. Criteri di validazione di B1 aggiornati per verificare la compatibilità della versione dello schema.

### S-18 — Controllo Handoff Cognitivo-Operativo
- **Impatto**: Medio
- **Decisione**: Opzione a) — Controllo automatico dell'orchestratore (nessun nuovo stadio)
- **Stato**: ✅ Implementato
- **Posizione**: Sezione "Output della Pipeline Cognitiva", tra C9 e O1
- **Dettagli**: Aggiunto paragrafo "Handoff Cognitivo-Operativo" che specifica il controllo di integrità automatico: (1) tutti gli artefatti cognitivi attesi presenti, (2) il manifesto riflette C9_IMPLEMENTATION_PLANNED, (3) nessun riferimento ad artefatti rotto. Il fallimento arresta la pipeline richiedendo intervento utente. Transizione della macchina a stati annotata con `[dopo controllo handoff]`.

### S-19 — Decisione Gate Utente per C6
- **Impatto**: Basso
- **Decisione**: Opzione b) — Documentare perché non serve un gate
- **Stato**: ✅ Implementato
- **Posizione**: Descrizione dello stadio C6
- **Dettagli**: Aggiunta "Nota" che spiega che non è richiesto un gate utente perché gli errori nei vincoli o nel modello di dominio vengono intercettati da C8 (Validazione Architettura) che può innescare un ritorno a C7 con note di revisione.

### S-20 — Decisione Gate Utente per O1/O2
- **Impatto**: Basso
- **Decisione**: Opzione b) — Nessun gate
- **Stato**: ✅ Implementato
- **Posizione**: Descrizioni degli stadi O1 e O2
- **Dettagli**: O1 e O2 non hanno gate utente (nessun cambiamento dalla v1.0). Ambiente e scaffold vengono verificati dai loro criteri di validazione senza richiedere conferma esplicita dell'utente.

### S-21 — Rinomina PROMPT.md in docs/project-spec.md
- **Impatto**: Medio
- **Decisione**: Opzione a) — Rinomina in `docs/project-spec.md`
- **Stato**: ✅ Implementato
- **Posizione**: In tutto il documento (C4, O4, O7, Output della Pipeline Cognitiva, ovunque si faccia riferimento a PROMPT.md)
- **Dettagli**: Tutti i riferimenti a `PROMPT.md` rinominati in `docs/project-spec.md`. L'artefatto è ora prodotto da C4 e risiede nella directory `docs/` in modo coerente con tutti gli altri artefatti cognitivi.

### S-22 — Approccio Ibrido ai Test (LLM + Strumenti Esterni)
- **Impatto**: Medio
- **Decisione**: Opzione c) — Ibrido (LLM primario + strumenti esterni opzionali), strumenti configurati in O1
- **Stato**: ✅ Implementato
- **Posizione**: Output di O1 (environment.md), input e output di O5, input di O8
- **Dettagli**: O1 ora produce `docs/environment.md` che include strumenti esterni raccomandati (linter, scanner SAST, auditor dipendenze). O5 fa riferimento a `docs/environment.md` per la disponibilità degli strumenti e documenta se sono stati usati strumenti esterni. L'output di O5 include le sotto-sezioni "Risultati strumenti esterni" e "Limitazioni". O8 fa riferimento a `docs/environment.md`.

### S-23 — Protocollo di Escalation
- **Impatto**: Basso
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: R.8 (Protocollo di Escalation) — nuova regola
- **Dettagli**: Escalation a tre livelli: Livello 1 (chiarimento in contesto), Livello 2 (revisione upstream tramite R.5), Livello 3 (blocco fatale tramite R.2). Ogni livello specifica condizione di attivazione e comportamento dell'orchestratore.

### S-24 — Metriche di Progresso
- **Impatto**: Basso
- **Decisione**: N/A (implementazione diretta)
- **Stato**: ✅ Implementato
- **Posizione**: R.1 punto 5, R.9 (Metriche di Progresso) — nuova regola, Schema del Manifesto (oggetto progress)
- **Dettagli**: R.1 punto 5 aggiornato per includere le metriche di progresso. Nuova regola R.9 che definisce il progresso a livello pipeline (`current_stage_index` / `total_stages`) e il progresso sotto-stadio per O3 (`modules_completed` / `modules_total`). I sommari esecutivi includono la stringa di progresso. Lo schema del manifesto include l'oggetto `progress`.

---

## Modifiche Trasversali

Oltre ai singoli suggerimenti, sono state applicate le seguenti modifiche strutturali:

1. **Rinumerazione regole**: le precedenti R.5 (Protocollo di Rientro) e R.6 (Convenzioni Git) sono state mantenute. Aggiunte nuove R.7 (Loop di Correzione), R.8 (Protocollo di Escalation), R.9 (Metriche di Progresso).
2. **Sezione Schema del Manifesto**: nuova sezione dedicata tra le Regole Trasversali e la Macchina a Stati, con lo schema JSON completo e le descrizioni dei campi.
3. **Sezione Agenti**: nuova sezione dopo i Vincoli di Progettazione che fornisce una tabella completa di mappatura agente-stadio.
4. **Aggiornamenti Macchina a Stati**: aggiunti gli stati `B1_AUDITING` e `C_ADO1_AUDITING`, aggiunta la sottosezione Regole di Ambito della Macchina a Stati (S.1), aggiornati gli invarianti.
5. **Riepilogo della Pipeline**: aggiornato per includere `[Controllo Handoff Cognitivo-Operativo]` tra le sezioni cognitiva e operativa.

---

*Fine dell'analisi dei miglioramenti.*
