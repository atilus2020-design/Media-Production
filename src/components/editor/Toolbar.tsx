import {
  Brush,
  Circle,
  Crop,
  Eraser,
  Hand,
  type LucideIcon,
  Minus,
  MousePointer2,
  Square,
  SquareDashed,
  Type,
} from 'lucide-react'

/** All tool ids. Most are placeholders until their phase is built. */
export type ToolId =
  | 'hand'
  | 'move'
  | 'select'
  | 'crop'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'

interface ToolDef {
  id: ToolId
  label: string
  shortcut: string
  icon: LucideIcon
  /** Phase in which this tool becomes functional. */
  phase: number
}

const TOOLS: ToolDef[] = [
  { id: 'hand', label: 'Hand (pan)', shortcut: 'H', icon: Hand, phase: 1 },
  { id: 'move', label: 'Move', shortcut: 'V', icon: MousePointer2, phase: 3 },
  { id: 'select', label: 'Rectangle select', shortcut: 'M', icon: SquareDashed, phase: 4 },
  { id: 'crop', label: 'Crop', shortcut: 'C', icon: Crop, phase: 3 },
  { id: 'brush', label: 'Brush', shortcut: 'B', icon: Brush, phase: 4 },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser, phase: 4 },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type, phase: 4 },
  { id: 'rect', label: 'Rectangle', shortcut: 'U', icon: Square, phase: 4 },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'U', icon: Circle, phase: 4 },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus, phase: 4 },
]

/** Highest phase built so far; tools from later phases render disabled. */
const CURRENT_PHASE = 1

interface Props {
  active: ToolId
  onChange: (tool: ToolId) => void
}

/** Vertical tool bar on the left, like Photoshop. */
export default function Toolbar({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Tools"
      className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-edge bg-panel py-2"
    >
      {TOOLS.map((tool) => {
        const enabled = tool.phase <= CURRENT_PHASE
        const Icon = tool.icon
        const title = enabled
          ? `${tool.label} (${tool.shortcut})`
          : `${tool.label}: coming in Phase ${tool.phase}`
        return (
          <button
            key={tool.id}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active === tool.id}
            disabled={!enabled}
            onClick={() => onChange(tool.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
              active === tool.id
                ? 'bg-accent text-white'
                : 'text-fg hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )
      })}
    </nav>
  )
}
