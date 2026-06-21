export interface CoachStep {
  /** CSS selector for the element to spotlight. */
  target: string
  title: string
  body: string
}

/** First-match tour — teaches the board's key zones in plan order. Targets are stable
 *  selectors already present in MatchBoard (and a data-coach hook on the lock-in button). */
export const MATCH_ONBOARDING_STEPS: CoachStep[] = [
  {
    target: '.board-meters',
    title: 'Score with xG',
    body: "No health bars here. Each round both teams build expected goals. When a bar fills a whole goal, you SCORE — most goals at full time wins.",
  },
  {
    target: '.fan2',
    title: 'Your squad this round',
    body: 'These are the players in your hand. Drag them onto the pitch — you can field a few each round, limited by your stamina.',
  },
  {
    target: '.pitch4',
    title: 'Two lanes: attack & defense',
    body: 'Drop players in ATTACK to create chances, or DEFENSE to shut theirs down. Tap a placed card to send it back to your hand.',
  },
  {
    target: '.formation-picker',
    title: 'Pick your shape',
    body: 'Offensive boosts attack, Defensive boosts defense, Balanced is even. You choose a new one every round.',
  },
  {
    target: '.tactical-slot',
    title: 'Tactical cards',
    body: 'One-shot game-changers — a penalty, an offside trap, a counter. Play up to 2 per half; your opponent sees them once played.',
  },
  {
    target: '[data-coach="commit"]',
    title: 'Lock in',
    body: 'Happy with your plan? Lock in to reveal both lineups and watch the chances play out. Good luck!',
  },
]
