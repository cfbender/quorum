import type { Config, Hooks, Plugin } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import * as path from "node:path"
import { buildAgentConfigs } from "./agents.js"
import { renderBootstrap } from "./bootstrap.js"
import { loadConfig } from "./config.js"
import type { QuorumConfig } from "./types.js"

type ConfigWithSkills = Config & {
  skills?: {
    paths?: string[]
    urls?: string[]
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.resolve(__dirname, "../../skills")

export function createHooks(config: QuorumConfig, skillsDir: string = SKILLS_DIR): Hooks {
  const registerAgents = config.triggerMode !== "off"
  const incomingAgents = registerAgents ? buildAgentConfigs(config) : {}
  const bootstrap = registerAgents ? renderBootstrap(config) : null

  return {
    config: async (rawInput) => {
      const input = rawInput as ConfigWithSkills
      input.skills = input.skills ?? {}
      input.skills.paths = input.skills.paths ?? []
      if (!input.skills.paths.includes(skillsDir)) {
        input.skills.paths.push(skillsDir)
      }

      if (registerAgents) {
        input.agent = input.agent ?? {}
        for (const [name, def] of Object.entries(incomingAgents)) {
          if (input.agent[name] !== undefined) continue
          input.agent[name] = def
        }
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
