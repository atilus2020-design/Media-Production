import { WandSparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export interface MenuItem {
  label: string
  shortcut?: string
  onSelect?: () => void
  disabled?: boolean
}

export interface MenuDef {
  label: string
  items: MenuItem[]
}

/**
 * Top menu bar (File / Edit / View …). Click a menu to open it. While one is
 * open, hovering another switches to it, like a desktop app.
 */
export default function MenuBar({ menus }: { menus: MenuDef[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Close the open menu on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      ref={barRef}
      className="flex h-10 shrink-0 items-center gap-1 border-b border-edge bg-panel px-2 text-sm"
    >
      <Link to="/" className="mr-2 flex items-center gap-1.5 px-1 font-semibold" title="Back to home">
        <WandSparkles className="h-4 w-4 text-accent" aria-hidden />
        <span className="hidden sm:inline">AI Photo Editor</span>
      </Link>

      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === menu.label}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
            onPointerEnter={() => open && setOpen(menu.label)}
            className={`rounded px-2.5 py-1 ${open === menu.label ? 'bg-panel-2' : 'hover:bg-panel-2'}`}
          >
            {menu.label}
          </button>

          {open === menu.label && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-1 min-w-56 rounded-md border border-edge bg-panel-2 py-1 shadow-xl"
            >
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(null)
                    item.onSelect?.()
                  }}
                  className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg"
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-xs opacity-70">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </header>
  )
}
