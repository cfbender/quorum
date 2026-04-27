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

1. Explore project context: files, recent commits, existing patterns.
2. Ask clarifying questions one at a time until the purpose, constraints, and success criteria are clear.
3. Call `quorum_consult` with a prompt that includes the problem, constraints, success criteria, and the request to propose an approach.
4. Read every returned response before synthesizing.
5. Produce a synthesis with these sections: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, Proposed design.
6. Before presenting the proposed design, surface material open questions. Ask one question at a time. Prefer the opencode `question` tool when the choice set is discrete; use conversational prose only for genuinely open-ended questions.
7. Present the synthesis section by section and get approval after each section.
8. Write the approved design to the configured spec directory as `YYYY-MM-DD-{topic}.md`.
9. Commit the spec file only.
10. Review the spec for unfinished markers, internal contradictions, scope creep, and ambiguous requirements.
11. Ask the user to review the written spec.
12. Begin implementation only after the user approves the written spec.

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
