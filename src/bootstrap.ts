import type { QuorumConfig } from "./types.js"

export function renderBootstrap(config: QuorumConfig): string | null {
  if (config.triggerMode !== "auto") return null

  const memberList = config.members.map((member) => member.name).join(", ")

  return `<quorum-bootstrap>
You have quorum planning members available as subagents: ${memberList}.

Use quorum first for planning-class requests:
- new feature work.
- behavior changes to existing functionality.
- architecture or design decisions.

Do not require quorum first for:
- obvious bug fixes.
- Typo or wording-only edits.
- Dependency-only bumps.
- Requests to run an existing command.
- Factual questions.

If you are unsure whether a request is planning-class, treat it as planning and run quorum.

For planning-class requests, load the quorum skill and dispatch parallel task calls to each member with the same planning prompt.

Use member outputs to synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design.

Prefer opencode question tool for discrete open questions. Receive explicit design approval before implementation.
</quorum-bootstrap>`
}
