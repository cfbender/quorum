import type { AgentConfig } from "@opencode-ai/sdk"
import { MEMBER_SYSTEM_PROMPT } from "./prompts.js"
import type { QuorumConfig } from "./types.js"

export function buildAgentConfigs(config: QuorumConfig): Record<string, AgentConfig> {
  const output: Record<string, AgentConfig> = {}

  for (const member of config.members) {
    output[member.name] = {
      mode: "subagent",
      model: `${member.providerID}/${member.modelID}`,
      prompt: MEMBER_SYSTEM_PROMPT,
      description: `Quorum planning member (${member.label})`,
      tools: {},
      reasoningEffort: "high",
    }
  }

  return output
}
