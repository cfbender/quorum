import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG, parseConfig, resolveConfigPath } from "../src/config.js"

describe("config", () => {
  it("provides the approved default quorum", () => {
    expect(DEFAULT_CONFIG.models).toEqual([
      { providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", label: "opus" },
      { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
      { providerID: "openrouter", modelID: "google/gemini-3-pro", label: "gemini" },
    ])
    expect(DEFAULT_CONFIG.concurrency).toBe(3)
    expect(DEFAULT_CONFIG.timeoutMs).toBe(120_000)
    expect(DEFAULT_CONFIG.maxTokens).toBe(4_000)
    expect(DEFAULT_CONFIG.reasoningEffort).toBe("high")
    expect(DEFAULT_CONFIG.triggerMode).toBe("auto")
    expect(DEFAULT_CONFIG.specDir).toBe("docs/quorum/specs")
  })

  it("parses a complete config object", () => {
    const config = parseConfig({
      models: [{ providerID: "anthropic", modelID: "claude-sonnet-4-6", label: "sonnet" }],
      concurrency: 1,
      timeoutMs: 5_000,
      maxTokens: 500,
      reasoningEffort: "medium",
      triggerMode: "manual",
      specDir: "docs/custom/specs",
    })

    expect(config).toEqual({
      models: [{ providerID: "anthropic", modelID: "claude-sonnet-4-6", label: "sonnet" }],
      concurrency: 1,
      timeoutMs: 5_000,
      maxTokens: 500,
      reasoningEffort: "medium",
      triggerMode: "manual",
      specDir: "docs/custom/specs",
    })
  })

  it("falls back to defaults for invalid scalar fields", () => {
    const config = parseConfig({
      models: [],
      concurrency: -10,
      timeoutMs: 0,
      maxTokens: "large",
      reasoningEffort: "maximum",
      triggerMode: "always",
      specDir: "",
    })

    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it("filters invalid models and keeps valid models", () => {
    const config = parseConfig({
      models: [
        { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
        { providerID: "", modelID: "bad", label: "bad" },
        { providerID: "openrouter", modelID: "", label: "bad" },
      ],
    })

    expect(config.models).toEqual([
      { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    ])
  })

  it("resolves quorum.json under the provided config dir", () => {
    expect(resolveConfigPath("/tmp/opencode-config")).toBe("/tmp/opencode-config/quorum.json")
  })
})
