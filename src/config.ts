import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { QuorumConfig, QuorumMember, TriggerMode } from "./types.js"

const MEMBER_NAME_RE = /^[a-z][a-z0-9-]*$/

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

function parseMember(value: unknown): QuorumMember | undefined {
  if (!isRecord(value)) return undefined
  const name = nonEmptyString(value.name)
  const providerID = nonEmptyString(value.providerID)
  const modelID = nonEmptyString(value.modelID)
  const label = nonEmptyString(value.label)
  if (!name || !providerID || !modelID || !label) return undefined
  if (!MEMBER_NAME_RE.test(name)) return undefined
  return { name, providerID, modelID, label }
}

function parseMembers(value: unknown): QuorumMember[] | undefined {
  if (!Array.isArray(value)) return undefined
  const members = value.map(parseMember).filter((member): member is QuorumMember => member !== undefined)
  if (members.length < 2) return undefined
  const names = new Set<string>()
  for (const member of members) {
    if (names.has(member.name)) return undefined
    names.add(member.name)
  }
  return members
}

export function parseConfig(value: unknown): QuorumConfig {
  if (!isRecord(value)) return DEFAULT_CONFIG
  return {
    members: parseMembers(value.members) ?? DEFAULT_CONFIG.members,
    triggerMode: parseTriggerMode(value.triggerMode) ?? DEFAULT_CONFIG.triggerMode,
    specDir: nonEmptyString(value.specDir) ?? DEFAULT_CONFIG.specDir,
  }
}

export function resolveConfigPath(configDir = process.env.OPENCODE_CONFIG_DIR ?? path.join(os.homedir(), ".config", "opencode")): string {
  return path.join(configDir, "quorum.json")
}

export function loadConfig(configDir?: string): QuorumConfig {
  const filePath = resolveConfigPath(configDir)
  if (!fs.existsSync(filePath)) return DEFAULT_CONFIG
  const raw = fs.readFileSync(filePath, "utf8")
  return parseConfig(JSON.parse(raw))
}
