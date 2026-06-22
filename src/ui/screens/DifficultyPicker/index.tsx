import type { Difficulty } from '../../quickplay/useQuickplayMatch'
import { useLang } from '../../i18n'

interface DifficultyOption {
  difficulty: Difficulty
  /** i18n key for the human-readable difficulty name. */
  labelKey: string
  tier: string
  /** i18n key for the descriptive blurb. */
  descKey: string
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { difficulty: 'easy', labelKey: 'screens.diffEasyLabel', tier: 'D', descKey: 'screens.diffEasyDesc' },
  { difficulty: 'medium', labelKey: 'screens.diffMediumLabel', tier: 'C', descKey: 'screens.diffMediumDesc' },
  { difficulty: 'hard', labelKey: 'screens.diffHardLabel', tier: 'B', descKey: 'screens.diffHardDesc' },
  { difficulty: 'legendary', labelKey: 'screens.diffLegendaryLabel', tier: 'S', descKey: 'screens.diffLegendaryDesc' },
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
  const { t } = useLang()
  return (
    <div className="screen menu">
      <div className="stadium-bg"></div>
      <div className="logo-block">
        <div className="kicker">{t('screens.diffKicker')}</div>
        <h1>{t('screens.diffTitle')}</h1>
        <div className="sub">{t('screens.diffSubtitle')}</div>
      </div>

      <div className="actions">
        {DIFFICULTY_OPTIONS.map(({ difficulty, labelKey, tier, descKey }) => {
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
              <span className="dp-label">{t(labelKey)}</span>
              <span className="dp-desc"> — {t(descKey)}</span>
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
          {loading ? t('screens.diffFinding') : t('screens.diffKickOff')}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onBack}>
          {t('screens.diffBack')}
        </button>
      </div>
    </div>
  )
}
