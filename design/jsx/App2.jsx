// WORLD CUP CLASH v2 — app shell + tweaks
const TWEAK2_DEFAULTS = /*EDITMODE-BEGIN*/{
  "frameStyle": "classic",
  "motion": "full juice",
  "intent": true,
  "startMorale": 100,
  "slotBudget": 20,
  "staminaCap": 8,
  "stoppageAt": 20,
  "momentumBonus": 6
}/*EDITMODE-END*/;

function HowToPlay2({ onClose }) {
  const rows = [
    ["Build", "30-card squad on a 20-slot budget. Legendaries 3 · Epics 2 · Rares 1 · Commons FREE · Tactics 1–3. Crown a Captain."],
    ["Plan", "Each round, draw 3 and refresh stamina (round+3, cap 8). Secretly field players into ATTACK or DEFENSE and play Tactic cards."],
    ["Reveal", "Both sides flip at once. Your ATK total hits their DEF total — and theirs hits yours. Both sides can score every round."],
    ["Tactics", "VAR, Offside Trap, Red Cards, Penalties, Catenaccio… Instants resolve first and edit the board. Powers stay in play all match."],
    ["Synergies", "3+ same nation = Chemistry · 2+ FWD attacking = +5 · 3+ DEF defending = +8 · 2+ MIDs = +1 stamina next round."],
    ["Win", "Played cards cycle through your discard pile and return. Drop their Morale to 0 — Stoppage Time (+3 damage) kicks in below 20."],
  ];
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ flexDirection: "column", maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="info" style={{ maxWidth: "none", gap: 12 }}>
          <h3>How to play</h3>
          {rows.map(([t, d]) => (<div key={t} className="ab"><b>{t}.</b> {d}</div>))}
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function App2() {
  const [t, setTweak] = useTweaks(TWEAK2_DEFAULTS);
  const [screen, setScreen] = useState("menu");
  const [squad, setSquad] = useState(null);
  const [captainId, setCaptainId] = useState(null);
  const [matchKey, setMatchKey] = useState(0);
  const [howto, setHowto] = useState(false);

  const frameClass = t.frameStyle === "classic" ? "" : `frame-${t.frameStyle}`;
  const tuning = {
    startMorale: t.startMorale,
    slotBudget: t.slotBudget,
    staminaCap: t.staminaCap,
    stoppageAt: t.stoppageAt,
    momentumBonus: t.momentumBonus,
    intent: t.intent,
  };

  const startMatch = (sq, cap) => {
    setSquad(sq); setCaptainId(cap); setMatchKey((k) => k + 1); setScreen("match");
  };
  const quickStart = () => {
    const p = window.WCC2E.presetSquad();
    startMatch(p.cards, p.captainId);
  };

  return (
    <div className={frameClass} data-screen-label={screen}>
      {screen === "menu" && (
        <div className="screen menu">
          <div className="stadium-bg"></div>
          <div className="logo-block">
            <div className="kicker">A deckbuilding football battler</div>
            <h1>WORLD CUP<br />CLASH</h1>
            <div className="sub">Split your lineup between attack and defense. Both sides score. Last morale standing wins.</div>
          </div>
          <div className="actions">
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Build a squad</button>
            <button className="btn btn-primary" onClick={quickStart}>Quick match (preset squad)</button>
            <button className="btn btn-ghost" onClick={() => setHowto(true)}>How to play</button>
          </div>
          {howto && <HowToPlay2 onClose={() => setHowto(false)} />}
        </div>
      )}

      {screen === "builder" && (
        <Builder2 slotBudget={t.slotBudget} deckSize={30} onStart={startMatch} onBack={() => setScreen("menu")} />
      )}

      {screen === "match" && squad && (
        <Board2
          key={matchKey}
          squad={squad}
          captainId={captainId}
          tuning={tuning}
          motion={t.motion === "full juice" ? "full" : "subtle"}
          onExit={() => setScreen("builder")}
          onRematch={() => setMatchKey((k) => k + 1)}
        />
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
        <TweakSection label="Tuning (next match)" />
        <TweakSlider label="Starting morale" value={t.startMorale} min={70} max={120}
          onChange={(v) => setTweak("startMorale", v)} />
        <TweakSlider label="Slot budget" value={t.slotBudget} min={14} max={26}
          onChange={(v) => setTweak("slotBudget", v)} />
        <TweakSlider label="Stamina cap" value={t.staminaCap} min={6} max={10}
          onChange={(v) => setTweak("staminaCap", v)} />
        <TweakSlider label="Stoppage threshold" value={t.stoppageAt} min={10} max={30}
          onChange={(v) => setTweak("stoppageAt", v)} />
        <TweakSlider label="On Form bonus" value={t.momentumBonus} min={0} max={12}
          onChange={(v) => setTweak("momentumBonus", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App2 />);
