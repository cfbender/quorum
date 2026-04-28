# quorum

Quorum is an opencode plugin that enforces multi-model planning discipline. It registers each configured member as a named subagent via the opencode `config` hook, then injects a bootstrap prompt that instructs the orchestrator to dispatch parallel `task` calls to those members before any creative or planning work. Member responses appear as native subtask drilldowns. The orchestrator synthesizes agreement, differences, partial coverage, unique insights, blind spots, open questions, and a proposed design.

## Install

Add the plugin to `opencode.json`:

```jsonc
{
  "plugin": [
    "quorum@git+https://github.com/cfbender/quorum.git"
  ]
}
```

Create `~/.config/opencode/quorum.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/cfbender/quorum/main/schema.json",
  "members": [
    { "name": "quorum-sonnet", "providerID": "openrouter", "modelID": "anthropic/claude-sonnet-4.6", "label": "sonnet" },
    { "name": "quorum-gpt5", "providerID": "openrouter", "modelID": "openai/gpt-5.4", "label": "gpt5" },
    { "name": "quorum-gemini", "providerID": "openrouter", "modelID": "google/gemini-3.1-pro-preview", "label": "gemini" }
  ],
  "triggerMode": "auto",
  "specDir": "docs/quorum/specs"
}
```

Each entry in `members` requires:

- `name` — kebab-case agent identifier matching `^[a-z][a-z0-9-]*$`. Used to dispatch `task` calls.
- `providerID` — opencode provider (e.g. `openrouter`).
- `modelID` — model path understood by the provider.
- `label` — short display name used in synthesis output.

At least two members are required.

## Trigger modes

- `auto`: registers all members as subagents **and** injects the bootstrap system prompt. The orchestrator automatically dispatches parallel planning tasks before creative work.
- `manual`: registers all members as subagents but does **not** inject the bootstrap. The orchestrator can still dispatch member tasks on demand, but does not do so automatically.
- `off`: disables all plugin hooks. No members are registered and no bootstrap is injected.

## Development

```bash
npm install
npm run verify
```

The compiled plugin is written to `.opencode/plugins/quorum.js` and is checked into git so git-based installs do not need a build step.

## Smoke test after install

1. Start a fresh opencode session.
2. Start a planning request such as: "Help me design a new CLI tool for X."
3. Confirm the orchestrator dispatches parallel `task` calls to each quorum member (e.g. `quorum-sonnet`, `quorum-gpt5`, `quorum-gemini`).
4. Confirm each member response appears as a native subtask drilldown.
5. Confirm the synthesis includes Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design.
6. Confirm discrete open questions are asked with the opencode `question` tool.
7. Approve the design and confirm the spec is written under `{specDir}` as a local scratch file and is not tracked by git. Confirm the orchestrator commits the relevant high-level doc updates (for example `AGENTS.md`).
8. Set `triggerMode` to `manual`, start a new session, and confirm the bootstrap is absent but members are still registered.
9. Set `triggerMode` to `off` and confirm no members appear and no bootstrap is injected.

## Migrating from v0.1

The following top-level config fields have been removed in v0.2:

| Removed field | Replacement |
|---|---|
| `models` | `members` (each entry now requires a `name` field) |
| `concurrency` | Parallelism is handled natively by opencode `task` dispatch |
| `timeoutMs` | No longer configurable; opencode manages task timeouts |
| `maxTokens` | No longer configurable; member agents use provider defaults |
| `reasoningEffort` | No longer configurable; member agents use `high` effort by default |

The `quorum_consult` tool has been removed. Replace any workflow that called it directly with parallel `task` calls to the configured member agents.
