// WORLD CUP CLASH — Design System: Patterns (live match-board widgets)
const { Section, Sub, Note, Code, Frame, Tile, MiniCrest, dsSamples } = window;

function Ball4({ lit, side }) {
  return (
    <svg className={`ball4 ${lit ? "lit " + side : ""}`} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" className="b-bg" />
      <path d="M12 8.6 L15.2 11 L14 14.8 L10 14.8 L8.8 11 Z" className="b-pent" />
      <path d="M12 2.2 L12 8.6 M15.2 11 L21.4 9 M14 14.8 L17.8 19.8 M10 14.8 L6.2 19.8 M8.8 11 L2.6 9" className="b-seam" />
    </svg>
  );
}

function ScoreBalls({ you, them, total = 5 }) {
  return (
    <div className="cb-pips">
      {Array.from({ length: total }).map((_, i) => {
        const mine = i < you, theirs = i >= total - them;
        return <Ball4 key={i} lit={mine || theirs} side={mine ? "you" : "them"} />;
      })}
    </div>
  );
}

function XgRail() {
  return (
    <div className="cb-xg">
      <div className="cbxg them" data-heat="2">
        <span className="cbxg-lab">ARG</span>
        <div className="cbxg-track"><i style={{ width: "62%" }} /><span className="cbxg-val">0.62</span></div>
        <span className="cbxg-heat" data-heat="2">FATIGUE</span>
      </div>
      <span className="cbxg-ball close">⚽</span>
      <div className="cbxg you">
        <div className="cbxg-track"><i style={{ width: "84%" }} /><span className="cbxg-val">0.84</span></div>
        <span className="cbxg-lab">YOU</span>
      </div>
    </div>
  );
}

function Patterns() {
  return (
    <React.Fragment>
      {/* ============ SCOREBOARD ============ */}
      <Section id="scoreboard" eyebrow="Patterns" title="Central scoreboard"
        lede="The match's anchor, floating over the centre circle. Angled team plates (red opponent, gold you), a clock/round core with goal-balls, and the xG rail that fills toward the next goal. Shakes on a goal.">
        <Frame center pitch caption={<span><Code>.centerboard5</Code> — team plates clip into the mid core; balls light gold (you) from the left, red (them) from the right.</span>}>
          <div className="centerboard5" style={{ position: "static", transform: "none" }}>
            <div className="cb-score">
              <div className="cb-team them">
                <MiniCrest cols={["#74ACDF", "#fff", "#74ACDF"]} size={30} />
                <span className="cb-code">ARG</span>
                <span className="cb-g">1</span>
              </div>
              <div className="cb-mid">
                <div className="cb-round">2ND HALF · <b>R6</b></div>
                <div className="cb-ht done">HT 1–1</div>
                <ScoreBalls you={2} them={1} />
              </div>
              <div className="cb-team you">
                <div className="cb-youcrest"><span>WC</span></div>
                <span className="cb-code">YOU</span>
                <span className="cb-g">2</span>
              </div>
            </div>
            <XgRail />
          </div>
        </Frame>
      </Section>

      {/* ============ MORALE / STAMINA / xG METER ============ */}
      <Section id="meters" eyebrow="Patterns" title="Meters & gauges"
        lede="The side strips read out the live game state: morale bars (health), stamina pips (your spend budget), and the xG meter that heats up — orange to red — as a side fatigues.">
        <div className="ds-grid cols-2">
          <Tile label="Morale & stamina" sub="side-strip block — bar drains, pips fill, ramp hint">
            <div style={{ width: "100%" }}>
              <div className="morale-block" style={{ minWidth: 0 }}>
                <div className="morale-row"><span className="who">You</span><span className="num">38</span><span style={{ fontSize: 11, color: "var(--txt-dim)" }}>morale</span></div>
                <div className="morale-bar"><i style={{ width: "76%" }} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
                <div className="stamina-pips">
                  {Array.from({ length: 7 }).map((_, i) => <span key={i} className={"pip" + (i < 5 ? " full" : "")} />)}
                  <span className="lbl">5 / 7</span>
                </div>
                <span className="ramp-hint5">+1 ramp</span>
              </div>
              <div className="morale-block" style={{ minWidth: 0, marginTop: 16 }}>
                <div className="morale-row"><span className="who">Argentina '86</span><span className="num low">14</span></div>
                <div className="morale-bar"><i className="low" style={{ width: "28%" }} /></div>
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
        <Sub>Compact score strip</Sub>
        <Note>An alternative inline readout (<Code>.scorestrip4</Code>) for tighter chrome — goals each side flanking five goal-balls.</Note>
        <Frame center>
          <div className="scorestrip4">
            <span className="ss-score you">2</span>
            <div className="ss-balls"><ScoreBalls you={2} them={1} /></div>
            <span className="ss-score them">1</span>
            <div className="ss-round"><span>2ND HALF</span><b>R6</b></div>
          </div>
        </Frame>
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
window.Ball4DS = Ball4;
