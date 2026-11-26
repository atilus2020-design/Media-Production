/**
 * Simple usage limits so nobody can run up your AI bill.
 *
 *   AI_DAILY_LIMIT          max AI edits per day for the whole site  (default 100)
 *   AI_HOURLY_LIMIT_PER_IP  max AI edits per hour per visitor        (default 20)
 *
 * Counts are kept in Netlify Blobs. Visitor IPs are hashed before storage,
 * so raw IP addresses are never saved. The counters aren't perfectly atomic
 * (two simultaneous requests might both squeak through), which is fine for a
 * cost guard. Phase 5 builds on this.
 */
import { getStore } from '@netlify/blobs'
import { UserFacingError } from './ai/types.ts'

const store = () => getStore({ name: 'ai-usage', consistency: 'strong' })

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Buffer.from(digest).toString('hex').slice(0, 32)
}

async function readCount(key: string): Promise<number> {
  const value = (await store().get(key, { type: 'json' })) as { count?: number } | null
  return value?.count ?? 0
}

/**
 * Throws a friendly 429 error if a limit is reached; otherwise records one use.
 * Call this right before starting (and paying for) an AI edit.
 */
export async function checkAndCountUsage(ip: string): Promise<void> {
  const dailyLimit = intEnv('AI_DAILY_LIMIT', 100)
  const hourlyLimit = intEnv('AI_HOURLY_LIMIT_PER_IP', 20)

  const now = new Date().toISOString() // e.g. 2026-11-26T14:03:12.000Z
  const dayKey = `day/${now.slice(0, 10)}`
  const ipKey = `ip/${await sha256(ip || 'unknown')}/${now.slice(0, 13)}`

  const [dayCount, ipCount] = await Promise.all([readCount(dayKey), readCount(ipKey)])

  if (dayCount >= dailyLimit) {
    throw new UserFacingError('The daily AI edit limit for this site has been reached. Please try again tomorrow.', 429)
  }
  if (ipCount >= hourlyLimit) {
    throw new UserFacingError(
      `You've reached the limit of ${hourlyLimit} AI edits per hour. Please try again later.`,
      429,
    )
  }

  await Promise.all([
    store().setJSON(dayKey, { count: dayCount + 1 }),
    store().setJSON(ipKey, { count: ipCount + 1 }),
  ])
}
