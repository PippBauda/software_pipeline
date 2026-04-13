export const PipelineCompactionController = async ({ client }) => {
  const TARGET_CHECKPOINTS = new Set([
    "post-cognitive",
    "post-o3",
    "post-o10",
    "post-reentry",
  ])

  const rawDryRun = String(process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN || "")
  const DRY_RUN = ["1", "true", "yes", "on"].includes(rawDryRun.toLowerCase())
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

  const triggerCompaction = async (sessionID, signature) => {
    const now = Date.now()
    const lastAt = lastCompactionAt.get(sessionID) || 0

    if (inFlight.has(sessionID)) return
    if (now - lastAt < COOLDOWN_MS) return
    if (lastSignature.get(sessionID) === signature) return

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
        return
      }

      await client.session.summarize({
        path: { id: sessionID },
        body: {},
      })
      lastCompactionAt.set(sessionID, Date.now())
    } catch {
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

      const sessionID = extractSessionId(props) || extractSessionId(event)
      if (!sessionID) return
      if (!client?.session?.summarize) return

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
