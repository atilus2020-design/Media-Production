import type { ReactNode } from 'react'
import { Layers, SlidersHorizontal, Sparkles, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Simple marketing page with a single call to action. */
export default function Landing() {
  return (
    <div className="flex min-h-full flex-col bg-app">
      <header className="flex items-center gap-2 px-6 py-4">
        <WandSparkles className="h-6 w-6 text-accent" aria-hidden />
        <span className="text-lg font-semibold">AI Photo Editor</span>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Edit photos by <span className="text-accent">describing</span> what you want.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Upload a photo and type “make the sky a sunset” or “turn this into a watercolor”.
          Then fine-tune it with layers, brushes, adjustments, and filters.
        </p>

        <Link
          to="/editor"
          className="mt-10 rounded-lg bg-accent px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Start Editing
        </Link>

        <ul className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          <Feature icon={<Sparkles className="h-5 w-5" />} title="AI prompt edits">
            Remove objects, change backgrounds, or restyle the whole image.
          </Feature>
          <Feature icon={<Layers className="h-5 w-5" />} title="Layers & history">
            Every edit is a layer or a history step, so you can always undo.
          </Feature>
          <Feature icon={<SlidersHorizontal className="h-5 w-5" />} title="Pro tools">
            Crop, adjust, filter, paint, add text and shapes.
          </Feature>
        </ul>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted">
        Your photos are processed in your browser. They're only sent to the AI provider when you run an AI edit.
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <li className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-center gap-2 font-semibold text-fg">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </li>
  )
}
