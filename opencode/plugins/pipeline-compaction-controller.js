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
 * Pipeline Compaction Controller — OpenCode plugin.
 *
 * Monitors assistant messages for Pipeline Checkpoint blocks and triggers
 * autonomous context compaction via `client.session.summarize` when a
 * recognized checkpoint is detected.
 *
 * Guards: cooldown, deduplication, in-flight tracking, fail-open error handling.
 *
 * Environment variables:
 * - `OPENCODE_PIPELINE_COMPACTION_DRY_RUN` — "1"|"true"|"yes"|"on" to skip actual compaction
 * - `OPENCODE_PIPELINE_COMPACTION_DEBUG` — "1"|"true"|"yes"|"on" to enable debug logging
 * - `OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS` — Minimum ms between compactions per session (default 120000)
 *
 * @param {PluginParams} params - Plugin initialization parameters
 * @returns {Promise<{
 *   event: (params: { event: PipelineEvent }) => Promise<void>,
 *   "experimental.session.compacting": (input: unknown, output: CompactionOutput) => Promise<void>
 * }>}
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
  /** @type {Set<string>} */
  const inFlight = new Set()
  /** @type {Map<string, number>} */
  const lastCompactionAt = new Map()
  /** @type {Map<string, string>} */
  const lastSignature = new Map()
  /** @type {Set<string>} */
  const startupLogged = new Set()

  /**
   * Extract a session ID from an object by probing multiple candidate paths.
   * @param {Record<string, unknown>} obj - Object to extract session ID from
   * @returns {string|undefined}
   */
  const extractSessionId = (obj) => {
    const candidates = [
      obj?.sessionID,
      obj?.sessionId,
      obj?.id,
      obj?.info?.sessionID,
      obj?.info?.sessionId,
      obj?.info?.id,
      obj?.session?.id,
    ]

    for (const value of candidates) {
      if (typeof value === "string" && value.length > 0) return value
    }
    return undefined
  }

  /**
   * Convert a value to its string representation.
   * @param {unknown} value
   * @returns {string}
   */
  const asText = (value) => {
    if (typeof value === "string") return value
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
    const header = text.match(/##\s*Pipeline Checkpoint\s*\[([^\]]+)\]/i)
    if (!header) return undefined

    const id = header[1].trim().toLowerCase()
    const blockMatch = text.match(
      /##\s*Pipeline Checkpoint\s*\[[^\]]+\][\s\S]*?(?=\n##\s|\n---|$)/i,
    )
    const block = blockMatch ? blockMatch[0].trim() : `## Pipeline Checkpoint [${id}]`
    return { id, block }
  }

  /**
   * Check if event properties indicate an assistant message.
   * @param {Record<string, unknown>} properties
   * @returns {boolean}
   */
  const isAssistantMessage = (properties) => {
    const role = properties?.role || properties?.info?.role || properties?.message?.role
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
      /##\s*Pipeline Checkpoint\s*\[[^\]]+\]/i.test(text) &&
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
   * Trigger context compaction for a session, respecting cooldown, dedup, and in-flight guards.
   * @param {string} sessionID - Target session ID
   * @param {string} signature - Checkpoint signature for deduplication
   * @returns {Promise<void>}
   */
  const triggerCompaction = async (sessionID, signature) => {
    const now = Date.now()
    const lastAt = lastCompactionAt.get(sessionID) || 0

    if (inFlight.has(sessionID)) {
      await debugLog("Skip compaction: already in-flight", { sessionID })
      return
    }
    if (now - lastAt < COOLDOWN_MS) {
      await debugLog("Skip compaction: cooldown active", {
        sessionID,
        cooldownMs: COOLDOWN_MS,
        elapsedMs: now - lastAt,
      })
      return
    }
    if (lastSignature.get(sessionID) === signature) {
      await debugLog("Skip compaction: duplicate checkpoint signature", { sessionID, signature })
      return
    }

    inFlight.add(sessionID)
    lastSignature.set(sessionID, signature)

    try {
      if (DRY_RUN) {
        await client.app.log({
          body: {
            service: "pipeline-compaction-controller",
            level: "info",
            message: "Dry-run: autonomous compaction skipped",
            extra: { sessionID, signature },
          },
        })
        lastCompactionAt.set(sessionID, Date.now())
        await debugLog("Dry-run compaction event handled", { sessionID, signature })
        return
      }

      await client.session.summarize({
        path: { id: sessionID },
        body: {},
      })
      lastCompactionAt.set(sessionID, Date.now())
      await debugLog("Autonomous compaction executed", { sessionID, signature })
    } catch {
      await debugLog("Compaction attempt failed (fail-open)", { sessionID, signature })
      // fail-open: pipeline continues without autonomous compaction
    } finally {
      inFlight.delete(sessionID)
    }
  }

  /**
   * Emit a one-time startup diagnostic log for a session.
   * @param {string} [sessionID]
   * @returns {Promise<void>}
   */
  const emitStartupCheck = async (sessionID) => {
    const key = sessionID || "global"
    if (startupLogged.has(key)) return
    startupLogged.add(key)

    const diagnostics = {
      dryRun: DRY_RUN,
      debug: DEBUG,
      cooldownMs: COOLDOWN_MS,
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
          extra: { rawCooldown, effectiveCooldownMs: COOLDOWN_MS, sessionID: sessionID || undefined },
        },
      })
    }
  }

  return {
    /**
     * Handle incoming pipeline events.
     * @param {{ event: PipelineEvent }} params
     * @returns {Promise<void>}
     */
    event: async ({ event }) => {
      if (!event || event.type === "session.compacted") return

      if (event.type === "session.created") {
        const createdSessionID = extractSessionId(event.properties) || extractSessionId(event)
        await emitStartupCheck(createdSessionID)
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

      const sessionID = extractSessionId(props) || extractSessionId(event)
      if (!sessionID) {
        await debugLog("Skip compaction: missing session id", {})
        return
      }
      if (!client?.session?.summarize) {
        await debugLog("Skip compaction: session.summarize unavailable", { sessionID })
        return
      }

      await emitStartupCheck(sessionID)

      const signature = `${checkpoint.id}:${checkpoint.block}`
      await triggerCompaction(sessionID, signature)
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
