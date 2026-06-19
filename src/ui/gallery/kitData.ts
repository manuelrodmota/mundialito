import type { PlayerCard, TacticalCard } from '../../engine/types'

/** Sample card data matching the engine PlayerCard shape. */
export const dsSamples: Record<string, PlayerCard> = {
  legendary: { id: 'ds-1', type: 'player', name: 'Mbappé', nation: 'France', worldCup: 2026, position: 'FWD', overall: 97, atk: 97, def: 53, cost: 5, rarity: 'legendary', slots: 3 },
  epic: { id: 'ds-2', type: 'player', name: 'De Bruyne', nation: 'Belgium', worldCup: 2026, position: 'MID', overall: 90, atk: 77, def: 70, cost: 4, rarity: 'epic', slots: 2 },
  rare: { id: 'ds-3', type: 'player', name: 'Pulisic', nation: 'USA', worldCup: 2026, position: 'FWD', overall: 85, atk: 85, def: 47, cost: 3, rarity: 'rare', slots: 1 },
  common: { id: 'ds-4', type: 'player', name: 'Borjan', nation: 'Canada', worldCup: 2022, position: 'GK', overall: 74, atk: 0, def: 79, cost: 2, rarity: 'common', slots: 0 },
  keeper: { id: 'ds-5', type: 'player', name: 'Courtois', nation: 'Belgium', worldCup: 2026, position: 'GK', overall: 91, atk: 0, def: 96, cost: 4, rarity: 'epic', slots: 2 },
  defender: { id: 'ds-6', type: 'player', name: 'Van Dijk', nation: 'Netherlands', worldCup: 2026, position: 'DEF', overall: 89, atk: 49, def: 89, cost: 4, rarity: 'epic', slots: 2 },
}

/** Sample tactical cards matching the engine TacticalCard shape. */
export const dsTactics: Record<string, TacticalCard> = {
  instant: { id: 'dt-1', type: 'tactical', name: 'VAR Review', category: 'instant', cost: 2, slots: 2, rarity: 'epic', effect: { kind: 'var' } },
  skill: { id: 'dt-2', type: 'tactical', name: 'Catenaccio', category: 'skill', cost: 2, slots: 1, rarity: 'rare', effect: { kind: 'catenaccio' } },
  power: { id: 'dt-3', type: 'tactical', name: 'Hand of God', category: 'power', cost: 3, slots: 3, rarity: 'legendary', effect: { kind: 'handOfGod' } },
}

export const dsTacticDescs: Record<string, string> = {
  instant: 'Cancel the opponent\'s biggest Tactic this round. If they played none, void their highest-rated revealed player instead.',
  skill: 'Park the bus: +50% DEF total this round.',
  power: 'Once per match: this round, your attack ignores their defense entirely.',
}
