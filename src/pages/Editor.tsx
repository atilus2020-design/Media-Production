import { AlertCircle, Info, Maximize, X, ZoomIn, ZoomOut } from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import CanvasStage from '../components/editor/CanvasStage.tsx'
import MenuBar, { type MenuDef } from '../components/editor/MenuBar.tsx'
import RightPanel from '../components/editor/RightPanel.tsx'
import Toolbar, { type ToolId } from '../components/editor/Toolbar.tsx'
import UploadDropzone from '../components/editor/UploadDropzone.tsx'
import { ACCEPT_ATTR, type LoadedImage, prepareUpload } from '../lib/image.ts'
import { centeredView, fitView, nextZoomStep, type Size, type View, zoomAt } from '../lib/viewport.ts'

/** "Ctrl" on Windows/Linux, "⌘" on Mac, for menu labels. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

/**
 * The editor screen: menu bar on top, tools on the left, canvas in the
 * middle, panels on the right, status bar at the bottom.
 */
export default function Editor() {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [tool, setTool] = useState<ToolId>('hand')
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  // When a new image loads we want to "fit to screen" as soon as we know the canvas size.
  const needsFitRef = useRef(false)

  // ---------- Loading a file ----------

  const openFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const loaded = await prepareUpload(file)
      needsFitRef.current = true
      setImage(loaded)
      if (loaded.wasResized) {
        setNotice(
          `This photo was ${loaded.originalWidth}×${loaded.originalHeight}px, so it was scaled to ` +
            `${loaded.width}×${loaded.height}px to keep the editor fast.`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading that file.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const browse = useCallback(() => fileInputRef.current?.click(), [])

  // ---------- Zoom helpers ----------

  const fit = useCallback(() => {
    if (image && canvasSize.width > 0) setView(fitView(image, canvasSize))
  }, [image, canvasSize])

  const actualSize = useCallback(() => {
    if (image && canvasSize.width > 0) setView(centeredView(image, canvasSize, 1))
  }, [image, canvasSize])

  const zoomStep = useCallback(
    (direction: 1 | -1) => {
      const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 }
      setView((v) => zoomAt(v, nextZoomStep(v.scale, direction), center))
    },
    [canvasSize],
  )

  // Fit the image the first time we know both the image and the canvas size.
  useEffect(() => {
    if (needsFitRef.current && image && canvasSize.width > 0) {
      needsFitRef.current = false
      setView(fitView(image, canvasSize))
    }
  }, [image, canvasSize])

  // ---------- Keyboard shortcuts ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in text boxes.
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        browse()
      } else if (mod && e.key === '0') {
        e.preventDefault()
        fit()
      } else if (mod && e.key === '1') {
        e.preventDefault()
        actualSize()
      } else if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomStep(1)
      } else if (mod && e.key === '-') {
        e.preventDefault()
        zoomStep(-1)
      } else if (!mod && e.key.toLowerCase() === 'h') {
        setTool('hand')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [browse, fit, actualSize, zoomStep])

  // ---------- Drag & drop onto the canvas area ----------

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault() // required to allow dropping
    setIsDragging(true)
  }
  const onDragLeave = (e: DragEvent) => {
    // Only clear when actually leaving the area (not moving between children).
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    void openFile(e.dataTransfer.files[0])
  }

  // ---------- Menus ----------

  const hasImage = image !== null
  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'Open image…', shortcut: `${MOD}O`, onSelect: browse },
        { label: 'Export… (Phase 5)', disabled: true },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo (Phase 3)', shortcut: `${MOD}Z`, disabled: true },
        { label: 'Redo (Phase 3)', shortcut: `${MOD}⇧Z`, disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom in', shortcut: `${MOD}+`, onSelect: () => zoomStep(1), disabled: !hasImage },
        { label: 'Zoom out', shortcut: `${MOD}−`, onSelect: () => zoomStep(-1), disabled: !hasImage },
        { label: 'Fit on screen', shortcut: `${MOD}0`, onSelect: fit, disabled: !hasImage },
        { label: 'Actual size (100%)', shortcut: `${MOD}1`, onSelect: actualSize, disabled: !hasImage },
      ],
    },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app text-fg select-none">
      <MenuBar menus={menus} />

      {/* Hidden native file input, opened by the dropzone and File > Open */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          void openFile(e.target.files?.[0])
          e.target.value = '' // allow re-selecting the same file
        }}
      />

      <div className="flex min-h-0 flex-1">
        <Toolbar active={tool} onChange={setTool} />

        {/* Center: canvas area (also the drag-and-drop target) */}
        <main
          className="relative min-w-0 flex-1 overflow-hidden bg-canvas-bg"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {image ? (
            <CanvasStage
              image={image}
              view={view}
              onViewChange={setView}
              onResize={setCanvasSize}
              size={canvasSize}
            />
          ) : (
            <UploadDropzone onBrowse={browse} isDragging={isDragging} />
          )}

          {/* Drop overlay when replacing an existing image */}
          {image && isDragging && (
            <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 text-lg font-semibold">
              Drop to open this photo
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm">
              Loading image…
            </div>
          )}

          {/* Toast-style messages */}
          <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-3">
            {error && <Toast kind="error" message={error} onClose={() => setError(null)} />}
            {notice && <Toast kind="info" message={notice} onClose={() => setNotice(null)} />}
          </div>
        </main>

        <RightPanel image={image} />
      </div>

      {/* Status bar */}
      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-edge bg-panel px-3 text-xs text-muted">
        {image ? (
          <>
            <button type="button" title="Zoom out" onClick={() => zoomStep(-1)} className="hover:text-fg">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center tabular-nums text-fg">{Math.round(view.scale * 100)}%</span>
            <button type="button" title="Zoom in" onClick={() => zoomStep(1)} className="hover:text-fg">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" title="Fit on screen" onClick={fit} className="hover:text-fg">
              <Maximize className="h-4 w-4" />
            </button>
            <span className="ml-2 truncate">
              {image.name} · {image.width} × {image.height}px
            </span>
            <span className="ml-auto hidden sm:inline">Scroll to zoom · drag to pan</span>
          </>
        ) : (
          <span>No image open</span>
        )}
      </footer>
    </div>
  )
}

function Toast({ kind, message, onClose }: { kind: 'error' | 'info'; message: string; onClose: () => void }) {
  const Icon = kind === 'error' ? AlertCircle : Info
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex max-w-lg items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${
        kind === 'error' ? 'border-danger/50 bg-[#3a1f1f] text-[#ffd6d6]' : 'border-edge bg-panel-2 text-fg'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
