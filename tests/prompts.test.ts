import { describe, expect, it } from "vitest"
import { renderMemberPrompt, renderSynthesisPrompt } from "../src/prompts.js"
import type { QuorumResponse } from "../src/types.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("prompts", () => {
  it("renders a normal-English member prompt", () => {
    const prompt = renderMemberPrompt({
      topic: "test topic",
      prompt: "Design a plugin.",
      context: "Use opencode.",
      reasoningEffort: "high",
      maxTokens: 4000,
    })

    expect(prompt).toContain("You are one member of a quorum")
    expect(prompt).toContain("**Topic:** test topic")
    expect(prompt).toContain("Design a plugin.")
    expect(prompt).toContain("Use opencode.")
    expect(prompt).toContain("Use high reasoning effort")
    expect(prompt).not.toMatch(forbiddenCavemanPattern)
  })

  it("renders synthesis prompt with successes, failures, open questions, and dropped models", () => {
    const responses: QuorumResponse[] = [
      { label: "opus", providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", ok: true, text: "Use a tool.", elapsedMs: 10, truncated: false },
      { label: "gpt5", providerID: "openrouter", modelID: "openai/gpt-5.4", ok: false, error: "timeout", elapsedMs: 100, truncated: false },
    ]

    const prompt = renderSynthesisPrompt({ topic: "quorum", responses, droppedModels: ["gpt5"] })

    expect(prompt).toContain("Agreement")
    expect(prompt).toContain("Key differences")
    expect(prompt).toContain("Partial coverage")
    expect(prompt).toContain("Unique insights")
    expect(prompt).toContain("Blind spots")
    expect(prompt).toContain("Open questions")
    expect(prompt).toContain("Proposed design")
    expect(prompt).toContain("Use a tool.")
    expect(prompt).toContain("[This model did not respond: timeout]")
    expect(prompt).toContain("Members that dropped from this quorum: gpt5")
    expect(prompt).toContain("Prefer the opencode `question` tool")
    expect(prompt).not.toMatch(forbiddenCavemanPattern)
  })
})
