import { useState, useEffect } from 'react'
import '../tokens/index.css'
import './gallery.css'
import { Foundations } from './sections/Foundations'
import { Components } from './sections/Components'
import { Patterns } from './sections/Patterns'
import { Screens } from './sections/Screens'

const NAV = [
  { group: 'Foundations', items: [['color', 'Color'], ['type', 'Typography'], ['spacing', 'Spacing'], ['shadow', 'Elevation'], ['motion', 'Motion']] },
  { group: 'Components', items: [['buttons', 'Buttons'], ['player-card', 'Player card'], ['tactic-card', 'Tactic card'], ['deck', 'Card back'], ['crests', 'Crests & flags'], ['chips', 'Chips & badges']] },
  { group: 'Patterns', items: [['scoreboard', 'Scoreboard & clock'], ['piles', 'Card piles'], ['limits', 'Hand & tactical limits'], ['starcore', 'Field cost & star core'], ['meters', 'Meters & gauges'], ['lanes', 'Lanes & clash']] },
  { group: 'Run & meta', items: [['bracket', 'Run map'], ['builder', 'Squad builder'], ['inputs', 'Filters & inputs'], ['overlays', 'Modals & overlays']] },
] as const

/** Living Design System gallery — mirrors the Design System HTML (Foundations · Components · Patterns · Run & meta).
 * Imports the real src/ui/ components so it doubles as an integration check.
 */
export function DesignSystemGallery() {
  const [active, setActive] = useState('color')

  useEffect(() => {
    const ids = NAV.flatMap((g) => g.items.map((i) => i[0]))
    const onScroll = () => {
      let cur: string = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) cur = id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' })
  }

  return (
    <>
      <div className="ds-amb" />
      <div className="ds-shell">
        <aside className="ds-side">
          <div className="ds-brand">
            <div className="mark">WC</div>
            <div className="t">
              <b>World Cup Clash</b>
              <span>Design system</span>
            </div>
          </div>
          <nav className="ds-nav">
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="ds-nav-group">{g.group}</div>
                {g.items.map(([id, label]) => (
                  <a
                    key={id}
                    href={'#' + id}
                    className={active === id ? 'active' : ''}
                    onClick={(e) => go(e, id)}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="ds-main">
          <div className="ds-wrap">
            <header className="ds-hero">
              <div className="kicker">Design system · v10</div>
              <h1>World Cup Clash</h1>
              <p>
                The complete visual language for the roguelike World Cup card game — built on
                Hiedra's purple accent, re-skinned for a dark stadium-night theme. Updated for the
                v10 balance pass: a gentle per-round field cost, the star-core stamina discount,
                diminishing returns on stacked lanes, and sudden-death golden goal.
              </p>
              <div className="meta">
                <span className="pill"><b>Inter</b> · 400–800</span>
                <span className="pill"><b>4pt</b> grid</span>
                <span className="pill">Accent <b>#7F56D9</b> / <b>#E8C873</b></span>
                <span className="pill">Tokens · <b>src/ui/tokens/</b></span>
              </div>
            </header>

            <Foundations />
            <Components />
            <Patterns />
            <Screens />
          </div>
        </main>
      </div>
    </>
  )
}
