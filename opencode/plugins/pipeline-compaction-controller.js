/**
 * @typedef {Object} AppLogBody
 * @property {string} service - Service identifier
 * @property {"debug"|"info"|"warn"|"error"} level - Log level
 * @property {string} message - Log message
 * @property {Record<string, unknown>} [extra] - Additional metadata
 */

/**
 * @typedef {Object} AppLogRequest
 * @property {AppLogBody} body - Log payload
 */

/**
 * @typedef {Object} SessionSummarizeRequest
 * @property {{ id: string }} path - Session path parameters
 * @property {Record<string, unknown>} body - Request body
 */

/**
 * @typedef {Object} Client
 * @property {{ log: (req: AppLogRequest) => Promise<void> }} [app] - Application logging API
 * @property {{ summarize: (req: SessionSummarizeRequest) => Promise<void> }} [session] - Session management API
 */

/**
 * @typedef {Object} PluginParams
 * @property {Client} client - OpenCode client API
 */

/**
 * @typedef {Object} Checkpoint
 * @property {string} id - Checkpoint identifier (lowercase, e.g. "post-cognitive")
 * @property {string} block - Full checkpoint markdown block
 */

/**
 * @typedef {Object} PipelineEvent
 * @property {string} type - Event type identifier
 * @property {Record<string, unknown>} [properties] - Event properties
 */

/**
 * @typedef {Object} CompactionOutput
 * @property {string[]} [context] - Context hints for compaction
 */

/**
 * @typedef {Object} PipelineCompactionPlugin
 * @property {(params: { event: PipelineEvent }) => Promise<void>} event
 *   Handle incoming pipeline events.
 * @property {(input: { sessionID: string, messageID: string, message: Record<string, unknown>, parts: unknown[] }, output: { compact: boolean }) => Promise<void>} [experimental.assistant.message.complete]
 *   Request in-loop compaction immediately after a completed assistant message.
 * @property {(input: unknown, output: CompactionOutput) => Promise<void>} [experimental.session.compacting]
 *   Hook into session compaction to preserve checkpoint blocks.
 */

/**
 * @typedef {PipelineCompactionPlugin & Record<string, unknown>} PipelineCompactionPluginFull
 */

/* ------------------------------------------------------------------ */
/*  Module-level constants (fix #8 — deduplicated regex)              */
/* ------------------------------------------------------------------ */

/** Regex: matches a Pipeline Checkpoint header, capturing the id inside brackets. */
const CHECKPOINT_HEADER_RE = /##\s*Pipeline Checkpoint\s*\[([^\]]+)\]/i

/** Regex: matches the full checkpoint block until the next heading or horizontal rule. */
const CHECKPOINT_BLOCK_RE = /##\s*Pipeline Checkpoint\s*\[[^\]]+\][\s\S]*?(?=\n##\s|\n---|$)/i

/** Maximum tracked sessions before oldest entries are evicted (fix #1). */
const MAX_TRACKED_SESSIONS = 500

/**
 * Pipeline Compaction Controller — OpenCode plugin.
 *
 * Monitors assistant messages for Pipeline Checkpoint blocks and requests
 * autonomous context compaction when a recognized checkpoint is detected.
 *
 * Preferred path: a patched OpenCode core consumes the
 * `experimental.assistant.message.complete` hook and executes built-in
 * compaction inside the current loop.
 *
 * Fallback path: on unpatched OpenCode builds, the plugin falls back to
 * `client.session.summarize` on `session.idle`.
 *
 * Guards: cooldown, deduplication, in-flight tracking, fail-open error handling.
 *
 * Environment variables:
 * - `OPENCODE_PIPELINE_COMPACTION_DRY_RUN` — "1"|"true"|"yes"|"on" to skip actual compaction
 * - `OPENCODE_PIPELINE_COMPACTION_DEBUG` — "1"|"true"|"yes"|"on" to enable debug logging
 * - `OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS` — Minimum ms between compactions per session (default 120000)
 * - `OPENCODE_PIPELINE_COMPACTION_PROVIDER_ID` — Override provider for compaction (e.g. "github-copilot")
 * - `OPENCODE_PIPELINE_COMPACTION_MODEL_ID` — Override model for compaction (e.g. "gpt-4o")
 *
 * @param {PluginParams} params - Plugin initialization parameters
 * @returns {Promise<PipelineCompactionPluginFull>}
 */
export const PipelineCompactionController = async ({ client }) => {
  /** @type {Set<string>} */
  const TARGET_CHECKPOINTS = new Set([
    "post-cognitive",
    "post-o3",
    "post-o10",
    "post-reentry",
  ])

  const rawDryRun = String(process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN || "")
  const DRY_RUN = ["1", "true", "yes", "on"].includes(rawDryRun.toLowerCase())
  const rawDebug = String(process.env.OPENCODE_PIPELINE_COMPACTION_DEBUG || "")
  const DEBUG = ["1", "true", "yes", "on"].includes(rawDebug.toLowerCase())
  const rawCooldown = process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS
  const parsedCooldown = Number(rawCooldown || 120000)
  const COOLDOWN_MS = Number.isFinite(parsedCooldown) && parsedCooldown >= 0 ? parsedCooldown : 120000
  const COMPACTION_PROVIDER_ID = process.env.OPENCODE_PIPELINE_COMPACTION_PROVIDER_ID || ""
  const COMPACTION_MODEL_ID = process.env.OPENCODE_PIPELINE_COMPACTION_MODEL_ID || ""
  /** @type {Set<string>} */
  const inFlight = new Set()
  /** @type {Map<string, number>} */
  const lastCompactionAt = new Map()
  /** @type {Map<string, string>} */
  const lastSignature = new Map()
  /** @type {Set<string>} */
  const startupLogged = new Set()

  /**
   * Pending checkpoints detected during streaming. A patched OpenCode core
   * consumes them through experimental.assistant.message.complete so the
   * built-in compaction flow can run inside the current loop. On unpatched
   * cores, session.idle remains as a best-effort fallback.
   * Map<sessionID, { signature, checkpointId }>
   * @type {Map<string, { signature: string, checkpointId: string }>}
   */
  const pendingCheckpoint = new Map()

  /**
   * Evict the oldest tracked session entries when size exceeds MAX_TRACKED_SESSIONS.
   * Uses Map/Set insertion-order iteration to remove the oldest entries first (fix #1).
   */
  const evictStaleSessions = () => {
    if (lastCompactionAt.size <= MAX_TRACKED_SESSIONS) return
    for (const key of lastCompactionAt.keys()) {
      lastCompactionAt.delete(key)
      lastSignature.delete(key)
      startupLogged.delete(key)
      if (lastCompactionAt.size <= MAX_TRACKED_SESSIONS) break
    }
  }

  /**
   * Extract a session ID from an object by probing multiple candidate paths.
   * @param {Record<string, unknown>} obj - Object to extract session ID from
   * @returns {string|undefined}
   */
  const extractSessionId = (obj) => {
    const info = /** @type {Record<string, unknown>} */ (obj?.info ?? {})
    const session = /** @type {Record<string, unknown>} */ (obj?.session ?? {})
    const candidates = [
      obj?.sessionID,
      obj?.sessionId,
      obj?.id,
      info?.sessionID,
      info?.sessionId,
      info?.id,
      session?.id,
    ]

    for (const value of candidates) {
      if (typeof value === "string" && value.length > 0) return value
    }
    return undefined
  }

  /**
   * Convert a value to its text representation.
   * Handles the actual OpenCode event structures:
   * - message.part.updated: properties.part.text (TextPart)
   * - message.updated: properties.info (Message — no inline text, parts are separate events)
   * Falls back to content/text properties or JSON serialization for forward-compatibility.
   * @param {unknown} value
   * @returns {string}
   */
  const asText = (value) => {
    if (typeof value === "string") return value
    if (value !== null && typeof value === "object") {
      const obj = /** @type {Record<string, unknown>} */ (value)
      // OpenCode message.part.updated: properties.part.text
      const part = /** @type {Record<string, unknown>} */ (obj.part ?? {})
      if (typeof part.text === "string") return part.text
      // Legacy/test: properties.content or properties.text
      if (typeof obj.content === "string") return obj.content
      if (typeof obj.text === "string") return obj.text
    }
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }

  /**
   * Extract a Pipeline Checkpoint block from text.
   * @param {string} text - Text to search for checkpoint
   * @returns {Checkpoint|undefined}
   */
  const extractCheckpoint = (text) => {
    const header = text.match(CHECKPOINT_HEADER_RE)
    if (!header) return undefined

    const id = header[1].trim().toLowerCase()
    const blockMatch = text.match(CHECKPOINT_BLOCK_RE)
    const block = blockMatch ? blockMatch[0].trim() : `## Pipeline Checkpoint [${id}]`
    return { id, block }
  }

  /**
   * Check if event properties indicate an assistant message.
   * Handles two OpenCode event structures:
   * - message.updated: properties.info.role === "assistant"
   * - message.part.updated: no role on part; check part.type === "text" (only
   *   text parts can contain checkpoint blocks). The looksLikeOrchestratorCheckpoint
   *   guard downstream ensures only genuine orchestrator checkpoints trigger compaction.
   * Also checks legacy/test paths: properties.role, properties.message.role.
   * @param {Record<string, unknown>} properties
   * @returns {boolean}
   */
  const isAssistantMessage = (properties) => {
    // OpenCode message.updated: properties.info.role
    const info = /** @type {Record<string, unknown>} */ (properties?.info ?? {})
    if (info.role) return String(info.role).toLowerCase() === "assistant"

    // OpenCode message.part.updated: properties.part is a Part object.
    // Parts don't carry role — accept text parts and rely on downstream
    // checkpoint format validation to filter out non-orchestrator content.
    const part = /** @type {Record<string, unknown>} */ (properties?.part ?? {})
    if (part.type === "text" && typeof part.text === "string") return true

    // Legacy / test / forward-compat paths
    const message = /** @type {Record<string, unknown>} */ (properties?.message ?? {})
    const role = properties?.role || message?.role
    if (!role) return false
    return String(role).toLowerCase() === "assistant"
  }

  /**
   * Validate that a text block looks like a genuine orchestrator checkpoint
   * (contains State, Next stage, and Required input artifacts fields).
   * @param {string} text
   * @returns {boolean}
   */
  const looksLikeOrchestratorCheckpoint = (text) => {
    return (
      CHECKPOINT_HEADER_RE.test(text) &&
      /-\s*\*\*State\*\*:/i.test(text) &&
      /-\s*\*\*Next stage\*\*:/i.test(text) &&
      /-\s*\*\*Required input artifacts\*\*:/i.test(text)
    )
  }

  /**
   * Emit a debug log message (only if DEBUG mode is enabled).
   * @param {string} message
   * @param {Record<string, unknown>} [extra]
   * @returns {Promise<void>}
   */
  const debugLog = async (message, extra) => {
    if (!DEBUG || !client?.app?.log) return
    try {
      await client.app.log({
        body: {
          service: "pipeline-compaction-controller",
          level: "debug",
          message,
          extra,
        },
      })
    } catch {
      // ignore debug-log failures
    }
  }

  /**
   * Normalize a checkpoint block for deduplication.
   * Collapses whitespace runs and trims so that insignificant formatting
   * differences do not defeat the dedup guard (fix #10).
   * @param {string} block
   * @returns {string}
   */
  const normalizeBlock = (block) => block.replace(/\s+/g, " ").trim()

  /**
   * Decide whether a checkpoint should trigger compaction now.
   * @param {string} sessionID - Target session ID
   * @param {string} signature - Checkpoint signature for deduplication
   * @returns {{ allow: boolean, reason?: string, elapsedMs?: number }}
   */
  const shouldTriggerCompaction = (sessionID, signature) => {
    const now = Date.now()
    const lastAt = lastCompactionAt.get(sessionID) || 0

    if (inFlight.has(sessionID)) {
      return { allow: false, reason: "already in-flight" }
    }
    if (now - lastAt < COOLDOWN_MS) {
      return { allow: false, reason: "cooldown active", elapsedMs: now - lastAt }
    }
    if (lastSignature.get(sessionID) === signature) {
      return { allow: false, reason: "duplicate checkpoint signature" }
    }

    return { allow: true }
  }

  /**
   * Trigger context compaction for a session, respecting cooldown, dedup, and in-flight guards.
   * @param {string} sessionID - Target session ID
   * @param {string} signature - Checkpoint signature for deduplication
   * @returns {Promise<boolean>}
   */
  const triggerCompaction = async (sessionID, signature) => {
    const decision = shouldTriggerCompaction(sessionID, signature)
    if (!decision.allow) {
      if (decision.reason === "cooldown active") {
        await debugLog("Skip compaction: cooldown active", {
          sessionID,
          cooldownMs: COOLDOWN_MS,
          elapsedMs: decision.elapsedMs,
        })
      } else {
        await debugLog(`Skip compaction: ${decision.reason}`, { sessionID, signature })
      }
      return false
    }

    // Claim the in-flight slot atomically, before any further await.
    inFlight.add(sessionID)

    lastSignature.set(sessionID, signature)

    try {
      if (DRY_RUN) {
        await client.app?.log({
          body: {
            service: "pipeline-compaction-controller",
            level: "info",
            message: "Dry-run: autonomous compaction skipped",
            extra: { sessionID, signature },
          },
        })
        lastCompactionAt.set(sessionID, Date.now())
        evictStaleSessions()
        await debugLog("Dry-run compaction event handled", { sessionID, signature })
        return true
      }

      await client.session?.summarize({
        path: { id: sessionID },
        body: {
          ...(COMPACTION_PROVIDER_ID ? { providerID: COMPACTION_PROVIDER_ID } : {}),
          ...(COMPACTION_MODEL_ID ? { modelID: COMPACTION_MODEL_ID } : {}),
        },
      })
      lastCompactionAt.set(sessionID, Date.now())
      evictStaleSessions()
      await debugLog("Autonomous compaction executed", { sessionID, signature })
      return true
    } catch (err) {
      // fail-open: pipeline continues without autonomous compaction.
      // Emit a visible warning (not just debug) so operators can detect
      // recurring failures without enabling DEBUG mode (fix #6).
      if (client?.app?.log) {
        try {
          await client.app.log({
            body: {
              service: "pipeline-compaction-controller",
              level: "warn",
              message: "Compaction attempt failed (fail-open)",
              extra: { sessionID, signature, error: String(err) },
            },
          })
        } catch {
          // last-resort: ignore logging failures
        }
      }
      return false
    } finally {
      inFlight.delete(sessionID)
    }
  }

  /**
   * Emit a one-time startup diagnostic log for a session.
   * Wrapped in try/catch for fail-open safety (fix #2).
   * @param {string} [sessionID]
   * @returns {Promise<void>}
   */
  const emitStartupCheck = async (sessionID) => {
    const key = sessionID || "global"
    if (startupLogged.has(key)) return
    startupLogged.add(key)

    try {
      const diagnostics = {
        dryRun: DRY_RUN,
        debug: DEBUG,
        cooldownMs: COOLDOWN_MS,
        compactionProviderID: COMPACTION_PROVIDER_ID || undefined,
        compactionModelID: COMPACTION_MODEL_ID || undefined,
        targetCheckpoints: Array.from(TARGET_CHECKPOINTS),
        hasSessionSummarize: Boolean(client?.session?.summarize),
        hasAppLog: Boolean(client?.app?.log),
        sessionID: sessionID || undefined,
      }

      if (!client?.app?.log) return

      await client.app.log({
        body: {
          service: "pipeline-compaction-controller",
          level: diagnostics.hasSessionSummarize ? "info" : "warn",
          message: diagnostics.hasSessionSummarize
            ? "Startup check: plugin ready"
            : "Startup check: session.summarize unavailable",
          extra: {
            diagnostics,
            rawEnv: {
              OPENCODE_PIPELINE_COMPACTION_DRY_RUN: rawDryRun || undefined,
              OPENCODE_PIPELINE_COMPACTION_DEBUG: rawDebug || undefined,
              OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS: rawCooldown || undefined,
              OPENCODE_PIPELINE_COMPACTION_PROVIDER_ID: COMPACTION_PROVIDER_ID || undefined,
              OPENCODE_PIPELINE_COMPACTION_MODEL_ID: COMPACTION_MODEL_ID || undefined,
            },
          },
        },
      })

      if (rawCooldown && COOLDOWN_MS === 120000 && rawCooldown !== "120000") {
        await client.app.log({
          body: {
            service: "pipeline-compaction-controller",
            level: "warn",
            message:
              "Startup check: invalid OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS, defaulting to 120000",
            extra: {
              rawCooldown,
              effectiveCooldownMs: COOLDOWN_MS,
              sessionID: sessionID || undefined,
            },
          },
        })
      }
    } catch {
      // fail-open: startup diagnostic is best-effort
    }
  }

  return {
    /**
     * Handle incoming pipeline events.
     *
      * Checkpoint detection happens while the orchestrator is streaming.
      * A patched OpenCode core consumes the pending checkpoint via
      * experimental.assistant.message.complete and triggers built-in compaction
      * in the same loop at the next safe boundary.
      *
      * @param {{ event: PipelineEvent }} params
      * @returns {Promise<void>}
      */
    event: async ({ event }) => {
      if (!event) return

      if (event.type === "session.created") {
        const createdSessionID = extractSessionId(event.properties ?? {}) || extractSessionId(/** @type {Record<string, unknown>} */ (event))
        await emitStartupCheck(createdSessionID)
        return
      }

      if (event.type === "session.idle") {
        const idleSessionID = extractSessionId(event.properties ?? {}) || extractSessionId(/** @type {Record<string, unknown>} */ (event))
        if (!idleSessionID) return

        const pending = pendingCheckpoint.get(idleSessionID)
        if (!pending) return
        pendingCheckpoint.delete(idleSessionID)

        await debugLog("Session idle — flushing pending checkpoint via summarize fallback", {
          sessionID: idleSessionID,
          signature: pending.signature,
        })
        await triggerCompaction(idleSessionID, pending.signature)
        return
      }

      if (event.type === "session.compacted") {
        const compactedSessionID = extractSessionId(event.properties ?? {}) || extractSessionId(/** @type {Record<string, unknown>} */ (event))
        if (!compactedSessionID) return
        pendingCheckpoint.delete(compactedSessionID)
        return
      }

      if (event.type !== "message.updated" && event.type !== "message.part.updated") {
        return
      }

      const props = event.properties || {}
      if (!isAssistantMessage(props)) return

      const text = asText(props)
      const checkpoint = extractCheckpoint(text)
      if (!checkpoint) return
      if (!TARGET_CHECKPOINTS.has(checkpoint.id)) return
      if (!looksLikeOrchestratorCheckpoint(text)) {
        await debugLog("Skip compaction: checkpoint does not match orchestrator format", {
          checkpointId: checkpoint.id,
        })
        return
      }

      const sessionID = extractSessionId(props) || extractSessionId(/** @type {Record<string, unknown>} */ (event))
      if (!sessionID) {
        await debugLog("Skip compaction: missing session id", {})
        return
      }
      await emitStartupCheck(sessionID)

      const signature = `${checkpoint.id}:${normalizeBlock(checkpoint.block)}`

      pendingCheckpoint.set(sessionID, { signature, checkpointId: checkpoint.id })
      await debugLog("Checkpoint detected — waiting for assistant message completion", {
        sessionID,
        checkpointId: checkpoint.id,
      })
    },

    /**
     * Request compaction inside the current OpenCode loop when the assistant
     * message has fully completed.
     *
     * This hook is consumed only by a patched OpenCode core. Without that patch,
     * checkpoint detection still works but live checkpoint compaction will not.
     *
     * @param {{ sessionID: string, messageID: string, message: Record<string, unknown>, parts: unknown[] }} input
     * @param {{ compact: boolean }} output
     * @returns {Promise<void>}
     */
    "experimental.assistant.message.complete": async (input, output) => {
      const sessionID = typeof input?.sessionID === "string" ? input.sessionID : undefined
      if (!sessionID) return

      const pending = pendingCheckpoint.get(sessionID)
      if (!pending) return

      const decision = shouldTriggerCompaction(sessionID, pending.signature)
      if (!decision.allow) {
        if (decision.reason === "cooldown active") {
          await debugLog("Skip compaction: cooldown active", {
            sessionID,
            cooldownMs: COOLDOWN_MS,
            elapsedMs: decision.elapsedMs,
          })
        } else {
          await debugLog(`Skip compaction: ${decision.reason}`, {
            sessionID,
            signature: pending.signature,
          })
        }
        pendingCheckpoint.delete(sessionID)
        return
      }

      pendingCheckpoint.delete(sessionID)
      lastSignature.set(sessionID, pending.signature)
      lastCompactionAt.set(sessionID, Date.now())
      evictStaleSessions()

      output.compact = true
      await debugLog("Checkpoint completed — requesting in-loop compaction", {
        sessionID,
        checkpointId: pending.checkpointId,
      })
    },

    /**
     * Hook into session compaction to preserve checkpoint blocks.
     * @param {unknown} _input
     * @param {CompactionOutput} output
     * @returns {Promise<void>}
     */
    "experimental.session.compacting": async (_input, output) => {
      if (!Array.isArray(output.context)) output.context = []
      output.context.push(
        "If a '## Pipeline Checkpoint [<id>]' block exists, preserve the newest relevant one verbatim.",
      )
    },
  }
}
