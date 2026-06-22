import { useState } from 'react'
import type { PlayerCard, TacticalCard, Card, OpponentTeam } from '../../../engine/types'
import type { RewardState } from '../../run/useArcadeRun'
import { NextPanel } from '../../organisms/NextPanel'
import { LockerSwapRow } from '../../organisms/LockerSwapRow'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { TACTICAL_DESCRIPTION_KEYS } from '../../organisms/CardDetailModal'
import { opponentBlurb } from '../../../data'
import { useLang } from '../../i18n'

interface LockerRoomProps {
  reward: RewardState
  deck: Card[]
  captainId: string
  nextOpponent: OpponentTeam | null
  onClaim: (player: PlayerCard, tacticalId?: string) => void
  onSwap: (takeId: string, exileId: string) => void
  onSetCaptain: (id: string) => void
  onContinue: () => void
  onRemoveCard?: (id: string) => void
}

/** Resolves a claimed tactical from the 1-of-3 offer and fires either
 *  onClaim (under cap) or triggers swap mode (at cap).
 *
 *  Under cap: immediately calls onClaim with the selected tactical id.
 *  At cap: defers to swap mode — user must choose a card to exile first.
 */
function TacticalOfferSection({
  offer,
  atCap,
  heldTacticals,
  chosenTacId,
  exileId,
  onChooseTac,
  onChooseExile,
}: {
  offer: TacticalCard[]
  atCap: boolean
  heldTacticals: TacticalCard[]
  chosenTacId: string | null
  exileId: string | null
  onChooseTac: (id: string) => void
  onChooseExile: (id: string) => void
}) {
  const { t: tr } = useLang()
  if (offer.length === 0) {
    return <p className="note3">{tr('run.noTacticalOffer')}</p>
  }

  return (
    <>
      {atCap && (
        <p className="note3">
          {tr('run.tacticalAtCap')}
        </p>
      )}
      <div className="offer-row">
        {offer.map((t) => (
          <div
            key={t.id}
            className={`offer-card${chosenTacId === t.id ? ' chosen' : chosenTacId && chosenTacId !== t.id ? ' dimmed' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onChooseTac(t.id)}
            onKeyDown={(e) => e.key === 'Enter' && onChooseTac(t.id)}
            aria-pressed={chosenTacId === t.id}
          >
            {chosenTacId === t.id && <span className="pick-tag">{tr('run.selected')}</span>}
            <TacticCard
              card={t}
              size={120}
              showSlots
              description={
                TACTICAL_DESCRIPTION_KEYS[t.effect.kind]
                  ? tr(TACTICAL_DESCRIPTION_KEYS[t.effect.kind])
                  : tr('builder.tacNoDescription', { name: t.name })
              }
            />
          </div>
        ))}
      </div>

      {atCap && chosenTacId && (
        <div>
          <h4>{tr('run.exileFromDeck')}</h4>
          <div className="pick-rows">
            {heldTacticals.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onChooseExile(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && onChooseExile(t.id)}
              >
                <LockerSwapRow
                  name={t.name}
                  isSwappingOut={exileId === t.id}
                  isHighlighted={exileId === t.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** Locker Room — between-match hub for Arcade Run.
 *
 *  Reveals the reward player, lets the user choose 1-of-3 tacticals (swap at cap),
 *  set the captain, review the deck, and preview the next opponent before continuing.
 *
 *  Prop-driven: all mutations are delegated back to useArcadeRun via callbacks.
 */
export function LockerRoom({
  reward,
  deck,
  captainId,
  nextOpponent,
  onClaim,
  onSwap,
  onSetCaptain,
  onContinue,
  onRemoveCard,
}: LockerRoomProps) {
  const { t, lang } = useLang()
  const [chosenTacId, setChosenTacId] = useState<string | null>(null)
  const [exileId, setExileId] = useState<string | null>(null)

  const playerCards = deck.filter((c): c is PlayerCard => c.type === 'player')
  const heldTacticals = deck.filter((c): c is TacticalCard => c.type === 'tactical')

  const { player: rewardPlayer, tacticalOffer, atCap } = reward

  function handleChooseTac(id: string) {
    setChosenTacId((prev) => (prev === id ? null : id))
    setExileId(null)
  }

  function handleChooseExile(id: string) {
    setExileId((prev) => (prev === id ? null : id))
  }

  function handleConfirm() {
    if (!rewardPlayer) return

    if (chosenTacId) {
      if (atCap) {
        if (!exileId) return
        onSwap(chosenTacId, exileId)
        onClaim(rewardPlayer)
      } else {
        onClaim(rewardPlayer, chosenTacId)
      }
    } else {
      onClaim(rewardPlayer)
    }
  }

  const hasTacticalOffer = tacticalOffer.length > 0
  // With a tactical on offer, force a deliberate pick (and an exile target at cap) before
  // claiming — otherwise "Accept Rewards" silently takes none. Skipping is the explicit
  // "Continue without rewards" link below. When there's no offer, the player reward alone is fine.
  const canConfirm =
    !!rewardPlayer && (!hasTacticalOffer || (chosenTacId !== null && (!atCap || !!exileId)))

  return (
    <div className="screen locker">
      <div className="locker-head">
        <div>
          <h2>{t('run.lockerRoom')}</h2>
          <div className="hint">{t('run.lockerHint')}</div>
        </div>
        {nextOpponent && (
          <span className="stage-tag">{nextOpponent.name}</span>
        )}
      </div>

      <div className="locker-body">
        <div className="locker-col">
          <h4>{t('run.reward')}</h4>

          {rewardPlayer ? (
            <div className="reward-stage">
              <PlayerCardComponent card={rewardPlayer} size={150} />
              <div className="note3">
                {rewardPlayer.rarity.toUpperCase()} · {rewardPlayer.position}
              </div>
            </div>
          ) : (
            <p className="note3">{t('run.noPlayerReward')}</p>
          )}

          <h4>{t('run.tacticalOfferHeading')}</h4>
          <TacticalOfferSection
            offer={tacticalOffer}
            atCap={atCap}
            heldTacticals={heldTacticals}
            chosenTacId={chosenTacId}
            exileId={exileId}
            onChooseTac={handleChooseTac}
            onChooseExile={handleChooseExile}
          />

          {hasTacticalOffer && chosenTacId === null && (
            <p className="note3">{t('run.tacticalSelectOne')}</p>
          )}
          <button
            type="button"
            className="btn btn-gold btn-big"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {t('run.acceptRewards')}
          </button>
          {hasTacticalOffer && rewardPlayer && (
            <button
              type="button"
              onClick={() => onClaim(rewardPlayer)}
              style={{
                display: 'block',
                margin: '10px auto 0',
                background: 'none',
                border: 'none',
                color: '#8b93a7',
                textDecoration: 'underline',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t('run.continueWithJustPlayer')}
            </button>
          )}
        </div>

        <div className="locker-col">
          <h4>{t('run.yourSquad')}</h4>
          <p className="note3">{t('run.playersCaptainMarked', { n: playerCards.length })}</p>
          <div className="pick-rows">
            {playerCards.map((p) => (
              <div
                key={p.id}
                className={`pick-row${p.id === captainId ? ' cap' : ''}`}
              >
                <span className="rt">{p.position.charAt(0)}</span>
                <span className="nm">{p.name}</span>
                <button
                  type="button"
                  className={`pick-row cap2${p.id === captainId ? ' on' : ''}`}
                  aria-label={t('run.setAsCaptain', { name: p.name })}
                  onClick={() => onSetCaptain(p.id)}
                  aria-pressed={p.id === captainId}
                >
                  ★
                </button>
                {onRemoveCard && (
                  <button
                    type="button"
                    className="pick-row rm"
                    title={t('run.removeFromDeck')}
                    onClick={() => onRemoveCard(p.id)}
                    aria-label={t('run.removePlayer', { name: p.name })}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {heldTacticals.length > 0 && (
            <>
              <h4>{t('run.tacticalsInDeck')}</h4>
              <div className="pick-rows">
                {heldTacticals.map((t) => (
                  <LockerSwapRow key={t.id} name={t.name} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="locker-col">
          {nextOpponent && (
            <>
              <h4>{t('run.nextOpponent')}</h4>
              <NextPanel
                name={nextOpponent.name}
                year={`'${String(nextOpponent.year).slice(-2)}`}
                round={nextOpponent.isChampion ? t('run.roundFinal') : t('run.roundNextMatch')}
                tier={nextOpponent.tier}
                formation={nextOpponent.preferredFormation}
                blurb={opponentBlurb(nextOpponent.year, nextOpponent.nation, lang, nextOpponent.blurb)}
                extra={nextOpponent.isChampion ? t('run.champion') : undefined}
                actions={
                  <button
                    type="button"
                    className="btn btn-primary btn-big"
                    onClick={onContinue}
                  >
                    {t('run.continue')}
                  </button>
                }
              />
            </>
          )}

          {!nextOpponent && (
            <button
              type="button"
              className="btn btn-primary btn-big"
              onClick={onContinue}
            >
              {t('run.continue')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
