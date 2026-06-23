# World Cup Clash — Project Reflection

*A card-based roguelike where you don't drain an HP bar — you score goals.*

---

## What problem we tried to solve

**Bored at halftime? Bored in the dead air between matches?** Yeah — us too. That 15-minute
itch (and the four-day one between fixtures) is the whole reason this game exists.

More seriously, though:

**The product problem.** Roguelike deckbuilders — *Slay the Spire*, *Balatro* — are some of
the most replayable games ever made: a five-minute run, a hundred small decisions, "just one
more." Football games are the opposite: enormous, expensive simulations you sink hours into.
Nobody had put the *drama of a World Cup knockout* — the tension of a 1–0 lead you have to
defend, the gamble of throwing bodies forward — inside the tight, infinitely-replayable loop
of a deckbuilder. We wanted a game where a full match takes a few minutes, every formation is
a bet, and losing your star striker to permadeath actually hurts.

## What we built

**World Cup Clash** — a complete, playable arcade roguelike. There's no health bar. Each match
is 90 minutes compressed into 10 rounds, and both teams fill an **expected-goals (xG) meter** by
attacking; a full meter takes a **shot** that converts on a probability (a strong chance, not an
automatic goal — a miss leaves some pressure to try again). Each round you pick a formation,
secretly field a capped lineup across attack and defense lanes, and play single-use Tactical Cards
your opponent can see coming. Your star players are once-per-half trumps; fatigue means you can't park the bus
forever; a three-goal lead ends it on the mercy rule, and a draw goes to golden-goal extra time.

It ships with **two modes in one engine**: a 7-match **Arcade Run** (Group → Final, with
rewards and roguelike permadeath) and **Quickplay** (build a ~16-player squad, pick a difficulty,
play one match). Under the hood it's ~22K lines of TypeScript: a **pure, deterministic,
fully-unit-tested match engine** (66 test files) with zero DOM or I/O, a framework-agnostic run
layer, and a React 19 + Vite UI with Framer Motion animations, drag-to-lane via dnd-kit, an
onboarding coachmark flow, and full English/Spanish localization. The card pool is *real* — every
men's World Cup squad from 1950 to 2026, ~22K player-rating rows served from Supabase Postgres.
It's deployed on Vercel.

## How we used AI to build it

AI wasn't a feature inside the game — the engine is deterministic, there's no LLM at runtime.
AI was the entire *toolchain* we built it with.

- **The whole SDLC ran through the [Qubika Agentic Framework (QAF)](https://github.com/thisisqubika/qubika-agentic-framework).**
  Instead of jumping straight to code, we authored the work as spec-driven (SDD) tickets with
  `/create-sdd-ticket` — 5 epics and 42 stories posted at JIRA — then shipped each one through QAF's
  `/implement-ticket` workflow: context-gathering → planning → implementation → validation →
  pull request. **The surprise here was how much the front-loading paid off.** Writing 42 detailed
  tickets *before* writing code felt like overhead at first; in practice it gave the implementation
  agents a precise target to hit, and the output quality was dramatically more consistent than
  "vibe-coding" a feature at a time.

- **Claude helped design the game and balanced the rules.** Claude took us from a small concept to
  the full game design document (`APP_DEFINITION.md`), then aided us in tuning the math against a
  **Monte-Carlo match simulator**. This was the most surprising part of the whole project: our
  early rule-sets were *unbalanced* in ways no human spotted by eye — the sim revealed that stacking
  every card into one lane was a dominant strategy and that scoring was wildly swingy.
  The fixes — **diminishing returns on lane stacking, a star-core stamina discount, a retuned xG
  curve** — emerged from iterating with Claude against thousands of simulated matches. The "**v10**"
  in our build name is literal: it took ten balance passes before a star-led squad reliably beat a
  wall of commons while goals stayed in a believable ~4–6 per match. A later **v11** pass made
  finishing **probabilistic** — a full meter now takes a *shot* rather than auto-scoring — which
  killed the deterministic "I score / you score" metronome without surrendering the better deck's edge.

- **We deliberately rebuilt the engine from the rules, not from the prototype.** We had a working
  HTML/JS prototype, but rather than porting its engine we had Claude write a fresh, pure-TypeScript
  engine *from the GDD rules* — deterministic, seed-driven, and unit-tested top to bottom. That
  decision is why the engine is trustworthy enough to balance against a simulator at all.

- **Claude handled visual design and data.** The design system, card-art direction, and a
  high-fidelity interactive prototype were produced with Claude. The player datasets were pulled
  from public sources (mostly Kaggle), then preprocessed and normalized with Claude into the clean
  Supabase schema the game queries.

## What we'd do next if we had another week

- **True roguelike deck progression.** Today you draft from the full historic pool. The more
  roguelike version is to *start small and earn your squad*: begin with a lean pool of players,
  and every match you win, you **keep the players you're rewarded** — with richer rewards for
  harder opponents. That turns each run into a build. Your deck grows out of your victories,
  tougher matches become worth the risk, and the XI you finish with is a record of how you got
  there — exactly the "one more run" hook that makes roguelikes stick. The **Collection** button
  already sits on the menu as a "coming soon" placeholder — that's its home: a gallery of every
  player you've earned, growing run over run.
- **Online play & a shared leaderboard.** Right now you battle historic AI teams; the obvious next
  beat is asynchronous PvP — draft a squad, challenge a friend's deck, climb a ladder. The
  meta-progression and leaderboard layer was always planned as "V3," and a week would let us land
  the first slice.
- **Deepen the tactical layer.** We shipped a solid set of Tactical Cards, but the design space is
  huge — manager specials, weather, injuries, set-piece minigames. More cards is where the
  replayability compounds.
- **Sound, juice, and a mobile build.** The game is animation-rich but silent; crowd noise, a
  goal-horn, and haptics would transform the feel. We did early simulator-driven testing and would
  use that week to package a proper mobile experience.
- **An AI manager on the other bench.** Today's opponent is a deterministic, rule-based AI — it
  plays well, but it always plays the same way. We'd wire **Claude through its API to *be* the
  opposing manager**: hand it the board state each round and let it pick formation, lineup, and
  Tactical Cards like a real coach reading the match. It's the one place we deliberately kept an
  LLM *out* of the runtime — and the most fun place to put one back in. Bonus: a prompt per nation
  gives each opponent a personality — a cautious, catenaccio Italy versus an all-out-attack Brazil —
  without writing a single new line of strategy code.
- **Push the agentic loop further.** The most exciting follow-up isn't a feature — it's closing the
  loop between the Monte-Carlo simulator and the balance pass so that *re-tuning is itself agentic*:
  point AI at the sim, let it propose and validate knob changes, and have it open the balance PR.
  Every value in our tuning table is already a knob; we'd make the AI turn them.
