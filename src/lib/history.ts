import { useCallback, useState } from 'react'
import type { LoadedImage } from './image.ts'

/**
 * A simple version history: each AI edit adds a new version, and undo/redo
 * moves between them. (Phase 3 replaces this with full layer-aware history.)
 */
export interface Version {
  id: number
  /** Shown in the History panel, e.g. "Original" or "AI: make the sky a sunset". */
  label: string
  image: LoadedImage
}

interface State {
  versions: Version[]
  index: number
}

let nextId = 1

export function useVersionHistory() {
  // Versions and the current index live in ONE state object, and every update
  // uses the functional form. That way an AI result that arrives a minute later
  // is added after whatever version is current *then*, not when it started.
  const [{ versions, index }, setState] = useState<State>({ versions: [], index: -1 })

  /** Start over with a single version (e.g. a newly opened photo). */
  const reset = useCallback((image: LoadedImage, label = 'Original') => {
    setState({ versions: [{ id: nextId++, label, image }], index: 0 })
  }, [])

  /** Add a version after the current one (dropping any "redo" versions). */
  const push = useCallback((image: LoadedImage, label: string) => {
    setState((s) => ({
      versions: [...s.versions.slice(0, s.index + 1), { id: nextId++, label, image }],
      index: s.index + 1,
    }))
  }, [])

  const undo = useCallback(() => setState((s) => ({ ...s, index: Math.max(0, s.index - 1) })), [])
  const redo = useCallback(() => setState((s) => ({ ...s, index: Math.min(s.versions.length - 1, s.index + 1) })), [])
  const jumpTo = useCallback(
    (i: number) => setState((s) => ({ ...s, index: Math.min(s.versions.length - 1, Math.max(0, i)) })),
    [],
  )

  return {
    versions,
    index,
    current: versions[index] ?? null,
    previous: index > 0 ? versions[index - 1] : null,
    canUndo: index > 0,
    canRedo: index < versions.length - 1,
    reset,
    push,
    undo,
    redo,
    jumpTo,
  }
}
