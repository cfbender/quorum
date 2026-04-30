import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { ConfigLoadResult, QuorumConfig, QuorumMember, ReasoningEffort, TriggerMode } from "./types.js"

export const DEFAULT_CONFIG: QuorumConfig = {
  members: [
    { name: "quorum-sonnet", providerID: "openrouter", modelID: "anthropic/claude-sonnet-4.6", label: "sonnet" },
    { name: "quorum-gpt5", providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { name: "quorum-gemini", providerID: "openrouter", modelID: "google/gemini-3.1-pro-preview", label: "gemini" },
  ],
  triggerMode: "auto",
  specDir: "docs/quorum/specs",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function parseTriggerMode(value: unknown): TriggerMode | undefined {
  return value === "auto" || value === "manual" || value === "off" ? value : undefined
}

function parseReasoningEffort(value: unknown): ReasoningEffort | undefined {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" ? value : undefined
}

type MemberParseResult = { member: QuorumMember } | { issue: string }

function parseMemberWithDiagnostic(value: unknown, index: number): MemberParseResult {
  if (!isRecord(value)) {
    return { issue: `Invalid member entry at index ${index}: expected an object` }
  }
  const name = nonEmptyString(value.name)
  if (!name) {
    return { issue: `Invalid member entry at index ${index}: missing required field 'name' or it is not a non-empty string` }
  }
  const providerID = nonEmptyString(value.providerID)
  if (!providerID) {
    return { issue: `Invalid member entry at index ${index}: field 'providerID' must be a non-empty string` }
  }
  const modelID = nonEmptyString(value.modelID)
  if (!modelID) {
    return { issue: `Invalid member entry at index ${index}: field 'modelID' must be a non-empty string` }
  }
  const label = nonEmptyString(value.label)
  if (!label) {
    return { issue: `Invalid member entry at index ${index}: field 'label' must be a non-empty string` }
  }
  const member: QuorumMember = { name, providerID, modelID, label }
  if (value.reasoningEffort !== undefined) {
    const effort = parseReasoningEffort(value.reasoningEffort)
    if (effort !== undefined) member.reasoningEffort = effort
  }
  return { member }
}

function parseMembersWithDiagnostics(
  value: unknown,
  issues: string[],
): QuorumMember[] | undefined {
  if (!Array.isArray(value)) return undefined

  const members: QuorumMember[] = []
  for (let i = 0; i < value.length; i++) {
    const result = parseMemberWithDiagnostic(value[i], i)
    if ("member" in result) {
      members.push(result.member)
    } else {
      issues.push(result.issue)
    }
  }

  if (members.length < 2) {
    issues.push(
      `Fewer than 2 valid members parsed (got ${members.length}); config falling back to defaults`,
    )
    return undefined
  }

  const names = new Set<string>()
  for (const member of members) {
    if (names.has(member.name)) {
      issues.push(
        `Duplicate member name '${member.name}'; config falling back to defaults`,
      )
      return undefined
    }
    names.add(member.name)
  }

  return members
}

export function parseConfig(value: unknown): ConfigLoadResult {
  const issues: string[] = []

  if (!isRecord(value)) {
    issues.push("Config root is not an object; falling back to defaults")
    return { config: DEFAULT_CONFIG, issues }
  }

  const members = parseMembersWithDiagnostics(value.members, issues)
  const resolvedMembers = members ?? DEFAULT_CONFIG.members

  const config: QuorumConfig = {
    members: resolvedMembers,
    triggerMode: parseTriggerMode(value.triggerMode) ?? DEFAULT_CONFIG.triggerMode,
    specDir: nonEmptyString(value.specDir) ?? DEFAULT_CONFIG.specDir,
  }

  return { config, issues }
}

export function resolveConfigPath(configDir = process.env.OPENCODE_CONFIG_DIR ?? path.join(os.homedir(), ".config", "opencode")): string {
  return path.join(configDir, "quorum.json")
}

export function loadConfig(configDir?: string): ConfigLoadResult {
  const filePath = resolveConfigPath(configDir)
  if (!fs.existsSync(filePath)) return { config: DEFAULT_CONFIG, issues: [] }
  const raw = fs.readFileSync(filePath, "utf8")
  return parseConfig(JSON.parse(raw))
}
