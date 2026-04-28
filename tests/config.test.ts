import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG, parseConfig, resolveConfigPath } from "../src/config.js"

describe("config", () => {
  it("provides the v0.2 default quorum members", () => {
    expect(DEFAULT_CONFIG.members).toEqual([
      { name: "quorum-sonnet", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      { name: "quorum-gpt5", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
      { name: "quorum-gemini", providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "gemini" },
    ])
    expect(DEFAULT_CONFIG.triggerMode).toBe("auto")
    expect(DEFAULT_CONFIG.specDir).toBe("docs/quorum/specs")
  })

  it("parses a complete v0.2 config object", () => {
    const config = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "manual",
      specDir: "docs/custom/specs",
    })

    expect(config).toEqual({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "manual",
      specDir: "docs/custom/specs",
    })
  })

  it("falls back to defaults for invalid members", () => {
    const config = parseConfig({
      members: [{ name: "Bad Name", providerID: "openrouter", modelID: "x", label: "x" }],
      triggerMode: "always",
      specDir: "",
    })

    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it("requires unique member names and at least two valid members", () => {
    const duplicate = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "a" },
        { name: "quorum-a", providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "b" },
      ],
    })

    expect(duplicate).toEqual(DEFAULT_CONFIG)
  })

  it("resolves quorum.json under the provided config dir", () => {
    expect(resolveConfigPath("/tmp/opencode-config")).toBe("/tmp/opencode-config/quorum.json")
  })
})
