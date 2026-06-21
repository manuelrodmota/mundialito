import { Button } from '../../atoms/Button'

interface MainMenuProps {
  onQuickplay: () => void
  onArcade?: () => void
  onCollection?: () => void
  onHowToPlay?: () => void
}

/** Main mode-select screen — entry point for Quickplay, Arcade Run, Collection, and How to Play. */
export function MainMenu({ onQuickplay, onArcade, onCollection, onHowToPlay }: MainMenuProps) {
  return (
    <div className="menu-screen">
      <div style={{ textAlign: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 36, margin: 0 }}>World Cup Clash</h1>
        <p className="note" style={{ margin: '8px 0 0' }}>
          Build your squad. Score the goals.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 12,
          width: '100%',
          maxWidth: 320,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Button variant="gold" size="big" onClick={onQuickplay}>
          Quickplay
        </Button>

        <Button variant="primary" size="big" onClick={onArcade}>
          Arcade Run
        </Button>

        <Button variant="ghost" onClick={onCollection}>
          Collection
        </Button>

        <Button variant="ghost" onClick={onHowToPlay}>
          How to Play
        </Button>
      </div>
    </div>
  )
}
