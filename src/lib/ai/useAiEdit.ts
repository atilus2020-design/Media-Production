import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToCanvas, encodeForAi, type ImageSource } from '../image.ts'
import { runAiEdit } from './api.ts'

export type AiPhase = 'idle' | 'uploading' | 'queued' | 'running'

export interface AiEditOptions {
  transparentBackground?: boolean
}

/**
 * React hook that runs AI edits and tracks their progress.
 *
 *   const ai = useAiEdit()
 *   const canvas = await ai.run(source, "make the sky a sunset")
 *   // canvas is the edited image at the same size as `source`, or null if cancelled/failed
 */
export function useAiEdit() {
  const [phase, setPhase] = useState<AiPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const busy = phase !== 'idle'

  // Tick the "elapsed seconds" counter while busy.
  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])

  // Stop polling if the editor is closed mid-edit.
  useEffect(() => () => abortRef.current?.abort(), [])

  const run = useCallback(
    async (source: ImageSource, prompt: string, options: AiEditOptions = {}): Promise<HTMLCanvasElement | null> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setElapsed(0)
      setPhase('uploading')
      try {
        const encoded = encodeForAi(source)
        const blob = await runAiEdit(
          {
            prompt,
            image: encoded.dataUrl,
            width: encoded.width,
            height: encoded.height,
            transparentBackground: options.transparentBackground,
          },
          { signal: controller.signal, onStatus: (s) => s !== 'done' && s !== 'error' && setPhase(s) },
        )
        // Bring the result back to the exact size of the photo on the canvas.
        return await blobToCanvas(blob, source.width, source.height)
      } catch (err) {
        if (controller.signal.aborted) return null
        setError(err instanceof Error ? err.message : 'The AI edit failed.')
        return null
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setPhase('idle')
        }
      }
    },
    [],
  )

  /** Stop waiting. (The server may still finish the edit, but we ignore it.) */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPhase('idle')
  }, [])

  return { phase, busy: phase !== 'idle', elapsed, error, clearError: () => setError(null), run, cancel }
}
