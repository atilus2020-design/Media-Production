/**
 * GET /api/health
 *
 * A tiny "is the backend alive?" endpoint. It proves that Netlify Functions
 * are deployed and that the server can see the API key, WITHOUT ever
 * revealing the key itself (we only report true/false).
 *
 * In Phase 2 the real AI endpoint (`/api/edit`) will live next to this file.
 */
import type { Config } from '@netlify/functions'

export default async (): Promise<Response> => {
  return Response.json({
    ok: true,
    // Only a boolean: never send secrets (or parts of them) to the browser.
    aiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    time: new Date().toISOString(),
  })
}

// Serve this function at a friendly URL instead of /.netlify/functions/health
export const config: Config = {
  path: '/api/health',
}
