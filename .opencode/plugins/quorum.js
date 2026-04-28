// src/prompts.ts
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
      reasoningEffort: "high"
    };
  }
  return output;
}

// src/bootstrap.ts
function renderBootstrap(config) {
  if (config.triggerMode !== "auto") return null;
  const memberList = config.members.map((member) => member.name).join(", ");
  return `<quorum-bootstrap>
You have quorum planning members available as subagents: ${memberList}.

Before creative or planning work, load the quorum skill and dispatch parallel task calls to each member with the same planning prompt.

Use member outputs to synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design.

Prefer opencode question tool for discrete open questions. Receive explicit design approval before implementation.
</quorum-bootstrap>`;
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
function parseMember(value) {
  if (!isRecord(value)) return void 0;
  const name = nonEmptyString(value.name);
  const providerID = nonEmptyString(value.providerID);
  const modelID = nonEmptyString(value.modelID);
  const label = nonEmptyString(value.label);
  if (!name || !providerID || !modelID || !label) return void 0;
  if (!MEMBER_NAME_RE.test(name)) return void 0;
  return { name, providerID, modelID, label };
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
  return {
    members: parseMembers(value.members) ?? DEFAULT_CONFIG.members,
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

// src/plugin.ts
function createHooks(config) {
  if (config.triggerMode === "off") return {};
  const incomingAgents = buildAgentConfigs(config);
  const bootstrap = renderBootstrap(config);
  return {
    config: async (input) => {
      input.agent = input.agent ?? {};
      for (const [name, def] of Object.entries(incomingAgents)) {
        if (input.agent[name] !== void 0) continue;
        input.agent[name] = def;
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
