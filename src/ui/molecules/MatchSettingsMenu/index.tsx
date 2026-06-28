import { useState, useRef, useEffect } from 'react'
import { useLang } from '../../i18n'
import { SoundControls } from '../SoundControls'

/** Settings cog icon (Material-style, solid fill). */
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
  )
}

interface MatchSettingsMenuProps {
  /** Opens the exit/surrender confirm flow (null hides the exit row). */
  onExit?: () => void
  /** Exit row label, tuned per mode (Surrender run / Quit match). */
  exitLabel?: string
}

/**
 * One discreet gear in the top-right corner that gathers the secondary match controls
 * (sound channels + exit) into a small popover, so they no longer clutter the HUD.
 */
export function MatchSettingsMenu({ onExit, exitLabel }: MatchSettingsMenuProps) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="match-settings" ref={ref}>
      <button
        type="button"
        className={`match-settings-gear${open ? ' open' : ''}`}
        aria-label={t('match.menu.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconGear />
      </button>
      {open && (
        <div className="match-settings-pop" role="menu">
          <div className="match-settings-row">
            <span className="match-settings-label">{t('match.menu.sound')}</span>
            <SoundControls />
          </div>
          {onExit && (
            <button
              type="button"
              className="match-settings-exit"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onExit()
              }}
            >
              {exitLabel ?? t('match.menu.label')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
