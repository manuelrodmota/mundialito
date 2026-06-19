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
