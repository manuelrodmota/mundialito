// WORLD CUP CLASH — Design System: Patterns (v10 live match-board widgets)
// v10 balance pass adds the field-cost / star-core / diminishing-returns pattern and reframes
// extra time as sudden death. v7 base carries over: numeric scoreboard + running match clock,
// 3-goal mercy marker, draw/discard/bench/exiled piles.
const { Section, Sub, Note, Code, Frame, Tile, MiniCrest, dsSamples } = window;

// a deck pile, matching the production .deckpile5/.dp7 markup
function Pile7({ kind, count, mark, label, cue, dw = 56 }) {
  return (
    <div className={`deckpile5 dp7 ${kind} ${count === 0 ? "is-empty" : ""}`} style={{ position: "static" }}>
      <div className="dp-stack" style={{ "--dw": dw + "px" }}>
        {count === 0
          ? <div className="dp-card empty"></div>
          : [0, 1, 2].slice(0, Math.min(3, count)).map((i) => (
            <div key={i} className="dp-card" style={{ transform: `translate(${i * -2}px, ${i * -3}px)` }}>
              {i === Math.min(3, count) - 1 && <span className="dp-mark">{mark}</span>}
            </div>
          ))}
      </div>
      <div className="dp-meta"><span className="dp-lab">{label}</span><span className="dp-count">{count}</span></div>
      {cue && <span className="dp-cue">{cue}</span>}
    </div>
  );
}

function Scoreboard7({ them = 1, you = 2, code = "ARG", minute = "63'", phase = "2ND HALF", mercy, mercyHot, et }) {
  return (
    <div className={`scoreboard7 ${et ? "et" : ""}`} style={{ position: "static", transform: "none" }}>
      <div className="sb-main">
        <div className="sb-team them">
          <MiniCrest cols={["#74ACDF", "#fff", "#74ACDF"]} size={30} />
          <span className="sb-code">{code}</span>
        </div>
        <div className="sb-score">
          <span className="sb-g them">{them}</span>
          <span className="sb-dash">–</span>
          <span className="sb-g you">{you}</span>
        </div>
        <div className="sb-team you">
          <div className="sb-youcrest"><span>WC</span></div>
          <span className="sb-code">YOU</span>
        </div>
      </div>
      <div className="sb-clock">
        <span className="sb-min">{minute}</span>
        <span className={`sb-phase ${et ? "et" : ""}`}>{phase}</span>
      </div>
      <div className={`sb-mercy ${mercyHot ? "hot" : ""}`}>{mercy}</div>
      <div className="cb-xg">
        <div className="cbxg them" data-heat="2">
          <span className="cbxg-lab">{code}</span>
          <div className="cbxg-track"><i style={{ width: "62%" }} /><span className="cbxg-val">0.62 xG</span></div>
          <span className="cbxg-heat" data-heat="2">●18</span>
        </div>
        <div className="cbxg you">
          <span className="cbxg-lab">YOU</span>
          <div className="cbxg-track"><i style={{ width: "84%" }} /><span className="cbxg-val">0.84 xG</span></div>
          <span className="cbxg-ball close" aria-hidden="true">⚽</span>
        </div>
      </div>
    </div>
  );
}

function Patterns() {
  return (
    <React.Fragment>
      {/* ============ SCOREBOARD ============ */}
      <Section id="scoreboard" eyebrow="Patterns" title="Scoreboard & match clock"
        lede="A normal numeric scoreline (scores can run past 3–2 now), a running match clock — kickoff → 45' halftime → 90' full time → ET — and a subtle mercy marker hinting that a 3-goal lead ends the match instantly. The xG rail fills toward the next goal; it shakes on a goal.">
        <Frame center pitch caption={<span><Code>.scoreboard7</Code> — angled team plates (red opponent, gold you) clip into a dark numeric core; the clock and 3-goal mercy marker sit below.</span>}>
          <Scoreboard7 them={1} you={2} minute="63'" phase="2ND HALF" mercy="You +1 · 2 from mercy" />
        </Frame>
        <Sub>States</Sub>
        <Note>The mercy marker brightens as a side closes on a 3-goal lead, and extra time flips the whole board into the golden-goal palette (<Code>.scoreboard7.et</Code>).</Note>
        <div className="ds-grid cols-2">
          <Tile label="Kickoff" sub="level — mercy threshold shown calmly">
            <Scoreboard7 them={0} you={0} minute="9'" phase="1ST HALF" mercy="Lead by 3 to win" />
          </Tile>
          <Tile label="Mercy in sight" sub="one more goal ends it — marker is hot">
            <Scoreboard7 them={1} you={3} minute="71'" phase="2ND HALF" mercy="You +2 · 1 from mercy" mercyHot />
          </Tile>
        </div>
      </Section>

      {/* ============ CARD PILES ============ */}
      <Section id="piles" eyebrow="Patterns" title="Card piles — the flow"
        lede="Four zones flank the hand and tell the whole story of card flow: commons cycle through draw/discard forever, premium players bench until halftime, and single-use Tactical Cards burn away to the exiled pile — at most 2 played a half (4 a match).">
        <Frame center caption={<span><Code>.deckpile5.dp7</Code> — draw &amp; bench on the left of the hand, discard &amp; exiled on the right. Counts are live.</span>}>
          <div style={{ display: "flex", gap: 30, alignItems: "flex-end" }}>
            <Pile7 kind="draw" count={12} mark="WC" label="Draw" />
            <Pile7 kind="locked" count={3} mark="★" label="Bench" cue="back at HT" />
            <Pile7 kind="discard" count={6} mark="WC" label="Discard" cue="grays cycle" />
            <Pile7 kind="exiled" count={2} mark="✕" label="Spent" cue="single-use" />
          </div>
        </Frame>
        <div className="ds-grid cols-2">
          <Tile label="Bench (locked)" sub="premium players — return to the deck at halftime / ET">
            <Pile7 kind="locked" count={3} mark="★" label="Bench" cue="back at HT" dw={64} />
          </Tile>
          <Tile label="Exiled (single-use)" sub="spent Tactical Cards — gone for the rest of the match">
            <Pile7 kind="exiled" count={2} mark="✕" label="Spent" cue="single-use" dw={64} />
          </Tile>
        </div>
      </Section>

      {/* ============ HAND & TACTICAL LIMITS (v8) ============ */}
      <Section id="limits" eyebrow="Patterns" title="Hand & tactical limits"
        lede="v8 adds two governors, surfaced in the action dock. You draw back up to a five-card minimum hand each round (grays reshuffle in if the pile runs dry), and tactical plays are capped — a live counter sits beside the player-cap chip and turns red once the half's allowance is spent.">
        <Frame center caption={<span>Action-dock chips — <Code>.cap-chip5</Code> for the per-round player cap, <Code>.cap-chip5.tac</Code> for tactical plays this half. Both go <Code>.full</Code> at the limit.</span>}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <span className="cap-chip5"><b>2</b>/4 players</span>
            <span className="cap-chip5 full"><b>4</b>/4 players</span>
            <span className="cap-chip5 tac"><b>0</b>/2 tactics · half</span>
            <span className="cap-chip5 tac"><b>1</b>/2 tactics · half</span>
            <span className="cap-chip5 tac full"><b>2</b>/2 tactics · half</span>
            <span className="cap-chip5 star">★ star core · support half-price</span>
          </div>
        </Frame>
        <div className="ds-grid cols-2">
          <Tile label="Minimum hand of 5" sub="draw back up to five each round">
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="chip">Hand <b>5</b></span>
                <span className="chip">Draw to <b>5</b></span>
                <span className="ramp-hint5">grays reshuffle mid-draw</span>
              </div>
            </div>
          </Tile>
          <Tile label="Run tactical deck cap" sub="carry up to ~4 — reward becomes a swap">
            <div className="pick-rows" style={{ width: "100%" }}>
              <div className="group-h">Tactical cards · 4 / 4</div>
              <div className="pick-row tactic-row swapping-out"><span className="rt">T</span><span className="nm">Catenaccio</span><span className="res l" style={{ marginLeft: "auto" }}>OUT</span></div>
              <div className="pick-row tactic-row"><span className="rt">T</span><span className="nm">VAR Review</span></div>
              <div className="pick-row tactic-row" style={{ borderColor: "var(--gold)" }}><span className="rt">T</span><span className="nm">Penalty Kick — swap in</span></div>
            </div>
          </Tile>
        </div>
      </Section>

      {/* ============ FIELD COST & STAR CORE (v10) ============ */}
      <Section id="starcore" eyebrow="Patterns · v10" title="Field cost & the star core"
        lede="The v10 balance pass makes quality beat quantity. Fielding a card costs a gentle per-round stamina by rarity (separate from the deck-build slot cost). In any lane holding a premium, the costliest card pays full and every other card is half-price — a “star core” — so a few stars out-field a wall of commons. Stacking a lane also hits diminishing returns.">
        <Sub>Per-round field cost</Sub>
        <Frame center caption={<span>Stamina to field a card this round — read off the card’s cost badge via <Code>window.fieldCostOf</Code>. The deck-build <b>slot</b> cost (0 / 1 / 2 / 3) is unchanged.</span>}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            {[["common", 2], ["rare", 2], ["epic", 3], ["legendary", 4]].map(([r, c]) => (
              <div key={r} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <PCard card={dsSamples[r]} size={96} />
                <span className="chip"><b>{c}</b> stamina</span>
              </div>
            ))}
          </div>
        </Frame>
        <Sub>Star-core discount</Sub>
        <div className="ds-grid cols-2">
          <Tile label="All commons — no discount" sub="three commons in a lane = 2 + 2 + 2">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="chip">2</span><span className="chip">2</span><span className="chip">2</span>
              <span className="res l" style={{ marginLeft: "auto" }}>= 6 stamina</span>
            </div>
          </Tile>
          <Tile label="Star core — support half-price" sub="legendary anchor pays full; the rest halve (min 1)">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="chip" style={{ borderColor: "var(--gold)", color: "#ffd9a0" }}>★ 4</span><span className="chip">1</span><span className="chip">1</span>
              <span className="res dmg" style={{ marginLeft: "auto" }}>= 6 stamina</span>
            </div>
          </Tile>
        </div>
        <Note>The discount is holistic, not per-card: stamina is recomputed from the committed lanes each round, and placement affordability uses the <i>marginal</i> cost — adding a star can retroactively halve its lane-mates. The <Code>.cap-chip5.star</Code> chip (shown above) lights up while a lane holds a premium.</Note>
        <Sub>Diminishing returns on stacking</Sub>
        <Frame center caption={<span>A lane’s contributions are sorted high→low and weighted, so the 4th–5th body adds little.</span>}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {[["1st", "1.00"], ["2nd", "0.85"], ["3rd", "0.70"], ["4th", "0.55"], ["5th", "0.40"], ["6th", "0.25"]].map(([ord, w]) => (
              <div key={ord} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span className="chip" style={{ opacity: 0.4 + 0.6 * parseFloat(w) }}><b>{ord}</b></span>
                <span style={{ fontSize: 12, color: "var(--txt-dim)", fontWeight: 700 }}>×{w}</span>
              </div>
            ))}
          </div>
        </Frame>
      </Section>

      {/* ============ EXTRA TIME ============ */}
      <Section id="extratime" eyebrow="Patterns" title="Extra time — sudden-death golden goal"
        lede="Level at full time? A distinct golden-goal mode: meters reset to 0, benched stars and fatigue refresh, every xG counts double — and it’s now true sudden death, so only the side that creates the bigger chance can bank xG in a passage. The next decisive chance wins it. The board takes a warm gold cast and a banner makes the stakes unmistakable.">
        <Frame center pitch caption={<span><Code>.et-banner7</Code> over a board tinted with <Code>.et-mode</Code>; the scoreboard switches to its <Code>.scoreboard7.et</Code> palette.</span>}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <div className="et-banner7" style={{ position: "static", transform: "none" }}>
              <span className="et-dot"></span>
              <b>EXTRA TIME</b><span className="et-sep">·</span>SUDDEN DEATH<span className="et-sep">·</span>only the bigger chance counts<span className="et-sep">·</span>xG ×2
            </div>
            <Scoreboard7 them={2} you={2} minute="95'" phase="EXTRA TIME" mercy="Golden goal · next goal wins" mercyHot et />
          </div>
        </Frame>
      </Section>

      {/* ============ MORALE / STAMINA / xG METER ============ */}
      <Section id="meters" eyebrow="Patterns" title="Meters & gauges"
        lede="The side strips read out live game state: stamina pips (your spend budget) and the xG meter that heats up — orange to red — as a side fatigues and its defense frays.">
        <div className="ds-grid cols-2">
          <Tile label="Stamina ramp" sub="pips fill; the ramp hint flags the next bump (8 → 10 → 12)">
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
                <div className="stamina-pips">
                  {Array.from({ length: 8 }).map((_, i) => <span key={i} className={"pip" + (i < 5 ? " full" : "")} />)}
                  <span className="lbl">5 / 8</span>
                </div>
                <span className="ramp-hint5">+2 ramp</span>
              </div>
            </div>
          </Tile>
          <Tile label="xG meter — fatigue heat" sub="data-heat 0→3 glows orange→red as a goal nears">
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="xgm4 mine" data-heat="0">
                <div className="xgm-row"><span className="xgm-goals">2</span>
                  <div className="xgm-bar"><i style={{ width: "40%" }} /><span className="xgm-val">0.40 xG</span></div>
                </div>
                <div className="xgm-sub"><span>YOU</span><span className="heat-tag">Fresh</span></div>
              </div>
              <div className="xgm4" data-heat="3">
                <div className="xgm-row"><span className="xgm-goals">1</span>
                  <div className="xgm-bar"><i style={{ width: "88%" }} /><span className="xgm-val">0.88 xG</span></div>
                </div>
                <div className="xgm-sub"><span>THEM</span><span className="heat-tag">Gassed</span></div>
              </div>
            </div>
          </Tile>
        </div>
      </Section>

      {/* ============ LANES & CLASH ============ */}
      <Section id="lanes" eyebrow="Patterns" title="Lanes & the clash"
        lede="Cards are committed into attack or defense lanes drawn on the pitch. On reveal, lanes march to midfield and a clash badge totals ATK vs DEF, spilling the surplus as a floating number.">
        <Frame pitch caption={<span><Code>.lane4</Code> lanes (tagged ATK / DEF) · <Code>.clash4</Code> badge · <Code>.dmg-float</Code> surplus. A droppable lane glows gold.</span>}>
          <div style={{ display: "flex", gap: 24, alignItems: "stretch", width: "100%", justifyContent: "center", minHeight: 220, position: "relative" }}>
            <div className="lane4 mine atk-lane droppable" style={{ width: 150, "--lw": "92px" }}>
              <div className="lane4-cards"><PCard card={dsSamples.legendary} size={92} /></div>
              <div className="ltag4">Your attack</div>
            </div>
            <div className="clash4" style={{ position: "static", transform: "none" }}>
              <div className="row4"><span className="num atk">112</span><span className="x">VS</span><span className="num def">70</span></div>
              <span className="res dmg">+42 on goal</span>
            </div>
            <div className="lane4 mine def-lane" style={{ width: 150, "--lw": "92px" }}>
              <div className="lane4-cards"><PCard card={dsSamples.defender} size={92} /></div>
              <div className="ltag4">Their defense</div>
            </div>
          </div>
        </Frame>
        <Sub>Floating feedback</Sub>
        <Frame center caption="damage number · zero/held · xG gain float">
          <div style={{ position: "relative", width: 120, height: 80 }}><span className="dmg-float" style={{ position: "static" }}>42</span></div>
          <div style={{ position: "relative", width: 120, height: 80 }}><span className="dmg-float zero" style={{ position: "static" }}>HELD</span></div>
          <div className="xg-float4" style={{ position: "static" }}><span className="amt">+0.34</span><span className="pt">xG · clear chance</span></div>
        </Frame>
      </Section>
    </React.Fragment>
  );
}
window.Patterns = Patterns;
