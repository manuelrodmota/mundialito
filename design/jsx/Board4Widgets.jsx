// WORLD CUP CLASH v4 — board widgets: score strip, xG meters w/ fatigue heat, goal blast, lanes
// Loaded before Board4.jsx. Reuses Pips3 / PowerShelf3 / FormationPicker3 / Crest3 from Board3.jsx.

function Ball4({ lit, side }) {
  return (
    <svg className={`ball4 ${lit ? "lit " + side : ""}`} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" className="b-bg"></circle>
      <path d="M12 8.6 L15.2 11 L14 14.8 L10 14.8 L8.8 11 Z" className="b-pent"></path>
      <path d="M12 2.2 L12 8.6 M15.2 11 L21.4 9 M14 14.8 L17.8 19.8 M10 14.8 L6.2 19.8 M8.8 11 L2.6 9" className="b-seam"></path>
    </svg>
  );
}

// the 5-ball strip — first to 3 lit wins; yours fill from the left, theirs from the right (GDD §16)
function ScoreStrip4({ g0, g1, toWin, round, roundCap, halftimeRound }) {
  const total = 2 * toWin - 1;
  return (
    <div className="scorestrip4">
      <span className="ss-score you">{g0}</span>
      <div className="ss-balls">
        {Array.from({ length: total }).map((_, i) => {
          const mine = i < g0;
          const theirs = i >= total - g1;
          return <Ball4 key={i} lit={mine || theirs} side={mine ? "you" : "them"} />;
        })}
      </div>
      <span className="ss-score them">{g1}</span>
      <span className="ss-round">
        ROUND <b>{Math.min(round, roundCap)}</b> / {roundCap}
        {round <= halftimeRound ? <i className="ht-tick" title={"Halftime after round " + halftimeRound}>HT @ {halftimeRound}</i> : null}
      </span>
    </div>
  );
}

// xG meter — fills toward the next goal; the heat glow is the fatigue dial (GDD §7, §8)
function XgMeter4({ P, T, shownXg, shownGoals, shownFatigue, mine }) {
  const xg = shownXg != null ? shownXg : P.xg;
  const goals = shownGoals != null ? shownGoals : P.goals;
  const F = shownFatigue != null ? shownFatigue : P.fatigue;
  const heat = F / T.fatigueMax;
  const heatLvl = F >= 24 ? 3 : F >= 14 ? 2 : F >= 7 ? 1 : 0;
  return (
    <div className={`xgm4 ${mine ? "mine" : ""}`} data-heat={heatLvl} style={{ "--heat": heat }}>
      <div className="xgm-row">
        <span className="xgm-goals">{goals}</span>
        <div className="xgm-bar" title={"xG toward the next goal: " + xg.toFixed(2) + " / 1.00"}>
          <i style={{ width: Math.min(100, xg * 100) + "%" }}></i>
          <span className="xgm-val">{xg.toFixed(2)} xG</span>
        </div>
      </div>
      <div className="xgm-sub">
        <span>{mine ? "to next goal" : "to their next goal"}</span>
        {heatLvl > 0 && <span className="heat-tag">FATIGUE {F} — defense at {Math.round((1 - F / T.fatigueDiv) * 100)}%</span>}
      </div>
    </div>
  );
}

function Chips4({ P, T, noPiles }) {
  return (
    <div className="count-chips">
      {P.onFormNext && <span className="chip flame">ON FORM next round</span>}
      {P.winStreak > 0 && <span className="chip">Pressure <b>{P.winStreak}</b>/3</span>}
      {P.pressedNext > 0 && <span className="chip stoppage">Pressed next round</span>}
      {P.floorZeroNext && <span className="chip stoppage">No xG floor next round</span>}
      {!noPiles && <span className="chip">Draw <b>{P.draw.length}</b></span>}
      {!noPiles && <span className="chip">Discard <b>{P.discard.length}</b></span>}
      {P.exiled.length > 0 && <span className="chip">Sent off <b>{P.exiled.length}</b></span>}
    </div>
  );
}

// the money moment (GDD §16)
function GoalBlast4({ who, score, n }) {
  return (
    <div className={`goal-blast ${who === 0 ? "you" : "them"}`}>
      <div className="gb-net"></div>
      <div className="gb-text">GOAL{n > 1 ? " ×" + n : ""}</div>
      <div className="gb-sub">{who === 0 ? "YOU SCORE" : "THEY SCORE"} · {score[0]} – {score[1]}</div>
    </div>
  );
}

function XgGain4({ amount, parts, pos }) {
  return (
    <div className="xg-float4" style={pos}>
      <span className="amt">+{amount.toFixed(2)} xG</span>
      {parts && parts.filter((p) => p.amt !== 0).slice(0, 3).map((p, i) => (
        <span key={i} className="pt">{p.label}{p.amt != null ? " +" + p.amt.toFixed(2) : ""}</span>
      ))}
    </div>
  );
}

function Lane4({ cls, title, kind, cards, mine, droppable, rejecting, faceDown, owner, state, lw, laneH, zeroId, showMult, onZoneClick, onCardClick, onInspect }) {
  const crowded = cards.length > 1 && cards.length * (lw * 1.42) + (cards.length - 1) * 8 > laneH;
  return (
    <div
      className={`lane4 ${cls || ""} ${kind}-lane ${mine ? "mine" : ""} ${droppable ? "droppable" : ""} ${rejecting ? "rejecting" : ""}`}
      style={{ "--lw": lw + "px" }}
      onClick={droppable && onZoneClick ? onZoneClick : undefined}
    >
      <span className="ltag4">{title}</span>
      {cards.length === 0 ? (
        <span className="lane-hint4">{faceDown ? "—" : mine ? (droppable ? "Place here" : "Empty") : "Empty"}</span>
      ) : (
        <div className={`lane4-cards ${crowded ? "crowded" : ""}`}>
          {cards.map((c, i) => (
            <div key={c.id + "_" + i} className={!faceDown && zeroId === c.id ? "offside4" : ""}
              onContextMenu={(e) => { e.preventDefault(); if (!faceDown) onInspect(c); }}>
              {!faceDown && zeroId === c.id && <span className="offside-flag4">OFFSIDE</span>}
              <AnyCard
                card={c}
                size={lw}
                faceDown={faceDown}
                isCaptain={!faceDown && c.id === state.players[owner].captainId}
                status={!faceDown ? state.players[owner].cardStatus[c.id] : null}
                showMult={showMult && !faceDown}
                onClick={!faceDown && mine && onCardClick ? (e) => { e.stopPropagation(); onCardClick(c); } : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevrons4({ dir }) {
  const pts = dir === "l" ? "15 4 7 12 15 20" : "9 4 17 12 9 20";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={pts}></polyline>
    </svg>
  );
}

function PitchMarkings4() {
  return (
    <React.Fragment>
      <div className="pl bound"></div>
      <div className="pl half"></div>
      <div className="pl circle"></div>
      <div className="pl spot"></div>
      {["l", "r"].map((s) => (
        <React.Fragment key={s}>
          <div className={`pl box ${s}`}></div>
          <div className={`pl six ${s}`}></div>
          <div className={`pl arc ${s}`}></div>
          <div className={`pl pspot ${s}`}></div>
          <div className={`pl goalbox ${s}`}></div>
        </React.Fragment>
      ))}
      {["tl", "bl", "tr", "br"].map((c) => (<div key={c} className={`pl corner ${c}`}></div>))}
      <div className="center-mark4">WC</div>
    </React.Fragment>
  );
}

Object.assign(window, { Ball4, ScoreStrip4, XgMeter4, Chips4, GoalBlast4, XgGain4, Lane4, Chevrons4, PitchMarkings4 });
