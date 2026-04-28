import type { Hooks, Plugin } from "@opencode-ai/plugin"
import { buildAgentConfigs } from "./agents.js"
import { renderBootstrap } from "./bootstrap.js"
import { loadConfig } from "./config.js"
import type { QuorumConfig } from "./types.js"

export function createHooks(config: QuorumConfig): Hooks {
  if (config.triggerMode === "off") return {}

  const incomingAgents = buildAgentConfigs(config)
  const bootstrap = renderBootstrap(config)

  return {
    config: async (input) => {
      input.agent = input.agent ?? {}
      for (const [name, def] of Object.entries(incomingAgents)) {
        if (input.agent[name] !== undefined) continue
        input.agent[name] = def
      }
    },
    ...(bootstrap !== null
      ? {
          "experimental.chat.system.transform": async (_input, output) => {
            output.system.push(bootstrap)
          },
        }
      : {}),
  }
}

export const QuorumPlugin: Plugin = async () => {
  const config = loadConfig()
  return createHooks(config)
}

export default QuorumPlugin
