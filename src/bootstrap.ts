import type { QuorumConfig } from "./types.js"

export function renderBootstrap(config: QuorumConfig): string | null {
  if (config.triggerMode !== "auto") return null

  const memberList = config.members.map((member) => member.name).join(", ")

  const deepBlock =
    config.deepMembers && config.deepMembers.length > 0
      ? `\n\n<quorum-deep>
Deep-review members available: ${config.deepMembers.map((m) => m.name).join(", ")}.

Hard rule: never invoke deep members by default. Only dispatch on explicit user request.

Triggers for deep review:
- User explicitly asks for deeper analysis, double-check, or follow-up review.
- User contests or expresses doubt about a prior synthesis.

Two dispatch modes:
- Replace (upfront): user asks for deep analysis before regular synthesis → dispatch deep members instead of regular members.
- Follow-up (escalation): regular synthesis already produced, user asks for double-check → dispatch deep members with prior synthesis and original request as context.

When regular synthesis is contested or uncertain, you may offer deep follow-up — but never invoke deep members without explicit user approval.

Deep output should be rendered as a distinct "Deep review" section, not merged into the regular synthesis.
</quorum-deep>`
      : ""

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

When you have open or clarification questions during a quorum workflow, ask them directly to the user — via the opencode question tool or in prose. Never dispatch clarification questions to subagents via task calls.
</quorum-bootstrap>${deepBlock}`
}
