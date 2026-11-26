/** Small helpers for consistent JSON responses from our functions. */
import { UserFacingError } from './ai/types.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE })
}

/** Error response shape the frontend expects: { error: "friendly message" }. */
export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}

/**
 * Convert any thrown value into a safe response. Only `UserFacingError`
 * messages are shown to users; anything unexpected is logged and replaced
 * with a generic message.
 */
export function handleError(err: unknown, where: string): Response {
  if (err instanceof UserFacingError) return errorResponse(err.message, err.status)
  console.error(`[${where}] unexpected error`, err)
  return errorResponse('Something went wrong on the server. Please try again.', 500)
}

/** Same as handleError but returns just the safe message (for storing in job status). */
export function safeMessage(err: unknown, where: string): string {
  if (err instanceof UserFacingError) return err.message
  console.error(`[${where}] unexpected error`, err)
  return 'Something went wrong while editing. Please try again.'
}
