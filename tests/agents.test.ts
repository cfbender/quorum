import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { buildAgentConfigs } from "../src/agents.js"
import { DEEP_MEMBER_SYSTEM_PROMPT, MEMBER_SYSTEM_PROMPT } from "../src/prompts.js"
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

  it("deep members registered with DEEP_MEMBER_SYSTEM_PROMPT and default xhigh", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    const agentMap = buildAgentConfigs(config)
    expect(agentMap["quorum-deep-a"]).toMatchObject({
      mode: "subagent",
      model: "openrouter/anthropic/claude-opus-4-5",
      prompt: DEEP_MEMBER_SYSTEM_PROMPT,
      reasoningEffort: "xhigh",
      tools: {},
    })
    expect(agentMap["quorum-deep-a"]?.description).toContain("deep-review member")
    expect(agentMap["quorum-deep-a"]?.description).toContain("explicit deep-analysis")
  })

  it("per-member reasoningEffort override respected for deep members", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus", reasoningEffort: "high" },
      ],
    }
    const agentMap = buildAgentConfigs(config)
    expect(agentMap["quorum-deep-a"]?.reasoningEffort).toBe("high")
  })

  it("regular members unchanged when deepMembers present", () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    const agentMap = buildAgentConfigs(config)
    expect(agentMap["quorum-sonnet"]?.prompt).toBe(MEMBER_SYSTEM_PROMPT)
    expect(agentMap["quorum-sonnet"]?.reasoningEffort).toBe("high")
  })

  it("no deep members registered when deepMembers unset", () => {
    const agentMap = buildAgentConfigs(DEFAULT_CONFIG)
    const keys = Object.keys(agentMap)
    expect(keys).not.toContain("quorum-deep-a")
    expect(keys).toHaveLength(3)
  })
})
