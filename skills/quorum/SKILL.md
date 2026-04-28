---
name: quorum
description: Use for planning-class requests such as new features, behavior changes, or architecture/design decisions. Dispatches the planning prompt to configured quorum member agents in parallel, synthesizes their perspectives, surfaces open questions, and requires explicit design approval before implementation.
---

# Skill: quorum

Use this skill for planning-class requests: new features, behavior changes, and architecture or design decisions.

## Hard gate

Do not write code, scaffold projects, run implementation commands, or invoke implementation tools until you have:

1. Dispatched parallel `task` calls to each configured quorum member agent.
2. Read every returned member response.
3. Produced a structured synthesis.
4. Surfaced material open questions to the user.
5. Received explicit approval for the design.

This applies to every planning task, regardless of perceived simplicity.

## Trigger gate

Run this check before dispatching any implementation subagent, asking the user clarifying questions, or writing code beyond a trivial edit. Answer each question:

1. Are there two or more meaningful design, product, or UX choices that the user has not already decided?
2. Is prior art in this codebase ambiguous, absent, or not an obvious match for the approach?
3. Will this ship user-facing behavior — UI, API surface, data model, auth, or persisted state?

If any answer is yes, invoke this skill. The quorum's proposed design then becomes the basis for clarifying questions, not the reverse.

If all three answers are no, this skill is not required. Typical skips: obvious bug fixes with a known root cause, typo or wording-only edits, dependency-only bumps, running an existing command, factual questions, or a small ticket with a clear blueprint from prior work and a mechanical implementation path.

If you are unsure, treat the request as planning-class and invoke this skill.

## Workflow

1. Explore project context: files, recent commits, existing patterns, and which high-level docs already exist (for example `AGENTS.md`, `ARCHITECTURE.md`, `docs/architecture/*`, `README.md`).
2. Ask clarifying questions one at a time until the purpose, constraints, and success criteria are clear.
3. Dispatch parallel `task` calls to each configured quorum member agent (for example `quorum-sonnet`, `quorum-gpt5`, `quorum-gemini`). Each call should include the problem statement, constraints, success criteria, and an explicit request for an independent approach proposal.
4. Read every returned member response before synthesizing. Each response appears as a native subtask drilldown in opencode — expand them to inspect the full text.
5. Produce a synthesis with these sections: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, Proposed design.
6. Before presenting the proposed design, surface material open questions. Ask one question at a time. Prefer the opencode `question` tool when the choice set is discrete; use conversational prose only for genuinely open-ended questions.
7. Present the synthesis section by section and get approval after each section.
8. Write the approved design to the configured spec directory as `{specDir}/YYYY-MM-DD-{topic}.md`. This file is a local scratch reference for the implementation phase, not a committed artifact.
9. Ensure the spec directory is gitignored. If the project's `.gitignore` does not already cover `{specDir}`, append an entry for it and stage the `.gitignore` change. Do not commit the spec file itself.
10. Identify the high-level docs that should capture the outcome of this design. Prefer, in order: `AGENTS.md`, any existing architecture docs (`ARCHITECTURE.md`, `docs/architecture/*`), and `README.md` when the change affects install or usage. Pick based on what already exists in the repo; do not invent new top-level doc files unless the user asks for one.
11. Update those high-level docs to reflect the outcome of the design — the "what" and the architectural "why", not the deliberation trail. Do not paste the synthesis sections verbatim. Do not list rejected alternatives. Capture only the decisions that future contributors need to know.
12. Self-review the doc edits for unfinished markers, internal contradictions, scope creep, and ambiguous requirements.
13. Ask the user to review the doc changes.
14. Once the user approves, commit the high-level doc changes (and the `.gitignore` update if one was made) in a single focused commit. Do not commit the spec file. Do not commit the raw synthesis.
15. Begin implementation only after the doc commit lands.

## Synthesis sections

- **Agreement** — points where two or more members converged. Name which members agreed.
- **Key differences** — places where members proposed genuinely different approaches. Name each member and summarize its position.
- **Partial coverage** — aspects only some members addressed. Treat these as worth considering, not consensus.
- **Unique insights** — a single member saying something the others missed. Evaluate on merit rather than popularity.
- **Blind spots** — what no member addressed that you notice is missing.
- **Open questions** — decisions the user needs to make, tradeoffs you cannot resolve alone, and assumptions that need confirmation.
- **Proposed design** — your fused recommendation. It is not a vote count and not a paraphrase of one member.

## Failure modes

- Fewer than two members respond: stop the quorum path, tell the user, and offer to retry or proceed single-model.
- All members agree trivially: surface that as a signal; do not invent disagreement.
- Members disagree sharply on fundamentals: present the options and ask the user to choose.
- A member task call fails entirely: tell the user, offer retry or single-model fallback.

## Deep review (opt-in)

When `deepMembers` are configured, a second pool of heavier models is available for explicit deep-analysis requests. Deep members are never invoked by default.

### Triggers

Invoke deep members only when the user explicitly requests:
- Deeper analysis or second-order thinking.
- A double-check of a prior synthesis.
- A follow-up review after seeing the regular synthesis.
- The deep pool by name. Phrasings like "ask the deep quorum", "deep quorum", "deep members", "deep pool", "the deep ones", "use the heavy models", or "run the deep review" all count as explicit requests. Treat any user message that names the deep pool or asks for heavier/deeper review as explicit approval to dispatch — no additional confirmation needed.

### Dispatch modes

- **Replace (upfront):** user asks for deep analysis before any regular synthesis → dispatch deep members instead of regular members. Use the same planning prompt.
- **Follow-up (escalation):** regular synthesis already produced and user asks for double-check → dispatch deep members with the prior synthesis and the original request as context so they can critique it.

### Context passing

For follow-up escalation, include in each deep member task call:
1. The original planning question and constraints.
2. The full regular synthesis produced in the prior step.
3. An explicit instruction to critique the synthesis: identify what it got right, what it missed, and where it was overconfident.

### Output

Render deep member output as a distinct **Deep review** section after the regular synthesis. Do not merge deep output into the regular synthesis. Present Agreement, Key differences, and any new signal surfaced by deep members.

### Hard rules

- Never invoke deep members without explicit user approval.
- When regular synthesis is contested or uncertain, you may *offer* deep follow-up — but do not invoke it automatically.
- Deep members are not a fallback for a failed regular quorum. If the regular quorum fails, tell the user and offer retry or single-model fallback.

## Anti-patterns

- Do not average responses into a bland summary.
- Do not pick one member's answer and call it synthesis.
- Do not hide disagreement.
- Do not skip consultation because the task looks easy.
- Do not bury material open questions inside the proposed design.
- Do not ask discrete-choice questions as plain prose when the opencode `question` tool is available.
- Do not commit specs, plans, or raw synthesis. They are scratch artifacts. Commit only the high-level doc updates that capture the outcome.
- Do not create new top-level documentation files when an existing one (such as `AGENTS.md`) is the right place for the outcome.
- Do not copy the deliberation trail into committed docs. Capture decisions, not the discussion that produced them.
- Do not dispatch open or clarification questions to subagents via `task` calls. Use the opencode `question` tool or ask the user directly in the main thread.
