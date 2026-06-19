import { Button } from '../../atoms/Button'
import { Chip } from '../../atoms/Chip'

interface MainMenuProps {
  onQuickplay: () => void
  onArcadeRun?: () => void
  onCollection?: () => void
  onHowToPlay?: () => void
}

/** Main mode-select screen — entry point for Quickplay, Arcade Run (gated MVP), Collection, and How to Play. */
export function MainMenu({ onQuickplay, onCollection, onHowToPlay }: MainMenuProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '48px 24px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
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
        }}
      >
        <Button variant="gold" size="big" onClick={onQuickplay}>
          Quickplay
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="primary" disabled style={{ flex: 1 }}>
            Arcade Run
          </Button>
          <Chip>Coming soon</Chip>
        </div>

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
