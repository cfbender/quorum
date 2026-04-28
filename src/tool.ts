import { tool } from "@opencode-ai/plugin/tool"
import { runQuorum } from "./consult.js"
import { isSubagentSession } from "./session.js"
import type { LegacyQuorumConfig, OpencodeClientLike } from "./types.js"

export function createQuorumTool(client: OpencodeClientLike, config: LegacyQuorumConfig) {
  return tool({
    description: "Fan out a planning prompt to the configured quorum of models and return their responses for synthesis. Use when starting any creative or planning work before writing code.",
    args: {
      topic: tool.schema.string().describe("Short label for this design topic; used by the orchestrator for the spec filename slug."),
      prompt: tool.schema.string().describe("Full planning prompt sent to each quorum member."),
      context: tool.schema.string().optional().describe("Optional project context, constraints, or success criteria appended to each member prompt."),
    },
    async execute(args, context) {
      const isSubagent = await isSubagentSession(client, context.sessionID)
      if (isSubagent) {
        return JSON.stringify({
          error: "quorum_consult is only available in root sessions. Ask the root orchestrator to consult the quorum.",
        })
      }

      const payload = await runQuorum({
        client,
        sessionID: context.sessionID,
        topic: args.topic,
        prompt: args.prompt,
        ...(args.context !== undefined ? { context: args.context } : {}),
        config,
        abortSignal: context.abort,
      })

      return JSON.stringify(payload, null, 2)
    },
  })
}
