/**
 * Picks the AI provider based on the AI_PROVIDER environment variable.
 *
 * To add a provider later (e.g. Gemini):
 *   1. Create `netlify/lib/ai/gemini.ts` exporting `createGeminiProvider()`
 *      that returns an `ImageEditProvider` (see ./types.ts).
 *   2. Add a `case 'gemini'` below.
 *   3. Set AI_PROVIDER=gemini (plus that provider's key) in .env / Netlify.
 */
import { createMockProvider } from './mock.ts'
import { createOpenAIProvider } from './openai.ts'
import { type ImageEditProvider, UserFacingError } from './types.ts'

export function getProvider(): ImageEditProvider {
  const name = (process.env.AI_PROVIDER || 'openai').toLowerCase()
  switch (name) {
    case 'openai':
      return createOpenAIProvider()
    case 'mock':
      return createMockProvider()
    default:
      throw new UserFacingError(`Unknown AI_PROVIDER "${name}" on the server.`, 500)
  }
}

/** True if the selected provider has its API key set (without revealing it). */
export function isProviderConfigured(): boolean {
  const name = (process.env.AI_PROVIDER || 'openai').toLowerCase()
  if (name === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  return name === 'mock'
}

export * from './types.ts'
