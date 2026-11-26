/**
 * The provider-neutral "adapter" contract for AI image editing.
 *
 * Every AI provider (OpenAI today; maybe Gemini or Replicate later) is wrapped
 * in an object that implements `ImageEditProvider`. The rest of the app only
 * talks to this interface, so switching providers means writing one new file
 * in this folder and changing `AI_PROVIDER`; nothing else changes.
 *
 * NOTE: shared server code lives in `netlify/lib/` (not `netlify/functions/`)
 * because Netlify treats every file/folder in `netlify/functions/` as its own
 * function endpoint.
 */

export interface ImageEditRequest {
  /** The photo to edit, as a data URL: "data:image/webp;base64,...". */
  image: string
  /** Pixel size of `image`, used to request a matching output size. */
  width: number
  height: number
  /** What the user wants changed. */
  prompt: string
  /**
   * Optional mask (PNG data URL, same size as `image`). Fully transparent
   * pixels mark the area the AI may change. Used in Phase 4.
   */
  mask?: string
  /** Ask for a transparent background (used by "Remove background"). */
  transparentBackground?: boolean
}

export interface ImageEditResult {
  /** The edited image's raw bytes. */
  bytes: Uint8Array
  /** e.g. "image/webp" */
  mimeType: string
}

export interface ImageEditProvider {
  /** Short id shown in logs, e.g. "openai". */
  readonly name: string
  /** Does this provider support masks (edit only part of the image)? */
  readonly supportsMask: boolean
  editImage(req: ImageEditRequest): Promise<ImageEditResult>
}

/**
 * An error whose `message` is safe and friendly to show to the user.
 * Anything else that's thrown gets replaced with a generic message, so
 * internal details (and certainly secrets) never reach the browser.
 */
export class UserFacingError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'UserFacingError'
    this.status = status
  }
}
