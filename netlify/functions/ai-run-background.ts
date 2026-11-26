/**
 * Background worker that performs the actual AI edit.
 *
 * The "-background" suffix plus `background: true` makes Netlify reply
 * "202 Accepted" immediately and let this run for up to 15 minutes, which
 * is plenty for slow image models. It's started by ai-jobs.ts with { jobId }.
 */
import type { NetlifyFunction } from '@netlify/functions'
import { getProvider } from '../lib/ai/index.ts'
import { safeMessage } from '../lib/http.ts'
import { deleteInput, getInput, getStatus, isValidJobId, saveResult, updateStatus } from '../lib/jobs.ts'

export default {
  async fetch(req: Request) {
    let jobId: unknown
    try {
      jobId = ((await req.json()) as { jobId?: unknown }).jobId
    } catch {
      return
    }
    if (!isValidJobId(jobId)) return

    // Only pick up jobs that are waiting. This also makes it harmless if
    // someone calls this URL directly or twice: nothing runs (or bills) again.
    const status = await getStatus(jobId)
    if (!status || status.state !== 'queued') return
    await updateStatus(jobId, { state: 'running' })

    try {
      const input = await getInput(jobId)
      if (!input) throw new Error('job input missing')

      const started = Date.now()
      const result = await getProvider().editImage(input)
      console.log(`[ai-run] job ${jobId} done in ${((Date.now() - started) / 1000).toFixed(1)}s`)

      await saveResult(jobId, result.bytes)
      await updateStatus(jobId, { state: 'done', mimeType: result.mimeType })
    } catch (err) {
      await updateStatus(jobId, { state: 'error', error: safeMessage(err, 'ai-run') })
    } finally {
      // Don't keep the user's original photo around longer than needed.
      await deleteInput(jobId).catch(() => {})
    }
  },
  config: {
    background: true,
  },
} satisfies NetlifyFunction
