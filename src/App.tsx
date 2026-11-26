import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.tsx'

// The editor (with the Konva canvas engine) is loaded only when someone opens
// it, so the landing page downloads fast.
const Editor = lazy(() => import('./pages/Editor.tsx'))

/** Top-level routes: "/" is the landing page, "/editor" is the editor. */
export default function App() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted">Loading editor…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/editor" element={<Editor />} />
        {/* Anything else falls back to the landing page */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  )
}
