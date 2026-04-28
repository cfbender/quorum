import { describe, expect, it } from "vitest"
import { DEEP_MEMBER_SYSTEM_PROMPT, MEMBER_SYSTEM_PROMPT } from "../src/prompts.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("prompts", () => {
  it("exports a normal-English member system prompt", () => {
    expect(MEMBER_SYSTEM_PROMPT).toContain("You are one member of a quorum")
    expect(MEMBER_SYSTEM_PROMPT).toContain("planning question")
    expect(MEMBER_SYSTEM_PROMPT).toContain("Surface assumptions")
    expect(MEMBER_SYSTEM_PROMPT).toContain("Do not call tools")
    expect(MEMBER_SYSTEM_PROMPT).not.toMatch(forbiddenCavemanPattern)
  })

  it("exports DEEP_MEMBER_SYSTEM_PROMPT", () => {
    expect(typeof DEEP_MEMBER_SYSTEM_PROMPT).toBe("string")
    expect(DEEP_MEMBER_SYSTEM_PROMPT.length).toBeGreaterThan(0)
  })

  it("DEEP_MEMBER_SYSTEM_PROMPT emphasizes thorough critical review", () => {
    expect(DEEP_MEMBER_SYSTEM_PROMPT).toContain("deep-review member")
    expect(DEEP_MEMBER_SYSTEM_PROMPT).toContain("challenge")
    expect(DEEP_MEMBER_SYSTEM_PROMPT).toContain("assumptions")
    expect(DEEP_MEMBER_SYSTEM_PROMPT).toContain("Do not call tools")
    expect(DEEP_MEMBER_SYSTEM_PROMPT).not.toMatch(forbiddenCavemanPattern)
  })

  it("DEEP_MEMBER_SYSTEM_PROMPT is distinct from MEMBER_SYSTEM_PROMPT", () => {
    expect(DEEP_MEMBER_SYSTEM_PROMPT).not.toBe(MEMBER_SYSTEM_PROMPT)
  })
})
