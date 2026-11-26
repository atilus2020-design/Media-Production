import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { type AiPreset, AI_PRESETS } from '../../lib/ai/presets.ts'
import type { AiPhase } from '../../lib/ai/useAiEdit.ts'
import type { BackendHealth } from '../../lib/useBackendHealth.ts'

interface Props {
  hasImage: boolean
  health: BackendHealth
  phase: AiPhase
  elapsed: number
  error: string | null
  onClearError: () => void
  onRun: (prompt: string, options: { transparentBackground?: boolean; label?: string }) => void
  onCancel: () => void
}

const MAX_PROMPT = 1000

const PHASE_TEXT: Record<AiPhase, string> = {
  idle: '',
  uploading: 'Uploading photo…',
  queued: 'Waiting for the AI…',
  running: 'AI is editing your photo…',
}

/** "Describe how you want to edit this photo" box + one-click presets. */
export default function AiPanel({ hasImage, health, phase, elapsed, error, onClearError, onRun, onCancel }: Props) {
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const busy = phase !== 'idle'
  const backendReady = health === 'ok' || health === 'checking'
  const canRun = hasImage && !busy && backendReady

  const submit = () => {
    const text = prompt.trim()
    if (!canRun || !text) return
    onRun(text, { label: text })
  }

  const applyPreset = (preset: AiPreset) => {
    if (preset.needsDetails) {
      // Let the user finish the sentence, cursor at the end.
      setPrompt(preset.prompt)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        el?.focus()
        el?.setSelectionRange(preset.prompt.length, preset.prompt.length)
      })
      return
    }
    onRun(preset.prompt, { transparentBackground: preset.transparentBackground, label: preset.label })
  }

  return (
    <div className="space-y-2">
      <HealthNotice health={health} />

      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter submits
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submit()
          }
        }}
        disabled={busy}
        rows={3}
        placeholder={hasImage ? 'Describe how you want to edit this photo…' : 'Upload a photo first'}
        aria-label="Describe how you want to edit this photo"
        className="w-full resize-none rounded-md border border-edge bg-app p-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60"
      />

      {busy ? (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
            <span className="flex-1" role="status">{PHASE_TEXT[phase]}</span>
            <span className="tabular-nums text-muted">{elapsed}s</span>
          </div>
          <p className="mt-1 text-xs text-muted">This usually takes 15–60 seconds.</p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded border border-edge py-1 text-xs hover:bg-panel-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canRun || !prompt.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Generate
          <span className="hidden text-xs font-normal opacity-70 lg:inline">(Ctrl+Enter)</span>
        </button>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/50 bg-[#3a1f1f] p-2 text-xs text-[#ffd6d6]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onClearError} aria-label="Dismiss error" className="opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div>
        <p className="mb-1.5 mt-3 text-xs text-muted">Quick edits</p>
        <div className="flex flex-wrap gap-1.5">
          {AI_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={!canRun}
              onClick={() => applyPreset(preset)}
              title={preset.needsDetails ? 'Fills the prompt box. Finish the sentence, then Generate.' : preset.prompt}
              className="rounded-full border border-edge bg-panel-2 px-2.5 py-1 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge"
            >
              {preset.label}
              {preset.needsDetails && '…'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Explains setup problems in plain language. */
function HealthNotice({ health }: { health: BackendHealth }) {
  if (health === 'ok' || health === 'checking') return null
  const text =
    health === 'no-key'
      ? 'AI is not set up yet: add OPENAI_API_KEY to your .env file (local) or Netlify environment variables, then restart/redeploy.'
      : 'Can’t reach the AI backend. Locally, run `netlify dev` (not `npm run dev`) and open http://localhost:8888.'
  return (
    <div className="flex items-start gap-2 rounded-md border border-[#806a2a] bg-[#3a321b] p-2 text-xs text-[#ffe9a8]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  )
}
