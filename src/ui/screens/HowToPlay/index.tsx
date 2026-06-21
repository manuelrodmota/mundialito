import { Button } from '../../atoms/Button'
import './howToPlay.css'

interface HowToPlayProps {
  onBack: () => void
}

/** Concise one-pager guide — what the game is and how a round plays, in plain English.
 *  Reached from the main menu; the in-match coach-marks (CoachMarks) teach the UI itself. */
export function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div className="screen htp">
      <div className="stadium-bg" />

      <div className="htp-inner">
        <div className="htp-head">
          <div>
            <span className="kicker">World Cup Clash</span>
            <h1>How to Play</h1>
          </div>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>

        <section className="htp-card">
          <h2><span className="ico">🎯</span> The goal</h2>
          <p>
            Beat a historic national team by <b>scoring more goals</b> than they do.
            There's no health bar here — football is about putting the ball in the net.
          </p>
        </section>

        <section className="htp-card">
          <h2><span className="ico">⚽</span> How you score (xG)</h2>
          <p>
            Each round both teams build <b>expected goals (xG)</b>. Your attackers fill
            <b> your</b> meter; the opponent's attackers fill <b>theirs</b>. Every time a
            meter fills a whole goal, that's a <span className="gold">GOAL</span>.
          </p>
          <p>
            Defenders and your keeper <b>slow the other side's meter</b> — they don't score,
            they keep goals out.
          </p>
        </section>

        <section className="htp-card">
          <h2><span className="ico">⏱️</span> A match</h2>
          <p>
            90 minutes = <b>10 rounds</b>, with a reset at <b>halftime</b> (round 5).
            Lead by <b>3 goals</b> and you win instantly (the mercy rule). Otherwise,
            whoever is ahead at <b>full time</b> wins — and a level game goes to
            <span className="gold"> golden-goal extra time</span> (next goal wins).
          </p>
        </section>

        <section className="htp-card">
          <h2><span className="ico">🔄</span> Each round</h2>
          <ol className="htp-steps">
            <li>Draw back up to <b>5 cards</b>.</li>
            <li>Pick a <b>formation</b> — your stance for the round.</li>
            <li>Field players into your <b>Attack</b> and <b>Defense</b> lanes (within your stamina and card cap).</li>
            <li>Optionally play a <b>tactical card</b> for a big swing.</li>
            <li><b>Lock in</b> — both lineups reveal and the meters fill.</li>
          </ol>
        </section>

        <section className="htp-card">
          <h2><span className="ico">🃏</span> Your cards</h2>
          <ul className="htp-bullets">
            <li><b>Common players</b> recycle all match — your reliable engine.</li>
            <li><b>Star players</b> (rare → legendary) are once-per-half trumps: they bench after use and return at halftime.</li>
            <li><b>Tactical cards</b> are single-use — at most <b>2 per half</b>. Once played, your opponent sees them.</li>
          </ul>
        </section>

        <section className="htp-card">
          <h2><span className="ico">🫁</span> Attack vs. defend</h2>
          <p>
            Attacking <b>rests your legs</b>; defending <b>tires them</b>. A tired back line
            lets the opponent score faster — so you can't park the bus forever. Halftime
            clears fatigue for both sides.
          </p>
        </section>

        <section className="htp-card">
          <h2><span className="ico">🏆</span> Winning</h2>
          <p>
            Most goals at full time takes the match. Level at 90'? It's golden-goal
            <b> extra time</b> — the next goal wins it. There are no draws.
          </p>
        </section>

        <p className="htp-tip">
          First match? <span className="gold">We'll point out the key parts</span> as you play.
        </p>

        <div className="htp-foot">
          <Button variant="gold" size="big" onClick={onBack}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  )
}
