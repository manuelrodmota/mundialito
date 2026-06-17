// WORLD CUP CLASH v6 — central scoreboard, central xG rail (with goal-ball), and draw/discard deck piles.
// Loaded after Board4Widgets.jsx, before Board5.jsx. Reuses Ball4 / Crest3 / Flag2.

const NATION_CODE6 = {
  Argentina: "ARG", France: "FRA", Brazil: "BRA", England: "ENG", Portugal: "POR",
  Spain: "ESP", Germany: "GER", Netherlands: "NED", Belgium: "BEL", Croatia: "CRO",
  Uruguay: "URU", Italy: "ITA", Morocco: "MAR", Japan: "JPN", USA: "USA", Mexico: "MEX",
  Senegal: "SEN", Poland: "POL", "South Korea": "KOR", Norway: "NOR", Canada: "CAN",
  Nigeria: "NGA", Cameroon: "CMR", Egypt: "EGY", Algeria: "ALG", Sweden: "SWE",
  Denmark: "DEN", Scotland: "SCO", Wales: "WAL", Australia: "AUS", Iran: "IRN",
  Qatar: "QAT", "Saudi Arabia": "KSA", Ecuador: "ECU", Colombia: "COL", Chile: "CHI",
  Hungary: "HUN", Georgia: "GEO", Serbia: "SRB", Switzerland: "SUI", Ghana: "GHA",
  Slovenia: "SVN", Russia: "RUS", "Ivory Coast": "CIV", Tunisia: "TUN", "Costa Rica": "CRC",
};
function nationCode6(n) { return NATION_CODE6[n] || (n || "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(); }

// Central scoreboard — opponent (red) and you (gold) on angled panels, round in the middle.
function CenterBoard5({ team, sMe, sAi, T, round, shake }) {
  const toWin = T.goalsToWin;
  const total = 2 * toWin - 1;
  const shownRound = Math.min(round, T.roundCap);
  return (
    <div className={`centerboard5 ${shake ? "cb-shake" : ""}`}>
      <div className="cb-score">
        <div className="cb-team them">
          <Crest3 nation={team.nation} year={team.year} size={28} showYear={false} />
          <span className="cb-code">{nationCode6(team.nation)}</span>
          <span className="cb-g">{sAi.goals}</span>
        </div>
        <div className="cb-mid">
          <div className="cb-round">ROUND <b>{shownRound}</b> / {T.roundCap}</div>
          {round <= T.halftimeRound
            ? <div className="cb-ht">HT @ {T.halftimeRound}</div>
            : <div className="cb-ht done">2ND HALF</div>}
          <div className="cb-pips" title={"First to " + toWin + " goals wins"}>
            {Array.from({ length: total }).map((_, i) => {
              const mine = i < sMe.goals;
              const theirs = i >= total - sAi.goals;
              return <Ball4 key={i} lit={mine || theirs} side={mine ? "you" : "them"} />;
            })}
          </div>
        </div>
        <div className="cb-team you">
          <div className="cb-youcrest"><span>YOU</span></div>
          <span className="cb-code">YOU</span>
          <span className="cb-g">{sMe.goals}</span>
        </div>
      </div>
      <div className="cb-xg">
        <CenterXgBar5 side="them" label={nationCode6(team.nation)} xg={sAi.xg} fatigue={sAi.fatigue} T={T} />
        <CenterXgBar5 side="you" label="YOU" xg={sMe.xg} fatigue={sMe.fatigue} T={T} />
      </div>
    </div>
  );
}

// One xG bar — fills toward the next goal; the football at the end is the "you score" cue.
function CenterXgBar5({ side, label, xg, fatigue, T }) {
  const pct = Math.min(100, xg * 100);
  const close = xg >= 0.78;
  const F = fatigue || 0;
  const heatLvl = F >= 24 ? 3 : F >= 14 ? 2 : F >= 7 ? 1 : 0;
  return (
    <div className={`cbxg ${side}`} data-heat={heatLvl} title={"xG toward the next goal: " + xg.toFixed(2) + " / 1.00"}>
      <span className="cbxg-lab">{label}</span>
      <div className="cbxg-track">
        <i style={{ width: pct + "%" }}></i>
        <span className="cbxg-val">{xg.toFixed(2)} xG</span>
      </div>
      <span className={`cbxg-ball ${close ? "close" : ""}`} aria-hidden="true">⚽</span>
      {heatLvl > 0 && (
        <span className="cbxg-heat" data-heat={heatLvl} title={"Tired legs — defense at " + Math.round((1 - F / T.fatigueDiv) * 100) + "%"}>
          ●{F}
        </span>
      )}
    </div>
  );
}

// A draw / discard deck pile — a small stack of card backs with a live count.
function DeckPile5({ kind, count, w, pileRef, pulse }) {
  const label = kind === "draw" ? "Draw" : "Discard";
  const depth = count === 0 ? 0 : Math.min(3, count);
  return (
    <div className={`deckpile5 ${kind} ${pulse ? "pulse" : ""}`} ref={pileRef} title={label + " pile — " + count + " card" + (count === 1 ? "" : "s")}>
      <div className="dp-stack" style={{ "--dw": w + "px" }}>
        {depth === 0 ? (
          <div className="dp-card empty"></div>
        ) : (
          Array.from({ length: depth }).map((_, i) => (
            <div key={i} className="dp-card" style={{ transform: `translate(${i * -2}px, ${i * -3}px)` }}>
              {i === depth - 1 && <span className="dp-mark">WC</span>}
            </div>
          ))
        )}
      </div>
      <div className="dp-meta">
        <span className="dp-lab">{label}</span>
        <span className="dp-count">{count}</span>
      </div>
    </div>
  );
}

Object.assign(window, { CenterBoard5, CenterXgBar5, DeckPile5, nationCode6 });
