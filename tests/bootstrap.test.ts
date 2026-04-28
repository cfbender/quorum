import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { renderBootstrap } from "../src/bootstrap.js"
import type { QuorumConfig } from "../src/types.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("bootstrap", () => {
  it("renders the normal-English quorum bootstrap in auto mode", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)
    expect(text).toContain("<quorum-bootstrap>")
    expect(text).toContain("quorum-sonnet")
    expect(text).toContain("task")
    expect(text).toContain("subagents")
    expect(text).not.toMatch(forbiddenCavemanPattern)
    // moderate trigger categories
    expect(text).toContain("new feature")
    expect(text).toContain("behavior changes")
    expect(text).toContain("architecture")
    // non-trigger categories
    expect(text).toContain("obvious bug fixes")
    expect(text).toContain("Dependency-only bumps")
    // uncertainty fallback
    expect(text).toContain("If you are unsure whether a request is planning")
  })

  it("contains open-question anti-pattern rule in quorum-bootstrap block", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)!
    // Must be inside <quorum-bootstrap>...</quorum-bootstrap>
    const bootstrapBlock = text.match(/<quorum-bootstrap>([\s\S]*?)<\/quorum-bootstrap>/)?.[0] ?? ""
    expect(bootstrapBlock).toContain("clarification")
    expect(bootstrapBlock).toContain("question tool")
    expect(bootstrapBlock).not.toBe("")
  })

  it("skips bootstrap in manual mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "manual" }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("skips bootstrap in off mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "off" }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("quorum-deep block present in auto mode when deepMembers configured", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    const text = renderBootstrap(config)!
    expect(text).toContain("<quorum-deep>")
    expect(text).toContain("quorum-deep-a")
    expect(text).toContain("never invoke deep members by default")
  })

  it("quorum-deep block absent when deepMembers unset", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)!
    expect(text).not.toContain("<quorum-deep>")
  })

  it("quorum-deep block absent in manual mode even if deepMembers configured", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      triggerMode: "manual",
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("quorum-deep block absent in off mode even if deepMembers configured", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      triggerMode: "off",
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    expect(renderBootstrap(config)).toBeNull()
  })
})
