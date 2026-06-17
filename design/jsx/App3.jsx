// WORLD CUP CLASH v3 — run shell (menu → XI → bracket → match → locker → trophy)
const TWEAK3_DEFAULTS = /*EDITMODE-BEGIN*/{
  "frameStyle": "classic",
  "motion": "full juice",
  "intent": true,
  "intentFormation": true,
  "formationSwing": 25,
  "startMorale": 50,
  "counterCap": 15,
  "slotBudget": 10,
  "staminaPerRound": 8,
  "stoppageAt": 10
}/*EDITMODE-END*/;

function HowToPlay3({ onClose, t }) {
  const rows = [
    ["The run", "7 matches to the trophy: 3 group games, R16, quarter, semi, Final. Opponents are real historic World Cup teams — the Final is always a world champion. Lose once and the run is over."],
    ["Build", "Start with 11 players on a 10-slot budget (commons free, legendaries 3) plus at most 1 tactical card. Crown a Captain."],
    ["Formations", "Each round pick a shape: Offensive 3-4-3 boosts ATK but weakens DEF, Defensive 5-4-1 the reverse, Balanced 4-3-3 is neutral. It multiplies your committed totals."],
    ["Plan", `Draw 3 each round; stamina refreshes to a flat ${t.staminaPerRound} for both sides — it never grows, so someone always stays on the bench. Secretly field players into ATTACK or DEFENSE and play tactical cards. The Intent strip shows the opponent's card count, stamina and formation — never which cards.`],
    ["Reveal", "Both sides flip at once. Your ATK total hits their DEF total — and theirs hits yours. Counters are capped at 15, so parking the bus is a wall, not a win button."],
    ["Rewards", "Win a match: a random new player joins (better odds deeper in the run) and you choose 1 of 3 tactical cards — or skip to keep the deck lean."],
    ["Win", `Drop their morale to 0. Morale resets to ${t.startMorale} every match; Stoppage Time (+3 damage) kicks in below ${t.stoppageAt}. Take the Final and lift the trophy.`],
  ];
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ flexDirection: "column", maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="info" style={{ maxWidth: "none", gap: 12 }}>
          <h3>How to play</h3>
          {rows.map(([t, d]) => (<div key={t} className="ab"><b>{t}.</b> {d}</div>))}
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function TrophySVG() {
  return (
    <svg className="trophy-cup" viewBox="0 0 24 24" fill="none" stroke="#e8c873" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21 L16 21 M12 17 L12 21 M6 4 L18 4 L18 9 A6 6 0 0 1 6 9 Z" fill="rgba(232,200,115,0.18)"></path>
      <path d="M6 5 L3.5 5 A0.5 0.5 0 0 0 3 5.5 C3 8.5 4.5 10 6.5 10.3 M18 5 L20.5 5 A0.5 0.5 0 0 1 21 5.5 C21 8.5 19.5 10 17.5 10.3"></path>
    </svg>
  );
}

function App3() {
  const [t, setTweak] = useTweaks(TWEAK3_DEFAULTS);
  const [screen, setScreen] = useState("menu");
  const [run, setRun] = useState(null);
  const [reward, setReward] = useState(null);
  const [lastBeaten, setLastBeaten] = useState(null);
  const [lossStage, setLossStage] = useState(null);
  const [matchKey, setMatchKey] = useState(0);
  const [howto, setHowto] = useState(false);
  const E3 = window.WCC3E;
  // v4 loads Board4.jsx (pitch board); v3 doesn't, so it falls back to Board3
  const BoardComp = window.Board4 || window.Board3;

  const frameClass = t.frameStyle === "classic" ? "" : `frame-${t.frameStyle}`;
  const tuning = {
    startMorale: t.startMorale,
    staminaPerRound: t.staminaPerRound,
    stoppageAt: t.stoppageAt,
    intent: t.intent,
    counterCap: t.counterCap,
    formationSwing: t.formationSwing,
    slotBudget: t.slotBudget,
  };

  const startRun = (deck, captainId) => {
    const r = { matchIndex: 0, deck, captainId, defeated: [], results: [] };
    r.opponent = E3.nextOpponent(r);
    setRun(r);
    setReward(null);
    setLossStage(null);
    setScreen("bracket");
  };
  const quickStart = () => {
    const p = E3.presetXI();
    startRun(p.cards, p.captainId);
  };

  const kickoff = () => {
    setMatchKey((k) => k + 1);
    setScreen("match");
  };

  const handleWin = () => {
    const beaten = run.opponent;
    const r = {
      ...run,
      defeated: [...run.defeated, beaten.id],
      results: [...run.results, beaten],
    };
    setLastBeaten(beaten);
    if (run.matchIndex === 6) {
      setRun(r);
      setScreen("trophy");
      return;
    }
    const player = E3.rewardPlayer(r);
    const offers = E3.tacticalOffers();
    r.deck = [...r.deck, player];
    setReward({ player, offers });
    setRun(r);
    setScreen("locker");
  };

  const handleRunOver = () => {
    setLossStage(E3.STAGES[run.matchIndex]);
    setRun({ ...run, results: [...run.results] });
    setScreen("runover");
  };

  const lockerContinue = (chosen, capId) => {
    const r = {
      ...run,
      captainId: capId,
      matchIndex: run.matchIndex + 1,
      deck: chosen ? [...run.deck, chosen] : run.deck,
    };
    r.opponent = E3.nextOpponent(r);
    setRun(r);
    setReward(null);
    setScreen("bracket");
  };

  const abandon = () => {
    if (window.confirm("Abandon this run? Your squad and progress will be lost.")) {
      setRun(null);
      setScreen("menu");
    }
  };

  const stage = run ? E3.STAGES[Math.min(run.matchIndex, 6)] : null;

  return (
    <div className={frameClass} data-screen-label={screen}>
      {screen === "menu" && (
        <div className="screen menu" data-screen-label="menu">
          <div className="stadium-bg"></div>
          <div className="logo-block">
            <div className="kicker">A roguelike run to the World Cup Final</div>
            <h1>WORLD CUP<br />CLASH</h1>
            <div className="sub">Pick an XI. Survive 7 matches against history's great teams. One loss ends the run.</div>
          </div>
          <div className="actions">
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Start a run</button>
            <button className="btn btn-primary" onClick={quickStart}>Quick run (preset XI)</button>
            <button className="btn btn-ghost" onClick={() => setHowto(true)}>How to play</button>
          </div>
          {howto && <HowToPlay3 t={t} onClose={() => setHowto(false)} />}
        </div>
      )}

      {screen === "builder" && (
        <Builder3 slotBudget={t.slotBudget} onStart={startRun} onBack={() => setScreen("menu")} />
      )}

      {screen === "bracket" && run && (
        <Bracket3 run={run} onKickoff={kickoff} onAbandon={abandon} />
      )}

      {screen === "match" && run && (
        <BoardComp
          key={matchKey}
          squad={run.deck}
          captainId={run.captainId}
          team={run.opponent}
          stage={stage}
          tuning={tuning}
          motion={t.motion === "full juice" ? "full" : "subtle"}
          showIntentFormation={t.intentFormation}
          onWin={handleWin}
          onRunOver={handleRunOver}
          onConcede={handleRunOver}
        />
      )}

      {screen === "locker" && run && reward && (
        <Locker3 run={run} beaten={lastBeaten} reward={reward} onContinue={lockerContinue} />
      )}

      {screen === "trophy" && run && (
        <div className="screen menu" data-screen-label="trophy">
          <div className="stadium-bg"></div>
          {Array.from({ length: 70 }).map((_, i) => (
            <div key={i} className="confetti" style={{
              left: Math.random() * 100 + "%",
              background: ["#e8c873", "#7f56d9", "#3fbf6f", "#5aa7e8", "#ef8a7c"][i % 5],
              animationDuration: 2.4 + Math.random() * 2.4 + "s",
              animationDelay: Math.random() * 2 + "s",
            }}></div>
          ))}
          <TrophySVG />
          <div className="logo-block">
            <div className="kicker">7 wins · 0 losses</div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 64px)" }}>CHAMPIONS<br />OF THE WORLD</h1>
            <div className="sub">You beat {run.results[6] ? run.results[6].name : "a world champion"} in the Final. The run is complete.</div>
          </div>
          <div className="run-list">
            {run.results.map((team, i) => (
              <div className="rrow" key={team.id}>
                <span className="st">{E3.STAGES[i].short}</span>
                <Crest3 nation={team.nation} year={team.year} size={26} showYear={false} />
                <span className="nm">{team.name}</span>
                <span className="res w">WON</span>
              </div>
            ))}
          </div>
          <div className="actions" style={{ flexDirection: "row", width: "auto" }}>
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Run it back</button>
            <button className="btn btn-ghost btn-big" onClick={() => { setRun(null); setScreen("menu"); }}>Menu</button>
          </div>
        </div>
      )}

      {screen === "runover" && run && (
        <div className="screen menu" data-screen-label="run-over">
          <div className="stadium-bg"></div>
          <div className="logo-block">
            <div className="kicker">Knocked out — {lossStage ? lossStage.label : ""}</div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 64px)" }}>RUN OVER</h1>
            <div className="sub">
              {run.results.length === 0
                ? "Out in the first match. Rework the XI and go again."
                : `${run.results.length} win${run.results.length === 1 ? "" : "s"} before the fall. The bracket only gets crueler from here.`}
            </div>
          </div>
          {run.results.length > 0 && (
            <div className="run-list">
              {run.results.map((team, i) => (
                <div className="rrow" key={team.id}>
                  <span className="st">{E3.STAGES[i].short}</span>
                  <Crest3 nation={team.nation} year={team.year} size={26} showYear={false} />
                  <span className="nm">{team.name}</span>
                  <span className="res w">WON</span>
                </div>
              ))}
              <div className="rrow">
                <span className="st">{lossStage ? lossStage.short : ""}</span>
                {run.opponent && <Crest3 nation={run.opponent.nation} year={run.opponent.year} size={26} showYear={false} />}
                <span className="nm">{run.opponent ? run.opponent.name : ""}</span>
                <span className="res l">LOST</span>
              </div>
            </div>
          )}
          <div className="actions" style={{ flexDirection: "row", width: "auto" }}>
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Build a new XI</button>
            <button className="btn btn-ghost btn-big" onClick={() => { setRun(null); setScreen("menu"); }}>Menu</button>
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Look" />
        <TweakSelect label="Card frame" value={t.frameStyle}
          options={["classic", "modern", "retro", "night"]}
          onChange={(v) => setTweak("frameStyle", v)} />
        <TweakRadio label="Motion" value={t.motion} options={["full juice", "subtle"]}
          onChange={(v) => setTweak("motion", v)} />
        <TweakSection label="Information" />
        <TweakToggle label="Show opponent intent" value={t.intent}
          onChange={(v) => setTweak("intent", v)} />
        <TweakToggle label="Show formation in intent" value={t.intentFormation}
          onChange={(v) => setTweak("intentFormation", v)} />
        <TweakSection label="Tuning (next match)" />
        <TweakSlider label="Formation swing %" value={t.formationSwing} min={10} max={30} step={5}
          onChange={(v) => setTweak("formationSwing", v)} />
        <TweakSlider label="Counter-attack cap" value={t.counterCap} min={5} max={25}
          onChange={(v) => setTweak("counterCap", v)} />
        <TweakSlider label="Starting morale" value={t.startMorale} min={30} max={120}
          onChange={(v) => setTweak("startMorale", v)} />
        <TweakSlider label="Stamina per round" value={t.staminaPerRound} min={6} max={10}
          onChange={(v) => setTweak("staminaPerRound", v)} />
        <TweakSlider label="Stoppage threshold" value={t.stoppageAt} min={5} max={30}
          onChange={(v) => setTweak("stoppageAt", v)} />
        <TweakSection label="Tuning (next run)" />
        <TweakSlider label="XI slot budget" value={t.slotBudget} min={8} max={14}
          onChange={(v) => setTweak("slotBudget", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App3 />);
