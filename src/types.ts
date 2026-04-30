export type TriggerMode = "auto" | "manual" | "off"
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

export type QuorumMember = {
  name: string
  providerID: string
  modelID: string
  label: string
  reasoningEffort?: ReasoningEffort
}

export type QuorumConfig = {
  members: QuorumMember[]
  triggerMode: TriggerMode
  specDir: string
}

export type ConfigLoadResult = {
  config: QuorumConfig
  issues: string[]
}

// v0.1 types — retained for compatibility until the v0.1 consult/tool stack is removed.

/**
 * v0.1 config shape used by the consult/tool stack, extended with v0.2 members field.
 * @deprecated Will be removed when the v0.1 consult stack is deleted in Task 4.
 */
export type LegacyQuorumConfig = QuorumConfig & {
  models: QuorumModel[]
  concurrency: number
  timeoutMs: number
  maxTokens: number
  reasoningEffort: ReasoningEffort
}

/** @deprecated Use QuorumMember instead. */
export type QuorumModel = {
  providerID: string
  modelID: string
  label: string
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type QuorumResponse = {
  label: string
  providerID: string
  modelID: string
  ok: boolean
  text?: string
  error?: string
  elapsedMs: number
  truncated: boolean
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type QuorumPayload = {
  responses: QuorumResponse[]
  synthesisPrompt: string
  meta: {
    topic: string
    startedAt: string
    droppedModels: string[]
    aborted: boolean
    abortReason?: string
  }
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type SessionSummary = {
  id: string
  parentID?: string
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type TextPartInput = {
  type: "text"
  text: string
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type PromptResponse = {
  data: {
    parts: unknown[]
  }
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type SessionApi = {
  create(input: { body: { parentID?: string }; throwOnError?: boolean }): Promise<{ data: SessionSummary }>
  get(input: { path: { id: string }; throwOnError?: boolean }): Promise<{ data: SessionSummary }>
  prompt(input: {
    path: { id: string }
    body: {
      model: { providerID: string; modelID: string }
      tools: Record<string, boolean>
      system: string
      parts: TextPartInput[]
    }
    throwOnError?: boolean
  }): Promise<PromptResponse>
  delete(input: { path: { id: string }; throwOnError?: boolean }): Promise<unknown>
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type AppApi = {
  log(input: {
    body: {
      service: string
      level: "info" | "warn" | "error"
      message: string
      extra?: Record<string, unknown>
    }
  }): Promise<unknown>
}

/** @deprecated Will be removed with the v0.1 consult stack. */
export type OpencodeClientLike = {
  session: SessionApi
  app?: AppApi
}
