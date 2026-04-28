// src/plugin.ts
import { fileURLToPath } from "node:url";
import * as path2 from "node:path";

// src/prompts.ts
var DEEP_MEMBER_SYSTEM_PROMPT = `You are a deep-review member of a quorum of planning consultants. You are invoked only on explicit request for second-order analysis, double-checking, or high-stakes architecture review.

Your role is to be thorough, critical, and unconventional where warranted.

Requirements:
- Identify second-order implications and downstream consequences of the proposed approach.
- Actively challenge assumptions \u2014 name them explicitly and question whether they hold.
- If prior synthesis is provided, critique it: identify what it got right, what it missed, and where it was overconfident.
- Surface failure modes, edge cases, and risks that a first-pass analysis may have overlooked.
- Do not simply restate or validate prior work. Add new signal.
- Do not call tools.
- Do not write files.
- Do not claim consensus; provide your independent critical perspective.`;
var MEMBER_SYSTEM_PROMPT = `You are one member of a quorum of planning consultants.

Read the planning question carefully and propose a practical approach with rationale.

Requirements:
- Address architecture, components, data flow, and tradeoffs.
- Surface assumptions and open questions that could change the design.
- Keep the response focused and concrete.
- Do not call tools.
- Do not write files.
- Do not claim consensus; provide your independent perspective.`;

// src/agents.ts
function buildAgentConfigs(config) {
  const output = {};
  for (const member of config.members) {
    output[member.name] = {
      mode: "subagent",
      model: `${member.providerID}/${member.modelID}`,
      prompt: MEMBER_SYSTEM_PROMPT,
      description: `Quorum planning member (${member.label})`,
      tools: {},
      reasoningEffort: member.reasoningEffort ?? "high"
    };
  }
  if (config.deepMembers) {
    for (const member of config.deepMembers) {
      output[member.name] = {
        mode: "subagent",
        model: `${member.providerID}/${member.modelID}`,
        prompt: DEEP_MEMBER_SYSTEM_PROMPT,
        description: `Quorum deep-review member (${member.label}). Use only on explicit deep-analysis or double-check requests.`,
        tools: {},
        reasoningEffort: member.reasoningEffort ?? "xhigh"
      };
    }
  }
  return output;
}

// src/bootstrap.ts
function renderBootstrap(config) {
  if (config.triggerMode !== "auto") return null;
  const memberList = config.members.map((member) => member.name).join(", ");
  const deepBlock = config.deepMembers && config.deepMembers.length > 0 ? `

<quorum-deep>
Deep-review members available: ${config.deepMembers.map((m) => m.name).join(", ")}.

Hard rule: never invoke deep members by default. Only dispatch on explicit user request.

Triggers for deep review:
- User explicitly asks for deeper analysis, double-check, or follow-up review.
- User contests or expresses doubt about a prior synthesis.

Two dispatch modes:
- Replace (upfront): user asks for deep analysis before regular synthesis \u2192 dispatch deep members instead of regular members.
- Follow-up (escalation): regular synthesis already produced, user asks for double-check \u2192 dispatch deep members with prior synthesis and original request as context.

When regular synthesis is contested or uncertain, you may offer deep follow-up \u2014 but never invoke deep members without explicit user approval.

Deep output should be rendered as a distinct "Deep review" section, not merged into the regular synthesis.
</quorum-deep>` : "";
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

When you have open or clarification questions during a quorum workflow, ask them directly to the user \u2014 via the opencode question tool or in prose. Never dispatch clarification questions to subagents via task calls.
</quorum-bootstrap>${deepBlock}`;
}

// src/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
var MEMBER_NAME_RE = /^[a-z][a-z0-9-]*$/;
var DEFAULT_CONFIG = {
  members: [
    { name: "quorum-sonnet", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
    { name: "quorum-gpt5", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { name: "quorum-gemini", providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "gemini" }
  ],
  triggerMode: "auto",
  specDir: "docs/quorum/specs"
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function parseTriggerMode(value) {
  return value === "auto" || value === "manual" || value === "off" ? value : void 0;
}
function parseReasoningEffort(value) {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" ? value : void 0;
}
function parseMember(value) {
  if (!isRecord(value)) return void 0;
  const name = nonEmptyString(value.name);
  const providerID = nonEmptyString(value.providerID);
  const modelID = nonEmptyString(value.modelID);
  const label = nonEmptyString(value.label);
  if (!name || !providerID || !modelID || !label) return void 0;
  if (!MEMBER_NAME_RE.test(name)) return void 0;
  const member = { name, providerID, modelID, label };
  if (value.reasoningEffort !== void 0) {
    const effort = parseReasoningEffort(value.reasoningEffort);
    if (effort !== void 0) member.reasoningEffort = effort;
  }
  return member;
}
function parseDeepMembers(value, memberNames) {
  if (!Array.isArray(value)) return void 0;
  if (value.length === 0) return void 0;
  const deep = value.map(parseMember).filter((m) => m !== void 0);
  if (deep.length === 0) return void 0;
  const deepNames = /* @__PURE__ */ new Set();
  for (const m of deep) {
    if (deepNames.has(m.name)) return void 0;
    if (memberNames.has(m.name)) return void 0;
    deepNames.add(m.name);
  }
  return deep;
}
function parseMembers(value) {
  if (!Array.isArray(value)) return void 0;
  const members = value.map(parseMember).filter((member) => member !== void 0);
  if (members.length < 2) return void 0;
  const names = /* @__PURE__ */ new Set();
  for (const member of members) {
    if (names.has(member.name)) return void 0;
    names.add(member.name);
  }
  return members;
}
function parseConfig(value) {
  if (!isRecord(value)) return DEFAULT_CONFIG;
  const members = parseMembers(value.members) ?? DEFAULT_CONFIG.members;
  const memberNames = new Set(members.map((m) => m.name));
  const deepMembers = parseDeepMembers(value.deepMembers, memberNames);
  const config = {
    members,
    triggerMode: parseTriggerMode(value.triggerMode) ?? DEFAULT_CONFIG.triggerMode,
    specDir: nonEmptyString(value.specDir) ?? DEFAULT_CONFIG.specDir
  };
  if (deepMembers !== void 0) config.deepMembers = deepMembers;
  return config;
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

// src/plugin.ts
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
var SKILLS_DIR = path2.resolve(__dirname, "../../skills");
function createHooks(config, skillsDir = SKILLS_DIR) {
  const registerAgents = config.triggerMode !== "off";
  const incomingAgents = registerAgents ? buildAgentConfigs(config) : {};
  const bootstrap = registerAgents ? renderBootstrap(config) : null;
  return {
    config: async (rawInput) => {
      const input = rawInput;
      input.skills = input.skills ?? {};
      input.skills.paths = input.skills.paths ?? [];
      if (!input.skills.paths.includes(skillsDir)) {
        input.skills.paths.push(skillsDir);
      }
      if (registerAgents) {
        input.agent = input.agent ?? {};
        for (const [name, def] of Object.entries(incomingAgents)) {
          if (input.agent[name] !== void 0) continue;
          input.agent[name] = def;
        }
      }
    },
    ...bootstrap !== null ? {
      "experimental.chat.system.transform": async (_input, output) => {
        output.system.push(bootstrap);
      }
    } : {}
  };
}
var QuorumPlugin = async () => {
  const config = loadConfig();
  return createHooks(config);
};
var plugin_default = QuorumPlugin;
export {
  QuorumPlugin,
  createHooks,
  plugin_default as default
};
