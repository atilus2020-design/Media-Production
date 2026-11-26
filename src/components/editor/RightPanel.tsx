import { Eye, Layers, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LoadedImage } from '../../lib/image.ts'

/**
 * Right-hand panels. In Phase 1 these are mostly read-only previews of
 * what's coming: the AI box arrives in Phase 2, a real layers panel and
 * adjustments in Phase 3.
 */
export default function RightPanel({ image }: { image: LoadedImage | null }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-l border-edge bg-panel md:flex lg:w-72">
      <Section title="AI Edit" icon={<Sparkles className="h-4 w-4" />}>
        <textarea
          disabled
          rows={3}
          placeholder="Describe how you want to edit this photo…"
          className="w-full resize-none rounded-md border border-edge bg-app p-2 text-sm placeholder:text-muted disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-muted">AI editing arrives in Phase 2.</p>
      </Section>

      <Section title="Layers" icon={<Layers className="h-4 w-4" />}>
        {image ? (
          <div className="flex items-center gap-2 rounded-md bg-accent/20 p-1.5 ring-1 ring-accent/50">
            <Eye className="h-4 w-4 shrink-0 text-muted" aria-label="Visible" />
            <LayerThumb image={image} />
            <span className="truncate text-sm">Background</span>
          </div>
        ) : (
          <p className="text-xs text-muted">No layers yet. Upload a photo to begin.</p>
        )}
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

/** Small preview of the layer's pixels. */
function LayerThumb({ image }: { image: LoadedImage }) {
  return <img src={image.thumbnailUrl} alt="" className="checkerboard h-8 w-8 shrink-0 rounded-sm object-contain" />
}
