/** Screen strings: How to Play, Quickplay wrapper, Arcade shell, Difficulty picker. */
export const en = {
  // How to Play
  'screens.howToPlayKicker': 'World Cup Clash',
  'screens.howToPlayTitle': 'How to Play',
  'screens.htpBack': 'Back',
  'screens.htpGoalTitle': 'The goal',
  'screens.htpGoalBody':
    "Beat a historic national team by <b>scoring more goals</b> than they do. There's no health bar here — football is about putting the ball in the net.",
  'screens.htpScoreTitle': 'How you score (xG)',
  'screens.htpScoreBody1':
    "Each round both teams build <b>expected goals (xG)</b> by attacking. Your attackers fill <b>your</b> meter; the opponent's fill <b>theirs</b>. When a meter fills, that team takes a <span class=\"gold\">SHOT</span> — a strong chance, but <b>not a sure thing</b>: it's a <span class=\"gold\">GOAL</span> or a save. Score and the meter empties; miss and it just drops a bit, so you keep pressing.",
  'screens.htpScoreBody2':
    "Defenders and your keeper <b>slow the other side's meter</b> — they don't score, they keep goals out. And a <b>star</b> paired with a lanemate <b>multiplies that whole lane</b>, so build around your best players.",
  'screens.htpMatchTitle': 'A match',
  'screens.htpMatchBody':
    '90 minutes = <b>8 rounds</b>, with a reset at <b>halftime</b> (after round 4). Lead by <b>3 goals</b> and you win instantly (the mercy rule). Otherwise the team ahead at <b>full time</b> wins — and if the score is level, the better chances (<b>xG</b>) settle it, then <span class="gold">golden-goal extra time</span>.',
  'screens.htpRoundTitle': 'Each round',
  'screens.htpRoundStep1': 'Draw back up to <b>5 cards</b>.',
  'screens.htpRoundStep2': 'Pick a <b>formation</b> — your stance for the round.',
  'screens.htpRoundStep3':
    'Field players into your <b>Attack</b> and <b>Defense</b> lanes (within your stamina and card cap).',
  'screens.htpRoundStep4': 'Optionally play a <b>tactical card</b> for a big swing.',
  'screens.htpRoundStep5': '<b>Lock in</b> — both lineups reveal, the meters fill, and any full meter takes its shot.',
  'screens.htpCardsTitle': 'Your cards',
  'screens.htpCardsBullet1': '<b>Common players</b> recycle all match — your reliable engine.',
  'screens.htpCardsBullet2':
    '<b>Star players</b> (rare → legendary) are once-per-half trumps: they bench after use and return at <b>halftime and extra time</b>.',
  'screens.htpCardsBullet3':
    '<b>Tactical cards</b> are single-use — at most <b>2 per half</b>. Once played, your opponent sees them.',
  'screens.htpEnergyTitle': 'Energy each round',
  'screens.htpEnergyBody':
    "Every round you get an <b>energy budget</b> (<b>8 → 10 → 12</b> as the match goes on). Fielding each player and playing each tactical <b>spends energy</b> — so you can't field everything. A <b>star</b> in a lane makes its support cards cost half. Cards you can't afford are <b>dimmed</b> in your hand.",
  'screens.htpStaminaTitle': 'Attack vs. defend',
  'screens.htpStaminaBody':
    "Only <b>attacking</b> rests your legs — defending <b>tires them</b> (faster late, and much faster in a <b>defensive formation</b>), and even an even split costs a little. A tired back line lets the opponent score faster — so you can't park the bus, or coast, forever. Halftime <b>recovers some</b> fatigue (not all); extra time clears it.",
  'screens.htpWinningTitle': 'Winning',
  'screens.htpWinningBody':
    "Most goals at <b>full time</b> (after round 8) takes the match. Level on goals? Whoever created the <b>better chances (xG)</b> edges it — and if those are level too, <span class=\"gold\">golden-goal extra time</span> decides it. There are no draws.",
  'screens.htpTip': 'First match? <span class="gold">We\'ll point out the key parts</span> as you play.',
  'screens.htpGotIt': 'Got it',

  // Quickplay wrapper
  'screens.qpBackToMenu': 'Back to Menu',
  'screens.qpStartingMatch': 'Starting match…',

  // Arcade shell
  'screens.arcadeBackToMenu': 'Back to Menu',
  'screens.arcadeStartingRun': 'Starting run…',

  // Difficulty picker
  'screens.diffEasyLabel': 'Easy',
  'screens.diffEasyDesc': 'A friendly warm-up match against a developing side.',
  'screens.diffMediumLabel': 'Medium',
  'screens.diffMediumDesc': 'A balanced contest — expect a proper game.',
  'screens.diffHardLabel': 'Hard',
  'screens.diffHardDesc': "A formidable opponent. You'll need your best XI.",
  'screens.diffLegendaryLabel': 'Legendary',
  'screens.diffLegendaryDesc': 'A champion side. Prepare for a battle.',
  'screens.diffKicker': 'Quickplay',
  'screens.diffTitle': 'Choose difficulty',
  'screens.diffSubtitle':
    'Difficulty sets your opponent’s tier — from developing sides (D) up to world champions (S).',
  'screens.diffFinding': 'Finding opponent…',
  'screens.diffKickOff': 'Kick off',
  'screens.diffBack': 'Back',
}

export const es: typeof en = {
  // How to Play
  'screens.howToPlayKicker': 'Mundialito',
  'screens.howToPlayTitle': 'Cómo jugar',
  'screens.htpBack': 'Atrás',
  'screens.htpGoalTitle': 'El objetivo',
  'screens.htpGoalBody':
    'Vencé a una selección nacional histórica <b>marcando más goles</b> que ella. Acá no hay barra de vida — el fútbol se trata de meter el balón en la red.',
  'screens.htpScoreTitle': 'Cómo marcás (xG)',
  'screens.htpScoreBody1':
    'Cada ronda ambos equipos generan <b>goles esperados (xG)</b> atacando. Tus atacantes llenan <b>tu</b> medidor; los del rival llenan <b>el suyo</b>. Cuando un medidor se llena, ese equipo <span class="gold">REMATA</span> — una gran ocasión, pero <b>no segura</b>: es <span class="gold">GOL</span> o atajada. Si marcás, el medidor se vacía; si fallás, solo baja un poco, así que seguís presionando.',
  'screens.htpScoreBody2':
    'Los defensas y tu arquero <b>frenan el medidor del rival</b> — no marcan, evitan goles. Y una <b>estrella</b> junto a un compañero de carril <b>multiplica todo ese carril</b>, así que construí alrededor de tus mejores jugadores.',
  'screens.htpMatchTitle': 'Un partido',
  'screens.htpMatchBody':
    '90 minutos = <b>8 rondas</b>, con un reinicio en el <b>descanso</b> (tras la ronda 4). Si llevás <b>3 goles</b> de ventaja ganás al instante (la regla de misericordia). Si no, gana quien esté por delante al <b>tiempo completo</b> — y si están iguales, lo definen las mejores ocasiones (<b>xG</b>), y luego el <span class="gold">tiempo extra de gol de oro</span>.',
  'screens.htpRoundTitle': 'Cada ronda',
  'screens.htpRoundStep1': 'Robá hasta tener <b>5 cartas</b>.',
  'screens.htpRoundStep2': 'Elegí una <b>formación</b> — tu postura para la ronda.',
  'screens.htpRoundStep3':
    'Colocá jugadores en tus carriles de <b>Ataque</b> y <b>Defensa</b> (dentro de tu resistencia y límite de cartas).',
  'screens.htpRoundStep4': 'Opcionalmente jugá una <b>carta táctica</b> para un gran giro.',
  'screens.htpRoundStep5': '<b>Confirmá</b> — ambas alineaciones se revelan, los medidores se llenan y todo medidor lleno remata.',
  'screens.htpCardsTitle': 'Tus cartas',
  'screens.htpCardsBullet1':
    'Los <b>jugadores comunes</b> se reciclan todo el partido — tu motor confiable.',
  'screens.htpCardsBullet2':
    'Las <b>estrellas</b> (rara → legendaria) son triunfos de un uso por tiempo: van al banco tras usarse y vuelven en el <b>descanso y el tiempo extra</b>.',
  'screens.htpCardsBullet3':
    'Las <b>cartas tácticas</b> son de un solo uso — como máximo <b>2 por tiempo</b>. Una vez jugadas, tu rival las ve.',
  'screens.htpEnergyTitle': 'Energía por ronda',
  'screens.htpEnergyBody':
    'Cada ronda tenés un <b>presupuesto de energía</b> (<b>8 → 10 → 12</b> a medida que avanza el partido). Alinear cada jugador y jugar cada táctica <b>gasta energía</b> — así que no podés alinearlo todo. Una <b>estrella</b> en una banda hace que sus cartas de apoyo cuesten la mitad. Las cartas que no podés pagar se <b>atenúan</b> en tu mano.',
  'screens.htpStaminaTitle': 'Atacar vs. defender',
  'screens.htpStaminaBody':
    'Solo <b>atacar</b> descansa tus piernas — defender <b>las cansa</b> (más al final, y mucho más en una <b>formación defensiva</b>), y hasta un reparto parejo cansa un poco. Una línea defensiva cansada deja que el rival marque más rápido — así que no podés encerrarte, ni especular, para siempre. El descanso <b>recupera parte</b> de la fatiga (no toda); el tiempo extra la elimina.',
  'screens.htpWinningTitle': 'Ganar',
  'screens.htpWinningBody':
    'Quien tenga más goles al <b>tiempo completo</b> (tras la ronda 8) se lleva el partido. ¿Iguales en goles? Lo define quien generó las <b>mejores ocasiones (xG)</b> — y si eso también está igualado, decide el <span class="gold">tiempo extra de gol de oro</span>. No hay empates.',
  'screens.htpTip': '¿Primer partido? <span class="gold">Te señalaremos las partes clave</span> mientras jugás.',
  'screens.htpGotIt': 'Entendido',

  // Quickplay wrapper
  'screens.qpBackToMenu': 'Volver al menú',
  'screens.qpStartingMatch': 'Iniciando partido…',

  // Arcade shell
  'screens.arcadeBackToMenu': 'Volver al menú',
  'screens.arcadeStartingRun': 'Iniciando partida…',

  // Difficulty picker
  'screens.diffEasyLabel': 'Fácil',
  'screens.diffEasyDesc': 'Un partido de calentamiento amistoso contra un equipo en desarrollo.',
  'screens.diffMediumLabel': 'Media',
  'screens.diffMediumDesc': 'Un duelo equilibrado — espera un partido de verdad.',
  'screens.diffHardLabel': 'Difícil',
  'screens.diffHardDesc': 'Un rival formidable. Necesitarás tu mejor once.',
  'screens.diffLegendaryLabel': 'Legendaria',
  'screens.diffLegendaryDesc': 'Una selección campeona. Preparate para una batalla.',
  'screens.diffKicker': 'Partida rápida',
  'screens.diffTitle': 'Elegí la dificultad',
  'screens.diffSubtitle':
    'La dificultad define el nivel de tu rival — desde equipos en desarrollo (D) hasta campeones del mundo (S).',
  'screens.diffFinding': 'Buscando rival…',
  'screens.diffKickOff': 'Iniciar partido',
  'screens.diffBack': 'Atrás',
}
