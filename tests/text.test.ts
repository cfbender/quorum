import { describe, expect, it } from "vitest"
import { extractTextParts, truncateApproxTokens } from "../src/text.js"

describe("text helpers", () => {
  it("extracts text from opencode parts and ignores non-text parts", () => {
    const text = extractTextParts([
      { type: "text", text: "Hello" },
      { type: "file", mime: "text/plain" },
      { type: "text", text: " world" },
      { type: "text", text: 42 },
    ])

    expect(text).toBe("Hello world")
  })

  it("does not truncate short text", () => {
    expect(truncateApproxTokens("short", 10)).toEqual({ text: "short", truncated: false })
  })

  it("truncates long text using a four-character token estimate", () => {
    const input = "x".repeat(50)
    const result = truncateApproxTokens(input, 5)
    expect(result.truncated).toBe(true)
    expect(result.text.startsWith("x".repeat(20))).toBe(true)
    expect(result.text).toContain("[Truncated by quorum")
  })
})
