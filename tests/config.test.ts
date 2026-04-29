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
    const { config, issues } = parseConfig({
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
    expect(issues).toEqual([])
  })

  it("clean config produces empty issues array", () => {
    const { issues } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(issues).toEqual([])
  })

  it("falls back to defaults for invalid members (missing providerID)", () => {
    const { config, issues } = parseConfig({
      members: [{ name: "quorum-a", modelID: "x", label: "x" }],
      triggerMode: "always",
      specDir: "",
    })

    expect(config).toEqual(DEFAULT_CONFIG)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((s) => s.includes("providerID"))).toBe(true)
  })

  it("invalid member at index produces issue string mentioning the index", () => {
    const { issues } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "", providerID: "openrouter", modelID: "x", label: "x" },
      ],
    })
    expect(issues.some((s) => s.includes("index 1"))).toBe(true)
  })

  it("requires unique member names and at least two valid members", () => {
    const { config, issues } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "a" },
        { name: "quorum-a", providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "b" },
      ],
    })

    expect(config).toEqual(DEFAULT_CONFIG)
    expect(issues.length).toBeGreaterThan(0)
  })

  it("member name with dots is accepted", () => {
    const { config, issues } = parseConfig({
      members: [
        { name: "quorum-sonnet-4.6", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
        { name: "quorum-glm-5.1", providerID: "openrouter", modelID: "z-ai/glm-5.1", label: "glm" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(issues).toEqual([])
    expect(config.members[0]?.name).toBe("quorum-sonnet-4.6")
    expect(config.members[1]?.name).toBe("quorum-glm-5.1")
  })

  it("member name with underscores is accepted", () => {
    const { config, issues } = parseConfig({
      members: [
        { name: "quorum_foo", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "foo" },
        { name: "quorum_bar", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "bar" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(issues).toEqual([])
    expect(config.members[0]?.name).toBe("quorum_foo")
    expect(config.members[1]?.name).toBe("quorum_bar")
  })

  it("resolves quorum.json under the provided config dir", () => {
    expect(resolveConfigPath("/tmp/opencode-config")).toBe("/tmp/opencode-config/quorum.json")
  })

  // deepMembers tests

  it("deepMembers unset → not present on parsed config", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toBeUndefined()
  })

  it("deepMembers empty array → treated as unset", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toBeUndefined()
  })

  it("deepMembers valid single entry → parsed correctly", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toEqual([
      { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
    ])
  })

  it("deepMembers valid multiple entries → all parsed", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
        { name: "quorum-deep-b", providerID: "openrouter", modelID: "openai/o3", label: "o3" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toHaveLength(2)
    expect(config.deepMembers?.[0]?.name).toBe("quorum-deep-a")
    expect(config.deepMembers?.[1]?.name).toBe("quorum-deep-b")
  })

  it("deepMembers within-array duplicate names → dropped to undefined", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "openai/o3", label: "o3" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toBeUndefined()
  })

  it("deepMembers cross-array name collision with members → dropped to undefined", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toBeUndefined()
  })

  it("deepMembers malformed entry (missing required field) → dropped with issue recorded", () => {
    const { config, issues } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-deep-a", providerID: "", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers).toBeUndefined()
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((s) => s.includes("providerID"))).toBe(true)
  })

  it("malformed deepMembers does not poison base config", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
      triggerMode: "manual",
      specDir: "docs/custom",
    })
    expect(config.members).toHaveLength(2)
    expect(config.triggerMode).toBe("manual")
    expect(config.specDir).toBe("docs/custom")
    expect(config.deepMembers).toBeUndefined()
  })

  it("per-member reasoningEffort parsed and preserved", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt", reasoningEffort: "medium" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.members[0]?.reasoningEffort).toBe("medium")
    expect(config.members[1]?.reasoningEffort).toBeUndefined()
  })

  it("per-member reasoningEffort on deepMembers parsed and preserved", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus", reasoningEffort: "xhigh" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.deepMembers?.[0]?.reasoningEffort).toBe("xhigh")
  })

  it("invalid reasoningEffort dropped — member still accepted", () => {
    const { config } = parseConfig({
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt", reasoningEffort: "ultra" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
      triggerMode: "auto",
      specDir: "docs/quorum/specs",
    })
    expect(config.members[0]?.name).toBe("quorum-a")
    expect(config.members[0]?.reasoningEffort).toBeUndefined()
  })
})
