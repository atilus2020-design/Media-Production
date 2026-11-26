/**
 * AI edit "jobs", stored in Netlify Blobs (a key/value store built into Netlify).
 *
 * Why jobs? An AI edit can take longer than the 60 seconds a normal Netlify
 * Function may run, so the work happens in a *background* function (up to
 * 15 minutes) and the browser polls for the result:
 *
 *   browser ──POST /api/ai/jobs──► ai-jobs.ts            saves input, status "queued",
 *                                      │                  kicks off the background function
 *                                      ▼
 *                               ai-run-background.ts      "running" → calls the AI → "done"/"error"
 *   browser ──GET /api/ai/jobs/:id──► ai-job.ts           polls the status
 *   browser ──GET /api/ai/jobs/:id/image──► ai-job.ts     downloads the result (then it's deleted)
 *
 * Keys per job:  <id>/input  (JSON)   <id>/status (JSON)   <id>/result (bytes)
 */
import { getStore } from '@netlify/blobs'
import type { ImageEditRequest } from './ai/types.ts'

export type JobState = 'queued' | 'running' | 'done' | 'error'

export interface JobStatus {
  state: JobState
  createdAt: number
  updatedAt: number
  /** Friendly error message when state is "error". */
  error?: string
  /** MIME type of the result when state is "done". */
  mimeType?: string
}

/** A job that hasn't finished after this long is treated as failed. */
export const JOB_STALE_MS = 16 * 60 * 1000

/** Strong consistency so a status written by one function is immediately visible to the next. */
const store = () => getStore({ name: 'ai-jobs', consistency: 'strong' })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Job ids are random UUIDs: unguessable, so knowing the id is the "permission" to read it. */
export const isValidJobId = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id)

export async function createJob(input: ImageEditRequest): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await store().setJSON(`${id}/input`, input)
  await setStatus(id, { state: 'queued', createdAt: now, updatedAt: now })
  return id
}

export async function getStatus(id: string): Promise<JobStatus | null> {
  return (await store().get(`${id}/status`, { type: 'json' })) as JobStatus | null
}

export async function setStatus(id: string, status: JobStatus): Promise<void> {
  await store().setJSON(`${id}/status`, status)
}

/** Update some status fields, keeping the rest. */
export async function updateStatus(id: string, patch: Partial<JobStatus>): Promise<void> {
  const current = await getStatus(id)
  if (!current) return
  await setStatus(id, { ...current, ...patch, updatedAt: Date.now() })
}

export async function getInput(id: string): Promise<ImageEditRequest | null> {
  return (await store().get(`${id}/input`, { type: 'json' })) as ImageEditRequest | null
}

export async function saveResult(id: string, bytes: Uint8Array): Promise<void> {
  // Copy into a fresh ArrayBuffer (exactly the image bytes, nothing more).
  await store().set(`${id}/result`, bytes.slice().buffer)
}

export async function getResult(id: string): Promise<ArrayBuffer | null> {
  return store().get(`${id}/result`, { type: 'arrayBuffer' })
}

export async function deleteInput(id: string): Promise<void> {
  await store().delete(`${id}/input`)
}

/** Remove everything about a job, so users' photos aren't kept around. */
export async function deleteJob(id: string): Promise<void> {
  const s = store()
  await Promise.all([s.delete(`${id}/input`), s.delete(`${id}/status`), s.delete(`${id}/result`)])
}
