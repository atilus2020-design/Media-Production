/**
 * OpenAI adapter: implements `ImageEditProvider` with the Images "edits" endpoint.
 *
 * Docs: https://developers.openai.com/api/reference/resources/images/methods/edit
 *
 * Settings (environment variables, all optional except the key):
 *   OPENAI_API_KEY        required
 *   OPENAI_IMAGE_MODEL    default "gpt-image-2.5-sunburst"
 *   OPENAI_IMAGE_QUALITY  "low" | "medium" | "high" (default "medium"). Higher = slower and pricier.
 *   OPENAI_BASE_URL       default "https://api.openai.com/v1" (only change for proxies/testing)
 */
import { type ImageEditProvider, type ImageEditRequest, type ImageEditResult, UserFacingError } from './types.ts'


/**
 * gpt-image-2.5 supports custom output sizes, so the result keeps the photo's
 * aspect ratio, plus masks and transparent backgrounds.
 */
const DEFAULT_MODEL = 'gpt-image-2.5-sunburst'

/** Longest side we ask the model to produce. */
const OUTPUT_LONG_EDGE = 1536

/** Give up on the API call after 10 minutes (background functions get 15). */
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000

export function createOpenAIProvider(): ImageEditProvider {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new UserFacingError('AI editing is not configured on the server (missing OPENAI_API_KEY).', 503)

  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL
  const quality = process.env.OPENAI_IMAGE_QUALITY || 'medium'
  const endpoint = `${(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')}/images/edits`

  return {
    name: 'openai',
    supportsMask: true,

    async editImage(req: ImageEditRequest): Promise<ImageEditResult> {
      const body: Record<string, unknown> = {
        model,
        prompt: req.prompt,
        images: [{ image_url: req.image }],
        n: 1,
        quality,
        size: pickOutputSize(model, req.width, req.height),
        // WebP keeps transparency (PNG-like) but is much smaller, which keeps
        // us well under Netlify's 6 MB response limit.
        output_format: 'webp',
        output_compression: 92,
        background: req.transparentBackground ? 'transparent' : 'auto',
      }
      if (req.mask) body.mask = { image_url: req.mask }

      let res: Response
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
      } catch (err) {
        console.error('[openai] network error', err)
        throw new UserFacingError("Couldn't reach the AI service. Please try again.", 502)
      }

      if (!res.ok) throw await toFriendlyError(res)

      const json = (await res.json()) as { data?: { b64_json?: string }[]; output_format?: string }
      const b64 = json.data?.[0]?.b64_json
      if (!b64) {
        console.error('[openai] response had no image data')
        throw new UserFacingError('The AI did not return an image. Please try again.', 502)
      }
      return {
        bytes: Uint8Array.from(Buffer.from(b64, 'base64')),
        mimeType: `image/${json.output_format ?? 'webp'}`,
      }
    },
  }
}

/**
 * Pick the `size` parameter. Models that accept custom sizes get one that
 * matches the photo's aspect ratio (each side a multiple of 16, as the API
 * requires); others get "auto".
 */
export function pickOutputSize(model: string, width: number, height: number): string {
  const customSizes = /^gpt-image-2(\.5)?(-|$)/.test(model)
  const ratio = width / height
  if (!customSizes || ratio > 3 || ratio < 1 / 3) return 'auto'

  const scale = OUTPUT_LONG_EDGE / Math.max(width, height)
  const round16 = (n: number) => Math.max(16, Math.round(n / 16) * 16)
  return `${round16(width * scale)}x${round16(height * scale)}`
}

/** Turn an OpenAI error response into a message a beginner can act on. */
async function toFriendlyError(res: Response): Promise<UserFacingError> {
  let message = ''
  let code = ''
  try {
    const data = (await res.json()) as { error?: { message?: string; code?: string } }
    message = data.error?.message ?? ''
    code = data.error?.code ?? ''
  } catch {
    /* body wasn't JSON */
  }
  // Server-side log for you (visible in Netlify → Logs → Functions). No secrets here.
  console.error(`[openai] HTTP ${res.status} code=${code} message=${message}`)

  if (res.status === 401) {
    return new UserFacingError('The server’s OpenAI API key is invalid. Check OPENAI_API_KEY.', 502)
  }
  if (res.status === 429) {
    return code === 'insufficient_quota'
      ? new UserFacingError('The OpenAI account is out of credits. Add billing credits and try again.', 502)
      : new UserFacingError('The AI service is busy right now. Please wait a minute and try again.', 503)
  }
  if (code === 'moderation_blocked' || /safety|moderation/i.test(message)) {
    return new UserFacingError(
      'The AI’s safety system declined this edit. Try a different photo or rephrase your prompt.',
      422,
    )
  }
  if (res.status >= 400 && res.status < 500) {
    const detail = message ? `: ${message.slice(0, 300)}` : '.'
    return new UserFacingError(`The AI couldn’t process this request${detail}`, 422)
  }
  return new UserFacingError('The AI service had a problem. Please try again in a moment.', 502)
}
