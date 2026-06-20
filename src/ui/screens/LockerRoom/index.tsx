import { useState } from 'react'
import type { PlayerCard, TacticalCard, Card, OpponentTeam } from '../../../engine/types'
import type { RewardState } from '../../run/useArcadeRun'
import { NextPanel } from '../../organisms/NextPanel'
import { LockerSwapRow } from '../../organisms/LockerSwapRow'

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
  if (offer.length === 0) {
    return <p className="note3">No tactical offer this stage.</p>
  }

  return (
    <>
      {atCap && (
        <p className="note3">
          Tactical deck is at capacity. Choose a card to take and one to exile.
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
            {chosenTacId === t.id && <span className="pick-tag">Selected</span>}
            <div
              className="tcard"
              data-cat={t.category}
              style={{ '--cw': '120px' } as React.CSSProperties}
            >
              <div className="inner">
                <div className="cat">{t.category}</div>
                <div className="tname">{t.name}</div>
                <div className="ttext">{t.effect.kind}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {atCap && chosenTacId && (
        <div>
          <h4>Exile from your deck</h4>
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

  const canConfirm =
    !!rewardPlayer && (chosenTacId === null || !atCap || (atCap && !!exileId))

  return (
    <div className="screen locker">
      <div className="locker-head">
        <div>
          <h2>Locker Room</h2>
          <div className="hint">Take your rewards and prepare for the next match.</div>
        </div>
        {nextOpponent && (
          <span className="stage-tag">{nextOpponent.name}</span>
        )}
      </div>

      <div className="locker-body">
        <div className="locker-col">
          <h4>Reward</h4>

          {rewardPlayer ? (
            <div className="reward-stage">
              <div
                className="wcard"
                data-rarity={rewardPlayer.rarity}
                style={{ '--cw': '140px' } as React.CSSProperties}
              >
                <div className="name">{rewardPlayer.name}</div>
                <div className="statrow">
                  <span className="atk">{rewardPlayer.atk}</span>
                  <span className="def">{rewardPlayer.def}</span>
                </div>
                <div className="nation">{rewardPlayer.nation}</div>
              </div>
              <div className="note3">
                {rewardPlayer.rarity.toUpperCase()} · {rewardPlayer.position}
              </div>
            </div>
          ) : (
            <p className="note3">No player reward this stage.</p>
          )}

          <h4>Tactical offer</h4>
          <TacticalOfferSection
            offer={tacticalOffer}
            atCap={atCap}
            heldTacticals={heldTacticals}
            chosenTacId={chosenTacId}
            exileId={exileId}
            onChooseTac={handleChooseTac}
            onChooseExile={handleChooseExile}
          />

          <button
            type="button"
            className="btn btn-gold btn-big"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Accept Rewards
          </button>
        </div>

        <div className="locker-col">
          <h4>Your Squad</h4>
          <p className="note3">{playerCards.length} players · captain marked ★</p>
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
                  aria-label={`Set ${p.name} as captain`}
                  onClick={() => onSetCaptain(p.id)}
                  aria-pressed={p.id === captainId}
                >
                  ★
                </button>
                {onRemoveCard && (
                  <button
                    type="button"
                    className="pick-row rm"
                    title="Remove from deck"
                    onClick={() => onRemoveCard(p.id)}
                    aria-label={`Remove ${p.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {heldTacticals.length > 0 && (
            <>
              <h4>Tacticals in deck</h4>
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
              <h4>Next opponent</h4>
              <NextPanel
                name={nextOpponent.name}
                year={`'${String(nextOpponent.year).slice(-2)}`}
                round={nextOpponent.isChampion ? 'Final' : 'Next Match'}
                tier={nextOpponent.tier}
                formation={nextOpponent.preferredFormation}
                blurb={nextOpponent.blurb}
                extra={nextOpponent.isChampion ? 'Champion' : undefined}
                actions={
                  <button
                    type="button"
                    className="btn btn-primary btn-big"
                    onClick={onContinue}
                  >
                    Continue
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
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
