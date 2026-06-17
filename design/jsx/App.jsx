// WORLD CUP CLASH — App shell, menu, tweaks wiring
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "frameStyle": "classic",
  "cardSize": 168,
  "motion": "full juice",
  "startMorale": 50,
  "staminaCap": 10,
  "prideBonus": 2,
  "momentumBonus": 4
}/*EDITMODE-END*/;

function HowToPlay({ onClose }) {
  const rows = [
    ["Build", "Hand-pick 5 stars, crown a Captain, roll 21 squad players. 26 cards total."],
    ["Commit", "Each round, both managers secretly commit one card. Cards cost stamina — 3 in round 1, +1 per round, cap 10."],
    ["Duel", "Cards flip together. The lower effective rating loses morale equal to the gap. First to 0 loses."],
    ["Roles", "FWD +2 damage on wins · DEF −3 damage on losses · MID +1 stamina next round · GK blocks a whole duel but can't win."],
    ["Edges", "Captain's nation gets +2 · 3 wins in a row = +4 On Form · at ≤10 morale, Stoppage Time adds +2 to everything."],
  ];
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ flexDirection: "column", maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="info" style={{ maxWidth: "none", gap: 12 }}>
          <h3>How to play</h3>
          {rows.map(([t, d]) => (
            <div key={t} className="ab"><b>{t}.</b> {d}</div>
          ))}
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("menu"); // menu | builder | match
  const [squad, setSquad] = useState(null);
  const [captainId, setCaptainId] = useState(null);
  const [matchKey, setMatchKey] = useState(0);
  const [howto, setHowto] = useState(false);

  const frameClass = t.frameStyle === "classic" ? "" : `frame-${t.frameStyle}`;
  const tuning = {
    startMorale: t.startMorale,
    staminaCap: t.staminaCap,
    prideBonus: t.prideBonus,
    momentumBonus: t.momentumBonus,
  };

  const startMatch = (sq, cap) => {
    setSquad(sq); setCaptainId(cap); setMatchKey((k) => k + 1); setScreen("match");
  };

  return (
    <div className={frameClass} data-screen-label={screen}>
      {screen === "menu" && (
        <div className="screen menu">
          <div className="stadium-bg"></div>
          <div className="logo-block">
            <div className="kicker">A 1v1 football card battler</div>
            <h1>WORLD CUP<br />CLASH</h1>
            <div className="sub">Two managers. One card a round. Last morale standing wins.</div>
          </div>
          <div className="actions">
            <button className="btn btn-gold btn-big" onClick={() => setScreen("builder")}>Play</button>
            <button className="btn btn-ghost" onClick={() => setHowto(true)}>How to play</button>
          </div>
          {howto && <HowToPlay onClose={() => setHowto(false)} />}
        </div>
      )}

      {screen === "builder" && (
        <Builder onStart={startMatch} onBack={() => setScreen("menu")} />
      )}

      {screen === "match" && squad && (
        <Board
          key={matchKey}
          squad={squad}
          captainId={captainId}
          tuning={tuning}
          motion={t.motion === "full juice" ? "full" : "subtle"}
          cardSize={t.cardSize}
          onExit={() => setScreen("builder")}
          onRematch={() => setMatchKey((k) => k + 1)}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Cards" />
        <TweakSelect label="Frame style" value={t.frameStyle}
          options={["classic", "modern", "retro", "night"]}
          onChange={(v) => setTweak("frameStyle", v)} />
        <TweakSlider label="Card size" value={t.cardSize} min={120} max={220} unit="px"
          onChange={(v) => setTweak("cardSize", v)} />
        <TweakSection label="Feel" />
        <TweakRadio label="Motion" value={t.motion} options={["full juice", "subtle"]}
          onChange={(v) => setTweak("motion", v)} />
        <TweakSection label="Tuning (next match)" />
        <TweakSlider label="Starting morale" value={t.startMorale} min={30} max={80}
          onChange={(v) => setTweak("startMorale", v)} />
        <TweakSlider label="Stamina cap" value={t.staminaCap} min={6} max={12}
          onChange={(v) => setTweak("staminaCap", v)} />
        <TweakSlider label="Captain's pride" value={t.prideBonus} min={0} max={6}
          onChange={(v) => setTweak("prideBonus", v)} />
        <TweakSlider label="On Form bonus" value={t.momentumBonus} min={0} max={10}
          onChange={(v) => setTweak("momentumBonus", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
