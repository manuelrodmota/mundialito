import { Section, Sub, Swatch, TokenTable, Code } from '../kit'

export function Foundations() {
  return (
    <>
      <Section id="color" eyebrow="Foundations" title="Color"
        lede="The UI is ~85% night-gray. Purple is the interactive accent (one CTA per view); gold is the trophy accent — captains, wins, the gameplay highlight.">
        <Sub>Surfaces — the night palette</Sub>
        <div className="ds-grid cols-4">
          <Swatch name="Night 0" value="#07090F" token="--night-0" />
          <Swatch name="Night 1" value="#0C101A" token="--night-1" />
          <Swatch name="Night 2" value="#131826" token="--night-2" />
          <Swatch name="Night 3" value="#1C2334" token="--night-3" />
        </div>
        <Sub>Brand &amp; accent</Sub>
        <div className="ds-grid cols-4">
          <Swatch name="Brand" value="#7F56D9" token="--brand" />
          <Swatch name="Brand gradient" token="--brand-grad" style={{ background: 'linear-gradient(180deg,#8f68e3,#6941c6)' }} />
          <Swatch name="Gold" value="#E8C873" token="--gold" />
          <Swatch name="Gold gradient" token="--gold-grad" style={{ background: 'linear-gradient(180deg,#f0d68a,#c89a2e)' }} />
        </div>
        <Sub>Semantic &amp; stat inks</Sub>
        <div className="ds-grid cols-4">
          <Swatch name="Good / success" value="#3FBF6F" token="--good" />
          <Swatch name="Bad / damage" value="#E8554A" token="--bad" />
          <Swatch name="Warn / fatigue" value="#FF9E50" token="--warn" />
          <Swatch name="Info / defense" value="#58A9FF" token="--info" />
          <Swatch name="ATK" value="#FF5F4E" token="--atk" />
          <Swatch name="DEF" value="#58A9FF" token="--def" />
        </div>
        <Sub>Card rarity surfaces</Sub>
        <div className="ds-grid cols-3">
          <Swatch name="Common · silver" token="--rar-common" style={{ background: 'linear-gradient(155deg,#d9dde3,#aab2bd 38%,#8a93a0 60%,#c4cad3)' }} />
          <Swatch name="Rare · blue" token="--rar-rare" style={{ background: 'linear-gradient(155deg,#5aa7e8,#2a64b8 40%,#1b3f86 65%,#3f83d6)' }} />
          <Swatch name="Epic · purple" token="--rar-epic" style={{ background: 'linear-gradient(155deg,#b07ae8,#7a3fc0 40%,#4d2386 65%,#9257d8)' }} />
          <Swatch name="Legendary · gold" token="--rar-legendary" style={{ background: 'linear-gradient(155deg,#f6e3a1,#d9b04f 38%,#a87d23 62%,#edd78f)' }} />
        </div>
      </Section>

      <Section id="type" eyebrow="Foundations" title="Typography"
        lede="Inter, weights 400–800. Display sizes use tight tracking; stats and scores use tabular figures.">
        <div className="ds-frame">
          <div className="stage" style={{ display: 'block', padding: '20px 40px' }}>
            {[
              { nm: 'Display', det: '800 · 84px · -0.03em', el: <div style={{ fontWeight: 800, fontSize: 64, letterSpacing: '-0.03em', lineHeight: 1, background: 'linear-gradient(180deg,#fff 30%,#b6bdd1)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>World Cup Clash</div> },
              { nm: 'Title', det: '800 · 34px · -0.02em', el: <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-0.02em' }}>Group stage — match 1</div> },
              { nm: 'Body', det: '400 · 15px · lh 1.5', el: <div style={{ fontSize: 15, color: 'var(--txt-dim)' }}>First to three wins. Survive seven matches.</div> },
              { nm: 'Numeric / score', det: '800 · tabular-nums', el: <div style={{ fontWeight: 800, fontSize: 34, fontVariantNumeric: 'tabular-nums' }}>2 — 1</div> },
            ].map((r, i) => (
              <div className="ds-type-row" key={i}>
                <div className="spec"><div className="nm">{r.nm}</div><div className="det">{r.det}</div></div>
                <div className="sample">{r.el}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="spacing" eyebrow="Foundations" title="Spacing"
        lede="Everything is a multiple of 4px.">
        <div className="ds-frame">
          <div className="stage" style={{ display: 'block', padding: '28px 40px' }}>
            {([[4, 'space-1'], [8, 'space-2'], [12, 'space-3'], [16, 'space-4'], [24, 'space-6'], [32, 'space-8'], [48, 'space-12']] as [number, string][]).map(([px, t]) => (
              <div className="ds-space-row" key={t}>
                <div className="bar" style={{ width: px }} />
                <div className="lab"><b>{px}px</b><span>--{t}</span></div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="shadow" eyebrow="Foundations" title="Elevation &amp; glow"
        lede="Soft, layered, dark-friendly. Selection and reward states glow gold.">
        <div className="ds-grid cols-3">
          {([
            ['--shadow-card', '0 4px 14px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25)'],
            ['--shadow-panel', '0 18px 50px rgba(0,0,0,.45)'],
            ['--glow-gold', '0 0 22px rgba(232,200,115,.35)'],
          ] as [string, string][]).map(([t, v]) => (
            <div key={t}>
              <div className="ds-shadow-box" style={{ boxShadow: v }}>{t.replace('--', '')}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="motion" eyebrow="Foundations" title="Motion"
        lede="Subtle and fast. Everything respects prefers-reduced-motion.">
        <Sub>Easing</Sub>
        <TokenTable cols={['Token', 'Curve', 'Use']} rows={[
          [{ node: <Code>--ease-out</Code>, cls: 'tok' }, { node: 'cubic-bezier(0.16, 1, 0.3, 1)', cls: 'val' }, { node: 'entrances, deal-in', cls: 'desc' }],
          [{ node: <Code>--ease-spring</Code>, cls: 'tok' }, { node: 'cubic-bezier(0.2, 0.8, 0.3, 1)', cls: 'val' }, { node: 'clash pops, score slams', cls: 'desc' }],
        ]} />
        <Sub>Duration</Sub>
        <TokenTable cols={['Token', 'Value', 'Use']} rows={[
          [{ node: <Code>--dur-fast</Code>, cls: 'tok' }, { node: '160ms', cls: 'val' }, { node: 'card lift / select', cls: 'desc' }],
          [{ node: <Code>--dur-base</Code>, cls: 'tok' }, { node: '220ms', cls: 'val' }, { node: 'modal pop, readout slide', cls: 'desc' }],
          [{ node: <Code>--dur-slow</Code>, cls: 'tok' }, { node: '420ms', cls: 'val' }, { node: 'deal-in, deck pulse', cls: 'desc' }],
        ]} />
      </Section>
    </>
  )
}
