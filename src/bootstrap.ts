import type { QuorumConfig } from "./types.js"

export function renderBootstrap(config: QuorumConfig): string | null {
  if (config.triggerMode !== "auto") return null

  const memberList = config.members.map((member) => member.name).join(", ")

  return `<quorum-bootstrap>
You have quorum planning members available as subagents: ${memberList}.

Before creative or planning work, load the quorum skill and dispatch parallel task calls to each member with the same planning prompt.

Use member outputs to synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design.

Prefer opencode question tool for discrete open questions. Receive explicit design approval before implementation.
</quorum-bootstrap>`
}
