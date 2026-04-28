import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { buildAgentConfigs } from "../src/agents.js"
import { MEMBER_SYSTEM_PROMPT } from "../src/prompts.js"

describe("buildAgentConfigs", () => {
  it("builds one subagent config per member", () => {
    const agentMap = buildAgentConfigs(DEFAULT_CONFIG)

    expect(Object.keys(agentMap)).toEqual(["quorum-sonnet", "quorum-gpt5", "quorum-gemini"])
    expect(agentMap["quorum-sonnet"]).toMatchObject({
      mode: "subagent",
      model: "openrouter/anthropic/claude-sonnet-4.6",
      prompt: MEMBER_SYSTEM_PROMPT,
      reasoningEffort: "high",
      tools: {},
    })
  })
})
