/**
 * Talks to our Netlify Functions. The browser never sees the AI API key;
 * it only calls /api/... on our own site.
 *
 * Flow: start a job → poll its status every 2s → download the result.
 */

export interface StartJobInput {
  prompt: string
  image: string // data URL
  width: number
  height: number
  mask?: string // PNG data URL (Phase 4)
  transparentBackground?: boolean
}

type JobState = 'queued' | 'running' | 'done' | 'error'

const POLL_INTERVAL_MS = 2000
/** Stop waiting after 6 minutes. */
const MAX_WAIT_MS = 6 * 60 * 1000

/** Read `{ error }` from a failed response, with a sensible fallback. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* not JSON (e.g. an HTML error page) */
  }
  if (res.status === 429) return 'Too many AI requests. Please wait a minute and try again.'
  if (res.status === 404) return 'The AI service was not found. If running locally, use `netlify dev` instead of `npm run dev`.'
  return fallback
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelled', 'AbortError'))
    })
  })

/**
 * Run a complete AI edit and return the edited image as a Blob.
 * `onStatus` is called with "queued" / "running" so the UI can show progress.
 * Throws an Error with a friendly message on failure.
 */
export async function runAiEdit(
  input: StartJobInput,
  opts: { signal?: AbortSignal; onStatus?: (state: JobState) => void } = {},
): Promise<Blob> {
  const { signal, onStatus } = opts

  // 1) Start the job
  let res: Response
  try {
    res = await fetch('/api/ai/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new Error('Could not reach the server. Check your internet connection.')
  }
  if (!res.ok) throw new Error(await readError(res, 'Could not start the AI edit.'))
  const { jobId } = (await res.json()) as { jobId: string }
  onStatus?.('queued')

  // 2) Poll until done
  const started = Date.now()
  while (true) {
    await sleep(POLL_INTERVAL_MS, signal)
    if (Date.now() - started > MAX_WAIT_MS) throw new Error('The AI is taking too long. Please try again.')

    let statusRes: Response
    try {
      statusRes = await fetch(`/api/ai/jobs/${jobId}`, { signal, cache: 'no-store' })
    } catch (err) {
      if (signal?.aborted) throw err
      continue // brief network hiccup: just try again next tick
    }
    if (!statusRes.ok) throw new Error(await readError(statusRes, 'Lost track of the AI job.'))

    const status = (await statusRes.json()) as { state: JobState; error?: string }
    if (status.state === 'error') throw new Error(status.error || 'The AI edit failed.')
    if (status.state === 'done') break
    onStatus?.(status.state)
  }

  // 3) Download the result
  const imgRes = await fetch(`/api/ai/jobs/${jobId}/image`, { signal, cache: 'no-store' })
  if (!imgRes.ok) throw new Error(await readError(imgRes, 'Could not download the edited image.'))
  return imgRes.blob()
}
