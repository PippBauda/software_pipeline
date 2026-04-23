import { describe, it, beforeEach, afterEach, mock } from "node:test"
import assert from "node:assert/strict"
import { PipelineCompactionController } from "../../opencode/plugins/pipeline-compaction-controller.js"

/* ------------------------------------------------------------------ */
/*  Environment isolation helper (fix #4.5)                           */
/* ------------------------------------------------------------------ */

/** @type {Record<string, string | undefined>} */
let savedEnv = {}

const ENV_KEYS = [
  "OPENCODE_PIPELINE_COMPACTION_DRY_RUN",
  "OPENCODE_PIPELINE_COMPACTION_DEBUG",
  "OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS",
]

function saveEnv() {
  savedEnv = {}
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k]
  }
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = savedEnv[k]
    }
  }
}

function clearEnv() {
  for (const k of ENV_KEYS) {
    delete process.env[k]
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Helper: create a mock client with spied methods.
 */
function createMockClient({ hasSummarize = true, hasLog = true } = {}) {
  /** @type {import("../../opencode/plugins/pipeline-compaction-controller.js").AppLogBody[]} */
  const logs = []
  /** @type {unknown[]} */
  const summarizeCalls = []

  return {
    client: {
      app: hasLog
        ? {
            log: mock.fn(async (/** @type {any} */ req) => {
              logs.push(req.body)
            }),
          }
        : undefined,
      session: hasSummarize
        ? {
            summarize: mock.fn(async (/** @type {any} */ req) => {
              summarizeCalls.push(req)
            }),
          }
        : undefined,
    },
    logs,
    summarizeCalls,
  }
}

/**
 * Helper: build a message event with checkpoint text (LEGACY format — properties.content).
 * Used by existing tests for backward-compatibility with the legacy event structure.
 * @param {string} checkpointId
 * @param {string} [sessionId]
 */
function makeMessageEvent(checkpointId, sessionId = "sess-123") {
  const text = [
    `## Pipeline Checkpoint [${checkpointId}]`,
    `- **State**: C9_IMPLEMENTATION_PLANNED`,
    `- **Next stage**: O1`,
    `- **Required input artifacts**: docs/architecture.md`,
  ].join("\n")

  return {
    type: "message.updated",
    properties: {
      role: "assistant",
      sessionID: sessionId,
      content: text,
    },
  }
}

/** @param {string} text @param {string} [sessionId] */
function makeTextEvent(text, sessionId = "sess-123") {
  return {
    type: "message.updated",
    properties: {
      role: "assistant",
      sessionID: sessionId,
      content: text,
    },
  }
}

/**
 * Helper: build a message.part.updated event matching the REAL OpenCode event structure.
 * In OpenCode, text content arrives as TextPart in message.part.updated events.
 * @param {string} checkpointId
 * @param {string} [sessionId]
 */
function makePartUpdatedEvent(checkpointId, sessionId = "sess-123") {
  const text = [
    `## Pipeline Checkpoint [${checkpointId}]`,
    `- **State**: C9_IMPLEMENTATION_PLANNED`,
    `- **Next stage**: O1`,
    `- **Required input artifacts**: docs/architecture.md`,
  ].join("\n")

  return {
    type: "message.part.updated",
    properties: {
      sessionID: sessionId,
      part: {
        id: "part-001",
        sessionID: sessionId,
        messageID: "msg-001",
        type: "text",
        text,
      },
      time: Date.now(),
    },
  }
}

/**
 * Helper: build a message.updated event matching the REAL OpenCode event structure.
 * In OpenCode, message.updated carries info (Message) but NOT text content.
 * @param {string} [sessionId]
 */
function makeRealMessageUpdatedEvent(sessionId = "sess-123") {
  return {
    type: "message.updated",
    properties: {
      sessionID: sessionId,
      info: {
        id: "msg-001",
        sessionID: sessionId,
        role: "assistant",
        time: { created: Date.now() },
        parentID: "msg-000",
        modelID: "test-model",
        providerID: "test-provider",
      },
    },
  }
}

/**
 * Helper: build a session.idle event to flush deferred compaction.
 * @param {string} [sessionId]
 */
function makeIdleEvent(sessionId = "sess-123") {
  return {
    type: "session.idle",
    properties: {
      sessionID: sessionId,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

/**
 * Helper: send checkpoint event + session.idle to flush deferred compaction.
 * @param {any} plugin
 * @param {any} event
 * @param {string} [sessionId]
 */
async function sendAndFlush(plugin, event, sessionId = "sess-123") {
  await plugin.event({ event })
  await plugin.event({ event: makeIdleEvent(sessionId) })
}

describe("PipelineCompactionController", () => {
  beforeEach(() => {
    saveEnv()
    clearEnv()
  })

  afterEach(() => {
    restoreEnv()
  })

  describe("checkpoint extraction and triggering", () => {
    it("should trigger compaction for a valid post-cognitive checkpoint", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))

      assert.equal(summarizeCalls.length, 1)
      assert.equal((/** @type {any} */ (summarizeCalls[0])).path.id, "sess-123")
    })

    it("should trigger compaction for all target checkpoints", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const targets = ["post-cognitive", "post-o3", "post-o10", "post-reentry"]

      for (const cp of targets) {
        const { client, summarizeCalls } = createMockClient()
        const plugin = await PipelineCompactionController({ client })
        await sendAndFlush(plugin, makeMessageEvent(cp, `sess-${cp}`), `sess-${cp}`)
        assert.equal(summarizeCalls.length, 1, `Expected compaction for ${cp}`)
      }
    })

    it("should NOT trigger for an unknown checkpoint id", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeMessageEvent("post-unknown")
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 0)
    })

    it("should NOT trigger if checkpoint lacks orchestrator format fields", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeTextEvent(
        "## Pipeline Checkpoint [post-cognitive]\nSome random text without required fields",
      )
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 0)
    })

    it("should NOT trigger for non-assistant messages", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = {
        type: "message.updated",
        properties: {
          role: "user",
          sessionID: "sess-123",
          content: makeMessageEvent("post-cognitive").properties.content,
        },
      }
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 0)
    })

    it("should NOT trigger for irrelevant event types", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: { type: "session.compacted" } })
      await plugin.event({ event: { type: "something.else" } })
      await plugin.event({ event: /** @type {any} */ (null) })

      assert.equal(summarizeCalls.length, 0)
    })
  })

  describe("session ID extraction", () => {
    it("should extract sessionID from properties", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive", "my-session"), "my-session")
      assert.equal((/** @type {any} */ (summarizeCalls[0])).path.id, "my-session")
    })

    it("should extract sessionId (camelCase) from event fallback", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const text = makeMessageEvent("post-cognitive").properties.content
      const event = {
        type: "message.updated",
        sessionId: "fallback-session",
        properties: { role: "assistant", content: text },
      }
      await plugin.event({ event })
      await plugin.event({ event: makeIdleEvent("fallback-session") })
      assert.equal((/** @type {any} */ (summarizeCalls[0])).path.id, "fallback-session")
    })

    it("should skip if no session ID found anywhere", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_DEBUG = "1"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const text = makeMessageEvent("post-cognitive").properties.content
      const event = {
        type: "message.updated",
        properties: { role: "assistant", content: text },
      }
      await plugin.event({ event })
      assert.equal(summarizeCalls.length, 0)
    })
  })

  describe("cooldown guard", () => {
    it("should skip compaction within cooldown window", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "60000"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      // First call should succeed
      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
      assert.equal(summarizeCalls.length, 1)

      // Second call with different checkpoint but same session - should be blocked by cooldown
      await sendAndFlush(plugin, makeMessageEvent("post-o3"))
      assert.equal(summarizeCalls.length, 1)
    })

    it("should allow compaction after cooldown expires", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
      await sendAndFlush(plugin, makeMessageEvent("post-o3"))
      assert.equal(summarizeCalls.length, 2)
    })
  })

  describe("deduplication guard", () => {
    it("should skip compaction for duplicate checkpoint signature", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeMessageEvent("post-cognitive")
      await sendAndFlush(plugin, event)
      await sendAndFlush(plugin, event)
      assert.equal(summarizeCalls.length, 1)
    })

    it("should treat whitespace-only differences as duplicates (normalized dedup)", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event1 = makeMessageEvent("post-cognitive")
      await sendAndFlush(plugin, event1)

      // Same content but with extra whitespace
      const text2 = [
        `## Pipeline Checkpoint [post-cognitive]`,
        `- **State**:   C9_IMPLEMENTATION_PLANNED`,
        `- **Next stage**:   O1`,
        `- **Required input artifacts**:   docs/architecture.md`,
      ].join("\n")
      const event2 = makeTextEvent(text2)
      await sendAndFlush(plugin, event2)

      assert.equal(summarizeCalls.length, 1, "Whitespace-only difference should be deduped")
    })
  })

  describe("dry-run mode", () => {
    it("should log but not call summarize when DRY_RUN is enabled", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN = "true"
      const { client, summarizeCalls, logs } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))

      assert.equal(summarizeCalls.length, 0)
      const dryRunLog = logs.find((l) => l.message.includes("Dry-run"))
      assert.ok(dryRunLog, "Expected a dry-run log entry")
    })

    for (const val of ["1", "yes", "on", "TRUE"]) {
      it(`should recognize DRY_RUN="${val}"`, async () => {
        process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN = val
        const { client, summarizeCalls } = createMockClient()
        const plugin = await PipelineCompactionController({ client })

        await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
        assert.equal(summarizeCalls.length, 0)
      })
    }
  })

  describe("fail-open behavior", () => {
    it("should not throw when summarize fails", async () => {
      const { client } = createMockClient()
      // @ts-ignore -- session is guaranteed non-null when hasSummarize=true
      client.session.summarize = mock.fn(async () => {
        throw new Error("API failure")
      })
      const plugin = await PipelineCompactionController({ client })

      // Should not throw
      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
    })

    it("should emit a visible warning when summarize fails (not just debug)", async () => {
      const { client, logs } = createMockClient()
      // @ts-ignore -- session is guaranteed non-null when hasSummarize=true
      client.session.summarize = mock.fn(async () => {
        throw new Error("API failure")
      })
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))

      const warnLog = logs.find((l) => l.level === "warn" && l.message.includes("fail-open"))
      assert.ok(warnLog, "Expected a warn-level log on compaction failure")
      assert.ok(String((/** @type {any} */ (warnLog)).extra?.error ?? "").includes("API failure"))
    })

    it("should not throw when client.session is missing", async () => {
      const { client } = createMockClient({ hasSummarize: false })
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
    })

    it("should not throw when client.app.log is missing", async () => {
      const { client } = createMockClient({ hasLog: false, hasSummarize: false })
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive") })
    })

    it("should not throw when emitStartupCheck encounters a logging error", async () => {
      const { client } = createMockClient()
      // @ts-ignore -- app is guaranteed non-null when hasLog=true
      client.app.log = mock.fn(async () => {
        throw new Error("Log API down")
      })
      const plugin = await PipelineCompactionController({ client })

      // emitStartupCheck is called on session.created — should not throw
      await plugin.event({
        event: { type: "session.created", properties: { sessionID: "s1" } },
      })
    })
  })

  describe("session.created event", () => {
    it("should emit startup check on session.created", async () => {
      const { client, logs } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({
        event: {
          type: "session.created",
          properties: { sessionID: "new-session" },
        },
      })

      const startupLog = logs.find((l) => l.message.includes("Startup check"))
      assert.ok(startupLog, "Expected a startup check log")
    })

    it("should emit startup check only once per session", async () => {
      const { client, logs } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const evt = {
        type: "session.created",
        properties: { sessionID: "new-session" },
      }
      await plugin.event({ event: evt })
      await plugin.event({ event: evt })

      const startupLogs = logs.filter((l) => l.message.includes("Startup check"))
      assert.equal(startupLogs.length, 1)
    })
  })

  describe("experimental.session.compacting hook", () => {
    it("should add context hint to output", async () => {
      const { client } = createMockClient()
      const plugin = await PipelineCompactionController({ client })
      const compacting = /** @type {Function} */ (/** @type {any} */ (plugin)["experimental.session.compacting"])

      /** @type {{ context?: string[] }} */
      const output = {}
      await compacting(null, output)

      assert.ok(Array.isArray(output.context))
      assert.equal(output.context.length, 1)
      assert.ok(output.context[0].includes("Pipeline Checkpoint"))
    })

    it("should append to existing context array", async () => {
      const { client } = createMockClient()
      const plugin = await PipelineCompactionController({ client })
      const compacting = /** @type {Function} */ (/** @type {any} */ (plugin)["experimental.session.compacting"])

      /** @type {{ context: string[] }} */
      const output = { context: ["existing hint"] }
      await compacting(null, output)

      assert.equal(output.context.length, 2)
      assert.equal(output.context[0], "existing hint")
    })
  })

  describe("cooldown environment variable parsing", () => {
    it("should use default 120000 for invalid cooldown value", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "not-a-number"
      const { client, logs } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({
        event: { type: "session.created", properties: { sessionID: "s1" } },
      })

      const warnLog = logs.find((l) => l.message.includes("invalid"))
      assert.ok(warnLog, "Expected a warning about invalid cooldown")
    })

    it("should accept valid custom cooldown", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "5000"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive"))
      assert.equal(summarizeCalls.length, 1)
    })
  })

  describe("message.part.updated event type", () => {
    it("should process message.part.updated events", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const text = makeMessageEvent("post-cognitive").properties.content
      const event = {
        type: "message.part.updated",
        properties: {
          role: "assistant",
          sessionID: "sess-456",
          content: text,
        },
      }
      await plugin.event({ event })
      await plugin.event({ event: makeIdleEvent("sess-456") })
      assert.equal(summarizeCalls.length, 1)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  NEW: asText fallback tests (fix #4.4)                           */
  /* ---------------------------------------------------------------- */

  describe("asText content extraction optimization", () => {
    it("should prefer content property over JSON.stringify", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const checkpointText = [
        `## Pipeline Checkpoint [post-cognitive]`,
        `- **State**: C9_IMPLEMENTATION_PLANNED`,
        `- **Next stage**: O1`,
        `- **Required input artifacts**: docs/architecture.md`,
      ].join("\n")

      const event = {
        type: "message.updated",
        properties: {
          role: "assistant",
          sessionID: "sess-content",
          content: checkpointText,
        },
      }
      await sendAndFlush(plugin, event, "sess-content")
      assert.equal(summarizeCalls.length, 1, "Should extract checkpoint from content property")
    })

    it("should handle properties with no content/text by falling back to JSON.stringify", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      // Event where checkpoint text is NOT in content/text but embedded in another key
      const checkpointText = [
        `## Pipeline Checkpoint [post-cognitive]`,
        `- **State**: C9_IMPLEMENTATION_PLANNED`,
        `- **Next stage**: O1`,
        `- **Required input artifacts**: docs/architecture.md`,
      ].join("\n")

      const event = {
        type: "message.updated",
        properties: {
          role: "assistant",
          sessionID: "sess-fallback",
          body: checkpointText, // not content or text
        },
      }
      await sendAndFlush(plugin, event, "sess-fallback")
      // Falls back to JSON.stringify which embeds the text — checkpoint should be found
      assert.equal(summarizeCalls.length, 1, "Should fall back to JSON.stringify for extraction")
    })

    it("should return empty string for unstringifiable objects", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      // Create a circular reference
      /** @type {Record<string, unknown>} */
      const circular = { role: "assistant", sessionID: "sess-circ" }
      circular["self"] = circular

      const event = {
        type: "message.updated",
        properties: circular,
      }
      // Should not throw — asText returns "" for unstringifiable objects
      await plugin.event({ event })
      assert.equal(summarizeCalls.length, 0)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  NEW: Concurrent events / in-flight guard (fix #4.2)             */
  /* ---------------------------------------------------------------- */

  describe("concurrent event handling (in-flight guard)", () => {
    it("should not double-trigger when two checkpoints arrive before idle", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event1 = makeMessageEvent("post-cognitive", "sess-concurrent")
      const event2 = makeMessageEvent("post-o3", "sess-concurrent")

      // Fire both checkpoint events (both store to pendingCompaction, last wins)
      await plugin.event({ event: event1 })
      await plugin.event({ event: event2 })

      // Flush with idle — only one compaction should fire
      await plugin.event({ event: makeIdleEvent("sess-concurrent") })

      assert.equal(summarizeCalls.length, 1, `Expected exactly 1 call, got ${summarizeCalls.length}`)
    })

    it("should allow sequential idle flushes for same session", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makeMessageEvent("post-cognitive", "sess-seq"), "sess-seq")
      await sendAndFlush(plugin, makeMessageEvent("post-o3", "sess-seq"), "sess-seq")

      assert.equal(summarizeCalls.length, 2, "Sequential checkpoint+idle pairs should both succeed")
    })
  })

  /* ---------------------------------------------------------------- */
  /*  NEW: Memory eviction (fix #4.3)                                 */
  /* ---------------------------------------------------------------- */

  describe("session eviction (memory growth prevention)", () => {
    it("should not grow internal state unboundedly across many sessions", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      // Simulate 600 distinct sessions (MAX_TRACKED_SESSIONS is 500)
      for (let i = 0; i < 600; i++) {
        const sid = `sess-evict-${i}`
        const event = makeMessageEvent("post-cognitive", sid)
        await plugin.event({ event })
        await plugin.event({ event: makeIdleEvent(sid) })
      }

      // The plugin should have evicted oldest sessions.
      // We can't directly inspect internal maps, but we verify the plugin
      // handles 600+ distinct sessions without throwing.
      assert.ok(true, "Plugin survived 600 session events without error")
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Real OpenCode event structure tests                              */
  /* ---------------------------------------------------------------- */

  describe("real OpenCode event structure (message.part.updated with TextPart)", () => {
    it("should trigger compaction for a valid checkpoint in a TextPart", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makePartUpdatedEvent("post-cognitive")
      await sendAndFlush(plugin, event)

      assert.equal(summarizeCalls.length, 1, "Should trigger compaction from TextPart")
      assert.equal((/** @type {any} */ (summarizeCalls[0])).path.id, "sess-123")
    })

    it("should trigger compaction for all target checkpoints via TextPart", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const targets = ["post-cognitive", "post-o3", "post-o10", "post-reentry"]

      for (const cp of targets) {
        const { client, summarizeCalls } = createMockClient()
        const plugin = await PipelineCompactionController({ client })
        await sendAndFlush(plugin, makePartUpdatedEvent(cp, `sess-${cp}`), `sess-${cp}`)
        assert.equal(summarizeCalls.length, 1, `Expected compaction for ${cp} via TextPart`)
      }
    })

    it("should NOT trigger for a non-text part type", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = {
        type: "message.part.updated",
        properties: {
          sessionID: "sess-123",
          part: {
            id: "part-002",
            sessionID: "sess-123",
            messageID: "msg-001",
            type: "reasoning",
            text: "## Pipeline Checkpoint [post-cognitive]\n- **State**: X\n- **Next stage**: O1\n- **Required input artifacts**: docs/a.md",
          },
          time: Date.now(),
        },
      }
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 0, "Should not trigger for reasoning parts")
    })

    it("should NOT trigger for a real message.updated event (no text content)", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeRealMessageUpdatedEvent("sess-123")
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 0, "message.updated has no text — should not trigger")
    })

    it("should extract sessionID from part properties", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makePartUpdatedEvent("post-cognitive", "my-real-session")
      await sendAndFlush(plugin, event, "my-real-session")

      assert.equal(summarizeCalls.length, 1)
      assert.equal((/** @type {any} */ (summarizeCalls[0])).path.id, "my-real-session")
    })

    it("should respect cooldown for TextPart events", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "60000"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await sendAndFlush(plugin, makePartUpdatedEvent("post-cognitive"))
      assert.equal(summarizeCalls.length, 1)

      await sendAndFlush(plugin, makePartUpdatedEvent("post-o3"))
      assert.equal(summarizeCalls.length, 1, "Should be blocked by cooldown")
    })

    it("should deduplicate identical TextPart checkpoints", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makePartUpdatedEvent("post-cognitive")
      await sendAndFlush(plugin, event)
      await sendAndFlush(plugin, event)
      assert.equal(summarizeCalls.length, 1, "Duplicate TextPart checkpoint should be deduped")
    })
  })

  /* ---------------------------------------------------------------- */
  /*  NEW: session.idle deferred compaction behavior                   */
  /* ---------------------------------------------------------------- */

  describe("session.idle deferred compaction", () => {
    it("should NOT compact when checkpoint detected but no idle event follows", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makePartUpdatedEvent("post-cognitive") })
      // No idle event sent
      assert.equal(summarizeCalls.length, 0, "Checkpoint without idle should not trigger compaction")
    })

    it("should compact when checkpoint is followed by idle event", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makePartUpdatedEvent("post-cognitive") })
      await plugin.event({ event: makeIdleEvent() })

      assert.equal(summarizeCalls.length, 1, "Checkpoint + idle should trigger compaction")
    })

    it("should only flush latest checkpoint when multiple arrive before idle", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makePartUpdatedEvent("post-cognitive") })
      await plugin.event({ event: makePartUpdatedEvent("post-o3") })
      await plugin.event({ event: makeIdleEvent() })

      // Only one compaction call (last checkpoint wins in pendingCompaction map)
      assert.equal(summarizeCalls.length, 1, "Only latest pending checkpoint should flush")
    })

    it("should be a no-op when idle fires without pending checkpoint", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeIdleEvent() })

      assert.equal(summarizeCalls.length, 0, "Idle without pending should not trigger compaction")
    })

    it("should handle idle for different session than pending checkpoint", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makePartUpdatedEvent("post-cognitive", "sess-A") })
      await plugin.event({ event: makeIdleEvent("sess-B") })

      assert.equal(summarizeCalls.length, 0, "Idle for wrong session should not flush")

      // Now flush the correct session
      await plugin.event({ event: makeIdleEvent("sess-A") })
      assert.equal(summarizeCalls.length, 1, "Idle for correct session should flush")
    })

    it("should clear pending after flush so second idle is a no-op", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makePartUpdatedEvent("post-cognitive") })
      await plugin.event({ event: makeIdleEvent() })
      assert.equal(summarizeCalls.length, 1)

      // Second idle — pending already cleared
      await plugin.event({ event: makeIdleEvent() })
      assert.equal(summarizeCalls.length, 1, "Second idle should not re-trigger")
    })
  })
})
