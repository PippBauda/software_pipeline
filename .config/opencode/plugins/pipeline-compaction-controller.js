export const PipelineCompactionController = async ({ client }) => {
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
  const inFlight = new Set()
  const lastCompactionAt = new Map()
  const lastSignature = new Map()
  const startupLogged = new Set()

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

  const asText = (value) => {
    if (typeof value === "string") return value
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }

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

  const isAssistantMessage = (properties) => {
    const role = properties?.role || properties?.info?.role || properties?.message?.role
    if (!role) return false
    return String(role).toLowerCase() === "assistant"
  }

  const looksLikeOrchestratorCheckpoint = (text) => {
    return (
      /##\s*Pipeline Checkpoint\s*\[[^\]]+\]/i.test(text) &&
      /-\s*\*\*State\*\*:/i.test(text) &&
      /-\s*\*\*Next stage\*\*:/i.test(text) &&
      /-\s*\*\*Required input artifacts\*\*:/i.test(text)
    )
  }

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

    "experimental.session.compacting": async (_input, output) => {
      if (!Array.isArray(output.context)) output.context = []
      output.context.push(
        "If a '## Pipeline Checkpoint [<id>]' block exists, preserve the newest relevant one verbatim.",
      )
    },
  }
}
