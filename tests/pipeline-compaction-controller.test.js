import { describe, it, beforeEach, mock } from "node:test"
import assert from "node:assert/strict"
import { PipelineCompactionController } from "../opencode/plugins/pipeline-compaction-controller.js"

/**
 * Helper: create a mock client with spied methods.
 */
function createMockClient({ hasSummarize = true, hasLog = true } = {}) {
  const logs = []
  const summarizeCalls = []

  return {
    client: {
      app: hasLog
        ? {
            log: mock.fn(async (req) => {
              logs.push(req.body)
            }),
          }
        : undefined,
      session: hasSummarize
        ? {
            summarize: mock.fn(async (req) => {
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
 * Helper: build a message event with checkpoint text.
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

// --- extractCheckpoint tests (indirectly via event handler) ---

describe("PipelineCompactionController", () => {
  beforeEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (k.startsWith("OPENCODE_PIPELINE_COMPACTION_")) delete process.env[k]
    })
  })

  describe("checkpoint extraction and triggering", () => {
    it("should trigger compaction for a valid post-cognitive checkpoint", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeMessageEvent("post-cognitive")
      await plugin.event({ event })

      assert.equal(summarizeCalls.length, 1)
      assert.equal(summarizeCalls[0].path.id, "sess-123")
    })

    it("should trigger compaction for all target checkpoints", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const targets = ["post-cognitive", "post-o3", "post-o10", "post-reentry"]

      for (const cp of targets) {
        const { client, summarizeCalls } = createMockClient()
        const plugin = await PipelineCompactionController({ client })
        await plugin.event({ event: makeMessageEvent(cp, `sess-${cp}`) })
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
      await plugin.event({ event: null })

      assert.equal(summarizeCalls.length, 0)
    })
  })

  describe("session ID extraction", () => {
    it("should extract sessionID from properties", async () => {
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive", "my-session") })
      assert.equal(summarizeCalls[0].path.id, "my-session")
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
      assert.equal(summarizeCalls[0].path.id, "fallback-session")
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
      await plugin.event({ event: makeMessageEvent("post-cognitive") })
      assert.equal(summarizeCalls.length, 1)

      // Second call with different checkpoint but same session - should be blocked by cooldown
      await plugin.event({ event: makeMessageEvent("post-o3") })
      assert.equal(summarizeCalls.length, 1)
    })

    it("should allow compaction after cooldown expires", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive") })
      await plugin.event({ event: makeMessageEvent("post-o3") })
      assert.equal(summarizeCalls.length, 2)
    })
  })

  describe("deduplication guard", () => {
    it("should skip compaction for duplicate checkpoint signature", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS = "0"
      const { client, summarizeCalls } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const event = makeMessageEvent("post-cognitive")
      await plugin.event({ event })
      await plugin.event({ event })
      assert.equal(summarizeCalls.length, 1)
    })
  })

  describe("dry-run mode", () => {
    it("should log but not call summarize when DRY_RUN is enabled", async () => {
      process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN = "true"
      const { client, summarizeCalls, logs } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive") })

      assert.equal(summarizeCalls.length, 0)
      const dryRunLog = logs.find((l) => l.message.includes("Dry-run"))
      assert.ok(dryRunLog, "Expected a dry-run log entry")
    })

    for (const val of ["1", "yes", "on", "TRUE"]) {
      it(`should recognize DRY_RUN="${val}"`, async () => {
        process.env.OPENCODE_PIPELINE_COMPACTION_DRY_RUN = val
        const { client, summarizeCalls } = createMockClient()
        const plugin = await PipelineCompactionController({ client })

        await plugin.event({ event: makeMessageEvent("post-cognitive") })
        assert.equal(summarizeCalls.length, 0)
      })
    }
  })

  describe("fail-open behavior", () => {
    it("should not throw when summarize fails", async () => {
      const { client } = createMockClient()
      client.session.summarize = mock.fn(async () => {
        throw new Error("API failure")
      })
      const plugin = await PipelineCompactionController({ client })

      // Should not throw
      await plugin.event({ event: makeMessageEvent("post-cognitive") })
    })

    it("should not throw when client.session is missing", async () => {
      const { client } = createMockClient({ hasSummarize: false })
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive") })
    })

    it("should not throw when client.app.log is missing", async () => {
      const { client } = createMockClient({ hasLog: false, hasSummarize: false })
      const plugin = await PipelineCompactionController({ client })

      await plugin.event({ event: makeMessageEvent("post-cognitive") })
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

      const output = {}
      await plugin["experimental.session.compacting"](null, output)

      assert.ok(Array.isArray(output.context))
      assert.equal(output.context.length, 1)
      assert.ok(output.context[0].includes("Pipeline Checkpoint"))
    })

    it("should append to existing context array", async () => {
      const { client } = createMockClient()
      const plugin = await PipelineCompactionController({ client })

      const output = { context: ["existing hint"] }
      await plugin["experimental.session.compacting"](null, output)

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

      await plugin.event({ event: makeMessageEvent("post-cognitive") })
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
      assert.equal(summarizeCalls.length, 1)
    })
  })
})
