// src/bootstrap.ts
var BOOTSTRAP = `<quorum-bootstrap>
You have access to the \`quorum_consult\` tool, which fans a prompt out to multiple models and returns their responses for you to synthesize.

**When to use it:** before any creative or planning work \u2014 new features, components, behavior changes, architectural decisions, or any task where "how should this work?" is not yet answered. Load the \`quorum\` skill for the full workflow.

**Hard rule:** for planning work, you must consult the quorum, synthesize, present a design, surface material open questions, and receive explicit user approval before writing code or invoking implementation tools. This applies regardless of perceived simplicity.

**Open questions:** if the answer would materially change the design, ask the user before presenting the proposed design. Prefer the opencode question tool for discrete choices such as multiple-choice, A/B, or yes/no decisions.

**Not for:** pure bug fixes with obvious cause, typo fixes, dependency bumps, running existing commands, answering factual questions.

When in doubt whether a task counts as planning: invoke the \`quorum\` skill and let it guide you.
</quorum-bootstrap>`;
function renderBootstrap(config) {
  return config.triggerMode === "auto" ? BOOTSTRAP : null;
}

// src/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
var DEFAULT_CONFIG = {
  models: [
    { providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", label: "opus" },
    { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { providerID: "openrouter", modelID: "google/gemini-3-pro", label: "gemini" }
  ],
  concurrency: 3,
  timeoutMs: 12e4,
  maxTokens: 4e3,
  reasoningEffort: "high",
  triggerMode: "auto",
  specDir: "docs/quorum/specs"
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function positiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : void 0;
}
function parseTriggerMode(value) {
  return value === "auto" || value === "manual" || value === "off" ? value : void 0;
}
function parseReasoningEffort(value) {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" ? value : void 0;
}
function parseModel(value) {
  if (!isRecord(value)) return void 0;
  const providerID = nonEmptyString(value.providerID);
  const modelID = nonEmptyString(value.modelID);
  const label = nonEmptyString(value.label);
  if (!providerID || !modelID || !label) return void 0;
  return { providerID, modelID, label };
}
function parseConfig(value) {
  if (!isRecord(value)) return DEFAULT_CONFIG;
  const models = Array.isArray(value.models) ? value.models.map(parseModel).filter((model) => model !== void 0) : DEFAULT_CONFIG.models;
  return {
    models: models.length > 0 ? models : DEFAULT_CONFIG.models,
    concurrency: positiveInteger(value.concurrency) ?? DEFAULT_CONFIG.concurrency,
    timeoutMs: positiveInteger(value.timeoutMs) ?? DEFAULT_CONFIG.timeoutMs,
    maxTokens: positiveInteger(value.maxTokens) ?? DEFAULT_CONFIG.maxTokens,
    reasoningEffort: parseReasoningEffort(value.reasoningEffort) ?? DEFAULT_CONFIG.reasoningEffort,
    triggerMode: parseTriggerMode(value.triggerMode) ?? DEFAULT_CONFIG.triggerMode,
    specDir: nonEmptyString(value.specDir) ?? DEFAULT_CONFIG.specDir
  };
}
function resolveConfigPath(configDir = process.env.OPENCODE_CONFIG_DIR ?? path.join(os.homedir(), ".config", "opencode")) {
  return path.join(configDir, "quorum.json");
}
function loadConfig(configDir) {
  const filePath = resolveConfigPath(configDir);
  if (!fs.existsSync(filePath)) return DEFAULT_CONFIG;
  const raw = fs.readFileSync(filePath, "utf8");
  return parseConfig(JSON.parse(raw));
}

// src/tool.ts
import { tool } from "@opencode-ai/plugin/tool";

// src/prompts.ts
function renderMemberPrompt(input) {
  const contextBlock = input.context?.trim() ? `

**Additional context:**
${input.context.trim()}` : "";
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
- Keep response focused. Do not pad. Aim for 400\u2013800 words unless the topic genuinely needs more.
- The tool will locally cap the returned text at approximately ${input.maxTokens} tokens before giving it back to the orchestrator.
- Do not try to coordinate with other members. You cannot see their responses.`;
}
function renderSynthesisPrompt(input) {
  const responseBlocks = input.responses.map((response) => {
    const body = response.ok ? response.text ?? "" : `[This model did not respond: ${response.error ?? "unknown error"}]`;
    return `---
## ${response.label} (${response.providerID}/${response.modelID})
${body}
---`;
  }).join("\n\n");
  const dropped = input.droppedModels.length > 0 ? input.droppedModels.join(", ") : "none";
  return `You have received responses from ${input.responses.length} members of the quorum on the topic: "${input.topic}".

Below are their responses, labeled. Read all of them before synthesizing.

${responseBlocks}

Now produce a synthesis with the following structure. Do not skip sections; if a section is empty, say so explicitly.

### Agreement
Points where 2+ members converged. These are high-confidence. Name which members agreed.

### Key differences
Places where members proposed genuinely different approaches. Name the member and summarize their position. Do not flatten the disagreement \u2014 surface it.

### Partial coverage
Aspects only some members addressed. Flag as "worth considering" rather than consensus.

### Unique insights
A single member saying something the others missed. Evaluate on merit. Do not discard for being minority.

### Blind spots
What no member addressed that you notice is missing. This is your value-add as the synthesizer.

### Open questions
Before proposing a design, list questions whose answers would change the design \u2014 decisions the user needs to make, tradeoffs you cannot resolve alone, assumptions that need confirmation. For each question, note which member or members raised it or left it implicit.

### Proposed design
Your fused recommendation, informed by the above. Not a vote count. Not a paraphrase of any single member. A synthesis.

**Surfacing open questions to the user:**

Before presenting the proposed-design section, surface the open questions. Prefer the opencode \`question\` tool when the question has discrete choices such as multiple-choice, A/B, or yes/no. Use plain conversational prose only when the question is genuinely open-ended and no reasonable choice set exists.

Ask questions one at a time. Do not batch them. Do not hide them inside the proposed design. The user must answer questions that materially shape the design before you present a design section. Lesser questions can be surfaced alongside the design.

Members that dropped from this quorum: ${dropped}.`;
}

// src/text.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function extractTextParts(parts) {
  return parts.map((part) => {
    if (!isRecord2(part)) return "";
    if (part.type !== "text") return "";
    return typeof part.text === "string" ? part.text : "";
  }).join("");
}
function truncateApproxTokens(text, maxTokens) {
  const maxChars = Math.max(1, maxTokens * 4);
  if (text.length <= maxChars) return { text, truncated: false };
  const truncated = text.slice(0, maxChars).trimEnd();
  return {
    text: `${truncated}

[Truncated by quorum after approximately ${maxTokens} tokens.]`,
    truncated: true
  };
}

// src/consult.ts
async function log(client, level, message, extra) {
  await client.app?.log({ body: { service: "quorum", level, message, ...extra !== void 0 ? { extra } : {} } }).catch(() => {
  });
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function withTimeout(promise, timeoutMs, label) {
  let timeout;
  const timeoutPromise = new Promise((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
async function mapLimited(items, limit, mapper) {
  const results = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item !== void 0) {
        results[currentIndex] = await mapper(item);
      }
    }
  }
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
async function consultOne(input, model) {
  const started = Date.now();
  let childID;
  try {
    await log(input.client, "info", "starting quorum member", { label: model.label, providerID: model.providerID, modelID: model.modelID });
    const child = await input.client.session.create({ body: { parentID: input.sessionID }, throwOnError: true });
    childID = child.data.id;
    const memberPrompt = renderMemberPrompt({
      topic: input.topic,
      prompt: input.prompt,
      ...input.context !== void 0 ? { context: input.context } : {},
      reasoningEffort: input.config.reasoningEffort,
      maxTokens: input.config.maxTokens
    });
    const response = await withTimeout(input.client.session.prompt({
      path: { id: childID },
      body: {
        model: { providerID: model.providerID, modelID: model.modelID },
        tools: {},
        system: "You are a planning consultant. Respond with normal professional English. Do not use tools.",
        parts: [{ type: "text", text: memberPrompt }]
      },
      throwOnError: true
    }), input.config.timeoutMs, model.label);
    const extracted = extractTextParts(response.data.parts);
    const capped = truncateApproxTokens(extracted, input.config.maxTokens);
    await log(input.client, "info", "finished quorum member", { label: model.label, elapsedMs: Date.now() - started });
    return {
      label: model.label,
      providerID: model.providerID,
      modelID: model.modelID,
      ok: true,
      text: capped.text,
      elapsedMs: Date.now() - started,
      truncated: capped.truncated
    };
  } catch (error) {
    await log(input.client, "warn", "quorum member failed", { label: model.label, error: errorMessage(error) });
    return {
      label: model.label,
      providerID: model.providerID,
      modelID: model.modelID,
      ok: false,
      error: errorMessage(error),
      elapsedMs: Date.now() - started,
      truncated: false
    };
  } finally {
    if (childID) {
      await input.client.session.delete({ path: { id: childID }, throwOnError: true }).catch(async (error) => {
        await log(input.client, "warn", "failed to delete quorum child session", { childID, error: errorMessage(error) });
      });
    }
  }
}
async function runQuorum(input) {
  if (input.abortSignal.aborted) {
    throw new Error("quorum consult aborted before dispatch");
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const responses = await mapLimited(input.config.models, input.config.concurrency, (model) => consultOne(input, model));
  const droppedModels = responses.filter((response) => !response.ok).map((response) => response.label);
  const successCount = responses.filter((response) => response.ok).length;
  const aborted = successCount < 2;
  const abortReason = aborted ? `Fewer than two quorum members responded successfully (${successCount}/${responses.length}).` : void 0;
  const synthesisPrompt = renderSynthesisPrompt({ topic: input.topic, responses, droppedModels });
  return {
    responses,
    synthesisPrompt,
    meta: {
      topic: input.topic,
      startedAt,
      droppedModels,
      aborted,
      ...abortReason ? { abortReason } : {}
    }
  };
}

// src/session.ts
async function isSubagentSession(client, sessionID) {
  const response = await client.session.get({ path: { id: sessionID }, throwOnError: true });
  return Boolean(response.data.parentID);
}

// src/tool.ts
function createQuorumTool(client, config) {
  return tool({
    description: "Fan out a planning prompt to the configured quorum of models and return their responses for synthesis. Use when starting any creative or planning work before writing code.",
    args: {
      topic: tool.schema.string().describe("Short label for this design topic; used by the orchestrator for the spec filename slug."),
      prompt: tool.schema.string().describe("Full planning prompt sent to each quorum member."),
      context: tool.schema.string().optional().describe("Optional project context, constraints, or success criteria appended to each member prompt.")
    },
    async execute(args, context) {
      const isSubagent = await isSubagentSession(client, context.sessionID);
      if (isSubagent) {
        return JSON.stringify({
          error: "quorum_consult is only available in root sessions. Ask the root orchestrator to consult the quorum."
        });
      }
      const payload = await runQuorum({
        client,
        sessionID: context.sessionID,
        topic: args.topic,
        prompt: args.prompt,
        ...args.context !== void 0 ? { context: args.context } : {},
        config,
        abortSignal: context.abort
      });
      return JSON.stringify(payload, null, 2);
    }
  });
}

// src/plugin.ts
function adaptClient(client) {
  return {
    session: {
      get: (input) => client.session.get({ ...input, throwOnError: true }),
      create: (input) => client.session.create({ ...input, throwOnError: true }),
      prompt: (input) => client.session.prompt({ ...input, throwOnError: true }),
      delete: (input) => client.session.delete({ ...input, throwOnError: true })
    },
    app: {
      log: (input) => client.app.log(input)
    }
  };
}
function createHooks(client, config) {
  if (config.triggerMode === "off") return {};
  const quorumTool = createQuorumTool(client, config);
  const bootstrap = renderBootstrap(config);
  return {
    tool: { quorum_consult: quorumTool },
    ...bootstrap !== null ? {
      "experimental.chat.system.transform": async (_input, output) => {
        output.system.push(bootstrap);
      }
    } : {}
  };
}
var QuorumPlugin = async ({ client }) => {
  const config = loadConfig();
  return createHooks(adaptClient(client), config);
};
var plugin_default = QuorumPlugin;
export {
  QuorumPlugin,
  createHooks,
  plugin_default as default
};
