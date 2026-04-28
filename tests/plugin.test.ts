import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { createHooks } from "../src/plugin.js"
import type { LegacyQuorumConfig, OpencodeClientLike } from "../src/types.js"

const LEGACY_DEFAULT: LegacyQuorumConfig = {
  ...DEFAULT_CONFIG,
  models: [
    { providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", label: "opus" },
    { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "gemini" },
  ],
  concurrency: 3,
  timeoutMs: 120_000,
  maxTokens: 4_000,
  reasoningEffort: "high",
}

function fakeClient(): OpencodeClientLike {
  return {
    session: {
      async get() {
        return { data: { id: "root" } }
      },
      async create() {
        return { data: { id: "child" } }
      },
      async prompt() {
        return { data: { parts: [{ type: "text", text: "answer" }] } }
      },
      async delete() {
        return {}
      },
    },
  }
}

describe("plugin hooks", () => {
  it("registers tool and system bootstrap in auto mode", async () => {
    const hooks = createHooks(fakeClient(), LEGACY_DEFAULT)
    expect(hooks.tool?.quorum_consult).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } }, output)
    expect(output.system.join("\n")).toContain("quorum_consult")
  })

  it("registers only the tool in manual mode", () => {
    const config: LegacyQuorumConfig = { ...LEGACY_DEFAULT, triggerMode: "manual" }
    const hooks = createHooks(fakeClient(), config)
    expect(hooks.tool?.quorum_consult).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()
  })

  it("registers no hooks in off mode", () => {
    const config: LegacyQuorumConfig = { ...LEGACY_DEFAULT, triggerMode: "off" }
    expect(createHooks(fakeClient(), config)).toEqual({})
  })
})
