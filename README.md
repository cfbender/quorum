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
- `reasoningEffort` *(optional)* — overrides the pool default. One of `"low"`, `"medium"`, `"high"`, `"xhigh"`. Default for regular members is `"high"`.

At least two members are required.

### Deep members (opt-in)

`deepMembers` is an optional second pool for heavier, more expensive analysis. Deep members are **never invoked by default** — they run only on explicit user request ("go deeper", "double-check this", follow-up review).

```json
{
  "members": [
    { "name": "quorum-sonnet", "providerID": "openrouter", "modelID": "anthropic/claude-sonnet-4.6", "label": "sonnet" },
    { "name": "quorum-gpt5", "providerID": "openrouter", "modelID": "openai/gpt-5.4", "label": "gpt5" },
    { "name": "quorum-gemini", "providerID": "openrouter", "modelID": "google/gemini-3.1-pro-preview", "label": "gemini" }
  ],
  "deepMembers": [
    { "name": "quorum-deep-sonnet", "providerID": "openrouter", "modelID": "anthropic/claude-opus-4-5", "label": "opus", "reasoningEffort": "xhigh" },
    { "name": "quorum-deep-o3", "providerID": "openrouter", "modelID": "openai/o3", "label": "o3" }
  ],
  "triggerMode": "auto",
  "specDir": "docs/quorum/specs"
}
```

Rules for `deepMembers`:

- At least one entry required (if the field is present).
- Same per-entry fields as `members` (same name pattern, same required fields).
- `name` values must be unique within `deepMembers` and must not collide with any name in `members`.
- `reasoningEffort` default for deep members is `"xhigh"` (overridden per-entry if set).
- If `deepMembers` is malformed (empty after filtering, duplicate names, name collision with `members`), the field is silently dropped — the rest of the config is unaffected.

## Trigger modes

- `auto`: registers all members as subagents **and** injects the bootstrap system prompt. The orchestrator automatically dispatches parallel planning tasks before creative work.
- `manual`: registers all members as subagents but does **not** inject the bootstrap. The orchestrator can still dispatch member tasks on demand, but does not do so automatically.
- `off`: disables agent registration and bootstrap injection, but the `quorum` skill is still auto-registered so it can be loaded manually via the `skill` tool.

The `quorum` skill is auto-registered on plugin load — no symlink or manual copy required. Once the plugin is installed, the skill appears in OpenCode's skill list and can be loaded via the `skill` tool.

By default, quorum-first behavior applies to planning-class requests: new feature work, behavior changes, and architecture or design decisions. It is not required for obvious bug fixes, typo/wording-only edits, dependency-only bumps, running an existing command, or factual questions. If uncertain, treat the request as planning-class and run quorum.

## Development

```bash
npm install
npm run verify
```

The compiled plugin is written to `.opencode/plugins/quorum.js` and is checked into git so git-based installs do not need a build step.

## Acknowledgments

Quorum draws inspiration from two prior works on multi-model orchestration:

- [Superpowers](https://github.com/obra/superpowers) — skill-based agent augmentation patterns.
- [OpenRouter Fusion](https://openrouter.ai/labs/fusion) — parallel multi-model synthesis.

