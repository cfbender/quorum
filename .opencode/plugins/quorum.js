// src/plugin.ts
import { fileURLToPath } from "node:url";
import * as fs2 from "node:fs";
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
- User refers to the deep pool by name \u2014 phrasings like "ask the deep quorum", "deep quorum", "deep members", "deep pool", "the deep ones", "use the heavy models", or "run the deep review" all count as explicit requests.
- User contests or expresses doubt about a prior synthesis.

Treat any user message that names the deep pool or asks for heavier/deeper review as explicit approval to dispatch deep members. You do not need to ask for additional confirmation in that case.

Two dispatch modes:
- Replace (upfront): user asks for deep analysis before regular synthesis \u2192 dispatch deep members instead of regular members.
- Follow-up (escalation): regular synthesis already produced, user asks for double-check \u2192 dispatch deep members with prior synthesis and original request as context.

When regular synthesis is contested or uncertain, you may offer deep follow-up \u2014 but never invoke deep members without explicit user approval.

Deep output should be rendered as a distinct "Deep review" section, not merged into the regular synthesis.
</quorum-deep>` : "";
  return `<quorum-bootstrap>
You have quorum planning members available as subagents: ${memberList}.

Trigger gate \u2014 run before dispatching any implementation subagent, asking the user clarifying questions, or writing code beyond a trivial edit. Answer each question:

1. Are there two or more meaningful design, product, or UX choices that the user has not already decided?
2. Is prior art in this codebase ambiguous, absent, or not an obvious match for the approach?
3. Will this ship user-facing behavior \u2014 UI, API surface, data model, auth, or persisted state?

If any answer is yes, load the quorum skill and run quorum first. The quorum's proposed design then becomes the basis for clarifying questions, not the reverse.

If all three answers are no, quorum is not required. Typical skips: obvious bug fixes with a known root cause, typo or wording-only edits, dependency-only bumps, running an existing command, or factual questions. A small ticket with a clear blueprint from prior work and a mechanical implementation path also skips.

If you are unsure, treat the request as planning-class and run quorum.

For planning-class requests, load the quorum skill and dispatch parallel task calls to each member with the same planning prompt. Use member outputs to synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design. Prefer opencode question tool for discrete open questions. Receive explicit design approval before implementation.

When you have open or clarification questions during a quorum workflow, ask them directly to the user \u2014 via the opencode question tool or in prose. Never dispatch clarification questions to subagents via task calls.
</quorum-bootstrap>${deepBlock}`;
}

// src/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
function parseMemberWithDiagnostic(value, index) {
  if (!isRecord(value)) {
    return { issue: `Invalid member entry at index ${index}: expected an object` };
  }
  const name = nonEmptyString(value.name);
  if (!name) {
    return { issue: `Invalid member entry at index ${index}: missing required field 'name' or it is not a non-empty string` };
  }
  const providerID = nonEmptyString(value.providerID);
  if (!providerID) {
    return { issue: `Invalid member entry at index ${index}: field 'providerID' must be a non-empty string` };
  }
  const modelID = nonEmptyString(value.modelID);
  if (!modelID) {
    return { issue: `Invalid member entry at index ${index}: field 'modelID' must be a non-empty string` };
  }
  const label = nonEmptyString(value.label);
  if (!label) {
    return { issue: `Invalid member entry at index ${index}: field 'label' must be a non-empty string` };
  }
  const member = { name, providerID, modelID, label };
  if (value.reasoningEffort !== void 0) {
    const effort = parseReasoningEffort(value.reasoningEffort);
    if (effort !== void 0) member.reasoningEffort = effort;
  }
  return { member };
}
function parseMembersWithDiagnostics(value, issues) {
  if (!Array.isArray(value)) return void 0;
  const members = [];
  for (let i = 0; i < value.length; i++) {
    const result = parseMemberWithDiagnostic(value[i], i);
    if ("member" in result) {
      members.push(result.member);
    } else {
      issues.push(result.issue);
    }
  }
  if (members.length < 2) {
    issues.push(
      `Fewer than 2 valid members parsed (got ${members.length}); config falling back to defaults`
    );
    return void 0;
  }
  const names = /* @__PURE__ */ new Set();
  for (const member of members) {
    if (names.has(member.name)) {
      issues.push(
        `Duplicate member name '${member.name}'; config falling back to defaults`
      );
      return void 0;
    }
    names.add(member.name);
  }
  return members;
}
function parseDeepMembersWithDiagnostics(value, memberNames, issues) {
  if (!Array.isArray(value)) return void 0;
  if (value.length === 0) return void 0;
  const deep = [];
  for (let i = 0; i < value.length; i++) {
    const result = parseMemberWithDiagnostic(value[i], i);
    if ("member" in result) {
      deep.push(result.member);
    } else {
      issues.push(`deepMembers: ${result.issue}`);
    }
  }
  if (deep.length === 0) return void 0;
  const deepNames = /* @__PURE__ */ new Set();
  for (const m of deep) {
    if (deepNames.has(m.name)) {
      issues.push(
        `deepMembers: duplicate name '${m.name}'; deepMembers dropped`
      );
      return void 0;
    }
    if (memberNames.has(m.name)) {
      issues.push(
        `deepMembers entry collides with a regular member name '${m.name}'; deepMembers dropped`
      );
      return void 0;
    }
    deepNames.add(m.name);
  }
  return deep;
}
function parseConfig(value) {
  const issues = [];
  if (!isRecord(value)) {
    issues.push("Config root is not an object; falling back to defaults");
    return { config: DEFAULT_CONFIG, issues };
  }
  const members = parseMembersWithDiagnostics(value.members, issues);
  const resolvedMembers = members ?? DEFAULT_CONFIG.members;
  const memberNames = new Set(resolvedMembers.map((m) => m.name));
  const deepMembers = parseDeepMembersWithDiagnostics(value.deepMembers, memberNames, issues);
  const config = {
    members: resolvedMembers,
    triggerMode: parseTriggerMode(value.triggerMode) ?? DEFAULT_CONFIG.triggerMode,
    specDir: nonEmptyString(value.specDir) ?? DEFAULT_CONFIG.specDir
  };
  if (deepMembers !== void 0) config.deepMembers = deepMembers;
  return { config, issues };
}
function resolveConfigPath(configDir = process.env.OPENCODE_CONFIG_DIR ?? path.join(os.homedir(), ".config", "opencode")) {
  return path.join(configDir, "quorum.json");
}
function loadConfig(configDir) {
  const filePath = resolveConfigPath(configDir);
  if (!fs.existsSync(filePath)) return { config: DEFAULT_CONFIG, issues: [] };
  const raw = fs.readFileSync(filePath, "utf8");
  return parseConfig(JSON.parse(raw));
}

// src/plugin.ts
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
var SKILLS_DIR = path2.resolve(__dirname, "../../skills");
function createHooks(config, skillsDir = SKILLS_DIR, extras = {}) {
  const { issues = [], configPath, bootMtime } = extras;
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
        const parts = [];
        if (configPath != null && bootMtime != null) {
          try {
            const currentMtime = fs2.statSync(configPath).mtimeMs;
            if (currentMtime > bootMtime) {
              const lastModified = new Date(currentMtime).toISOString();
              parts.push(
                `<quorum-restart-required>
quorum.json has been edited since opencode started (last modified: ${lastModified}). The currently registered quorum agents reflect the old config. Restart opencode to apply changes. Tell the user this before proceeding with any quorum work.
</quorum-restart-required>`
              );
            }
          } catch {
          }
        }
        if (issues.length > 0) {
          const issueLines = issues.map((issue) => `- ${issue}`).join("\n");
          parts.push(
            `<quorum-config-issues>
The following issues were detected in quorum.json at opencode startup. Tell the user so they can fix their config:
${issueLines}
</quorum-config-issues>`
          );
        }
        parts.push(bootstrap);
        output.system.push(parts.join("\n\n"));
      }
    } : {}
  };
}
var QuorumPlugin = async () => {
  const { config, issues } = loadConfig();
  if (issues.length > 0) {
    console.warn("[quorum] Config issues:\n" + issues.join("\n"));
  }
  const configPath = resolveConfigPath();
  const bootMtime = fs2.existsSync(configPath) ? fs2.statSync(configPath).mtimeMs : null;
  return createHooks(config, SKILLS_DIR, { issues, configPath, bootMtime });
};
var plugin_default = QuorumPlugin;
export {
  QuorumPlugin,
  createHooks,
  plugin_default as default
};
