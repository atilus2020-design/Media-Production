import { Eye, History, Layers, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Version } from '../../lib/history.ts'
import type { LoadedImage } from '../../lib/image.ts'

interface Props {
  image: LoadedImage | null
  /** The AI prompt panel (rendered by the Editor so it can share AI state with the canvas). */
  aiPanel: ReactNode
  versions: Version[]
  versionIndex: number
  onJumpToVersion: (index: number) => void
}

/**
 * Right-hand panels: AI Edit, History, Layers, Properties.
 * The layers panel becomes fully interactive in Phase 3.
 */
export default function RightPanel({ image, aiPanel, versions, versionIndex, onJumpToVersion }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-l border-edge bg-panel md:flex lg:w-72">
      <Section title="AI Edit" icon={<Sparkles className="h-4 w-4" />}>
        {aiPanel}
      </Section>

      <Section title="History" icon={<History className="h-4 w-4" />}>
        {versions.length === 0 ? (
          <p className="text-xs text-muted">Your edits will appear here.</p>
        ) : (
          <ol className="space-y-0.5">
            {versions.map((v, i) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onJumpToVersion(i)}
                  title={v.label}
                  className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs ${
                    i === versionIndex
                      ? 'bg-accent/25 text-white'
                      : i > versionIndex
                        ? 'text-muted/60 hover:bg-panel-2' // "redo" steps are dimmed
                        : 'hover:bg-panel-2'
                  }`}
                >
                  <img src={v.image.thumbnailUrl} alt="" className="checkerboard h-6 w-6 shrink-0 rounded-sm object-cover" />
                  <span className="truncate">{v.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Layers" icon={<Layers className="h-4 w-4" />}>
        {image ? (
          <div className="flex items-center gap-2 rounded-md bg-accent/20 p-1.5 ring-1 ring-accent/50">
            <Eye className="h-4 w-4 shrink-0 text-muted" aria-label="Visible" />
            <img src={image.thumbnailUrl} alt="" className="checkerboard h-8 w-8 shrink-0 rounded-sm object-contain" />
            <span className="truncate text-sm">Background</span>
          </div>
        ) : (
          <p className="text-xs text-muted">No layers yet. Upload a photo to begin.</p>
        )}
        <p className="mt-2 text-[11px] text-muted">Full layers (add, reorder, opacity…) arrive in Phase 3.</p>
      </Section>

      <Section title="Properties">
        {image ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted">File</dt>
            <dd className="truncate" title={image.name}>{image.name}</dd>
            <dt className="text-muted">Canvas</dt>
            <dd>{image.width} × {image.height} px</dd>
            {image.wasResized && (
              <>
                <dt className="text-muted">Original</dt>
                <dd>{image.originalWidth} × {image.originalHeight} px</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-xs text-muted">Nothing selected.</p>
        )}
      </Section>
    </aside>
  )
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-edge p-3">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}
