# quorum

Quorum is an opencode plugin that enforces multi-model planning discipline. It adds a `quorum_consult` tool that fans a planning prompt out to multiple configured models, returns the labeled responses, and instructs the main conversation model to synthesize agreement, differences, partial coverage, unique insights, blind spots, open questions, and a proposed design.

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
  "models": [
    { "providerID": "openrouter", "modelID": "anthropic/claude-opus-4.7", "label": "opus" },
    { "providerID": "openrouter", "modelID": "openai/gpt-5.4", "label": "gpt5" },
    { "providerID": "openrouter", "modelID": "google/gemini-3.1-pro-preview", "label": "gemini" }
  ],
  "concurrency": 3,
  "timeoutMs": 120000,
  "maxTokens": 4000,
  "reasoningEffort": "high",
  "triggerMode": "auto",
  "specDir": "docs/quorum/specs"
}
```

## Trigger modes

- `auto`: injects the bootstrap system prompt and registers `quorum_consult`.
- `manual`: registers `quorum_consult` without injecting the bootstrap.
- `off`: disables the plugin hooks.

## Development

```bash
npm install
npm run verify
```

The compiled plugin is written to `.opencode/plugins/quorum.js` and is checked into git so git-based installs do not need a build step.

## Smoke test after install

1. Start a fresh opencode session.
2. Start a planning request such as: "Help me design a new CLI tool for X."
3. Confirm the orchestrator invokes `quorum_consult` before writing code.
4. Confirm labeled model responses are returned.
5. Confirm the synthesis includes Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, and Proposed design.
6. Confirm discrete open questions are asked with the opencode `question` tool.
7. Approve the design and confirm the spec is written under `{specDir}` as a local scratch file and is not tracked by git. Confirm the orchestrator instead commits the relevant high-level doc updates (for example `AGENTS.md`).
8. Set `triggerMode` to `manual`, start a new session, and confirm the bootstrap is absent.
9. Configure one nonexistent model and confirm the failed model appears in `droppedModels` while the others still return.
