# quorum

Quorum adds multi-model deliberation as a primitive. It registers each configured member as a named subagent and injects a bootstrap prompt that instructs the orchestrator to dispatch parallel `task` calls to those members for planning-class work. The orchestrator synthesizes agreement, differences, partial coverage, unique insights, blind spots, open questions, and a proposed design — then hands off.

Quorum is intentionally narrow: fan out and synthesize. It does not write spec files, update high-level docs, or gate implementation. Those responsibilities belong to caller skills (for example `adaptive-planning`, `to-prd`, or `to-issues`) or to the main thread.

Quorum is available as both an **OpenCode TypeScript plugin** (see below) and a **Hygge Lua plugin** (`hygge/`).

## Install — OpenCode

Add the plugin to `opencode.json`:

```jsonc
{
  "plugin": [
    "quorum@git+https://github.com/cfbender/quorum.git@latest"
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
  "triggerMode": "auto"
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

## Install — Hygge

The `hygge/` directory is a self-contained Hygge Lua plugin. It reuses the same `quorum.json` config schema but reads from `~/.config/hygge/quorum.json`.

### Install from local path

```bash
hygge plugins install local:/path/to/quorum/hygge
```

### Install from GitHub

```bash
hygge plugins install github:cfbender/quorum
```

The repository root contains a Hygge `plugin.toml` whose entrypoint points at `hygge/plugin.lua`, so GitHub installs work from the repo root. Local installs can point either at the repo root or directly at the `hygge/` subdirectory.

### Config file

Create `~/.config/hygge/quorum.json` (same schema as the OpenCode config):

```json
{
  "members": [
    { "name": "quorum-sonnet", "providerID": "openrouter", "modelID": "anthropic/claude-sonnet-4.6", "label": "sonnet" },
    { "name": "quorum-gpt5",   "providerID": "openrouter", "modelID": "openai/gpt-5.4",              "label": "gpt5"   },
    { "name": "quorum-gemini", "providerID": "openrouter", "modelID": "google/gemini-3.1-pro-preview","label": "gemini" }
  ],
  "triggerMode": "auto"
}
```

If `~/.config/hygge/quorum.json` is absent the plugin starts with built-in defaults. The `$schema` field is optional and ignored by the Lua parser.

### Hygge trigger modes

- `auto`: registers all members as subagents **and** injects the bootstrap `pre_message` hook. The agent automatically considers quorum before planning-class work.
- `manual`: registers subagents but does **not** inject the bootstrap hook. You can still dispatch member tasks on demand.
- `off`: disables both registration and the hook.

### Hygge slash command

`/quorum-status` prints the active config (members, trigger mode, any parse issues) without leaving the chat.

### Limitations vs. OpenCode port

| Feature | OpenCode | Hygge |
|---|---|---|
| Config path | `~/.config/opencode/quorum.json` | `~/.config/hygge/quorum.json` |
| Config hot-reload hint | ✅ mtime check + `<quorum-restart-required>` | ❌ no mtime check (Hygge has no per-turn hook for system prompt injection) |
| Skill auto-registration | ✅ | ❌ install the skill separately if needed |
| `reasoningEffort` per member | ✅ | ❌ Hygge subagent API does not expose per-subagent reasoning effort |
| JSON parsing | Native (TypeScript) | Lua pattern matching (handles well-formed quorum.json; exotic escapes may fail) |

## Development

```bash
npm install
npm run verify
```

The compiled plugin is written to `.opencode/plugins/quorum.js` and is checked into git so git-based installs do not need a build step.
The package intentionally uses `npm run build:plugin` instead of a `build` script: npm prepares git dependencies when `scripts.build` exists, and OpenCode's plugin installer cannot complete that preparation path.

## Acknowledgments

Quorum draws inspiration from two prior works on multi-model orchestration:

- [Superpowers](https://github.com/obra/superpowers) — skill-based agent augmentation patterns.
- [OpenRouter Fusion](https://openrouter.ai/labs/fusion) — parallel multi-model synthesis.
