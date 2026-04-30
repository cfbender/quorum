import { describe, expect, it } from "vitest"
import { MEMBER_SYSTEM_PROMPT } from "../src/prompts.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("prompts", () => {
  it("exports a normal-English member system prompt", () => {
    expect(MEMBER_SYSTEM_PROMPT).toContain("You are one member of a quorum")
    expect(MEMBER_SYSTEM_PROMPT).toContain("planning question")
    expect(MEMBER_SYSTEM_PROMPT).toContain("Surface assumptions")
    expect(MEMBER_SYSTEM_PROMPT).toContain("Do not call tools")
    expect(MEMBER_SYSTEM_PROMPT).not.toMatch(forbiddenCavemanPattern)
  })
})
