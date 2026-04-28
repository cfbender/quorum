import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { createHooks } from "../src/plugin.js"

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
})
