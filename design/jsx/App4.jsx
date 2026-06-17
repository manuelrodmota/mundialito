// WORLD CUP CLASH v4 — run shell: xG tuning knobs + v4 how-to-play
const TWEAK4_DEFAULTS = /*EDITMODE-BEGIN*/{
  "frameStyle": "classic",
  "motion": "full juice",
  "intent": true,
  "intentFormation": true,
  "goalsToWin": 3,
  "roundCap": 10,
  "xgSlope": 150,
  "xgCap": 0.6,
  "fatigueRate": 3,
  "formationSwing": 25,
  "staminaPerRound": 8,
  "slotBudget": 10
}/*EDITMODE-END*/;

function HowToPlay4({ onClose, t }) {
  const rows = [
    ["The run", "7 matches to the trophy: 3 group games, R16, quarter, semi, Final. Opponents are real historic World Cup teams — the Final is always a world champion. Lose once and the run is over."],
    ["Build", "Start with 11 players on a 10-slot budget (commons free, legendaries 3) plus at most 1 tactical card. Crown a Captain."],
    ["Score goals", `There is no HP — you score goals. Every round your attack creates chances that accumulate as xG; when your meter crosses 1.0 you score, and the remainder carries over. First to ${t.goalsToWin} goals wins.`],
    ["Fatigue", "You can't park the bus forever. Defending tires your back line, attacking rests it — fatigue saps your effective DEF, so the opponent's meter fills faster against you. Halftime (round 5) gives both sides fresh legs; Water Break clears yours."],
    ["Plan", `Draw 3 each round; stamina refreshes to a flat ${t.staminaPerRound} for both sides. Pick a formation, secretly field players into ATTACK or DEFENSE — but tactical cards are face-up the moment they're played, by both sides. Telegraph yours, read theirs.`],
    ["Gated cards", "Many tactical cards need a matching role on the pitch: Penalty Kick wants a FWD in attack, Catenaccio wants 2 DEF, Tiki-Taka wants 2 MID. Playing one leaks that you have that player."],
    ["The cap", `No winner after ${t.roundCap} rounds? Most goals wins; level on goals, first scorer wins; 0–0 goes to whoever accumulated more xG.`],
    ["Rewards", "Win a match: a random new player joins (better odds deeper in the run) and you choose 1 of 3 tactical cards — or skip to keep the deck lean."],
  ];
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ flexDirection: "column", maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="info" style={{ maxWidth: "none", gap: 12 }}>
          <h3>How to play</h3>
          {rows.map(([k, d]) => (<div key={k} className="ab"><b>{k}.</b> {d}</div>))}
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function TrophySVG4() {
  return (
    <svg className="trophy-cup" viewBox="0 0 24 24" fill="none" stroke="#e8c873" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21 L16 21 M12 17 L12 21 M6 4 L18 4 L18 9 A6 6 0 0 1 6 9 Z" fill="rgba(232,200,115,0.18)"></path>
      <path d="M6 5 L3.5 5 A0.5 0.5 0 0 0 3 5.5 C3 8.5 4.5 10 6.5 10.3 M18 5 L20.5 5 A0.5 0.5 0 0 1 21 5.5 C21 8.5 19.5 10 17.5 10.3"></path>
    </svg>
  );
}

function App4() {
  const [t, setTweak] = useTweaks(TWEAK4_DEFAULTS);
  const [screen, setScreen] = useState("menu");
  const [run, setRun] = useState(null);
  const [reward, setReward] = useState(null);
  const [lastBeaten, setLastBeaten] = useState(null);
  const [lossStage, setLossStage] = useState(null);
  const [matchKey, setMatchKey] = useState(0);
  const [howto, setHowto] = useState(false);
  const E4 = window.WCC4E;

  const frameClass = t.frameStyle === "classic" ? "" : `frame-${t.frameStyle}`;
  const tuning = {
    goalsToWin: t.goalsToWin,
    roundCap: t.roundCap,
    xgSlope: t.xgSlope,
    xgCap: t.xgCap,
    fatigueRate: t.fatigueRate,
    formationSwing: t.formationSwing,
    staminaPerRound: t.staminaPerRound,
    slotBudget: t.slotBudget,
    intent: t.intent,
  };

  const startRun = (deck, captainId) => {
    const r = { matchIndex: 0, deck, captainId, defeated: [], results: [] };
    r.opponent = E4.nextOpponent(r);
    setRun(r);
    setReward(null);
    setLossStage(null);
    setScreen("bracket");
  };
  const quickStart = () => {
    const p = E4.presetXI();
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
    const player = E4.rewardPlayer(r);
    const offers = E4.tacticalOffers();
    r.deck = [...r.deck, player];
    setReward({ player, offers });
    setRun(r);
    setScreen("locker");
  };

  const handleRunOver = () => {
    setLossStage(E4.STAGES[run.matchIndex]);
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
    r.opponent = E4.nextOpponent(r);
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

  const stage = run ? E4.STAGES[Math.min(run.matchIndex, 6)] : null;

  return (
    <div className={frameClass} data-screen-label={screen}>
      {screen === "menu" && (
        <div className="screen menu" data-screen-label="menu">
          <div className="stadium-bg"></div>
          <div className="logo-block">
            <div className="kicker">A roguelike run to the World Cup Final</div>
            <h1>WORLD CUP<br />CLASH</h1>
            <div className="sub">Pick an XI. Create chances, convert your xG, score goals — first to 3 wins. Survive 7 matches against history's great teams.</div>
          </div>
          <div className="actions">
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Start a run</button>
            <button className="btn btn-primary" onClick={quickStart}>Quick run (preset XI)</button>
            <button className="btn btn-ghost" onClick={() => setHowto(true)}>How to play</button>
          </div>
          {howto && <HowToPlay4 t={t} onClose={() => setHowto(false)} />}
        </div>
      )}

      {screen === "builder" && (
        <Builder3 slotBudget={t.slotBudget} onStart={startRun} onBack={() => setScreen("menu")} />
      )}

      {screen === "bracket" && run && (
        <Bracket3 run={run} onKickoff={kickoff} onAbandon={abandon} />
      )}

      {screen === "match" && run && (
        <Board4
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
          <TrophySVG4 />
          <div className="logo-block">
            <div className="kicker">7 wins · 0 losses</div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 64px)" }}>CHAMPIONS<br />OF THE WORLD</h1>
            <div className="sub">You beat {run.results[6] ? run.results[6].name : "a world champion"} in the Final. The run is complete.</div>
          </div>
          <div className="run-list">
            {run.results.map((team, i) => (
              <div className="rrow" key={team.id}>
                <span className="st">{E4.STAGES[i].short}</span>
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
                  <span className="st">{E4.STAGES[i].short}</span>
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
        <TweakSection label="xG engine (next match)" />
        <TweakSlider label="Goals to win" value={t.goalsToWin} min={2} max={5}
          onChange={(v) => setTweak("goalsToWin", v)} />
        <TweakSlider label="Round cap" value={t.roundCap} min={8} max={14}
          onChange={(v) => setTweak("roundCap", v)} />
        <TweakSlider label="xG slope (÷ATK surplus)" value={t.xgSlope} min={100} max={220} step={10}
          onChange={(v) => setTweak("xgSlope", v)} />
        <TweakSlider label="xG cap per round" value={t.xgCap} min={0.4} max={0.8} step={0.05}
          onChange={(v) => setTweak("xgCap", v)} />
        <TweakSlider label="Fatigue rate" value={t.fatigueRate} min={1} max={6}
          onChange={(v) => setTweak("fatigueRate", v)} />
        <TweakSection label="Tuning (next match)" />
        <TweakSlider label="Formation swing %" value={t.formationSwing} min={10} max={30} step={5}
          onChange={(v) => setTweak("formationSwing", v)} />
        <TweakSlider label="Stamina per round" value={t.staminaPerRound} min={6} max={10}
          onChange={(v) => setTweak("staminaPerRound", v)} />
        <TweakSection label="Tuning (next run)" />
        <TweakSlider label="XI slot budget" value={t.slotBudget} min={8} max={14}
          onChange={(v) => setTweak("slotBudget", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App4 />);
