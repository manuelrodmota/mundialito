// WORLD CUP CLASH — Squad Builder screen
function Builder({ onStart, onBack }) {
  const POOL = window.WCC_DATA.POOL;
  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");
  const [nation, setNation] = useState("all");
  const [pos, setPos] = useState("all");
  const [minR, setMinR] = useState(60);
  const [rarity, setRarity] = useState("all");
  const [picks, setPicks] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [rolled, setRolled] = useState(null);
  const [inspect, setInspect] = useState(null);

  const nations = [...new Set(POOL.map((c) => c.nation))].filter((n) => n !== "—").sort();
  const years = [...new Set(POOL.map((c) => c.worldCup))].sort((a, b) => b - a);

  const filtered = POOL.filter((c) =>
    (q === "" || c.name.toLowerCase().includes(q.toLowerCase())) &&
    (year === "all" || c.worldCup === +year) &&
    (nation === "all" || c.nation === nation) &&
    (pos === "all" || c.position === pos) &&
    c.rating >= minR &&
    (rarity === "all" || c.rarity === rarity)
  ).sort((a, b) => b.rating - a.rating);

  const toggle = (card) => {
    if (picks.find((c) => c.id === card.id)) {
      setPicks(picks.filter((c) => c.id !== card.id));
      if (captainId === card.id) setCaptainId(null);
    } else if (picks.length < 5) {
      const next = [...picks, card];
      setPicks(next);
      if (!captainId) setCaptainId(card.id);
    }
  };

  const roll = () => setRolled(window.WCC_ENGINE.rollSquad(picks));
  const squad = rolled ? picks.concat(rolled) : null;
  const curve = squad
    ? [1, 2, 3, 4, 5].map((cost) => squad.filter((c) => c.cost === cost).length)
    : null;
  const maxCurve = curve ? Math.max(...curve, 1) : 1;

  if (rolled) {
    return (
      <div className="screen builder">
        <div className="stadium-bg"></div>
        <div className="builder-head">
          <div>
            <h2>Your 26-man squad</h2>
            <div className="hint">5 hand-picks, 21 rolled from the pool. Check your stamina curve, then walk out.</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setRolled(null)}>Back to picks</button>
        </div>
        <div className="squad-review">
          <h3>The elite spine</h3>
          <div className="squad-grid">
            {picks.map((c) => (
              <WCard key={c.id} card={c} size={132} isCaptain={c.id === captainId} onClick={() => setInspect(c)} />
            ))}
          </div>
          <h3>Squad players (rolled)</h3>
          <div className="squad-grid">
            {rolled.map((c, i) => (
              <div key={c.id} className="deal-in" style={{ animationDelay: `${i * 45}ms` }}>
                <WCard card={c} size={132} onClick={() => setInspect(c)} />
              </div>
            ))}
          </div>
          <h3>Stamina curve</h3>
          <div className="curve">
            {curve.map((n, i) => (
              <div key={i} className="bar-wrap">
                <div className="cnt">{n}</div>
                <div className="bar" style={{ height: `${(n / maxCurve) * 78}%` }}></div>
                <div className="lbl">Cost {i + 1}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="builder-foot">
          <button className="btn btn-ghost" onClick={roll}>Re-roll the 21</button>
          <button className="btn btn-gold btn-big" onClick={() => onStart(squad, captainId)}>Start match</button>
        </div>
        {inspect && <CardModal card={inspect} isCaptain={inspect.id === captainId} onClose={() => setInspect(null)} />}
      </div>
    );
  }

  return (
    <div className="screen builder">
      <div className="stadium-bg"></div>
      <div className="builder-head">
        <div>
          <h2>Build your squad</h2>
          <div className="hint">Hand-pick 5 stars, crown a Captain, then roll 21 squad players.</div>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>Menu</button>
      </div>
      <div className="builder-body">
        <div className="pool-pane">
          <div className="filters">
            <input type="text" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All World Cups</option>
              {years.map((y) => (<option key={y} value={y}>WC {y}</option>))}
            </select>
            <select value={nation} onChange={(e) => setNation(e.target.value)}>
              <option value="all">All nations</option>
              {nations.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
            <select value={pos} onChange={(e) => setPos(e.target.value)}>
              <option value="all">All positions</option>
              <option>GK</option><option>DEF</option><option>MID</option><option>FWD</option>
            </select>
            <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
              <option value="all">All rarities</option>
              <option value="common">Common</option><option value="rare">Rare</option>
              <option value="epic">Epic</option><option value="icon">Icon</option>
            </select>
            <div className="range-wrap">
              <span>Rating {minR}+</span>
              <input type="range" min="60" max="95" value={minR} onChange={(e) => setMinR(+e.target.value)} />
            </div>
          </div>
          <div className="pool-grid">
            {filtered.map((c) => (
              <WCard
                key={c.id}
                card={c}
                size={150}
                isCaptain={c.id === captainId}
                className={picks.find((p) => p.id === c.id) ? "fan-card selected" : ""}
                onClick={() => toggle(c)}
              />
            ))}
          </div>
        </div>
        <div className="picks-pane">
          <h3>Your picks · {picks.length}/5</h3>
          <div className="hint">Click a card to add it. Star one pick as Captain — every card sharing their nation gets +2 in duels, and your Captain always starts in hand.</div>
          <div className="pick-slots">
            {[0, 1, 2, 3, 4].map((i) => {
              const c = picks[i];
              if (!c) return <div key={i} className="pick-slot empty">Empty slot</div>;
              return (
                <div key={c.id} className="pick-slot">
                  <span className="rt">{c.rating}</span>
                  <Flag nation={c.nation} />
                  <span className="nm">{c.name}</span>
                  <button
                    className={`cap-star ${captainId === c.id ? "on" : ""}`}
                    title="Make Captain"
                    onClick={() => setCaptainId(c.id)}
                  >★</button>
                  <button title="Remove" onClick={() => toggle(c)}>✕</button>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={picks.length !== 5 || !captainId} onClick={roll}>
            Roll the other 21
          </button>
          {picks.length === 5 && !captainId && <div className="hint">Pick a Captain first (★).</div>}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Builder });
