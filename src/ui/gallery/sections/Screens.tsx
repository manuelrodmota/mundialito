import { Section, Sub, Frame, Tile, Code, Note } from '../kit'
import { Button } from '../../atoms/Button'
import { FormationPicker } from '../../organisms/FormationPicker'
import { Filters } from '../../organisms/Filters'
import { Ladder } from '../../organisms/Ladder'
import { NextPanel } from '../../organisms/NextPanel'
import { PickRow, SlotMeter } from '../../molecules/PickRow'
import { FillWithCommons } from '../../organisms/FillWithCommons'
import { ResultTitle } from '../../organisms/ResultTitle'
import { Goal } from '../../organisms/Goal'
import { ShotMiss } from '../../organisms/ShotMiss'
import type { Formation } from '../../../engine/types'
import { useState } from 'react'

const DEMO_NODES = [
  { stage: 'Group', number: '1', done: true, beaten: 'Cameroon \'90' },
  { stage: 'Group', number: '2', done: true, beaten: 'Japan \'22' },
  { stage: 'R16', number: '3', now: true },
  { stage: 'Quarter', number: '4' },
  { stage: 'Semi', number: '5' },
  { stage: 'Final', number: '6', final: true },
]

export function Screens() {
  const [formation, setFormation] = useState<Formation>('balanced')

  return (
    <>
      <Section id="bracket" eyebrow="Run &amp; meta" title="Run map / bracket"
        lede="Seven matches from group stage to final. Completed nodes turn green; current node pulses gold; final wears a double ring.">
        <Frame center caption={<span><Code>.ladder</Code> of <Code>.lnode</Code> states: done · now · upcoming · final.</span>}>
          <Ladder nodes={DEMO_NODES} />
        </Frame>

        <Sub>Next-match panel</Sub>
        <Frame center caption={<span><Code>.next-panel</Code> — opponent identity, tier stars, difficulty chips, and action stack.</span>}>
          <NextPanel
            cols={['#74ACDF', '#fff', '#74ACDF']}
            year="'86"
            round="Round of 16"
            name="Argentina 1986"
            tier="A"
            formation="offensive"
            blurb="A relentless attacking team built around one impossible number 10. Park the bus or trade blows."
            extra="Maradona's side"
            actions={
              <>
                <Button variant="gold">Kick off</Button>
                <Button variant="ghost">Locker room</Button>
              </>
            }
          />
        </Frame>
      </Section>

      <Section id="builder" eyebrow="Run &amp; meta" title="Squad builder"
        lede="v9: the slot budget buys a PREMIUM core — commons aren&apos;t hand-pickable. The slot meter tracks spend against the 10-slot cap and turns red on overflow; premium picks list with rating, slot cost and a captain toggle. “Fill bench (random)” rolls the rest of the XI from random commons. The tactical tray starts at one card and grows to a run cap of ~4. Formation picker sets your tactical lean.">
        <div className="ds-grid cols-2">
          <Tile label="Slot meter" sub="fills brand→gold; .over turns red">
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SlotMeter used={8} cap={10} />
              <SlotMeter used={12} cap={10} />
            </div>
          </Tile>
          <Tile label="Pick rows" sub="premium core + bench · random commons">
            <div className="pick-rows" style={{ width: '100%' }}>
              <div className="group-h">Premium core</div>
              <PickRow rating={97} name="Mbappé" slots={3} isCaptain onCaptainToggle={() => {}} onRemove={() => {}} />
              <PickRow rating={90} name="De Bruyne" slots={2} onCaptainToggle={() => {}} onRemove={() => {}} />
              <div className="group-h">Bench · random commons</div>
              <div style={{ opacity: 0.8 }}>
                <PickRow rating={68} name="Rolled common" slots={0} />
                <PickRow rating={71} name="Rolled common" slots={0} />
              </div>
            </div>
          </Tile>
        </div>
        <Sub>Fill bench</Sub>
        <Frame center caption={<span>Commons can&apos;t be hand-picked in v9 — <Code>.btn-ghost</Code> rolls a random bench to complete the XI. Re-click to re-roll.</span>}>
          <FillWithCommons onFill={() => {}} />
        </Frame>
        <Sub>Formation picker</Sub>
        <Frame center caption={<span><Code>.formation-picker</Code> — balanced / offensive / defensive, each tinted on select.</span>}>
          <FormationPicker selected={formation} onSelect={setFormation} />
        </Frame>
      </Section>

      <Section id="inputs" eyebrow="Run &amp; meta" title="Filters &amp; inputs"
        lede="The pool browser uses flat night-2 fields with a brand focus border.">
        <Frame caption={<span><Code>.filters</Code> row — search, select, range. v9 offers premiums only (commons aren&apos;t hand-pickable).</span>}>
          <Filters rarityAllLabel="All premiums" rarityOptions={['Legendary', 'Epic', 'Rare']} />
        </Frame>
      </Section>

      <Section id="overlays" eyebrow="Run &amp; meta" title="Modals &amp; result overlays"
        lede="Full-screen overlays handle the GOAL / SAVE shot cinematics and win/loss results.">
        <div className="ds-grid cols-2">
          <Tile label="Result overlay" center sub="win / loss / draw titles">
            <ResultTitle you={3} them={1} note="Through to the quarter-finals." />
          </Tile>
          <Tile label="GOAL · you" center sub="boot strike → ball in → keeper late · gold">
            <div style={{ position: 'relative', width: '100%', minHeight: 380 }}>
              <Goal isYou score={[1, 0]} />
            </div>
          </Tile>
          <Tile label="GOAL · them" center sub="opponent scores · red">
            <div style={{ position: 'relative', width: '100%', minHeight: 380 }}>
              <Goal isYou={false} scorer="Brazil" score={[1, 1]} />
            </div>
          </Tile>
          <Tile label="SAVED · you" center sub="your keeper denies them · green">
            <div style={{ position: 'relative', width: '100%', minHeight: 380 }}>
              <ShotMiss mine={false} p={0.62} score={[0, 0]} />
            </div>
          </Tile>
          <Tile label="SAVED · them" center sub="their keeper denies you · red">
            <div style={{ position: 'relative', width: '100%', minHeight: 380 }}>
              <ShotMiss mine p={0.41} score={[0, 0]} />
            </div>
          </Tile>
        </div>
        <Note>Veil <Code>.modal-veil</Code> (blur 4px) → <Code>.modal-card</Code> (pop 220ms). Overlays use <Code>.overlay</Code> (blur 8px).</Note>
      </Section>
    </>
  )
}
