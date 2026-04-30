import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { buildAgentConfigs } from "../src/agents.js"
import { MEMBER_SYSTEM_PROMPT } from "../src/prompts.js"
import type { QuorumConfig } from "../src/types.js"

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

  it("regular members default to reasoningEffort high", () => {
    const agentMap = buildAgentConfigs(DEFAULT_CONFIG)
    for (const name of ["quorum-sonnet", "quorum-gpt5", "quorum-gemini"]) {
      expect(agentMap[name]?.reasoningEffort).toBe("high")
    }
  })

  it("per-member reasoningEffort override respected for regular members", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      members: [
        { name: "quorum-a", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt", reasoningEffort: "medium" },
        { name: "quorum-b", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
      ],
    }
    const agentMap = buildAgentConfigs(config)
    expect(agentMap["quorum-a"]?.reasoningEffort).toBe("medium")
    expect(agentMap["quorum-b"]?.reasoningEffort).toBe("high")
  })

  it("all members registered with MEMBER_SYSTEM_PROMPT", () => {
    const agentMap = buildAgentConfigs(DEFAULT_CONFIG)
    for (const name of ["quorum-sonnet", "quorum-gpt5", "quorum-gemini"]) {
      expect(agentMap[name]?.prompt).toBe(MEMBER_SYSTEM_PROMPT)
    }
  })

  it("result contains exactly one entry per member", () => {
    const agentMap = buildAgentConfigs(DEFAULT_CONFIG)
    const keys = Object.keys(agentMap)
    expect(keys).toHaveLength(3)
    expect(keys).toEqual(["quorum-sonnet", "quorum-gpt5", "quorum-gemini"])
  })
})
