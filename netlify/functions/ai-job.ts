/**
 * GET /api/ai/jobs/:id        → { state: "queued" | "running" | "done" | "error", error? }
 * GET /api/ai/jobs/:id/image  → the edited image bytes (one-time download; the job is then deleted)
 */
import type { Config, Context } from '@netlify/functions'
import { errorResponse, handleError, json } from '../lib/http.ts'
import { deleteJob, getResult, getStatus, isValidJobId, JOB_STALE_MS, updateStatus } from '../lib/jobs.ts'

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    // Read the id from the URL ourselves (works the same locally and on Netlify).
    const id = new URL(req.url).pathname.match(/\/api\/ai\/jobs\/([^/]+)/)?.[1]
    if (!isValidJobId(id)) return errorResponse('Unknown job.', 404)

    const status = await getStatus(id)
    if (!status) return errorResponse('This AI job no longer exists. Please run the edit again.', 404)

    const wantsImage = new URL(req.url).pathname.endsWith('/image')

    if (!wantsImage) {
      // A job stuck for too long (e.g. the worker crashed) is reported as failed.
      if ((status.state === 'queued' || status.state === 'running') && Date.now() - status.createdAt > JOB_STALE_MS) {
        const error = 'The AI took too long to respond. Please try again.'
        await updateStatus(id, { state: 'error', error })
        return json({ state: 'error', error })
      }
      return json({ state: status.state, error: status.error })
    }

    if (status.state !== 'done') return errorResponse('The edited image is not ready yet.', 409)
    const bytes = await getResult(id)
    if (!bytes) return errorResponse('The edited image has expired. Please run the edit again.', 410)

    // Clean up after the response is sent: the browser now has the image.
    context.waitUntil(deleteJob(id))

    return new Response(bytes, {
      headers: {
        'Content-Type': status.mimeType ?? 'image/webp',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return handleError(err, 'ai-job')
  }
}

export const config: Config = {
  path: ['/api/ai/jobs/:id', '/api/ai/jobs/:id/image'],
  method: 'GET',
}
