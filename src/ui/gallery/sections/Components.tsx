import { useState } from 'react'
import { Section, Sub, Note, Code, Frame, Tile } from '../kit'
import { dsSamples, dsTactics, dsTacticDescs } from '../kitData'
import { Button } from '../../atoms/Button'
import { Flag } from '../../atoms/Flag'
import { MiniCrest, PlayerCrest } from '../../atoms/Crest'
import { Chip, StageTag, FormationChip, TacticChip, TierStars, RarityMultBadge } from '../../atoms/Chip'
import { CapChip } from '../../atoms/CapChip'
import { CardBack } from '../../atoms/CardBack'
import { PlayerCard } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { CardModal } from '../../organisms/CardModal'
import type { Card } from '../../../engine/types'

export function Components() {
  const [modal, setModal] = useState<{ card: Card; isCaptain?: boolean } | null>(null)

  return (
    <>
      <Section id="buttons" eyebrow="Components" title="Buttons"
        lede="Three weights of intent. Gold is the primary CTA; purple is the standard action; ghost is secondary.">
        <div className="ds-grid cols-3">
          <Tile label="Gold — primary CTA" sub="Start a run · reward confirm" center>
            <Button variant="gold">Start a run</Button>
            <Button variant="gold" size="big">Kick off</Button>
          </Tile>
          <Tile label="Brand — standard action" sub="Quick run · commit · reveal" center>
            <Button variant="primary">Quick run</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Tile>
          <Tile label="Ghost — secondary" sub="How to play · cancel · back" center>
            <Button variant="ghost">How to play</Button>
            <Button variant="ghost" size="big">Back</Button>
          </Tile>
        </div>
        <Note>Classes: <Code>.btn</Code> + <Code>.btn-gold</Code> / <Code>.btn-primary</Code> / <Code>.btn-ghost</Code>, optional <Code>.btn-big</Code>.</Note>
      </Section>

      <Section id="player-card" eyebrow="Components" title="Player card"
        lede="The hero object. A 1:1.42 portrait with a metallic rarity surface, rating + position, nation flag, jersey figure, name and ATK·DEF stat row.">
        <Frame center caption={<span><b>Anatomy</b> — cost chip · rarity multiplier · captain band · rating/position · flag · jersey · name · ATK·DEF. Click any card for its detail modal.</span>}>
          <PlayerCard card={dsSamples.legendary} size={196} isCaptain showSlots showMult onClick={() => setModal({ card: dsSamples.legendary, isCaptain: true })} />
        </Frame>

        <Sub>Rarity surfaces</Sub>
        <Frame center caption="common · rare · epic · legendary">
          {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => (
            <PlayerCard key={r} card={dsSamples[r] ?? dsSamples.legendary} size={150} showSlots showMult onClick={() => setModal({ card: dsSamples[r] ?? dsSamples.legendary })} />
          ))}
        </Frame>

        <Sub>States &amp; overlays</Sub>
        <Frame center caption="captain band · booked · injured · selected · unaffordable · face-down">
          <PlayerCard card={dsSamples.defender} size={132} isCaptain showSlots />
          <PlayerCard card={dsSamples.rare} size={132} status={{ booked: true }} showSlots />
          <PlayerCard card={dsSamples.epic} size={132} status={{ injured: true }} showSlots />
          <PlayerCard card={dsSamples.legendary} size={132} selected />
          <PlayerCard card={dsSamples.common} size={132} unaffordable />
          <PlayerCard card={dsSamples.epic} size={132} faceDown />
        </Frame>
      </Section>

      <Section id="tactic-card" eyebrow="Components" title="Tactic card"
        lede="Same footprint as a player card but content-led: category eyebrow, glyph disc, name, rules text.">
        <Frame center caption={<span>Set via <Code>data-cat</Code>. instant = reactive · skill = one-off · power = persistent.</span>}>
          {(['instant', 'skill', 'power'] as const).map((c) => (
            <TacticCard key={c} card={dsTactics[c]} size={168} description={dsTacticDescs[c]} showSlots onClick={() => setModal({ card: dsTactics[c] })} />
          ))}
        </Frame>
      </Section>

      <Section id="deck" eyebrow="Components" title="Card back">
        <Frame center caption="face-down card with WC backmark">
          <CardBack size={132} />
        </Frame>
      </Section>

      <Section id="crests" eyebrow="Components" title="Crests &amp; flags"
        lede="Nations are reduced to three-band striped chips. The round crest stamps a World Cup year.">
        <Frame center caption="nation crest (with year) · flag chips · player crest · AI crest">
          <MiniCrest cols={['#74ACDF', '#fff', '#74ACDF']} size={54} year="'26" />
          <MiniCrest cols={['#0055A4', '#fff', '#EF4135']} size={54} year="'26" />
          <Flag nation="Brazil" />
          <Flag nation="England" />
          <PlayerCrest variant="you" />
          <PlayerCrest variant="ai" />
        </Frame>
      </Section>

      <Section id="chips" eyebrow="Components" title="Chips, tags &amp; badges"
        lede="Pill-shaped metadata. Count chips carry live numbers; status chips animate; stage and rarity badges classify.">
        <div className="ds-grid cols-2">
          <Tile label="Count &amp; status chips">
            <Chip>Hand <b>5</b></Chip>
            <Chip>Stamina <b>7</b></Chip>
            <Chip variant="flame">On a roll</Chip>
            <Chip variant="stoppage">Stoppage</Chip>
            <CapChip kind="players" current={3} max={3} />
          </Tile>
          <Tile label="Tags &amp; formation">
            <StageTag>Round of 16</StageTag>
            <FormationChip formation="offensive">Offensive</FormationChip>
            <FormationChip formation="defensive">Defensive</FormationChip>
          </Tile>
          <Tile label="Tactic shelf chips" sub="played tactics, colour-keyed by category">
            <div className="shelf">
              <span className="label">You</span>
              <TacticChip category="instant">VAR Review</TacticChip>
              <TacticChip category="skill">Catenaccio</TacticChip>
              <TacticChip category="power">Fortress</TacticChip>
              <TacticChip category="skill" cancelled>Nutmeg</TacticChip>
            </div>
          </Tile>
          <Tile label="Tier stars" sub="opponent difficulty">
            <TierStars filled={3} />
            <TierStars filled={5} />
            <RarityMultBadge rarity="legendary" />
            <RarityMultBadge rarity="epic" />
          </Tile>
        </div>
      </Section>

      <CardModal
        card={modal?.card ?? null}
        open={modal !== null}
        onClose={() => setModal(null)}
        isCaptain={modal?.isCaptain}
        showMult={modal?.card?.type === 'player'}
        tacticDescription={modal?.card?.type === 'tactical' ? dsTacticDescs[modal.card.category] : undefined}
      />
    </>
  )
}
