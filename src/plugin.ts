import type { Config, Hooks, Plugin } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import * as fs from "node:fs"
import * as path from "node:path"
import { buildAgentConfigs } from "./agents.js"
import { renderBootstrap } from "./bootstrap.js"
import { loadConfig, resolveConfigPath } from "./config.js"
import type { QuorumConfig } from "./types.js"

type ConfigWithSkills = Config & {
  skills?: {
    paths?: string[]
    urls?: string[]
  }
}

type HookExtras = {
  issues?: string[]
  configPath?: string
  bootMtime?: number | null
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.resolve(__dirname, "../../skills")

export function createHooks(
  config: QuorumConfig,
  skillsDir: string = SKILLS_DIR,
  extras: HookExtras = {},
): Hooks {
  const { issues = [], configPath, bootMtime } = extras
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
            const parts: string[] = []

            // Restart hint — most urgent, prepended first
            if (configPath != null && bootMtime != null) {
              try {
                const currentMtime = fs.statSync(configPath).mtimeMs
                if (currentMtime > bootMtime) {
                  const lastModified = new Date(currentMtime).toISOString()
                  parts.push(
                    `<quorum-restart-required>\nquorum.json has been edited since opencode started (last modified: ${lastModified}). The currently registered quorum agents reflect the old config. Restart opencode to apply changes. Tell the user this before proceeding with any quorum work.\n</quorum-restart-required>`,
                  )
                }
              } catch {
                // stat failed — skip hint silently
              }
            }

            // Config issues block
            if (issues.length > 0) {
              const issueLines = issues.map((issue) => `- ${issue}`).join("\n")
              parts.push(
                `<quorum-config-issues>\nThe following issues were detected in quorum.json at opencode startup. Tell the user so they can fix their config:\n${issueLines}\n</quorum-config-issues>`,
              )
            }

            // Bootstrap
            parts.push(bootstrap)

            output.system.push(parts.join("\n\n"))
          },
        }
      : {}),
  }
}

export const QuorumPlugin: Plugin = async () => {
  const { config, issues } = loadConfig()

  if (issues.length > 0) {
    console.warn("[quorum] Config issues:\n" + issues.join("\n"))
  }

  const configPath = resolveConfigPath()
  const bootMtime = fs.existsSync(configPath) ? fs.statSync(configPath).mtimeMs : null

  return createHooks(config, SKILLS_DIR, { issues, configPath, bootMtime })
}

export default QuorumPlugin
