/**
 * Mock provider for FREE testing: AI_PROVIDER=mock
 *
 * Waits a few seconds and returns your photo unchanged. Use it to check
 * that uploads, jobs, polling, history, and the before/after slider all work
 * without spending any API credits.
 */
import type { ImageEditProvider, ImageEditRequest, ImageEditResult } from './types.ts'

export function createMockProvider(): ImageEditProvider {
  return {
    name: 'mock',
    supportsMask: true,
    async editImage(req: ImageEditRequest): Promise<ImageEditResult> {
      await new Promise((r) => setTimeout(r, Number(process.env.MOCK_DELAY_MS ?? 4000)))
      const [header, b64] = req.image.split(',')
      const mimeType = header.slice('data:'.length, header.indexOf(';'))
      return { bytes: Uint8Array.from(Buffer.from(b64, 'base64')), mimeType }
    },
  }
}
