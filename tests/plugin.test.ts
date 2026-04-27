import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { createHooks } from "../src/plugin.js"
import type { OpencodeClientLike, QuorumConfig } from "../src/types.js"

function fakeClient(): OpencodeClientLike {
  return {
    session: {
      async get() {
        return { data: { id: "root" } }
      },
      async create() {
        return { data: { id: "child" } }
      },
      async prompt() {
        return { data: { parts: [{ type: "text", text: "answer" }] } }
      },
      async delete() {
        return {}
      },
    },
  }
}

describe("plugin hooks", () => {
  it("registers tool and system bootstrap in auto mode", async () => {
    const hooks = createHooks(fakeClient(), DEFAULT_CONFIG)
    expect(hooks.tool?.quorum_consult).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } }, output)
    expect(output.system.join("\n")).toContain("quorum_consult")
  })

  it("registers only the tool in manual mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "manual" }
    const hooks = createHooks(fakeClient(), config)
    expect(hooks.tool?.quorum_consult).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()
  })

  it("registers no hooks in off mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "off" }
    expect(createHooks(fakeClient(), config)).toEqual({})
  })
})
