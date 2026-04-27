---
name: quorum
description: Use before any creative or planning work — new features, components, behavior changes, architectural decisions, or any task where "how should this work?" is not yet answered. Consults multiple models, synthesizes their perspectives, surfaces open questions, and produces a design the user approves before implementation begins.
---

# Skill: quorum

Use this skill before any creative or planning work. This includes new features, components, behavior changes, architectural decisions, or any task where the user has described what they want but not how it should work.

## Hard gate

Do not write code, scaffold projects, run implementation commands, or invoke implementation tools until you have:

1. Consulted the quorum with `quorum_consult`.
2. Read every returned model response.
3. Produced a structured synthesis.
4. Surfaced material open questions to the user.
5. Received explicit approval for the design.

This applies to every planning task, regardless of perceived simplicity.

## When to invoke

Invoke for:

- New features or components.
- Behavior changes to existing features.
- Architectural or design decisions.
- Any task where "how should this work?" is not yet answered.

Do not invoke for:

- Pure bug fixes with an obvious cause.
- Typo fixes.
- Dependency bumps.
- Running existing commands.
- Answering factual questions.

## Workflow

1. Explore project context: files, recent commits, existing patterns, and which high-level docs already exist (for example `AGENTS.md`, `ARCHITECTURE.md`, `docs/architecture/*`, `README.md`).
2. Ask clarifying questions one at a time until the purpose, constraints, and success criteria are clear.
3. Call `quorum_consult` with a prompt that includes the problem, constraints, success criteria, and the request to propose an approach.
4. Read every returned response before synthesizing.
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

- Fewer than two models respond: stop the quorum path, tell the user, and offer to retry or proceed single-model.
- All models agree trivially: surface that as a signal; do not invent disagreement.
- Models disagree sharply on fundamentals: present the options and ask the user to choose.
- Tool call fails entirely: tell the user, offer retry or single-model fallback.

## Anti-patterns

- Do not average responses into a bland summary.
- Do not pick one model's answer and call it synthesis.
- Do not hide disagreement.
- Do not skip consultation because the task looks easy.
- Do not bury material open questions inside the proposed design.
- Do not ask discrete-choice questions as plain prose when the opencode `question` tool is available.
- Do not commit specs, plans, or raw synthesis. They are scratch artifacts. Commit only the high-level doc updates that capture the outcome.
- Do not create new top-level documentation files when an existing one (such as `AGENTS.md`) is the right place for the outcome.
- Do not copy the deliberation trail into committed docs. Capture decisions, not the discussion that produced them.
