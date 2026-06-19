import type { Difficulty } from '../../quickplay/useQuickplayMatch'
import { Button } from '../../atoms/Button'

interface DifficultyOption {
  difficulty: Difficulty
  label: string
  tier: string
  description: string
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { difficulty: 'easy', label: 'Easy', tier: 'D', description: 'A friendly warm-up match against a developing side.' },
  { difficulty: 'medium', label: 'Medium', tier: 'C', description: 'A balanced contest — expect a proper game.' },
  { difficulty: 'hard', label: 'Hard', tier: 'B', description: 'A formidable opponent. You\'ll need your best XI.' },
  { difficulty: 'legendary', label: 'Legendary', tier: 'S', description: 'A champion side. Prepare for a battle.' },
]

interface DifficultyPickerProps {
  selected: Difficulty
  onSelect: (d: Difficulty) => void
  onConfirm: () => void
  onBack: () => void
  loading?: boolean
}

/** Difficulty picker — four levels mapping to opponent tiers D/C/B/S (Legendary = champion). */
export function DifficultyPicker({
  selected,
  onSelect,
  onConfirm,
  onBack,
  loading = false,
}: DifficultyPickerProps) {
  return (
    <div className="difficulty-picker">
      <div className="dp-header">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <h2>Choose Your Opponent</h2>
      </div>

      <div className="dp-options">
        {DIFFICULTY_OPTIONS.map(({ difficulty, label, tier, description }) => (
          <button
            key={difficulty}
            type="button"
            className={`dp-option${selected === difficulty ? ' selected' : ''}`}
            onClick={() => onSelect(difficulty)}
            data-difficulty={difficulty}
          >
            <div className="dp-tier">{tier}</div>
            <div className="dp-label">{label}</div>
            <div className="dp-desc">{description}</div>
          </button>
        ))}
      </div>

      <Button
        variant="gold"
        size="big"
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? 'Finding opponent…' : 'Kick Off'}
      </Button>
    </div>
  )
}
