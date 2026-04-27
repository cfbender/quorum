import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin"
import { renderBootstrap } from "./bootstrap.js"
import { loadConfig } from "./config.js"
import { createQuorumTool } from "./tool.js"
import type { OpencodeClientLike, QuorumConfig } from "./types.js"

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

export function createHooks(client: OpencodeClientLike, config: QuorumConfig): QuorumHooks {
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
  return createHooks(adaptClient(client), config)
}

export default QuorumPlugin
