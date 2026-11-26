/**
 * GET /api/health
 *
 * A tiny "is the backend alive?" endpoint. It proves that Netlify Functions
 * are deployed and that the server can see the API key, WITHOUT ever
 * revealing the key itself (we only report true/false).
 *
 * The frontend calls this on load to show a helpful message if AI isn't set up.
 */
import type { Config } from '@netlify/functions'
import { isProviderConfigured } from '../lib/ai/index.ts'

export default async (): Promise<Response> => {
  return Response.json({
    ok: true,
    // Only a boolean: never send secrets (or parts of them) to the browser.
    aiKeyConfigured: isProviderConfigured(),
    aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
    time: new Date().toISOString(),
  })
}

// Serve this function at a friendly URL instead of /.netlify/functions/health
export const config: Config = {
  path: '/api/health',
}
