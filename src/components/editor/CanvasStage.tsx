import type Konva from 'konva'
import { useEffect, useMemo, useRef } from 'react'
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { LoadedImage } from '../../lib/image.ts'
import { type Size, type View, zoomAt } from '../../lib/viewport.ts'

interface Props {
  image: LoadedImage
  view: View
  onViewChange: (view: View) => void
  /** Reports the size of the canvas area whenever it changes. */
  onResize: (size: Size) => void
  size: Size
  /**
   * Before/after comparison. When set, the left part of the image (up to
   * `split`, 0–1) shows `before` and the rest shows the current image.
   */
  compare?: { before: LoadedImage; split: number; onSplitChange: (split: number) => void }
}

/**
 * The Konva canvas: shows the photo on a transparency checkerboard, with
 * zoom (mouse wheel / trackpad pinch), pan (drag), and an optional
 * before/after slider. Later phases add layers and drawing tools here.
 */
export default function CanvasStage({ image, view, onViewChange, onResize, size, compare }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Watch the container so the Stage always fills it (window resize, panel toggle, tablet rotation).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      onResize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onResize])

  // A small checkerboard tile, drawn once and repeated behind the image.
  const checker = useMemo(() => makeCheckerTile(), [])

  // Mouse wheel = zoom toward the cursor. Trackpad pinch arrives as wheel + ctrlKey
  // with small deltas, so this formula gives smooth zooming for both.
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return
    const delta = Math.max(-100, Math.min(100, e.evt.deltaY))
    const factor = Math.pow(1.0015, -delta * (e.evt.ctrlKey ? 4 : 1))
    onViewChange(zoomAt(view, view.scale * factor, pointer))
  }

  // Dragging moves the whole stage; when the drag ends we store the new position.
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage || e.target !== stage) return
    onViewChange({ ...view, x: stage.x(), y: stage.y() })
  }

  return (
    <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* Document background: checkerboard shows where the image is transparent */}
            <Rect
              width={image.width}
              height={image.height}
              // Konva accepts canvases here at runtime; its type only lists <img>
              fillPatternImage={checker as unknown as HTMLImageElement}
              // Keep checker squares the same on-screen size at any zoom
              fillPatternScale={{ x: 1 / view.scale, y: 1 / view.scale }}
              shadowColor="black"
              shadowBlur={24 / view.scale}
              shadowOpacity={0.5}
              listening={false}
            />
            <KonvaImage
              image={image.source}
              width={image.width}
              height={image.height}
              // Show crisp pixels when zoomed in a lot, smooth when zoomed out
              imageSmoothingEnabled={view.scale < 2}
              listening={false}
            />
            {compare && <CompareOverlay image={image} view={view} {...compare} />}
          </Layer>
        </Stage>
      )}
    </div>
  )
}

/**
 * Draws the "before" image clipped to the left of the split line, plus a
 * draggable handle. Sizes are divided by the zoom so the handle looks the
 * same at any zoom level.
 */
function CompareOverlay({
  image,
  before,
  view,
  split,
  onSplitChange,
}: {
  image: LoadedImage
  before: LoadedImage
  view: View
  split: number
  onSplitChange: (split: number) => void
}) {
  const splitX = split * image.width
  const s = 1 / view.scale // converts screen pixels to image pixels

  return (
    <>
      <Group clipX={0} clipY={0} clipWidth={splitX} clipHeight={image.height} listening={false}>
        <KonvaImage image={before.source} width={image.width} height={image.height} imageSmoothingEnabled={view.scale < 2} />
      </Group>

      <Group
        x={splitX}
        y={0}
        draggable
        // Only move horizontally, and stay within the image (absolute screen coords).
        dragBoundFunc={(pos) => ({
          x: Math.min(view.x + image.width * view.scale, Math.max(view.x, pos.x)),
          y: view.y,
        })}
        onDragMove={(e) => onSplitChange(Math.min(1, Math.max(0, e.target.x() / image.width)))}
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container()
          if (c) c.style.cursor = 'ew-resize'
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container()
          if (c) c.style.cursor = ''
        }}
      >
        {/* Wide invisible hit area makes the line easy to grab, even by finger */}
        <Rect x={-12 * s} width={24 * s} height={image.height} fill="transparent" />
        <Line points={[0, 0, 0, image.height]} stroke="white" strokeWidth={2 * s} shadowColor="black" shadowBlur={4 * s} shadowOpacity={0.6} />
        <Circle y={image.height / 2} radius={14 * s} fill="white" shadowColor="black" shadowBlur={6 * s} shadowOpacity={0.5} />
        <Line
          points={[-5 * s, image.height / 2 - 5 * s, -9 * s, image.height / 2, -5 * s, image.height / 2 + 5 * s]}
          stroke="#333"
          strokeWidth={2 * s}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[5 * s, image.height / 2 - 5 * s, 9 * s, image.height / 2, 5 * s, image.height / 2 + 5 * s]}
          stroke="#333"
          strokeWidth={2 * s}
          lineCap="round"
          lineJoin="round"
        />
      </Group>
    </>
  )
}

/** Build a 16×16 grey/white checkerboard tile as a canvas. */
function makeCheckerTile(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#cccccc'
  ctx.fillRect(0, 0, 8, 8)
  ctx.fillRect(8, 8, 8, 8)
  return c
}
