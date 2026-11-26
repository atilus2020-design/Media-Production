import { ImagePlus } from 'lucide-react'

interface Props {
  /** Opens the system file picker. */
  onBrowse: () => void
  /** True while a file is being dragged over the canvas area. */
  isDragging: boolean
}

/**
 * Empty-state shown before any photo is loaded. The actual drag-and-drop
 * handling lives on the whole canvas area in Editor.tsx, so users can drop
 * a file anywhere there; this component is just the visual target.
 */
export default function UploadDropzone({ onBrowse, isDragging }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <button
        type="button"
        onClick={onBrowse}
        className={`flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-edge bg-panel/50 hover:border-muted hover:bg-panel'
        }`}
      >
        <ImagePlus className={`h-14 w-14 ${isDragging ? 'text-accent' : 'text-muted'}`} aria-hidden />
        <div>
          <p className="text-lg font-semibold">
            {isDragging ? 'Drop your photo here' : 'Drag & drop a photo, or click to upload'}
          </p>
          <p className="mt-1 text-sm text-muted">JPG, PNG, or WEBP · up to 10 MB</p>
        </div>
      </button>
    </div>
  )
}
