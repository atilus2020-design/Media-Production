/**
 * POST /api/ai/jobs: start an AI edit.
 *
 * Body (JSON):
 *   { prompt: string, image: "data:image/...;base64,...", width: number, height: number,
 *     mask?: "data:image/png;base64,...", transparentBackground?: boolean }
 *
 * Response: 202 { jobId }. Then poll GET /api/ai/jobs/:jobId.
 */
import type { Config, Context } from '@netlify/functions'
import { isProviderConfigured, type ImageEditRequest, UserFacingError } from '../lib/ai/index.ts'
import { errorResponse, handleError, json } from '../lib/http.ts'
import { createJob, updateStatus } from '../lib/jobs.ts'
import { checkAndCountUsage } from '../lib/usage.ts'

/** Limits on what the browser may send. */
const MAX_PROMPT_CHARS = 1000
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024 // decoded; keeps the request under Netlify's 6 MB limit
const MAX_MASK_BYTES = 1 * 1024 * 1024
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    if (!isProviderConfigured()) {
      return errorResponse('AI editing is not set up yet: the server has no API key. See the README.', 503)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('The request was not valid JSON.', 400)
    }
    const input = validate(body)

    // Cost guard: per-visitor and site-wide limits (throws a friendly 429).
    await checkAndCountUsage(context.ip)

    const jobId = await createJob(input)

    // Start the background worker. It replies 202 right away and keeps running.
    // We send only the job id; the worker reads the photo from Blobs.
    const workerUrl = new URL('/.netlify/functions/ai-run-background', req.url)
    const kick = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    }).catch((err: unknown) => {
      console.error('[ai-jobs] could not start background worker', err)
      return null
    })
    if (!kick || !kick.ok) {
      await updateStatus(jobId, { state: 'error', error: 'Could not start the AI job. Please try again.' })
      return errorResponse('Could not start the AI job. Please try again.', 502)
    }

    return json({ jobId }, 202)
  } catch (err) {
    return handleError(err, 'ai-jobs')
  }
}

/** Check every field and return a clean, typed request (or throw a friendly 400). */
function validate(body: unknown): ImageEditRequest {
  if (!body || typeof body !== 'object') throw new UserFacingError('Missing request body.')
  const b = body as Record<string, unknown>

  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  if (!prompt) throw new UserFacingError('Please describe how you want to edit the photo.')
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new UserFacingError(`Your prompt is too long (max ${MAX_PROMPT_CHARS} characters).`)
  }

  const image = b.image
  if (typeof image !== 'string' || !IMAGE_DATA_URL.test(image)) {
    throw new UserFacingError('The image must be a PNG, JPG, or WEBP.')
  }
  if (base64Bytes(image) > MAX_IMAGE_BYTES) throw new UserFacingError('The image is too large to send to the AI.', 413)

  const width = Number(b.width)
  const height = Number(b.height)
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width > 4096 || height > 4096) {
    throw new UserFacingError('Invalid image size.')
  }

  let mask: string | undefined
  if (b.mask !== undefined && b.mask !== null) {
    if (typeof b.mask !== 'string' || !PNG_DATA_URL.test(b.mask)) throw new UserFacingError('The mask must be a PNG.')
    if (base64Bytes(b.mask) > MAX_MASK_BYTES) throw new UserFacingError('The selection mask is too large.', 413)
    mask = b.mask
  }

  return { prompt, image, width, height, mask, transparentBackground: b.transparentBackground === true }
}

/** Approximate decoded size of a base64 data URL. */
function base64Bytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor((b64.length * 3) / 4)
}

export const config: Config = {
  path: '/api/ai/jobs',
  method: 'POST',
  // Netlify's built-in limiter: at most 6 new AI jobs per minute per visitor.
  // (Works on all Netlify plans. Daily/hourly caps live in lib/usage.ts.)
  rateLimit: {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
