import type { AgentConfig } from "@opencode-ai/sdk"
import { DEEP_MEMBER_SYSTEM_PROMPT, MEMBER_SYSTEM_PROMPT } from "./prompts.js"
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
      reasoningEffort: member.reasoningEffort ?? "high",
    }
  }

  if (config.deepMembers) {
    for (const member of config.deepMembers) {
      output[member.name] = {
        mode: "subagent",
        model: `${member.providerID}/${member.modelID}`,
        prompt: DEEP_MEMBER_SYSTEM_PROMPT,
        description: `Quorum deep-review member (${member.label}). Use only on explicit deep-analysis or double-check requests.`,
        tools: {},
        reasoningEffort: member.reasoningEffort ?? "xhigh",
      }
    }
  }

  return output
}
