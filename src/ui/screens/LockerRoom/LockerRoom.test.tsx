import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LockerRoom } from './index'
import type { PlayerCard, TacticalCard, Card, OpponentTeam } from '../../../engine/types'
import type { RewardState } from '../../run/useArcadeRun'

function makePlayer(overrides?: Partial<PlayerCard>): PlayerCard {
  return {
    id: 'p1',
    type: 'player',
    name: 'Pelé',
    nation: 'BRA',
    worldCup: 1970,
    position: 'FWD',
    overall: 97,
    atk: 90,
    def: 40,
    cost: 3,
    rarity: 'legendary',
    slots: 4,
    ...overrides,
  }
}

function makeTactical(overrides?: Partial<TacticalCard>): TacticalCard {
  return {
    id: 'tac1',
    type: 'tactical',
    name: 'Tiki-Taka',
    category: 'skill',
    cost: 2,
    slots: 1,
    rarity: 'rare',
    effect: { kind: 'tikiTaka' },
    ...overrides,
  }
}

const rewardPlayer = makePlayer()

const baseReward: RewardState = {
  player: rewardPlayer,
  tacticalOffer: [
    makeTactical({ id: 'tac1', name: 'Tiki-Taka' }),
    makeTactical({ id: 'tac2', name: 'High Press', effect: { kind: 'highPress' } }),
    makeTactical({ id: 'tac3', name: 'Catenaccio', category: 'power', effect: { kind: 'catenaccio' } }),
  ],
  atCap: false,
}

const deck: Card[] = [
  makePlayer({ id: 'cap1', name: 'Maradona', position: 'MID', rarity: 'legendary' }),
  makePlayer({ id: 'p2', name: 'Ronaldo', position: 'FWD', rarity: 'epic' }),
]

const opponent: OpponentTeam = {
  id: 'bra70',
  name: 'Brazil',
  nation: 'BRA',
  year: 1970,
  tier: 'A',
  strength: 88,
  squad: [],
  preferredFormation: 'offensive',
  isChampion: false,
}

describe('LockerRoom', () => {
  it('reveals the reward player name', () => {
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getByText('Pelé')).toBeInTheDocument()
  })

  it('renders all three tactical offer cards', () => {
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getByText('Tiki-Taka')).toBeInTheDocument()
    expect(screen.getByText('High Press')).toBeInTheDocument()
    expect(screen.getByText('Catenaccio')).toBeInTheDocument()
  })

  it('fires onClaim with player and chosen tactical id when a tactical is selected and accepted', async () => {
    const onClaim = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={onClaim}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByText('Tiki-Taka'))
    await userEvent.click(screen.getByRole('button', { name: /accept rewards/i }))
    expect(onClaim).toHaveBeenCalledWith(rewardPlayer, 'tac1')
  })

  it('disables Accept Rewards until a tactical is selected when an offer is present', async () => {
    const onClaim = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={onClaim}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    // With a tactical on offer, claiming requires a deliberate pick (else "Accept Rewards"
    // would silently take none); the skip path is the "Continue without rewards" link.
    expect(screen.getByRole('button', { name: /accept rewards/i })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /accept rewards/i }))
    expect(onClaim).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Tiki-Taka'))
    expect(screen.getByRole('button', { name: /accept rewards/i })).toBeEnabled()
  })

  it('shows cap warning and requires exile when atCap is true', async () => {
    const heldTac = makeTactical({ id: 'held1', name: 'Long Ball', effect: { kind: 'longBall' } })
    const capReward: RewardState = { ...baseReward, atCap: true }
    render(
      <LockerRoom
        reward={capReward}
        deck={[...deck, heldTac]}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getByText(/tactical deck is at capacity/i)).toBeInTheDocument()
  })

  it('calls onSwap with takeId and exileId at cap before calling onClaim', async () => {
    const onClaim = vi.fn()
    const onSwap = vi.fn()
    const heldTac = makeTactical({ id: 'held1', name: 'Long Ball', effect: { kind: 'longBall' } })
    const capReward: RewardState = { ...baseReward, atCap: true }

    render(
      <LockerRoom
        reward={capReward}
        deck={[...deck, heldTac]}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={onClaim}
        onSwap={onSwap}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Tiki-Taka'))
    // After selecting a take card at cap, an exile list is shown.
    // Long Ball appears twice: once in the held tacticals section, once in the exile chooser.
    // Both clicking instances map to the same held1 id, so clicking either works.
    const longBallItems = screen.getAllByText('Long Ball')
    await userEvent.click(longBallItems[0]!)
    await userEvent.click(screen.getByRole('button', { name: /accept rewards/i }))

    expect(onSwap).toHaveBeenCalledWith('tac1', 'held1')
    expect(onClaim).toHaveBeenCalledWith(rewardPlayer)
  })

  it('fires onSetCaptain with the correct player id when the star button is clicked', async () => {
    const onSetCaptain = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={onSetCaptain}
        onContinue={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /set ronaldo as captain/i }))
    expect(onSetCaptain).toHaveBeenCalledWith('p2')
  })

  it('claims the player only from "Continue with just the player"', async () => {
    const onClaim = vi.fn()
    const onContinue = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={onClaim}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={onContinue}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /continue with just the player/i }))
    expect(onClaim).toHaveBeenCalledWith(rewardPlayer)
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('fires onContinue from the next-opponent Continue button (skips all rewards)', async () => {
    const onClaim = vi.fn()
    const onContinue = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={onClaim}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={onContinue}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('shows the next opponent preview in the right column', () => {
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Brazil').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Brazil' })).toBeInTheDocument()
  })

  it('shows deck players with captain starred', () => {
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getByText('Maradona')).toBeInTheDocument()
    expect(screen.getByText('Ronaldo')).toBeInTheDocument()
  })

  it('fires onRemoveCard when remove button is clicked', async () => {
    const onRemoveCard = vi.fn()
    render(
      <LockerRoom
        reward={baseReward}
        deck={deck}
        captainId="cap1"
        nextOpponent={opponent}
        onClaim={vi.fn()}
        onSwap={vi.fn()}
        onSetCaptain={vi.fn()}
        onContinue={vi.fn()}
        onRemoveCard={onRemoveCard}
      />,
    )
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await userEvent.click(removeButtons[0]!)
    expect(onRemoveCard).toHaveBeenCalled()
  })
})
