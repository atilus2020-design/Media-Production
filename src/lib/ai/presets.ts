/**
 * One-click AI edits. Add or tweak presets here. The prompt is sent
 * to the AI exactly as written, so be specific.
 */
export interface AiPreset {
  id: string
  label: string
  prompt: string
  /** Ask the AI for a transparent background. */
  transparentBackground?: boolean
  /**
   * If true, clicking only fills the prompt box (and focuses it) so the user
   * can finish the sentence, e.g. "Replace the background with …".
   */
  needsDetails?: boolean
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'remove-bg',
    label: 'Remove background',
    prompt:
      'Remove the background completely. Keep only the main subject, with clean, precise edges, on a fully transparent background. Do not alter the subject.',
    transparentBackground: true,
  },
  {
    id: 'enhance',
    label: 'Enhance quality',
    prompt:
      'Enhance this photo: improve sharpness, clarity, lighting, and color balance, and reduce noise, while keeping it natural and true to the original. Do not change the content or composition.',
  },
  {
    id: 'vintage',
    label: 'Make it vintage',
    prompt:
      'Give this photo a vintage film look: warm faded tones, soft contrast, subtle film grain, and a light vignette, like a 1970s print. Keep the content and composition the same.',
  },
  {
    id: 'cartoon',
    label: 'Cartoon style',
    prompt:
      'Redraw this image in a vibrant cartoon illustration style with bold clean outlines and flat colors, keeping the same composition, subjects, and poses.',
  },
  {
    id: 'change-bg',
    label: 'Change background',
    prompt: 'Keep the main subject exactly as it is and replace the background with ',
    needsDetails: true,
  },
]
