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
        lede="Build an XI under a slot budget. Slot meter tracks spend; pick rows list rating/name/slots/captain/remove.">
        <div className="ds-grid cols-2">
          <Tile label="Slot meter" sub="fills brand→gold; .over turns red">
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SlotMeter used={9} cap={12} />
              <SlotMeter used={14} cap={12} />
            </div>
          </Tile>
          <Tile label="Pick rows" sub="rating · name · slot cost · captain · remove">
            <div className="pick-rows" style={{ width: '100%' }}>
              <PickRow rating={97} name="Mbappé" slots={3} isCaptain onCaptainToggle={() => {}} onRemove={() => {}} />
              <PickRow rating={90} name="De Bruyne" slots={2} onCaptainToggle={() => {}} onRemove={() => {}} />
              <PickRow rating="—" name="Catenaccio" slots={1} isTactic onRemove={() => {}} />
            </div>
          </Tile>
        </div>
        <Sub>Formation picker</Sub>
        <Frame center caption={<span><Code>.formation-picker</Code> — balanced / offensive / defensive, each tinted on select.</span>}>
          <FormationPicker selected={formation} onSelect={setFormation} />
        </Frame>
        <Sub>Fill with commons</Sub>
        <Frame center caption="Random-common fill for remaining slots (§16.3)">
          <FillWithCommons onFill={() => {}} />
        </Frame>
      </Section>

      <Section id="inputs" eyebrow="Run &amp; meta" title="Filters &amp; inputs"
        lede="The pool browser uses flat night-2 fields with a brand focus border.">
        <Frame caption={<span><Code>.filters</Code> row — search, select, range.</span>}>
          <Filters />
        </Frame>
      </Section>

      <Section id="overlays" eyebrow="Run &amp; meta" title="Modals &amp; result overlays"
        lede="Full-screen overlays handle the GOAL blast and win/loss results.">
        <div className="ds-grid cols-2">
          <Tile label="Result overlay" center sub="win / loss / draw titles">
            <ResultTitle you={3} them={1} note="Through to the quarter-finals." />
          </Tile>
          <Tile label="GOAL blast" center sub="the money moment — full-bleed in play">
            <Goal />
          </Tile>
        </div>
        <Note>Veil <Code>.modal-veil</Code> (blur 4px) → <Code>.modal-card</Code> (pop 220ms). Overlays use <Code>.overlay</Code> (blur 8px).</Note>
      </Section>
    </>
  )
}
