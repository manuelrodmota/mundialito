/** Leftover in-match / card-anatomy components: formation picker, extra-time banner,
 *  and the shared CardModal detail view. */
export const en = {
  // FormationPicker
  'formation.shape': 'Shape',
  'formation.offensive': 'Offensive',
  'formation.balanced': 'Balanced',
  'formation.defensive': 'Defensive',
  'formation.fatigueLow': 'Tires slowly',
  'formation.fatigueNormal': 'Normal fatigue',
  'formation.fatigueHigh': 'Tires fast',

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

  // Fatigue heat labels (Meters)
  'match.heat.fresh': 'Fresh',
  'match.heat.warm': 'Warm',
  'match.heat.hot': 'Hot',
  'match.heat.gassed': 'Gassed',

  // Player/tactic card anatomy
  'card.captain': 'CAPTAIN',
  'card.free': 'FREE',
  'card.staminaTitle': 'Stamina cost to field this round',
  'card.staminaCost': 'Stamina cost',
  'card.laneMultTitle': 'Lane multiplier — this star lifts the whole line ×{mult}',
  'card.bookedTitle': 'Booked — next whistle is a red',
  'card.injuredTitle': 'Injured — −15 ATK/DEF',
  'card.starCore': '★ star core · support half-price',
  'card.capPlayers': 'players',
  'card.capTactics': 'tactics · half',

  // Just-in-time plan hints (planHint)
  'match.hint.noAttack': "No one up front — you can't create chances. Put a player in ATTACK.",
  'match.hint.loneStriker':
    'One striker vs their {n} at the back rarely breaks through — a lone star ≈ two defenders. Add another up front.',
  'match.hint.offensiveWaste':
    'Offensive shape wastes its boost with one attacker — add more up front or switch to Balanced.',
}

export const es: typeof en = {
  // FormationPicker
  'formation.shape': 'Esquema',
  'formation.offensive': 'Ofensiva',
  'formation.balanced': 'Equilibrada',
  'formation.defensive': 'Defensiva',
  'formation.fatigueLow': 'Se cansa lento',
  'formation.fatigueNormal': 'Cansancio normal',
  'formation.fatigueHigh': 'Se cansa rápido',

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
  'card.roleGk': 'Arquero — solo en la línea de defensa. DEF = global +5, ATK 0.',
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

  // Fatigue heat labels (Meters)
  'match.heat.fresh': 'Pleno',
  'match.heat.warm': 'Tibio',
  'match.heat.hot': 'Caliente',
  'match.heat.gassed': 'Agotado',

  // Player/tactic card anatomy
  'card.captain': 'CAPITÁN',
  'card.free': 'GRATIS',
  'card.staminaTitle': 'Coste de resistencia para alinear esta ronda',
  'card.staminaCost': 'Coste de resistencia',
  'card.laneMultTitle': 'Multiplicador de banda — esta estrella eleva toda la línea ×{mult}',
  'card.bookedTitle': 'Amonestado — el próximo silbato es roja',
  'card.injuredTitle': 'Lesionado — −15 ATK/DEF',
  'card.starCore': '★ núcleo estelar · apoyo a mitad de precio',
  'card.capPlayers': 'jugadores',
  'card.capTactics': 'tácticas · mitad',

  // Just-in-time plan hints (planHint)
  'match.hint.noAttack': 'Nadie en ataque — no podés generar ocasiones. Colocá un jugador en ATAQUE.',
  'match.hint.loneStriker':
    'Un solo delantero contra sus {n} atrás rara vez rompe — una estrella sola ≈ dos defensas. Sumá otro en ataque.',
  'match.hint.offensiveWaste':
    'La formación Ofensiva desperdicia su bonus con un solo atacante — sumá más en ataque o cambiá a Equilibrada.',
}
