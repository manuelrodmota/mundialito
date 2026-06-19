// WORLD CUP CLASH — Design System: Run & meta screens
const { Section, Sub, Note, Code, Frame, Tile } = window;

function Ladder() {
  const nodes = [
    { st: "Group", n: "1", done: true, beat: "Cameroon '90" },
    { st: "Group", n: "2", done: true, beat: "Japan '22" },
    { st: "R16", n: "3", now: true },
    { st: "Quarter", n: "4" },
    { st: "Semi", n: "5" },
    { st: "Final", n: "6", final: true },
  ];
  return (
    <div className="ladder">
      {nodes.map((nd, i) => (
        <div className="seg" key={i} style={{ display: "flex", alignItems: "flex-start" }}>
          <div className={"lnode" + (nd.done ? " done" : "") + (nd.now ? " now" : "") + (nd.final ? " final" : "")}>
            <div className="dot">{nd.done ? "" : nd.n}</div>
            <div className="stage">{nd.st}</div>
            <div className="beaten">{nd.beat || ""}</div>
          </div>
          {i < nodes.length - 1 && <div className={"link" + (nd.done ? " done" : "")} />}
        </div>
      ))}
    </div>
  );
}

function Screens() {
  return (
    <React.Fragment>
      {/* ============ MENU / HERO ============ */}
      <Section id="menu" eyebrow="Run & meta" title="Title & hero"
        lede="The entry screen sets the tone — a gradient wordmark over a stadium-night backdrop, a gold kicker, and a tight stack of three intent-ranked buttons.">
        <Frame caption={<span><Code>.menu</Code> over <Code>.stadium-bg</Code> — kicker · gradient H1 · sub · gold / brand / ghost action stack.</span>}>
          <div style={{ position: "relative", width: "100%", minHeight: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, overflow: "hidden", borderRadius: 12 }}>
            <div className="stadium-bg" />
            <div className="logo-block" style={{ textAlign: "center", zIndex: 1 }}>
              <div className="kicker">A roguelike run to the World Cup final</div>
              <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 10, background: "linear-gradient(180deg,#fff 30%,#b6bdd1 90%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>World Cup Clash</h1>
              <div className="sub" style={{ color: "var(--txt-dim)", marginTop: 12, fontSize: 15 }}>Pick an XI. Score goals across the full 90. Lead by three to end it early.</div>
            </div>
            <div className="actions" style={{ display: "flex", flexDirection: "column", gap: 12, width: 300, zIndex: 1 }}>
              <button className="btn btn-gold btn-big">Start a run</button>
              <button className="btn btn-primary">Quick run (preset XI)</button>
              <button className="btn btn-ghost">How to play</button>
            </div>
          </div>
        </Frame>
      </Section>

      {/* ============ BRACKET LADDER ============ */}
      <Section id="bracket" eyebrow="Run & meta" title="Run map / bracket"
        lede="Seven matches from group stage to final. Completed nodes turn green with a check; the current node pulses gold; the final wears a double ring.">
        <Frame center caption={<span><Code>.ladder</Code> of <Code>.lnode</Code> states: done · now · upcoming · final.</span>}>
          <Ladder />
        </Frame>

        <Sub>Next-match panel</Sub>
        <Frame center caption={<span><Code>.next-panel</Code> — opponent identity, tier stars, difficulty chips, and the run action stack.</span>}>
          <div className="next-panel" style={{ maxWidth: 560 }}>
            <MiniCrest cols={["#74ACDF", "#fff", "#74ACDF"]} size={64} year="'86" />
            <div className="meta">
              <div className="vs">Round of 16 · vs</div>
              <h3>Argentina 1986</h3>
              <div className="chips">
                <span className="tier-stars">{Array.from({ length: 5 }).map((_, i) => <i key={i} className={i > 3 ? "off" : ""} />)}</span>
                <span className="fchip" data-f="offensive">Offensive</span>
                <span className="chip">Maradona's side</span>
              </div>
              <div className="blurb">A relentless attacking team built around one impossible number 10. Park the bus or trade blows.</div>
            </div>
            <div className="actions3">
              <button className="btn btn-gold">Kick off</button>
              <button className="btn btn-ghost">Locker room</button>
            </div>
          </div>
        </Frame>
      </Section>

      {/* ============ BUILDER ============ */}
      <Section id="builder" eyebrow="Run & meta" title="Squad builder"
        lede="v9: the slot budget buys a PREMIUM core — commons aren’t hand-pickable. The slot meter tracks spend against the 10-slot cap and turns red on overflow; premium picks list with rating, slot cost and a captain toggle. “Fill bench (random)” rolls the rest of the 11 from random commons (re-click to re-roll). The tactical tray starts at one card and grows to a run cap of ~4. Formation picker sets your tactical lean.">
        <div className="ds-grid cols-2">
          <Tile label="Slot meter" sub="fills brand→gold; .over turns red">
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="slot-meter">
                <div className="row"><span style={{ fontSize: 13, color: "var(--txt-dim)", fontWeight: 700 }}>SLOTS USED</span><b>8 / 10</b></div>
                <div className="track"><i style={{ width: "80%" }} /></div>
              </div>
              <div className="slot-meter">
                <div className="row"><span style={{ fontSize: 13, color: "var(--txt-dim)", fontWeight: 700 }}>OVER BUDGET</span><b className="over">12 / 10</b></div>
                <div className="track"><i className="over" style={{ width: "100%" }} /></div>
              </div>
            </div>
          </Tile>
          <Tile label="Pick rows" sub="premium core + bench · random commons">
            <div className="pick-rows" style={{ width: "100%" }}>
              <div className="group-h">Premium core</div>
              <div className="pick-row"><span className="rt">97</span><span className="nm">Mbappé</span><span className="sl">3 sl</span><button className="cap2 on">★</button><button className="rm">✕</button></div>
              <div className="pick-row"><span className="rt">90</span><span className="nm">De Bruyne</span><span className="sl">2 sl</span><button className="cap2">★</button><button className="rm">✕</button></div>
              <div className="group-h">Bench · random commons</div>
              <div className="pick-row" style={{ opacity: 0.8 }}><span className="rt">68</span><span className="nm">Rolled common</span><span className="sl">0 sl</span></div>
              <div className="pick-row" style={{ opacity: 0.8 }}><span className="rt">71</span><span className="nm">Rolled common</span><span className="sl">0 sl</span></div>
            </div>
          </Tile>
        </div>
        <Sub>Fill bench</Sub>
        <Frame center caption={<span>Commons can’t be hand-picked in v9 — <Code>.btn-ghost</Code> rolls a random bench to complete the 11. Re-click to re-roll.</span>}>
          <button className="btn btn-ghost">Fill bench (random)</button>
        </Frame>
        <Sub>Formation picker</Sub>
        <Frame center caption={<span><Code>.formation-picker</Code> — balanced / offensive / defensive, each tinted on select.</span>}>
          <div className="formation-picker">
            <span className="fp-label">Shape</span>
            <button><b>4-4-2</b><span>Balanced</span><i>Even ATK / DEF</i></button>
            <button className="on" data-f="offensive"><b>4-3-3</b><span>Offensive</span><i>+ATK, −DEF</i></button>
            <button data-f="defensive"><b>5-4-1</b><span>Defensive</span><i>+DEF, −ATK</i></button>
          </div>
        </Frame>
      </Section>

      {/* ============ INPUTS ============ */}
      <Section id="inputs" eyebrow="Run & meta" title="Filters & inputs"
        lede="The pool browser uses flat night-2 fields with a brand focus border. Text search, selects and a rating range share one row.">
        <Frame caption={<span><Code>.filters</Code> row — inputs, select, range. Focus borders go <Code>--brand</Code>.</span>}>
          <div className="filters" style={{ border: "none", padding: 0, width: "100%" }}>
            <input type="text" placeholder="Search players…" defaultValue="" />
            <select defaultValue="all"><option value="all">All positions</option><option>FWD</option><option>MID</option><option>DEF</option><option>GK</option></select>
            <select defaultValue="all"><option value="all">All premiums</option><option>Legendary</option><option>Epic</option><option>Rare</option></select>
            <div className="range-wrap"><span>Rating 80+</span><input type="range" min="60" max="99" defaultValue="80" /></div>
          </div>
        </Frame>
      </Section>

      {/* ============ MODAL & OVERLAY ============ */}
      <Section id="overlays" eyebrow="Run & meta" title="Modals & result overlays"
        lede="Detail modals pop on a blurred veil. Full-screen overlays handle the big moments — the GOAL blast, win/loss results with a trophy, and mulligan/redraw.">
        <div className="ds-grid cols-2">
          <Tile label="Result overlay" center sub="win / loss / draw titles">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="mvp-tag">Full time · you win</div>
              <div className="result-title win" style={{ fontSize: 44 }}>3 — 1</div>
              <div className="note" style={{ fontSize: 13 }}>Through to the quarter-finals.</div>
            </div>
          </Tile>
          <Tile label="GOAL blast" center sub="the money moment — full-bleed in play">
            <div style={{ position: "relative", width: "100%", height: 120, borderRadius: 10, overflow: "hidden", background: "radial-gradient(80% 60% at 50% 50%, rgba(10,13,21,.75), rgba(10,13,21,.92))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div className="gb-net" style={{ position: "absolute", inset: 0, opacity: 0.14 }} />
              <div style={{ fontSize: 56, fontWeight: 900, fontStyle: "italic", color: "#e8c873", letterSpacing: "-0.02em", lineHeight: 1 }}>GOAL!</div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.3em", color: "rgba(255,255,255,.85)", marginTop: 6 }}>YOU SCORE</div>
            </div>
          </Tile>
        </div>
        <Note>Veil <Code>.modal-veil</Code> (blur 4px) → <Code>.modal-card</Code> (pop 220ms). Overlays use <Code>.overlay</Code> (blur 8px). The card detail modal is the <Code>CardModal2</Code> component shown in Components.</Note>
      </Section>
    </React.Fragment>
  );
}
window.Screens = Screens;
