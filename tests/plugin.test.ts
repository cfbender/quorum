import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { createHooks } from "../src/plugin.js"
import type { QuorumConfig } from "../src/types.js"

describe("plugin hooks", () => {
  it("registers config hook and bootstrap in auto mode", async () => {
    const hooks = createHooks(DEFAULT_CONFIG)
    expect(hooks.config).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()

    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toContain("quorum-sonnet")

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    expect(output.system.join("\n")).toContain("quorum-sonnet")
    expect(output.system.join("\n")).toContain("task")
    expect(output.system.join("\n")).toContain("new feature work")
    expect(output.system.join("\n")).toContain("obvious bug fixes")
    expect(output.system.join("\n")).toContain("If you are unsure whether a request is planning-class")
  })

  it("registers only config hook in manual mode", () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "manual" })
    expect(hooks.config).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()
  })

  it("registers no hooks in off mode", () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "off" })
    expect(hooks).toEqual({})
  })

  it("deep agents appear in input.agent when deepMembers configured", async () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    const hooks = createHooks(config)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toContain("quorum-sonnet")
    expect(Object.keys(cfg.agent)).toContain("quorum-deep-a")
  })

  it("hook shape unchanged for configs without deepMembers", async () => {
    const hooks = createHooks(DEFAULT_CONFIG)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toHaveLength(3)
    expect(Object.keys(cfg.agent)).toEqual(["quorum-sonnet", "quorum-gpt5", "quorum-gemini"])
  })
})
