export interface CoachStep {
  /** CSS selector for the element to spotlight. */
  target: string
  /** i18n key for the step title (resolved with `t()` in CoachMarks). */
  title: string
  /** i18n key for the step body (resolved with `t()` in CoachMarks). */
  body: string
}

/** First-match tour — teaches the board's key zones in plan order. Targets are stable
 *  selectors already present in MatchBoard (and a data-coach hook on the lock-in button).
 *  `title`/`body` are i18n keys (namespace `match.coach.*`), resolved in CoachMarks. */
export const MATCH_ONBOARDING_STEPS: CoachStep[] = [
  {
    target: '.board-meters',
    title: 'match.coach.score.title',
    body: 'match.coach.score.body',
  },
  {
    target: '.fan2',
    title: 'match.coach.squad.title',
    body: 'match.coach.squad.body',
  },
  {
    target: '.pitch4',
    title: 'match.coach.lanes.title',
    body: 'match.coach.lanes.body',
  },
  {
    target: '.stamina-pips',
    title: 'match.coach.stamina.title',
    body: 'match.coach.stamina.body',
  },
  {
    target: '.formation-picker',
    title: 'match.coach.shape.title',
    body: 'match.coach.shape.body',
  },
  {
    target: '.tactical-slot',
    title: 'match.coach.tactical.title',
    body: 'match.coach.tactical.body',
  },
  {
    target: '[data-coach="commit"]',
    title: 'match.coach.lockin.title',
    body: 'match.coach.lockin.body',
  },
]
