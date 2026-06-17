// WORLD CUP CLASH v7 — numeric scoreboard + running match clock (HT 45' / FT 90' / ET),
// a subtle 3-goal mercy marker, central xG rail, and draw / discard / bench / exiled piles.
// Loaded after Board4Widgets.jsx, before Board7.jsx. Reuses Crest3 / Flag2.

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

// Central scoreboard (v7) — a normal numeric score, a running match clock, and the 3-goal mercy marker.
function CenterBoard7({ team, sMe, sAi, T, round, extraTime, etRound, shake, ended, winner }) {
  const code = nationCode6(team.nation);
  // running clock: ~9' per round → R5 = 45' (HT), R10 = 90' (FT); ET counts on past 90'
  const regMin = Math.min(round, T.roundCap) * 9;
  const minute = extraTime ? 90 + Math.max(1, etRound) * 5 : regMin;
  let phase;
  if (ended) phase = extraTime ? "FULL TIME (ET)" : "FULL TIME";
  else if (extraTime) phase = "EXTRA TIME";
  else if (round <= 5) phase = "1ST HALF";
  else phase = "2ND HALF";

  // mercy marker — a 3-goal lead ends it instantly; brightens as a side closes on it
  const lead = Math.abs(sMe.goals - sAi.goals);
  const leaderCode = sMe.goals === sAi.goals ? null : (sMe.goals > sAi.goals ? "YOU" : code);
  const togo = T.mercyLead - lead;
  let mercy, mercyHot = false;
  if (extraTime) { mercy = "GOLDEN GOAL · next goal wins"; mercyHot = true; }
  else if (lead === 0) mercy = "Lead by " + T.mercyLead + " to win";
  else if (togo <= 0) { mercy = leaderCode + " win by " + lead; mercyHot = true; }
  else { mercy = leaderCode + " +" + lead + " · " + togo + " from mercy"; mercyHot = togo <= 1; }

  return (
    <div className={`scoreboard7 ${extraTime ? "et" : ""} ${shake ? "cb-shake" : ""}`}>
      <div className="sb-main">
        <div className="sb-team them">
          <Crest3 nation={team.nation} year={team.year} size={30} showYear={false} />
          <span className="sb-code">{code}</span>
        </div>
        <div className="sb-score">
          <span className="sb-g them">{sAi.goals}</span>
          <span className="sb-dash">–</span>
          <span className="sb-g you">{sMe.goals}</span>
        </div>
        <div className="sb-team you">
          <div className="sb-youcrest"><span>YOU</span></div>
          <span className="sb-code">YOU</span>
        </div>
      </div>
      <div className="sb-clock">
        <span className="sb-min">{minute}'</span>
        <span className={`sb-phase ${extraTime ? "et" : ""}`}>{phase}</span>
      </div>
      <div className={`sb-mercy ${mercyHot ? "hot" : ""}`} title={"A " + T.mercyLead + "-goal lead ends the match instantly"}>{mercy}</div>
      <div className="cb-xg">
        <CenterXgBar7 side="them" label={code} xg={sAi.xg} fatigue={sAi.fatigue} extraTime={extraTime} T={T} />
        <CenterXgBar7 side="you" label="YOU" xg={sMe.xg} fatigue={sMe.fatigue} extraTime={extraTime} T={T} />
      </div>
    </div>
  );
}

// One xG bar — fills toward the next goal; the football at the end is the "you score" cue.
function CenterXgBar7({ side, label, xg, fatigue, extraTime, T }) {
  const pct = Math.min(100, xg * 100);
  const close = xg >= 0.78;
  const F = fatigue || 0;
  const heatLvl = F >= 24 ? 3 : F >= 14 ? 2 : F >= 7 ? 1 : 0;
  return (
    <div className={`cbxg ${side} ${extraTime ? "et" : ""}`} data-heat={heatLvl} title={"xG toward the next goal: " + xg.toFixed(2) + " / 1.00"}>
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

// A deck pile — draw / discard / bench (locked premium players) / exiled (spent Tactical Cards).
const PILE_META7 = {
  draw:    { label: "Draw",    cue: null,            title: "Draw pile" },
  discard: { label: "Discard", cue: "grays cycle",   title: "Discard — commons reshuffle when the draw runs out" },
  locked:  { label: "Bench",   cue: "back at HT",     title: "Benched stars — premium players return to your deck at halftime" },
  exiled:  { label: "Spent",   cue: "single-use",     title: "Exiled — single-use Tactical Cards, gone for the match" },
};
function DeckPile7({ kind, count, w, pileRef, pulse }) {
  const meta = PILE_META7[kind] || PILE_META7.draw;
  const depth = count === 0 ? 0 : Math.min(3, count);
  return (
    <div className={`deckpile5 dp7 ${kind} ${pulse ? "pulse" : ""} ${count === 0 ? "is-empty" : ""}`} ref={pileRef} title={meta.title + " — " + count + " card" + (count === 1 ? "" : "s")}>
      <div className="dp-stack" style={{ "--dw": w + "px" }}>
        {depth === 0 ? (
          <div className="dp-card empty"></div>
        ) : (
          Array.from({ length: depth }).map((_, i) => (
            <div key={i} className="dp-card" style={{ transform: `translate(${i * -2}px, ${i * -3}px)` }}>
              {i === depth - 1 && <span className="dp-mark">{kind === "locked" ? "★" : kind === "exiled" ? "✕" : "WC"}</span>}
            </div>
          ))
        )}
      </div>
      <div className="dp-meta">
        <span className="dp-lab">{meta.label}</span>
        <span className="dp-count">{count}</span>
      </div>
      {meta.cue && <span className="dp-cue">{meta.cue}</span>}
    </div>
  );
}

Object.assign(window, { CenterBoard7, CenterXgBar7, DeckPile7, nationCode6 });
