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

Trigger gate — run before dispatching any implementation subagent, asking the user clarifying questions, or writing code beyond a trivial edit. Answer each question:

1. Are there two or more meaningful design, product, or UX choices that the user has not already decided?
2. Is prior art in this codebase ambiguous, absent, or not an obvious match for the approach?
3. Will this ship user-facing behavior — UI, API surface, data model, auth, or persisted state?

If any answer is yes, load the quorum skill and run quorum first. The quorum's proposed design then becomes the basis for clarifying questions, not the reverse.

If all three answers are no, quorum is not required. Typical skips: obvious bug fixes with a known root cause, typo or wording-only edits, dependency-only bumps, running an existing command, or factual questions. A small ticket with a clear blueprint from prior work and a mechanical implementation path also skips.

If you are unsure, treat the request as planning-class and run quorum.

For planning-class requests, load the quorum skill and dispatch parallel task calls to each member with the same planning prompt. Use member outputs to synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design. Prefer opencode question tool for discrete open questions. Receive explicit design approval before implementation.

When you have open or clarification questions during a quorum workflow, ask them directly to the user — via the opencode question tool or in prose. Never dispatch clarification questions to subagents via task calls.
</quorum-bootstrap>${deepBlock}`
}
