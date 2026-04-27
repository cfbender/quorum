import { renderMemberPrompt, renderSynthesisPrompt } from "./prompts.js"
import { extractTextParts, truncateApproxTokens } from "./text.js"
import type { OpencodeClientLike, QuorumConfig, QuorumModel, QuorumPayload, QuorumResponse } from "./types.js"

type RunQuorumInput = {
  client: OpencodeClientLike
  sessionID: string
  topic: string
  prompt: string
  context?: string
  config: QuorumConfig
  abortSignal: AbortSignal
}

async function log(client: OpencodeClientLike, level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>): Promise<void> {
  await client.app?.log({ body: { service: "quorum", level, message, ...(extra !== undefined ? { extra } : {}) } }).catch(() => {})
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function mapLimited<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const item = items[currentIndex]
      if (item !== undefined) {
        results[currentIndex] = await mapper(item)
      }
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function consultOne(input: RunQuorumInput, model: QuorumModel): Promise<QuorumResponse> {
  const started = Date.now()
  let childID: string | undefined

  try {
    await log(input.client, "info", "starting quorum member", { label: model.label, providerID: model.providerID, modelID: model.modelID })
    const child = await input.client.session.create({ body: { parentID: input.sessionID }, throwOnError: true })
    childID = child.data.id
    const memberPrompt = renderMemberPrompt({
      topic: input.topic,
      prompt: input.prompt,
      ...(input.context !== undefined ? { context: input.context } : {}),
      reasoningEffort: input.config.reasoningEffort,
      maxTokens: input.config.maxTokens,
    })

    const response = await withTimeout(input.client.session.prompt({
      path: { id: childID },
      body: {
        model: { providerID: model.providerID, modelID: model.modelID },
        tools: {},
        system: "You are a planning consultant. Respond with normal professional English. Do not use tools.",
        parts: [{ type: "text", text: memberPrompt }],
      },
      throwOnError: true,
    }), input.config.timeoutMs, model.label)

    const extracted = extractTextParts(response.data.parts)
    const capped = truncateApproxTokens(extracted, input.config.maxTokens)
    await log(input.client, "info", "finished quorum member", { label: model.label, elapsedMs: Date.now() - started })

    return {
      label: model.label,
      providerID: model.providerID,
      modelID: model.modelID,
      ok: true,
      text: capped.text,
      elapsedMs: Date.now() - started,
      truncated: capped.truncated,
    }
  } catch (error) {
    await log(input.client, "warn", "quorum member failed", { label: model.label, error: errorMessage(error) })
    return {
      label: model.label,
      providerID: model.providerID,
      modelID: model.modelID,
      ok: false,
      error: errorMessage(error),
      elapsedMs: Date.now() - started,
      truncated: false,
    }
  } finally {
    if (childID) {
      await input.client.session.delete({ path: { id: childID }, throwOnError: true }).catch(async (error: unknown) => {
        await log(input.client, "warn", "failed to delete quorum child session", { childID, error: errorMessage(error) })
      })
    }
  }
}

export async function runQuorum(input: RunQuorumInput): Promise<QuorumPayload> {
  if (input.abortSignal.aborted) {
    throw new Error("quorum consult aborted before dispatch")
  }

  const startedAt = new Date().toISOString()
  const responses = await mapLimited(input.config.models, input.config.concurrency, (model) => consultOne(input, model))
  const droppedModels = responses.filter((response) => !response.ok).map((response) => response.label)
  const successCount = responses.filter((response) => response.ok).length
  const aborted = successCount < 2
  const abortReason = aborted ? `Fewer than two quorum members responded successfully (${successCount}/${responses.length}).` : undefined
  const synthesisPrompt = renderSynthesisPrompt({ topic: input.topic, responses, droppedModels })

  return {
    responses,
    synthesisPrompt,
    meta: {
      topic: input.topic,
      startedAt,
      droppedModels,
      aborted,
      ...(abortReason ? { abortReason } : {}),
    },
  }
}
