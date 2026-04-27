function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function extractTextParts(parts: unknown[]): string {
  return parts.map((part) => {
    if (!isRecord(part)) return ""
    if (part.type !== "text") return ""
    return typeof part.text === "string" ? part.text : ""
  }).join("")
}

export function truncateApproxTokens(text: string, maxTokens: number): { text: string; truncated: boolean } {
  const maxChars = Math.max(1, maxTokens * 4)
  if (text.length <= maxChars) return { text, truncated: false }
  const truncated = text.slice(0, maxChars).trimEnd()
  return {
    text: `${truncated}\n\n[Truncated by quorum after approximately ${maxTokens} tokens.]`,
    truncated: true,
  }
}
