/**
 * Zoom & pan math for the canvas.
 *
 * The "view" says how the image is placed on screen:
 *   screenX = imageX * scale + x
 *   screenY = imageY * scale + y
 */
export interface View {
  scale: number
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export const MIN_ZOOM = 0.02 // 2%
export const MAX_ZOOM = 32 // 3200%

export const clampZoom = (s: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s))

/** Scale and center the image so it fits inside the box, with some padding. Never upscales past 100%. */
export function fitView(image: Size, box: Size, padding = 32): View {
  const availW = Math.max(1, box.width - padding * 2)
  const availH = Math.max(1, box.height - padding * 2)
  const scale = clampZoom(Math.min(1, availW / image.width, availH / image.height))
  return centeredView(image, box, scale)
}

/** Center the image in the box at a given scale. */
export function centeredView(image: Size, box: Size, scale: number): View {
  return {
    scale,
    x: (box.width - image.width * scale) / 2,
    y: (box.height - image.height * scale) / 2,
  }
}

/**
 * Zoom to `newScale` while keeping the screen point `anchor` fixed,
 * which feels like zooming "into" the cursor.
 */
export function zoomAt(view: View, newScale: number, anchor: { x: number; y: number }): View {
  const scale = clampZoom(newScale)
  // Which image pixel is under the anchor right now?
  const imgX = (anchor.x - view.x) / view.scale
  const imgY = (anchor.y - view.y) / view.scale
  // Keep that same pixel under the anchor after zooming.
  return { scale, x: anchor.x - imgX * scale, y: anchor.y - imgY * scale }
}

/** Zoom steps used by the + / − buttons and keyboard shortcuts. */
const ZOOM_STEPS = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 32]

export function nextZoomStep(current: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((s) => s > current + 1e-6) ?? MAX_ZOOM
  return [...ZOOM_STEPS].reverse().find((s) => s < current - 1e-6) ?? MIN_ZOOM
}
