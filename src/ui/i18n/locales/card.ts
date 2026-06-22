/** Leftover in-match / card-anatomy components: formation picker, extra-time banner,
 *  and the shared CardModal detail view. */
export const en = {
  // FormationPicker
  'formation.shape': 'Shape',
  'formation.offensive': 'Offensive',
  'formation.balanced': 'Balanced',
  'formation.defensive': 'Defensive',

  // ExtraTimeBanner
  'et.extraTime': 'EXTRA TIME',
  'et.suddenDeath': 'SUDDEN DEATH',
  'et.biggerChance': 'only the bigger chance counts',

  // CardModal — rarity words (capitalised display)
  'card.rarityCommon': 'Common',
  'card.rarityRare': 'Rare',
  'card.rarityEpic': 'Epic',
  'card.rarityLegendary': 'Legendary',
  // CardModal — role explanations
  'card.roleFwd': 'Forward — full ATK going forward, soft at the back (DEF = 55% of overall).',
  'card.roleMid': 'Midfielder — balanced (85% ATK / 78% DEF). 2+ MIDs played = +1 stamina next round.',
  'card.roleDef': 'Defender — a wall (full DEF), limited going forward (55% ATK).',
  'card.roleGk': 'Goalkeeper — defense lane only. DEF = overall +5, ATK 0.',
  // CardModal — body copy
  'card.slot': 'slot',
  'card.slots': 'slots',
  'card.tagPlayer': '{nation} · World Cup {wc} · {rarity} · {slots} {slotWord}',
  'card.starQuality': 'Star quality.',
  'card.starQualityBody':
    '{rarity} cards contribute ×{mult} their stats each round — an effective ATK {atk} / DEF {def}.',
  'card.cost': 'Cost.',
  'card.costPlayerBody':
    '{n} stamina to field, into attack or defense. Beside a star (premium in the lane) support cards pay half.',
  'card.tagTactical': '{category} tactical card · {slots} {slotWord}',
  'card.costTacticalBody': '{n} stamina.',
  'card.close': 'Close',

  // ResultTitle overlay
  'result.fullTime': 'Full time',
  'result.youWin': 'you win',
  'result.youLose': 'you lose',
  'result.draw': 'draw',
}

export const es: typeof en = {
  // FormationPicker
  'formation.shape': 'Esquema',
  'formation.offensive': 'Ofensiva',
  'formation.balanced': 'Equilibrada',
  'formation.defensive': 'Defensiva',

  // ExtraTimeBanner
  'et.extraTime': 'TIEMPO EXTRA',
  'et.suddenDeath': 'MUERTE SÚBITA',
  'et.biggerChance': 'solo cuenta la ocasión más clara',

  // CardModal — rarity words
  'card.rarityCommon': 'Común',
  'card.rarityRare': 'Rara',
  'card.rarityEpic': 'Épica',
  'card.rarityLegendary': 'Legendaria',
  // CardModal — role explanations
  'card.roleFwd': 'Delantero — ATK completo en ataque, flojo atrás (DEF = 55 % del global).',
  'card.roleMid':
    'Mediocampista — equilibrado (85 % ATK / 78 % DEF). 2+ mediocampistas jugados = +1 de resistencia la próxima ronda.',
  'card.roleDef': 'Defensa — un muro (DEF completo), limitado en ataque (55 % ATK).',
  'card.roleGk': 'Portero — solo en la línea de defensa. DEF = global +5, ATK 0.',
  // CardModal — body copy
  'card.slot': 'espacio',
  'card.slots': 'espacios',
  'card.tagPlayer': '{nation} · Mundial {wc} · {rarity} · {slots} {slotWord}',
  'card.starQuality': 'Calidad de estrella.',
  'card.starQualityBody':
    'Las cartas {rarity} aportan ×{mult} sus estadísticas cada ronda — un ATK efectivo {atk} / DEF {def}.',
  'card.cost': 'Coste.',
  'card.costPlayerBody':
    '{n} de resistencia para alinearla, en ataque o defensa. Junto a una estrella (premium en la línea), las cartas de apoyo pagan la mitad.',
  'card.tagTactical': 'Carta táctica {category} · {slots} {slotWord}',
  'card.costTacticalBody': '{n} de resistencia.',
  'card.close': 'Cerrar',

  // ResultTitle overlay
  'result.fullTime': 'Tiempo completo',
  'result.youWin': 'ganaste',
  'result.youLose': 'perdiste',
  'result.draw': 'empate',
}
