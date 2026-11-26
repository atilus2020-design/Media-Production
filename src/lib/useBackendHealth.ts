import { useEffect, useState } from 'react'

/**
 * Asks GET /api/health whether the backend is running and the AI key is set,
 * so the UI can explain what's wrong instead of failing mysteriously.
 *
 *   "checking"     still asking
 *   "ok"           ready for AI edits
 *   "no-key"       functions work, but OPENAI_API_KEY isn't set
 *   "unreachable"  no functions (e.g. you ran `npm run dev` instead of `netlify dev`)
 */
export type BackendHealth = 'checking' | 'ok' | 'no-key' | 'unreachable'

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>('checking')

  useEffect(() => {
    let cancelled = false
    fetch('/api/health', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { aiKeyConfigured?: boolean }) => {
        if (!cancelled) setHealth(data.aiKeyConfigured ? 'ok' : 'no-key')
      })
      // Vite's dev server answers unknown URLs with index.html, so JSON parsing fails → unreachable.
      .catch(() => !cancelled && setHealth('unreachable'))
    return () => {
      cancelled = true
    }
  }, [])

  return health
}
