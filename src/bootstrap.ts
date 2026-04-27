import type { QuorumConfig } from "./types.js"

const BOOTSTRAP = `<quorum-bootstrap>
You have access to the \`quorum_consult\` tool, which fans a prompt out to multiple models and returns their responses for you to synthesize.

**When to use it:** before any creative or planning work — new features, components, behavior changes, architectural decisions, or any task where "how should this work?" is not yet answered. Load the \`quorum\` skill for the full workflow.

**Hard rule:** for planning work, you must consult the quorum, synthesize, present a design, surface material open questions, and receive explicit user approval before writing code or invoking implementation tools. This applies regardless of perceived simplicity.

**Open questions:** if the answer would materially change the design, ask the user before presenting the proposed design. Prefer the opencode question tool for discrete choices such as multiple-choice, A/B, or yes/no decisions.

**Not for:** pure bug fixes with obvious cause, typo fixes, dependency bumps, running existing commands, answering factual questions.

When in doubt whether a task counts as planning: invoke the \`quorum\` skill and let it guide you.
</quorum-bootstrap>`

export function renderBootstrap(config: QuorumConfig): string | null {
  return config.triggerMode === "auto" ? BOOTSTRAP : null
}
