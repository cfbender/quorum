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

- `name` — agent identifier used to dispatch `task` calls. Any non-empty string is accepted; opencode itself may impose further constraints.
- `providerID` — opencode provider (e.g. `openrouter`).
- `modelID` — model path understood by the provider.
- `label` — short display name used in synthesis output.
- `reasoningEffort` *(optional)* — overrides the pool default. One of `"low"`, `"medium"`, `"high"`, `"xhigh"`. Default for regular members is `"high"`.

At least two members are required. Member names must be unique within `members`.

### Config reload & validation

- `quorum.json` is read **once, at opencode startup**. Opencode registers plugin-provided agents only at boot — there is no runtime re-registration API. If you edit `quorum.json` in an active session, restart opencode for changes to take effect.
- The plugin stats `quorum.json` on every chat turn. If its mtime is newer than when opencode started, the bootstrap system prompt gains a `<quorum-restart-required>` block instructing the orchestrator to tell you to restart opencode. This prevents silently dispatching stale agents.
- Parse failures are surfaced, not swallowed. If any member entry is invalid (missing field, duplicate name, etc.), the plugin:
  1. Logs a `[quorum] Config issues:` warning to opencode's plugin log at startup.
  2. Injects a `<quorum-config-issues>` block into the bootstrap prompt on every chat turn until the config is fixed, so the orchestrator tells you what's wrong.
  3. Falls back to `DEFAULT_CONFIG` only for the specific field that failed (the rest of a valid config is preserved).

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

