/**
 * Image helpers: validating uploads, decoding files, and downscaling.
 * Everything here runs in the browser.
 */

/** File types we accept (by MIME type). */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Value for an <input accept="..."> attribute. */
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,' + ACCEPTED_TYPES.join(',')

/** Maximum upload size: 10 MB. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/**
 * Largest width/height we keep for the editing canvas. Bigger photos are
 * scaled down on load so the editor stays fast, especially on tablets.
 * (Phase 2 will downscale further, to what the AI API accepts, before uploading.)
 */
export const MAX_CANVAS_DIMENSION = 4096

/**
 * Check type and size. Returns a friendly error message, or null if the file is OK.
 */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" isn't a supported image. Please use JPG, PNG, or WEBP.`
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `"${file.name}" is ${mb} MB. The maximum size is 10 MB.`
  }
  return null
}

/** Decode a File into an HTMLImageElement. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image. It may be corrupted.'))
    }
    img.src = url
  })
}

/**
 * If the image is larger than `maxDim` on its longest side, return a
 * scaled-down canvas copy. Otherwise return the image unchanged.
 * Aspect ratio is always preserved.
 */
export function downscaleImage(
  img: HTMLImageElement,
  maxDim: number,
): HTMLImageElement | HTMLCanvasElement {
  const { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.min(1, maxDim / Math.max(w, h))
  if (scale === 1) return img

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return img
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Everything the editor needs to know about a loaded photo. */
export interface LoadedImage {
  /** Drawable source (image or canvas) used by Konva. */
  source: HTMLImageElement | HTMLCanvasElement
  width: number
  height: number
  /** Original file name, e.g. "beach.jpg". */
  name: string
  /** True if we shrank it on load. */
  wasResized: boolean
  originalWidth: number
  originalHeight: number
  /** Small PNG data URL for the layers panel. */
  thumbnailUrl: string
}

/** Render a small preview (max 64px) of an image as a data URL. */
export function makeThumbnail(source: CanvasImageSource & { width: number; height: number }, size = 64): string {
  const scale = Math.min(1, size / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Validate, decode, and (if needed) downscale an uploaded file. Throws a friendly Error. */
export async function prepareUpload(file: File): Promise<LoadedImage> {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)

  const img = await loadImageFromFile(file)
  const source = downscaleImage(img, MAX_CANVAS_DIMENSION)
  return {
    source,
    width: source.width,
    height: source.height,
    name: file.name,
    wasResized: source !== img,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    thumbnailUrl: makeThumbnail(source),
  }
}

/** Any drawable we use as a layer source. */
export type ImageSource = HTMLImageElement | HTMLCanvasElement

/** Wrap a canvas (e.g. an AI result) as a LoadedImage. */
export function canvasToLoadedImage(canvas: HTMLCanvasElement, name: string): LoadedImage {
  return {
    source: canvas,
    width: canvas.width,
    height: canvas.height,
    name,
    wasResized: false,
    originalWidth: canvas.width,
    originalHeight: canvas.height,
    thumbnailUrl: makeThumbnail(canvas),
  }
}

/**
 * Decode an image Blob (e.g. the AI's result) and fit it onto a canvas of
 * exactly `width`×`height`, so the result lines up with the original photo.
 * If the aspect ratio differs slightly, the image is scaled to cover the
 * canvas and centered (a few edge pixels may be trimmed, never stretched).
 */
export async function blobToCanvas(blob: Blob, width: number, height: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not create a drawing canvas.')
  const scale = Math.max(width / bitmap.width, height / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h)
  bitmap.close()
  return canvas
}

/** Size limit for images we upload to the AI (the server accepts 3.5 MB). */
const AI_UPLOAD_MAX_BYTES = 3 * 1024 * 1024

/**
 * Prepare an image for the AI: scale it so the longest side is at most
 * `maxDim`, then encode it compactly (WEBP keeps transparency; falls back to
 * PNG in browsers without WEBP encoding, then to JPEG if still too big).
 */
export function encodeForAi(source: ImageSource, maxDim = 1536): { dataUrl: string; width: number; height: number } {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not create a drawing canvas.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

  const bytes = (url: string) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4)
  let dataUrl = canvas.toDataURL('image/webp', 0.92)
  if (bytes(dataUrl) > AI_UPLOAD_MAX_BYTES) dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  if (bytes(dataUrl) > AI_UPLOAD_MAX_BYTES) dataUrl = canvas.toDataURL('image/jpeg', 0.75)
  return { dataUrl, width: canvas.width, height: canvas.height }
}
