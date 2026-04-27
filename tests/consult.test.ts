import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { runQuorum } from "../src/consult.js"
import type { OpencodeClientLike, PromptResponse, QuorumConfig, QuorumModel, TextPartInput } from "../src/types.js"

type PromptCall = {
  providerID: string
  modelID: string
  system: string
  text: string
}

function makeClient(options: {
  models: QuorumModel[]
  responses: Map<string, () => Promise<PromptResponse>>
  promptCalls?: PromptCall[]
  deleted?: string[]
}): OpencodeClientLike {
  let createCount = 0
  return {
    app: {
      async log() {
        return {}
      },
    },
    session: {
      async get() {
        return { data: { id: "root" } }
      },
      async create() {
        createCount += 1
        return { data: { id: `child-${createCount}` } }
      },
      async prompt(input) {
        const textPart = input.body.parts.find((part: TextPartInput) => part.type === "text")
        options.promptCalls?.push({
          providerID: input.body.model.providerID,
          modelID: input.body.model.modelID,
          system: input.body.system,
          text: textPart?.text ?? "",
        })
        const key = `${input.body.model.providerID}/${input.body.model.modelID}`
        const handler = options.responses.get(key)
        if (!handler) throw new Error(`missing response for ${key}`)
        return handler()
      },
      async delete(input) {
        options.deleted?.push(input.path.id)
        return {}
      },
    },
  }
}

function configWith(models: QuorumModel[], override: Partial<QuorumConfig> = {}): QuorumConfig {
  return { ...DEFAULT_CONFIG, models, concurrency: models.length, timeoutMs: 100, ...override }
}

describe("runQuorum", () => {
  it("fans out to each configured model and returns a synthesis prompt", async () => {
    const models = DEFAULT_CONFIG.models.slice(0, 2)
    const promptCalls: PromptCall[] = []
    const deleted: string[] = []
    const client = makeClient({
      models,
      promptCalls,
      deleted,
      responses: new Map([
        ["openrouter/anthropic/claude-opus-4.7", async () => ({ data: { parts: [{ type: "text", text: "Opus answer" }] } })],
        ["openrouter/openai/gpt-5.4", async () => ({ data: { parts: [{ type: "text", text: "GPT answer" }] } })],
      ]),
    })

    const result = await runQuorum({
      client,
      sessionID: "root",
      topic: "quorum",
      prompt: "Design it.",
      context: "Use opencode.",
      config: configWith(models),
      abortSignal: new AbortController().signal,
    })

    expect(result.meta.aborted).toBe(false)
    expect(result.responses.map((response) => response.text)).toEqual(["Opus answer", "GPT answer"])
    expect(result.synthesisPrompt).toContain("Open questions")
    expect(promptCalls).toHaveLength(2)
    expect(promptCalls[0]?.text).toContain("Design it.")
    expect(deleted).toEqual(["child-1", "child-2"])
  })

  it("records model errors without failing the whole quorum", async () => {
    const models = DEFAULT_CONFIG.models.slice(0, 2)
    const client = makeClient({
      models,
      responses: new Map([
        ["openrouter/anthropic/claude-opus-4.7", async () => ({ data: { parts: [{ type: "text", text: "Opus answer" }] } })],
        ["openrouter/openai/gpt-5.4", async () => { throw new Error("provider failed") }],
      ]),
    })

    const result = await runQuorum({
      client,
      sessionID: "root",
      topic: "quorum",
      prompt: "Design it.",
      config: configWith(models),
      abortSignal: new AbortController().signal,
    })

    expect(result.responses[0]?.ok).toBe(true)
    expect(result.responses[1]?.ok).toBe(false)
    expect(result.responses[1]?.error).toContain("provider failed")
    expect(result.meta.droppedModels).toEqual(["gpt5"])
    expect(result.meta.aborted).toBe(true)
    expect(result.meta.abortReason).toContain("Fewer than two")
  })

  it("times out slow models", async () => {
    const models = DEFAULT_CONFIG.models.slice(0, 2)
    const client = makeClient({
      models,
      responses: new Map([
        ["openrouter/anthropic/claude-opus-4.7", async () => ({ data: { parts: [{ type: "text", text: "Opus answer" }] } })],
        ["openrouter/openai/gpt-5.4", async () => new Promise((resolve) => setTimeout(() => resolve({ data: { parts: [{ type: "text", text: "late" }] } }), 50))],
      ]),
    })

    const result = await runQuorum({
      client,
      sessionID: "root",
      topic: "quorum",
      prompt: "Design it.",
      config: configWith(models, { timeoutMs: 5 }),
      abortSignal: new AbortController().signal,
    })

    expect(result.responses[1]?.ok).toBe(false)
    expect(result.responses[1]?.error).toContain("timed out")
    expect(result.meta.droppedModels).toEqual(["gpt5"])
  })

  it("locally truncates long responses", async () => {
    const models = DEFAULT_CONFIG.models.slice(0, 2)
    const longText = "x".repeat(100)
    const client = makeClient({
      models,
      responses: new Map([
        ["openrouter/anthropic/claude-opus-4.7", async () => ({ data: { parts: [{ type: "text", text: longText }] } })],
        ["openrouter/openai/gpt-5.4", async () => ({ data: { parts: [{ type: "text", text: "short" }] } })],
      ]),
    })

    const result = await runQuorum({
      client,
      sessionID: "root",
      topic: "quorum",
      prompt: "Design it.",
      config: configWith(models, { maxTokens: 5 }),
      abortSignal: new AbortController().signal,
    })

    expect(result.responses[0]?.truncated).toBe(true)
    expect(result.responses[0]?.text).toContain("[Truncated by quorum")
  })
})
