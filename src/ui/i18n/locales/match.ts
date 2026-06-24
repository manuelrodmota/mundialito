/** In-match board strings: lane labels, scoreboard, round report, coach-mark tour, etc. */
export const en = {
  // Formation shape labels (the code "4-4-2" etc. stays literal; only the word is translated)
  'match.shape.balanced': 'BALANCED',
  'match.shape.offensive': 'OFFENSIVE',
  'match.shape.defensive': 'DEFENSIVE',

  // Phase / clock
  'match.phase.extraTime': 'EXTRA TIME',
  'match.phase.firstHalf': '1ST HALF',
  'match.phase.secondHalf': '2ND HALF',

  // Mercy rule
  'match.mercy': '–{n} to mercy',

  // Numeric "Show the numbers" side note (parts joined with " · ")
  'match.note.line': '{shapeLabel} {shape} · ATK ×{atkMult} DEF ×{defMult}',
  'match.note.starQuality': 'star quality +{n}',
  'match.note.chemistry': 'chemistry +{atk}/{def}',
  'match.note.fatigue': 'fatigue {n} → DEF ×{mult}',
  'match.note.row': '{who} — {parts}',

  // Friendly round-report language — stance words
  'match.stance.offensive': 'on the front foot',
  'match.stance.balanced': 'balanced',
  'match.stance.defensive': 'sitting deep',

  // Friendly round-report language — chance quality
  'match.chance.golden': 'a golden chance',
  'match.chance.big': 'a big chance',
  'match.chance.clear': 'a clear chance',
  'match.chance.half': 'a half-chance',
  'match.chance.none': 'barely a sniff',

  // Friendly one-line side read
  'match.side.read': '{who} — {stance}, created {chance} ({xg} xG).',

  // Headline summary lines
  'match.summary.endToEnd': 'End to end — a goal apiece this round.',
  'match.summary.clinical': 'Clinical — you buried your chance.',
  'match.summary.punished': '{opp} punished you with a goal.',
  'match.summary.youBetter': 'You had the better of this round.',
  'match.summary.theyPressed': '{opp} pressed harder that round.',
  'match.summary.cagey': 'A cagey, even round — no goals.',

  // Surrender — run
  'match.surrender.run.button': '🏳 Surrender run',
  'match.surrender.run.title': 'Give up the run?',
  'match.surrender.run.body':
    "Your run ends here and you'll head back to squad selection to build a new team. This can't be undone.",
  'match.surrender.run.confirm': 'Surrender run',
  // Surrender — match
  'match.surrender.match.button': '🏳 Quit match',
  'match.surrender.match.title': 'Quit this match?',
  'match.surrender.match.body': "You'll leave the match and return to the main menu. No result is saved.",
  'match.surrender.match.confirm': 'Quit match',
  'match.surrender.keepPlaying': 'Keep playing',

  // Pitch direction hints
  'match.dir.youAttack': 'You attack',
  'match.dir.theyAttack': 'They attack',

  // Opponent intent banner
  'match.intent.label': 'Opponent:',
  'match.intent.cardOne': 'card',
  'match.intent.cardMany': 'cards',
  'match.intent.stamina': 'stamina',
  'match.oppTactics.label': "Opponent's active tactics",

  // Lane labels (reveal + plan)
  'match.lane.yourDefense': 'Your defense',
  'match.lane.yourAttack': 'Your attack',
  'match.lane.theirAttack': 'Their attack',
  'match.lane.theirDefense': 'Their defense',

  // xG floats
  'match.xg.yourAttack': 'xG · your attack',
  'match.xg.theirAttack': 'xG · their attack',

  // Meter labels
  'match.meter.you': 'YOU',
  // v11 Pressure → Conversion meter. The bar fills as you attack; the label reads the goal chance
  // qualitatively (a full bar is a high chance, not a sure goal). Fatigue ("FRESH") is a separate line.
  'match.meter.chanceLow': 'Low goal chance ⚽',
  'match.meter.chanceMed': 'Med goal chance ⚽',
  'match.meter.chanceHigh': 'High goal chance ⚽',
  'match.meter.tip': 'The bar fills as you attack — the fuller it is, the better your chance to score when you take the shot. A goal empties the meter; a miss knocks a chunk off so you keep trying. The tag below (FRESH/HOT) is your fatigue.',
  // v11 shot reveal — SAVE cinematic (twin of the GOAL blast): wordmark + "DENY · scoreline"
  'match.shot.saved': 'SAVED',
  'match.shot.youDeny': 'YOU DENY THEM',
  'match.shot.theyDeny': 'THEY DENY YOU',
  // legacy flavor/chance copy — no longer rendered by the redesigned SAVE cinematic; kept for reuse
  'match.shot.youMissed': "Your chance goes begging — the keeper wins it.",
  'match.shot.theyMissed': '{opp} blow their chance.',
  'match.shot.atChance': 'shot taken at {pct}%',

  // Action dock — stamina readout + active powers shelf
  'match.dock.stamina': 'Stamina',
  'match.dock.staminaLeft': '{left}/{max} stamina left',
  'match.dock.staminaTip':
    "Your energy this round (8 → 10 → 12 as the match goes on). Fielding each player and tactical spends it — a star in a lane makes its support cards cost half. Cards you can't afford are dimmed.",
  'match.dock.powers': 'Powers',

  // Coach plan hint
  'match.commit.lockReveal': 'Lock in & reveal',
  'match.commit.passRound': 'Pass round',
  'match.tactic.play': 'Play this card',
  'match.tactic.stop': 'Stop using this card',
  'match.tactic.inUse': 'In use',
  'match.tactic.noPlaysLeft': 'No tactical plays left this half ({n}/{n}).',
  'match.tactic.needs': 'Needs {req} in your lineup to play.',
  'match.tactic.needsEnergy': 'Needs {n}⚡ — not enough stamina left this round.',
  'match.tactic.activePower': 'Power — active for the rest of the match.',
  'match.tactic.played': 'Played this round.',
  'match.tactic.tapToInspect': 'Tap to see what it does',
  'match.tactic.reqPos': '≥{n} {pos}',
  // Hand-card block badges (shown on a dimmed/undroppable card)
  'match.card.pitchFull': 'PITCH FULL',
  'match.card.needsEnergy': 'NEEDS ⚡',
  'match.card.tacticsUsed': 'TACTICS USED',
  'match.tactic.reqFwdMid': '≥{n} FWD or MID',

  // Round report panel
  'match.report.extraTime': "Extra time +{n}'",
  'match.report.round': 'Round {n}',
  'match.report.heading': '{phase} — full report',
  'match.report.goalYou': '⚽ GOAL! You make it {you}–{them}',
  'match.report.goalThem': '⚽ GOAL! {opp} makes it {you}–{them}',
  'match.report.onFormYou': "🔥 You're on form — a scoring boost next round.",
  'match.report.onFormThem': '🔥 {opp} are on form — watch out next round.',
  'match.report.halftime': '🏃 Halftime — your stars are back and legs are fresh.',
  'match.report.showNumbers': 'Show the numbers',
  'match.report.xgYou': 'You +{xg} xG — ATK {atk} vs DEF {def}',
  'match.report.xgThem': 'They +{xg} xG — ATK {atk} vs DEF {def}',
  'match.report.who.you': 'You',
  'match.report.who.they': 'They',
  'match.report.next.result': 'See result →',
  'match.report.next.et': 'Next ET round →',
  'match.report.next.round': 'Next round →',

  // Deck piles
  'match.pile.draw': 'Draw',
  'match.pile.bench': 'Bench',
  'match.pile.benchCue': 'returns at HT',
  'match.pile.discard': 'Discard',
  'match.pile.exiled': 'Exiled',

  // Bottom strip
  'match.you': 'YOU',

  // Lane fx pills
  'match.fx.stacked': '−{n}% stacked',
  'match.fx.crowdedTitle': 'Crowded lane',
  'match.fx.crowdedBody':
    'Piling cards into one lane gives diminishing returns. These {count} cards play at {pct}% of their combined stats — a few strong cards beat a big crowd.',
  'match.fx.starCore': '★ −{n}⚡ star core',
  'match.fx.starCoreTitle': 'Star core',
  'match.fx.starCoreBody':
    'A star anchors this lane, so every other card here costs half stamina (min 1). You save {n}⚡ this round.',

  // Clash badge / floats
  'match.clash.vs': 'VS',
  'match.clash.onGoal': '+{n} on goal',
  'match.float.held': 'HELD',
  'match.xg.clearChance': 'xG · clear chance',

  // Coach-marks tour
  'match.coach.stepOf': 'Step {i} of {n}',
  'match.coach.skip': 'Skip tour',
  'match.coach.gotIt': 'Got it',
  'match.coach.next': 'Next →',
  'match.coach.ariaTutorial': 'Tutorial',

  // Coach-mark steps
  'match.coach.score.title': 'Score with xG',
  'match.coach.score.body':
    'No health bars here. Each round you attack to fill your chance meter. When it fills you take a SHOT — at the % shown — so a full meter is a great chance, not a sure goal. A goal empties it; a miss leaves some pressure to try again. Most goals at full time wins.',
  'match.coach.squad.title': 'Your squad this round',
  'match.coach.squad.body':
    'These are the players in your hand. Drag them onto the pitch — you can field a few each round, limited by your stamina.',
  'match.coach.lanes.title': 'Two lanes: attack & defense',
  'match.coach.lanes.body':
    'Drop players in ATTACK to create chances, or DEFENSE to shut theirs down. Tap a placed card to send it back to your hand.',
  'match.coach.stamina.title': 'Watch your stamina',
  'match.coach.stamina.body':
    'Every player you field spends stamina from this round’s budget. It refills and grows as the match wears on — spend it where it matters most.',
  'match.coach.shape.title': 'Pick your shape',
  'match.coach.shape.body':
    'Offensive boosts attack, Defensive boosts defense, Balanced is even. You choose a new one every round.',
  'match.coach.tactical.title': 'Tactical cards',
  'match.coach.tactical.body':
    'One-shot game-changers — a penalty, an offside trap, a counter. Play up to 2 per half; your opponent sees them once played.',
  'match.coach.lockin.title': 'Lock in',
  'match.coach.lockin.body':
    'Happy with your plan? Lock in to reveal both lineups and watch the chances play out. Good luck!',
}

export const es: typeof en = {
  // Formation shape labels
  'match.shape.balanced': 'EQUILIBRADA',
  'match.shape.offensive': 'OFENSIVA',
  'match.shape.defensive': 'DEFENSIVA',

  // Phase / clock
  'match.phase.extraTime': 'TIEMPO EXTRA',
  'match.phase.firstHalf': '1ER TIEMPO',
  'match.phase.secondHalf': '2DO TIEMPO',

  // Mercy rule
  'match.mercy': '–{n} para la goleada',

  // Numeric side note
  'match.note.line': '{shapeLabel} {shape} · ATK ×{atkMult} DEF ×{defMult}',
  'match.note.starQuality': 'calidad de estrella +{n}',
  'match.note.chemistry': 'química +{atk}/{def}',
  'match.note.fatigue': 'fatiga {n} → DEF ×{mult}',
  'match.note.row': '{who} — {parts}',

  // Stance words
  'match.stance.offensive': 'al ataque',
  'match.stance.balanced': 'equilibrado',
  'match.stance.defensive': 'replegado',

  // Chance quality
  'match.chance.golden': 'una ocasión inmejorable',
  'match.chance.big': 'una gran ocasión',
  'match.chance.clear': 'una ocasión clara',
  'match.chance.half': 'una media ocasión',
  'match.chance.none': 'casi nada',

  // Friendly one-line side read
  'match.side.read': '{who} — {stance}, generó {chance} ({xg} xG).',

  // Headline summary lines
  'match.summary.endToEnd': 'De lado a lado — un gol para cada uno esta ronda.',
  'match.summary.clinical': 'Contundente — aprovechaste tu ocasión.',
  'match.summary.punished': '{opp} te castigó con un gol.',
  'match.summary.youBetter': 'Llevaste la mejor parte en esta ronda.',
  'match.summary.theyPressed': '{opp} apretó más en esa ronda.',
  'match.summary.cagey': 'Una ronda trabada y pareja — sin goles.',

  // Surrender — run
  'match.surrender.run.button': '🏳 Abandonar la partida',
  'match.surrender.run.title': '¿Abandonar la partida?',
  'match.surrender.run.body':
    'Tu partida termina aquí y volverás a la selección de plantilla para armar un nuevo equipo. Esto no se puede deshacer.',
  'match.surrender.run.confirm': 'Abandonar la partida',
  // Surrender — match
  'match.surrender.match.button': '🏳 Salir del partido',
  'match.surrender.match.title': '¿Salir de este partido?',
  'match.surrender.match.body': 'Saldrás del partido y volverás al menú principal. No se guarda ningún resultado.',
  'match.surrender.match.confirm': 'Salir del partido',
  'match.surrender.keepPlaying': 'Seguir jugando',

  // Pitch direction hints
  'match.dir.youAttack': 'Tú atacas',
  'match.dir.theyAttack': 'Ellos atacan',

  // Opponent intent banner
  'match.intent.label': 'Rival:',
  'match.intent.cardOne': 'carta',
  'match.intent.cardMany': 'cartas',
  'match.intent.stamina': 'resistencia',
  'match.oppTactics.label': 'Tácticas activas del rival',

  // Lane labels
  'match.lane.yourDefense': 'Tu defensa',
  'match.lane.yourAttack': 'Tu ataque',
  'match.lane.theirAttack': 'Su ataque',
  'match.lane.theirDefense': 'Su defensa',

  // xG floats
  'match.xg.yourAttack': 'xG · tu ataque',
  'match.xg.theirAttack': 'xG · su ataque',

  // Meter labels
  'match.meter.you': 'TÚ',
  // v11 medidor Presión → Conversión. La barra se llena al atacar; la etiqueta indica la ocasión de
  // gol de forma cualitativa (barra llena = gran ocasión, no gol seguro). La fatiga ("FRESH") va aparte.
  'match.meter.chanceLow': 'Ocasión baja ⚽',
  'match.meter.chanceMed': 'Ocasión media ⚽',
  'match.meter.chanceHigh': 'Ocasión alta ⚽',
  'match.meter.tip': 'La barra se llena al atacar — cuanto más llena, mejor tu ocasión de marcar al rematar. Un gol vacía el medidor; un fallo le quita una parte para seguir intentándolo. La etiqueta de abajo (FRESH/HOT) es tu fatiga.',
  // v11 revelación del remate — cinemática de ATAJADA (gemela del blast de GOL)
  'match.shot.saved': 'ATAJADA',
  'match.shot.youDeny': 'LES TAPAS EL GOL',
  'match.shot.theyDeny': 'TE TAPAN EL GOL',
  // copia heredada de fallo/probabilidad — ya no se muestra en la cinemática rediseñada; se conserva por si se reutiliza
  'match.shot.youMissed': 'Tu ocasión se esfuma — el portero la gana.',
  'match.shot.theyMissed': '{opp} desperdician su ocasión.',
  'match.shot.atChance': 'remate al {pct}%',

  // Action dock — stamina readout + active powers shelf
  'match.dock.stamina': 'Resistencia',
  'match.dock.staminaLeft': '{left}/{max} de resistencia',
  'match.dock.staminaTip':
    'Tu energía esta ronda (8 → 10 → 12 a medida que avanza el partido). Alinear cada jugador y táctica la gasta — una estrella en una banda hace que sus cartas de apoyo cuesten la mitad. Las cartas que no puedes pagar se atenúan.',
  'match.dock.powers': 'Poderes',

  // Coach plan hint
  'match.commit.lockReveal': 'Confirmar jugada y revelar',
  'match.commit.passRound': 'Pasar ronda',
  'match.tactic.play': 'Jugar esta carta',
  'match.tactic.stop': 'Dejar de usar esta carta',
  'match.tactic.inUse': 'En uso',
  'match.tactic.noPlaysLeft': 'No quedan jugadas tácticas en esta mitad ({n}/{n}).',
  'match.tactic.needs': 'Necesita {req} en tu alineación para jugarse.',
  'match.tactic.needsEnergy': 'Necesita {n}⚡ — no queda resistencia esta ronda.',
  'match.tactic.activePower': 'Poder — activo el resto del partido.',
  'match.tactic.played': 'Jugada esta ronda.',
  'match.tactic.tapToInspect': 'Toca para ver qué hace',
  'match.tactic.reqPos': '≥{n} {pos}',
  'match.tactic.reqFwdMid': '≥{n} DEL o MED',
  // Insignias de bloqueo en cartas de la mano
  'match.card.pitchFull': 'CANCHA LLENA',
  'match.card.needsEnergy': 'NECESITA ⚡',
  'match.card.tacticsUsed': 'TÁCTICAS USADAS',

  // Round report panel
  'match.report.extraTime': "Tiempo extra +{n}'",
  'match.report.round': 'Ronda {n}',
  'match.report.heading': '{phase} — informe completo',
  'match.report.goalYou': '⚽ ¡GOL! Pones el {you}–{them}',
  'match.report.goalThem': '⚽ ¡GOL! {opp} pone el {you}–{them}',
  'match.report.onFormYou': '🔥 Estás en racha — impulso goleador la próxima ronda.',
  'match.report.onFormThem': '🔥 {opp} está en racha — cuidado la próxima ronda.',
  'match.report.halftime': '🏃 Medio tiempo — tus estrellas vuelven y las piernas están frescas.',
  'match.report.showNumbers': 'Ver los números',
  'match.report.xgYou': 'Tú +{xg} xG — ATK {atk} vs DEF {def}',
  'match.report.xgThem': 'Ellos +{xg} xG — ATK {atk} vs DEF {def}',
  'match.report.who.you': 'Tú',
  'match.report.who.they': 'Ellos',
  'match.report.next.result': 'Ver resultado →',
  'match.report.next.et': 'Siguiente ronda de TE →',
  'match.report.next.round': 'Siguiente ronda →',

  // Deck piles
  'match.pile.draw': 'Robo',
  'match.pile.bench': 'Banquillo',
  'match.pile.benchCue': 'vuelve en el descanso',
  'match.pile.discard': 'Descarte',
  'match.pile.exiled': 'Exiliadas',

  // Bottom strip
  'match.you': 'TÚ',

  // Lane fx pills
  'match.fx.stacked': '−{n}% amontonado',
  'match.fx.crowdedTitle': 'Banda saturada',
  'match.fx.crowdedBody':
    'Amontonar cartas en una banda da rendimientos decrecientes. Estas {count} cartas rinden al {pct}% de sus estadísticas combinadas — unas pocas cartas fuertes superan a una gran multitud.',
  'match.fx.starCore': '★ −{n}⚡ núcleo estelar',
  'match.fx.starCoreTitle': 'Núcleo estelar',
  'match.fx.starCoreBody':
    'Una estrella ancla esta banda, así que toda otra carta aquí cuesta la mitad de resistencia (mín. 1). Ahorras {n}⚡ esta ronda.',

  // Clash badge / floats
  'match.clash.vs': 'VS',
  'match.clash.onGoal': '+{n} al gol',
  'match.float.held': 'CONTENIDO',
  'match.xg.clearChance': 'xG · ocasión clara',

  // Coach-marks tour
  'match.coach.stepOf': 'Paso {i} de {n}',
  'match.coach.skip': 'Saltar tutorial',
  'match.coach.gotIt': 'Entendido',
  'match.coach.next': 'Siguiente →',
  'match.coach.ariaTutorial': 'Tutorial',

  // Coach-mark steps
  'match.coach.score.title': 'Marca con xG',
  'match.coach.score.body':
    'Aquí no hay barras de vida. Cada ronda atacas para llenar tu medidor de ocasión. Al llenarse REMATAS — al % indicado — así que un medidor lleno es una gran ocasión, no un gol seguro. Un gol lo vacía; un fallo deja algo de presión para reintentar. Gana quien tenga más goles al final.',
  'match.coach.squad.title': 'Tu plantilla esta ronda',
  'match.coach.squad.body':
    'Estos son los jugadores en tu mano. Arrástralos al campo — puedes alinear a unos cuantos cada ronda, según tu resistencia.',
  'match.coach.lanes.title': 'Dos bandas: ataque y defensa',
  'match.coach.lanes.body':
    'Coloca jugadores en ATAQUE para generar ocasiones, o en DEFENSA para frenar las suyas. Toca una carta colocada para devolverla a tu mano.',
  'match.coach.stamina.title': 'Cuida tu resistencia',
  'match.coach.stamina.body':
    'Cada jugador que alineas gasta resistencia del presupuesto de la ronda. Se recarga y aumenta con el correr del partido — gástala donde más cuente.',
  'match.coach.shape.title': 'Elige tu formación',
  'match.coach.shape.body':
    'Ofensiva potencia el ataque, Defensiva potencia la defensa, Equilibrada es pareja. Eliges una nueva cada ronda.',
  'match.coach.tactical.title': 'Cartas tácticas',
  'match.coach.tactical.body':
    'Cambios de partido de un solo uso — un penalti, una trampa de fuera de juego, un contraataque. Juega hasta 2 por tiempo; tu rival las ve una vez jugadas.',
  'match.coach.lockin.title': 'Confirmar jugada',
  'match.coach.lockin.body':
    '¿Conforme con tu plan? Confirma la jugada para revelar ambas alineaciones y ver cómo se desarrollan las ocasiones. ¡Suerte!',
}
