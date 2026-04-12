export const PipelineCompactionController = async ({ client }) => {
  const TARGET_CHECKPOINTS = new Set([
    "post-cognitive",
    "post-o3",
    "post-o10",
    "post-reentry",
  ])

  const DRY_RUN = ["1", "true", "yes", "on"].includes(
    String(process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN || "").toLowerCase(),
  )
  const COOLDOWN_MS = Number(process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS || 120000)
  const inFlight = new Set()
  const lastCompactionAt = new Map()
  const lastSignature = new Map()

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

  return {
    event: async ({ event }) => {
      if (!event || event.type === "session.compacted") return

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
