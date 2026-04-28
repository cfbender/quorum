import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin"
import { renderBootstrap } from "./bootstrap.js"
import { loadConfig } from "./config.js"
import { createQuorumTool } from "./tool.js"
import type { LegacyQuorumConfig, OpencodeClientLike, QuorumConfig } from "./types.js"

// v0.1 legacy defaults used to fill missing fields when running the consult tool.
// Removed in Task 4 when the v0.1 stack is deleted.
const LEGACY_DEFAULTS: Omit<LegacyQuorumConfig, keyof QuorumConfig> = {
  models: [
    { providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", label: "opus" },
    { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "gemini" },
  ],
  concurrency: 3,
  timeoutMs: 120_000,
  maxTokens: 4_000,
  reasoningEffort: "high",
}

function toLegacyConfig(config: QuorumConfig): LegacyQuorumConfig {
  return { ...config, ...LEGACY_DEFAULTS }
}

function adaptClient(client: PluginInput["client"]): OpencodeClientLike {
  return {
    session: {
      get: (input) => client.session.get({ ...input, throwOnError: true }),
      create: (input) => client.session.create({ ...input, throwOnError: true }),
      prompt: (input) => client.session.prompt({ ...input, throwOnError: true }),
      delete: (input) => client.session.delete({ ...input, throwOnError: true }),
    },
    app: {
      log: (input) => client.app.log(input),
    },
  }
}

type SystemTransformInput = { model: { id: string } }
type SystemTransformOutput = { system: string[] }

type QuorumHooks = Omit<Hooks, "experimental.chat.system.transform"> & {
  "experimental.chat.system.transform"?: (input: SystemTransformInput, output: SystemTransformOutput) => Promise<void>
}

export function createHooks(client: OpencodeClientLike, config: LegacyQuorumConfig): QuorumHooks {
  if (config.triggerMode === "off") return {}

  const quorumTool = createQuorumTool(client, config)
  const bootstrap = renderBootstrap(config)

  return {
    tool: { quorum_consult: quorumTool },
    ...(bootstrap !== null
      ? {
          "experimental.chat.system.transform": async (_input: SystemTransformInput, output: SystemTransformOutput) => {
            output.system.push(bootstrap)
          },
        }
      : {}),
  }
}

export const QuorumPlugin: Plugin = async ({ client }) => {
  const config = loadConfig()
  return createHooks(adaptClient(client), toLegacyConfig(config))
}

export default QuorumPlugin
