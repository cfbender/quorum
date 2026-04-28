import type { QuorumResponse, ReasoningEffort } from "./types.js"

export const MEMBER_SYSTEM_PROMPT = `You are one member of a quorum of planning consultants.

Read the planning question carefully and propose a practical approach with rationale.

Requirements:
- Address architecture, components, data flow, and tradeoffs.
- Surface assumptions and open questions that could change the design.
- Keep the response focused and concrete.
- Do not call tools.
- Do not write files.
- Do not claim consensus; provide your independent perspective.`

export function renderMemberPrompt(input: {
  topic: string
  prompt: string
  context?: string
  reasoningEffort: ReasoningEffort
  maxTokens: number
}): string {
  const contextBlock = input.context?.trim()
    ? `\n\n**Additional context:**\n${input.context.trim()}`
    : ""

  return `You are one member of a quorum of models being consulted on a planning question. Your response will be synthesized alongside responses from other models.

**Topic:** ${input.topic}

**Question:**
${input.prompt}${contextBlock}

**Instructions for your response:**
- Propose an approach. Do not just restate the problem.
- Be specific about architecture, components, data flow, and tradeoffs.
- If you see multiple viable approaches, name them and recommend one.
- Flag assumptions you are making.
- Flag things you would want to know before committing to an approach.
- Use ${input.reasoningEffort} reasoning effort.
- Keep response focused. Do not pad. Aim for 400–800 words unless the topic genuinely needs more.
- The tool will locally cap the returned text at approximately ${input.maxTokens} tokens before giving it back to the orchestrator.
- Do not try to coordinate with other members. You cannot see their responses.`
}

export function renderSynthesisPrompt(input: {
  topic: string
  responses: QuorumResponse[]
  droppedModels: string[]
}): string {
  const responseBlocks = input.responses.map((response) => {
    const body = response.ok
      ? response.text ?? ""
      : `[This model did not respond: ${response.error ?? "unknown error"}]`
    return `---\n## ${response.label} (${response.providerID}/${response.modelID})\n${body}\n---`
  }).join("\n\n")

  const dropped = input.droppedModels.length > 0 ? input.droppedModels.join(", ") : "none"

  return `You have received responses from ${input.responses.length} members of the quorum on the topic: "${input.topic}".

Below are their responses, labeled. Read all of them before synthesizing.

${responseBlocks}

Now produce a synthesis with the following structure. Do not skip sections; if a section is empty, say so explicitly.

### Agreement
Points where 2+ members converged. These are high-confidence. Name which members agreed.

### Key differences
Places where members proposed genuinely different approaches. Name the member and summarize their position. Do not flatten the disagreement — surface it.

### Partial coverage
Aspects only some members addressed. Flag as "worth considering" rather than consensus.

### Unique insights
A single member saying something the others missed. Evaluate on merit. Do not discard for being minority.

### Blind spots
What no member addressed that you notice is missing. This is your value-add as the synthesizer.

### Open questions
Before proposing a design, list questions whose answers would change the design — decisions the user needs to make, tradeoffs you cannot resolve alone, assumptions that need confirmation. For each question, note which member or members raised it or left it implicit.

### Proposed design
Your fused recommendation, informed by the above. Not a vote count. Not a paraphrase of any single member. A synthesis.

**Surfacing open questions to the user:**

Before presenting the proposed-design section, surface the open questions. Prefer the opencode \`question\` tool when the question has discrete choices such as multiple-choice, A/B, or yes/no. Use plain conversational prose only when the question is genuinely open-ended and no reasonable choice set exists.

Ask questions one at a time. Do not batch them. Do not hide them inside the proposed design. The user must answer questions that materially shape the design before you present a design section. Lesser questions can be surfaced alongside the design.

Members that dropped from this quorum: ${dropped}.`
}
