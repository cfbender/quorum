export type TriggerMode = "auto" | "manual" | "off"
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

export type QuorumModel = {
  providerID: string
  modelID: string
  label: string
}

export type QuorumConfig = {
  models: QuorumModel[]
  concurrency: number
  timeoutMs: number
  maxTokens: number
  reasoningEffort: ReasoningEffort
  triggerMode: TriggerMode
  specDir: string
}

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

export type SessionSummary = {
  id: string
  parentID?: string
}

export type TextPartInput = {
  type: "text"
  text: string
}

export type PromptResponse = {
  data: {
    parts: unknown[]
  }
}

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

export type OpencodeClientLike = {
  session: SessionApi
  app?: AppApi
}
