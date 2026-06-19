import { Section, Sub, Note, Code, Frame, Tile } from '../kit'
import { dsSamples } from '../kitData'
import { Scoreboard } from '../../organisms/Scoreboard'
import { ExtraTimeBanner } from '../../organisms/ExtraTime'
import { DeckPile } from '../../molecules/DeckPile'
import { CapChip } from '../../atoms/CapChip'
import { StaminaMeter, XGMeter } from '../../molecules/Meters'
import { Lane, ClashBadge, DmgFloat, XGFloat } from '../../organisms/Lanes'
import { DndContext } from '@dnd-kit/core'
import { PlayerCard } from '../../molecules/PlayerCard'
import { LockerSwapRow } from '../../organisms/LockerSwapRow'

export function Patterns() {
  return (
    <>
      <Section id="scoreboard" eyebrow="Patterns" title="Scoreboard &amp; match clock"
        lede="Numeric scoreline, running clock, 3-goal mercy marker, and xG rail.">
        <Frame center pitch caption={<span><Code>.scoreboard7</Code> — angled team plates clip into a dark numeric core.</span>}>
          <Scoreboard them={1} you={2} minute="63'" phase="2ND HALF" mercy="You +1 · 2 from mercy" />
        </Frame>
        <Sub>States</Sub>
        <div className="ds-grid cols-2">
          <Tile label="Kickoff" sub="level — mercy threshold shown calmly">
            <Scoreboard them={0} you={0} minute="9'" phase="1ST HALF" mercy="Lead by 3 to win" />
          </Tile>
          <Tile label="Extra time" sub="golden-goal palette">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <ExtraTimeBanner />
              <Scoreboard them={2} you={2} minute="95'" phase="EXTRA TIME" mercy="Golden goal · next goal wins" mercyHot et />
            </div>
          </Tile>
        </div>
      </Section>

      <Section id="piles" eyebrow="Patterns" title="Card piles — the flow"
        lede="Four zones flank the hand: commons cycle draw/discard, premiums bench until halftime, Tactical Cards burn to exiled.">
        <Frame center caption={<span><Code>.deckpile5.dp7</Code> — draw &amp; bench on left, discard &amp; exiled on right.</span>}>
          <div style={{ display: 'flex', gap: 30, alignItems: 'flex-end' }}>
            <DeckPile kind="draw" count={12} mark="WC" label="Draw" />
            <DeckPile kind="locked" count={3} mark="★" label="Bench" cue="back at HT" />
            <DeckPile kind="discard" count={6} mark="WC" label="Discard" cue="grays cycle" />
            <DeckPile kind="exiled" count={2} mark="✕" label="Spent" cue="single-use" />
          </div>
        </Frame>
      </Section>

      <Section id="limits" eyebrow="Patterns" title="Hand &amp; tactical limits"
        lede="Cap chips show per-round player cap and tactical-plays-this-half counter.">
        <Frame center caption={<span><Code>.cap-chip5</Code> per-round player cap · <Code>.cap-chip5.tac</Code> tactics this half. Both go <Code>.full</Code> at the limit.</span>}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <CapChip kind="players" current={2} max={4} />
            <CapChip kind="players" current={4} max={4} />
            <CapChip kind="tactics" current={0} max={2} />
            <CapChip kind="tactics" current={1} max={2} />
            <CapChip kind="tactics" current={2} max={2} />
            <CapChip kind="star" />
          </div>
        </Frame>
        <Sub>Run tactical deck cap — locker swap</Sub>
        <div className="ds-grid cols-2">
          <Tile label="Tactical swap-row" sub="OUT = card being replaced, highlighted = swap-in">
            <div className="pick-rows" style={{ width: '100%' }}>
              <div className="group-h">Tactical cards · 4 / 4</div>
              <LockerSwapRow name="Catenaccio" isSwappingOut />
              <LockerSwapRow name="VAR Review" />
              <LockerSwapRow name="Penalty Kick — swap in" isHighlighted />
            </div>
          </Tile>
        </div>
        <Note>The locker swap-row (<Code>.pick-row.tactic-row</Code>) appears when a run reward exceeds the 4-card deck cap.</Note>
      </Section>

      <Section id="starcore" eyebrow="Patterns · v10" title="Field cost &amp; the star core"
        lede="The v10 balance pass makes quality beat quantity. Fielding a card costs a gentle per-round stamina by rarity (separate from the deck-build slot cost). In any lane holding a premium, the costliest card pays full and every other card is half-price — a “star core” — so a few stars out-field a wall of commons. Stacking a lane also hits diminishing returns.">
        <Sub>Per-round field cost</Sub>
        <Frame center caption={<span>Stamina to field a card this round. The deck-build <b>slot</b> cost (0 / 1 / 2 / 3) is unchanged.</span>}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            {([['common', 2], ['rare', 2], ['epic', 3], ['legendary', 4]] as const).map(([r, c]) => (
              <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <PlayerCard card={dsSamples[r]} size={96} />
                <span className="chip"><b>{c}</b> stamina</span>
              </div>
            ))}
          </div>
        </Frame>
        <Sub>Star-core discount</Sub>
        <div className="ds-grid cols-2">
          <Tile label="All commons — no discount" sub="three commons in a lane = 2 + 2 + 2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="chip">2</span><span className="chip">2</span><span className="chip">2</span>
              <span className="res l" style={{ marginLeft: 'auto' }}>= 6 stamina</span>
            </div>
          </Tile>
          <Tile label="Star core — support half-price" sub="legendary anchor pays full; the rest halve (min 1)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="chip" style={{ borderColor: 'var(--gold)', color: '#ffd9a0' }}>★ 4</span><span className="chip">1</span><span className="chip">1</span>
              <span className="res dmg" style={{ marginLeft: 'auto' }}>= 6 stamina</span>
            </div>
          </Tile>
        </div>
        <Note>The discount is holistic, not per-card: stamina is recomputed from the committed lanes each round, and placement affordability uses the <i>marginal</i> cost — adding a star can retroactively halve its lane-mates. The <Code>.cap-chip5.star</Code> chip lights up while a lane holds a premium.</Note>
        <Sub>Diminishing returns on stacking</Sub>
        <Frame center caption={<span>A lane’s contributions are sorted high→low and weighted, so the 4th–5th body adds little.</span>}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {([['1st', '1.00'], ['2nd', '0.85'], ['3rd', '0.70'], ['4th', '0.55'], ['5th', '0.40'], ['6th', '0.25']] as const).map(([ord, w]) => (
              <div key={ord} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span className="chip" style={{ opacity: 0.4 + 0.6 * parseFloat(w) }}><b>{ord}</b></span>
                <span style={{ fontSize: 12, color: 'var(--txt-dim)', fontWeight: 700 }}>×{w}</span>
              </div>
            ))}
          </div>
        </Frame>
      </Section>

      <Section id="meters" eyebrow="Patterns" title="Meters &amp; gauges"
        lede="Stamina pips and the xG meter that heats up as a side fatigues.">
        <div className="ds-grid cols-2">
          <Tile label="Stamina ramp" sub="pips fill; ramp hint flags next bump (8→10→12)">
            <StaminaMeter current={5} max={8} rampLabel="+2 ramp" />
          </Tile>
          <Tile label="xG meter — fatigue heat" sub="data-heat 0→3 glows orange→red as a goal nears">
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <XGMeter goals={2} xg={0.40} heat={0} label="YOU" mine />
              <XGMeter goals={1} xg={0.88} heat={3} label="THEM" />
            </div>
          </Tile>
        </div>
      </Section>

      <Section id="lanes" eyebrow="Patterns" title="Lanes &amp; the clash"
        lede="Cards are committed into attack or defense lanes. On reveal, lanes march to midfield and a clash badge totals ATK vs DEF.">
        <Frame pitch caption={<span><Code>.lane4</Code> lanes · <Code>.clash4</Code> badge · <Code>.dmg-float</Code> surplus. A droppable lane glows gold.</span>}>
          <DndContext>
            <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', width: '100%', justifyContent: 'center', minHeight: 220, position: 'relative' }}>
              <Lane id="atk" kind="atk" label="Your attack" lw={92}>
                <PlayerCard card={dsSamples.legendary} size={92} />
              </Lane>
              <ClashBadge atk={112} def={70} diff={42} />
              <Lane id="def" kind="def" label="Their defense" lw={92}>
                <PlayerCard card={dsSamples.defender} size={92} />
              </Lane>
            </div>
          </DndContext>
        </Frame>
        <Sub>v10 balance levers — lane-group indicators</Sub>
        <Frame pitch caption={<span>A stacked, premium-anchored lane: <Code>.fx-pill.stack</Code> (diminishing returns) + <Code>.fx-pill.core</Code> (star-core saving), framed by the gold <Code>.fx-core</Code> zone. Cards pack into the measured height (<Code>--ovl</Code>) so a full lane never spills off the pitch.</span>}>
          <DndContext>
            {/* fx is laneFx([legendary, epic, rare], "attack") — kept as a literal so the gallery stays engine-type-only */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 280, position: 'relative' }}>
              <Lane id="atk-fx" kind="atk" label="Your attack" lw={84} count={3} fx={{ lossPct: 13, saved: 3, starcore: true }}>
                <div><PlayerCard card={dsSamples.legendary} size={84} /></div>
                <div><PlayerCard card={dsSamples.epic} size={84} /></div>
                <div><PlayerCard card={dsSamples.rare} size={84} /></div>
              </Lane>
            </div>
          </DndContext>
        </Frame>
        <Note>Both levers are independent and can light up together. The amber <Code>−N% stacked</Code> pill reflects diminishing returns on lane stacking (any tier mix); the gold <Code>★ −N⚡ star core</Code> pill reflects the half-price support discount when a premium anchors the lane.</Note>
        <Sub>Floating feedback</Sub>
        <Frame center caption="damage number · zero/held · xG gain float">
          <div style={{ position: 'relative', width: 120, height: 80 }}>
            <DmgFloat value={42} />
          </div>
          <div style={{ position: 'relative', width: 120, height: 80 }}>
            <DmgFloat value="HELD" />
          </div>
          <XGFloat amount={0.34} />
        </Frame>
      </Section>
    </>
  )
}
