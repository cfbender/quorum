import type { OpencodeClientLike } from "./types.js"

export async function isSubagentSession(client: OpencodeClientLike, sessionID: string): Promise<boolean> {
  const response = await client.session.get({ path: { id: sessionID }, throwOnError: true })
  return Boolean(response.data.parentID)
}
