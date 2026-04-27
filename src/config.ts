import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { QuorumConfig, QuorumModel, ReasoningEffort, TriggerMode } from "./types.js"

export const DEFAULT_CONFIG: QuorumConfig = {
  models: [
    { providerID: "openrouter", modelID: "anthropic/claude-opus-4.7", label: "opus" },
    { providerID: "openrouter", modelID: "openai/gpt-5.4", label: "gpt5" },
    { providerID: "openrouter", modelID: "google/gemini-3-pro", label: "gemini" },
  ],
  concurrency: 3,
  timeoutMs: 120_000,
  maxTokens: 4_000,
  reasoningEffort: "high",
  triggerMode: "auto",
  specDir: "docs/quorum/specs",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
}

function parseTriggerMode(value: unknown): TriggerMode | undefined {
  return value === "auto" || value === "manual" || value === "off" ? value : undefined
}

function parseReasoningEffort(value: unknown): ReasoningEffort | undefined {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" ? value : undefined
}

function parseModel(value: unknown): QuorumModel | undefined {
  if (!isRecord(value)) return undefined
  const providerID = nonEmptyString(value.providerID)
  const modelID = nonEmptyString(value.modelID)
  const label = nonEmptyString(value.label)
  if (!providerID || !modelID || !label) return undefined
  return { providerID, modelID, label }
}

export function parseConfig(value: unknown): QuorumConfig {
  if (!isRecord(value)) return DEFAULT_CONFIG

  const models = Array.isArray(value.models)
    ? value.models.map(parseModel).filter((model): model is QuorumModel => model !== undefined)
    : DEFAULT_CONFIG.models

  return {
    models: models.length > 0 ? models : DEFAULT_CONFIG.models,
    concurrency: positiveInteger(value.concurrency) ?? DEFAULT_CONFIG.concurrency,
    timeoutMs: positiveInteger(value.timeoutMs) ?? DEFAULT_CONFIG.timeoutMs,
    maxTokens: positiveInteger(value.maxTokens) ?? DEFAULT_CONFIG.maxTokens,
    reasoningEffort: parseReasoningEffort(value.reasoningEffort) ?? DEFAULT_CONFIG.reasoningEffort,
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
