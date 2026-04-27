import { describe, expect, it } from "vitest"
import { isSubagentSession } from "../src/session.js"
import type { OpencodeClientLike } from "../src/types.js"

function fakeClient(parentID?: string): OpencodeClientLike {
  return {
    session: {
      async get() {
        return { data: parentID ? { id: "child", parentID } : { id: "root" } }
      },
      async create() {
        return { data: { id: "unused" } }
      },
      async prompt() {
        return { data: { parts: [] } }
      },
      async delete() {
        return {}
      },
    },
  }
}

describe("session helpers", () => {
  it("detects root sessions", async () => {
    await expect(isSubagentSession(fakeClient(), "root")).resolves.toBe(false)
  })

  it("detects subagent sessions", async () => {
    await expect(isSubagentSession(fakeClient("root"), "child")).resolves.toBe(true)
  })
})
