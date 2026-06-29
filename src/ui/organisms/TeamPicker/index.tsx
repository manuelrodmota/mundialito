import { useState } from 'react'
import { useLang } from '../../i18n'
import { PICKABLE_NATIONS, teamBadge } from '../../data/nations'

interface TeamPickerProps {
  current: string | null
  onPick: (nation: string) => void
  onClose: () => void
}

/** Modal to choose a favourite nation — shown as a crest on the account. */
export function TeamPicker({ current, onPick, onClose }: TeamPickerProps) {
  const { t } = useLang()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = query ? PICKABLE_NATIONS.filter((n) => n.toLowerCase().includes(query)) : PICKABLE_NATIONS

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="team-picker" onClick={(e) => e.stopPropagation()}>
        <h3>{t('account.pickTeamTitle')}</h3>
        <input
          className="coll-search"
          autoFocus
          value={q}
          placeholder={t('account.pickTeamSearch')}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="team-grid">
          {list.map((nation) => {
            const badge = teamBadge(nation)
            return (
              <button
                key={nation}
                className={`team-opt${nation === current ? ' on' : ''}`}
                type="button"
                title={nation}
                onClick={() => onPick(nation)}
              >
                {badge ? <img src={badge} alt="" loading="lazy" draggable={false} /> : <span className="tb-fallback" />}
                <span className="tn">{nation}</span>
              </button>
            )
          })}
          {list.length === 0 && <div className="coll-empty">{t('account.pickTeamNone')}</div>}
        </div>
      </div>
    </div>
  )
}
