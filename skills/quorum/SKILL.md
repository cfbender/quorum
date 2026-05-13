---
name: quorum
description: Fan out a planning-class question to multiple model agents in parallel, then synthesize their perspectives into a structured response. Use for new features, behavior changes, and architecture or design decisions when you want multi-model deliberation. Quorum produces a synthesis and surfaces open questions — it does not write specs, update docs, or gate implementation. Those belong to caller skills (e.g. `adaptive-planning`, `to-prd`, `to-issues`).
---

# Skill: quorum

Quorum is a primitive: fan out a planning question to configured member agents, then synthesize. Other skills handle planning, spec writing, doc updates, and implementation gating.

## Hard gate

Do not write code, scaffold projects, run implementation commands, or invoke implementation tools until you have:

1. Dispatched parallel `task` calls to each configured quorum member agent.
2. Read every returned member response.
3. Produced a structured synthesis.
4. Surfaced material open questions to the user.

After the synthesis and open questions are presented, control returns to the caller. Quorum does not own the next step.

## Trigger gate

Run this check before dispatching any implementation subagent or writing code beyond a trivial edit. Answer each question:

1. Are there two or more meaningful design, product, or UX choices that the user has not already decided?
2. Is prior art in this codebase ambiguous, absent, or not an obvious match for the approach?
3. Will this ship user-facing behavior — UI, API surface, data model, auth, or persisted state?

If any answer is yes, invoke this skill. The quorum's synthesis then becomes the basis for the next step (clarifying questions, spec writing, planning, or implementation).

If all three answers are no, this skill is not required. Typical skips: obvious bug fixes with a known root cause, typo or wording-only edits, dependency-only bumps, running an existing command, factual questions, or a small ticket with a clear blueprint from prior work and a mechanical implementation path.

If you are unsure, treat the request as planning-class and invoke this skill.

## Workflow

1. If the problem statement is too vague to dispatch usefully, ask at most one or two sharp clarifying questions, then dispatch. Do not run a long clarifying-question dance — members will flag ambiguity in their responses, and the synthesis will surface it as an open question.
2. Dispatch parallel `task` calls to each configured quorum member agent. Each call must include the problem statement, known constraints, success criteria, and an explicit request for an independent approach proposal.
3. Read every returned member response before synthesizing. Each response appears as a native subtask drilldown in opencode — expand them to inspect the full text.
4. Produce a synthesis with these sections: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, Proposed design.
5. Before presenting the proposed design, surface material open questions. Ask one question at a time. Prefer the opencode `question` tool when the choice set is discrete; use conversational prose only for genuinely open-ended questions.
6. Present the synthesis to the user, then hand off. The caller skill or main thread decides what happens next — spec writing, PRD, plan, issues, direct implementation, or nothing at all. Quorum is done.

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

## Anti-patterns

- Do not average responses into a bland summary.
- Do not pick one member's answer and call it synthesis.
- Do not hide disagreement.
- Do not skip consultation because the task looks easy.
- Do not bury material open questions inside the proposed design.
- Do not ask discrete-choice questions as plain prose when the opencode `question` tool is available.
- Do not dispatch open or clarification questions to subagents via `task` calls. Use the opencode `question` tool or ask the user directly in the main thread.
- Do not run a long clarifying-question dance before dispatch. One or two sharp questions, then fan out.
- Do not write spec files, update high-level docs, manage `.gitignore`, or gate implementation behind a doc commit. Those belong to caller skills.
- Do not block on "approval of the proposed design" before exiting. Present the synthesis, surface open questions, and hand back.
