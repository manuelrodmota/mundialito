import type { Difficulty } from '../../quickplay/useQuickplayMatch'

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
    <div className="screen menu">
      <div className="stadium-bg"></div>
      <div className="logo-block">
        <div className="kicker">Quickplay</div>
        <h1>Choose difficulty</h1>
        <div className="sub">Difficulty sets your opponent&apos;s tier — from developing sides (D) up to world champions (S).</div>
      </div>

      <div className="actions">
        {DIFFICULTY_OPTIONS.map(({ difficulty, label, tier, description }) => {
          const isSelected = selected === difficulty
          const btnCls = [
            'btn',
            'dp-option',
            isSelected ? 'btn-gold selected' : 'btn-primary',
          ].join(' ')
          return (
            <button
              key={difficulty}
              type="button"
              className={btnCls}
              onClick={() => onSelect(difficulty)}
              data-difficulty={difficulty}
            >
              <span className="dp-tier">{tier}</span>
              {' '}
              <span className="dp-label">{label}</span>
              <span className="dp-desc"> — {description}</span>
            </button>
          )
        })}
      </div>

      <div className="actions" style={{ flexDirection: 'row', width: 'auto', marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-gold btn-big"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Finding opponent…' : 'Kick off'}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
