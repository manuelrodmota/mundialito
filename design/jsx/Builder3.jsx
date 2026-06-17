// WORLD CUP CLASH v3 — XI builder (11 players · 10-slot budget · 0–1 tactical card)
function Builder3({ slotBudget, onStart, onBack }) {
  const { PLAYERS, TACTICS } = window.WCC2;
  const XI = 11;
  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");
  const [nation, setNation] = useState("all");
  const [pos, setPos] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [picks, setPicks] = useState([]);          // players only
  const [tactical, setTactical] = useState(null);  // 0 or 1 tactical card
  const [captainId, setCaptainId] = useState(null);
  const [inspect, setInspect] = useState(null);
  const scrollRef = useRef(null);
  const tacticsRef = useRef(null);

  const nations = [...new Set(PLAYERS.map((c) => c.nation))].sort();
  const years = [...new Set(PLAYERS.map((c) => c.worldCup))].sort((a, b) => b - a);

  const slotsUsed = picks.reduce((s, c) => s + c.slots, 0) + (tactical ? tactical.slots : 0);
  const inPicks = (c) => picks.some((p) => p.id === c.id);

  const filtered = PLAYERS.filter((c) =>
        (q === "" || c.name.toLowerCase().includes(q.toLowerCase())) &&
        (year === "all" || c.worldCup === +year) &&
        (nation === "all" || c.nation === nation) &&
        (pos === "all" || c.position === pos) &&
        (rarity === "all" || c.rarity === rarity)
      ).sort((a, b) => b.overall - a.overall);

  const scrollToTactics = () => {
    const sc = scrollRef.current, t = tacticsRef.current;
    if (sc && t) sc.scrollTo({ top: t.offsetTop - sc.offsetTop - 8, behavior: "smooth" });
  };
  const scrollToTop = () => {
    const sc = scrollRef.current;
    if (sc) sc.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePlayer = (card) => {
    if (inPicks(card)) {
      setPicks(picks.filter((c) => c.id !== card.id));
      if (captainId === card.id) setCaptainId(null);
    } else {
      if (picks.length >= XI) return;
      if (slotsUsed + card.slots > slotBudget) return;
      setPicks([...picks, card]);
      if (!captainId && card.rarity !== "common") setCaptainId(card.id);
    }
  };
  const toggleTactical = (card) => {
    if (tactical && tactical.id.startsWith(card.id)) { setTactical(null); return; }
    const otherSlots = picks.reduce((s, c) => s + c.slots, 0);
    if (otherSlots + card.slots > slotBudget) return;
    setTactical(window.WCC3.cloneTactical(card));
  };

  const autofill = () => {
    const room = XI - picks.length;
    if (room <= 0) return;
    const commons = PLAYERS.filter((c) => c.slots === 0 && !inPicks(c));
    const byNation = {};
    commons.forEach((c) => (byNation[c.nation] = byNation[c.nation] || []).push(c));
    const sortedGroups = Object.values(byNation).sort((a, b) => b.length - a.length);
    const fill = [];
    for (const g of sortedGroups) {
      for (const c of g.sort((a, b) => b.overall - a.overall)) {
        if (fill.length >= room) break;
        fill.push(c);
      }
      if (fill.length >= room) break;
    }
    setPicks([...picks, ...fill]);
  };

  const preset = () => {
    const p = window.WCC3E.presetXI();
    setPicks(p.cards.filter((c) => c.type === "player"));
    setTactical(p.cards.find((c) => c.type === "tactic") || null);
    setCaptainId(p.captainId);
  };

  const gks = picks.filter((c) => c.position === "GK").length;
  const ready = picks.length === XI && slotsUsed <= slotBudget && captainId;

  const groups = [
    ["Legendaries", picks.filter((c) => c.rarity === "legendary")],
    ["Epics", picks.filter((c) => c.rarity === "epic")],
    ["Rares", picks.filter((c) => c.rarity === "rare")],
    ["Tactical card", tactical ? [tactical] : []],
    ["Commons (free)", picks.filter((c) => c.rarity === "common")],
  ];

  const avg = (k) => (picks.length ? Math.round(picks.reduce((s, c) => s + c[k], 0) / picks.length) : 0);

  const startLabel = ready
    ? "Start the run"
    : `${picks.length}/${XI} players · ${slotsUsed}/${slotBudget} slots${captainId ? "" : " · pick a captain"}`;

  return (
    <div className="screen builder" data-screen-label="xi-builder">
      <div className="stadium-bg"></div>
      <div className="builder-head">
        <div>
          <h2>Pick your starting XI</h2>
          <div className="hint">11 players on a {slotBudget}-slot budget, plus at most 1 tactical card. Commons are free — start hungry, build up over the run.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={preset}>Load preset XI</button>
          <button className="btn btn-ghost" onClick={onBack}>Menu</button>
        </div>
      </div>
      <div className="builder-body">
        <div className="pool-pane">
          <div className="filters">
            <div className="builder-tabs">
              <button onClick={scrollToTop}>Players</button>
              <button onClick={scrollToTactics}>Tactical cards ↓</button>
            </div>
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
              <option value="common">Common (0 slots)</option><option value="rare">Rare (1)</option>
              <option value="epic">Epic (2)</option><option value="legendary">Legendary (3)</option>
            </select>
          </div>
          <div className="pool-scroll" ref={scrollRef}>
            <div className="pool-grid2">
              {filtered.map((c) => (
                <div key={c.id} style={{ position: "relative" }} onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}>
                  <AnyCard
                    card={c}
                    size={150}
                    isCaptain={c.id === captainId}
                    showSlots
                    className={inPicks(c) ? "fan-card selected" : ""}
                    onClick={() => togglePlayer(c)}
                  />
                </div>
              ))}
            </div>
            <div className="pool-divider" ref={tacticsRef}>
              <span>Tactical cards · take at most 1 into the run</span>
            </div>
            <div className="pool-grid2">
              {TACTICS.map((c) => (
                <div key={c.id} style={{ position: "relative" }} onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}>
                  <AnyCard
                    card={c}
                    size={150}
                    showSlots
                    className={tactical && tactical.id.startsWith(c.id) ? "fan-card selected" : ""}
                    onClick={() => toggleTactical(c)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="picks-pane" style={{ width: 340 }}>
          <div className="slot-meter">
            <div className="row">
              <span>Slot budget</span>
              <b className={slotsUsed > slotBudget ? "over" : ""}>{slotsUsed} / {slotBudget}</b>
            </div>
            <div className="track"><i className={slotsUsed > slotBudget ? "over" : ""} style={{ width: Math.min(100, (slotsUsed / slotBudget) * 100) + "%" }}></i></div>
            <div className="row">
              <span>Starting XI</span>
              <b>{picks.length} / {XI}</b>
            </div>
            <div className="track"><i style={{ width: Math.min(100, (picks.length / XI) * 100) + "%" }}></i></div>
          </div>
          <div className="hint">
            ⚔ avg {avg("atk")} · ⛨ avg {avg("def")} · {tactical ? "1 tactical card" : "no tactical card"} · {gks} GK{gks === 1 ? "" : "s"}
            {gks === 0 && picks.length > 6 ? " — consider a goalkeeper" : ""}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, padding: "9px 10px", fontSize: 13 }} onClick={autofill}>
              Fill with commons
            </button>
            <button className="btn btn-ghost" style={{ padding: "9px 12px", fontSize: 13 }} onClick={() => { setPicks([]); setTactical(null); setCaptainId(null); }}>
              Clear
            </button>
          </div>
          <div className="pick-rows" style={{ overflowY: "auto", flex: 1 }}>
            {groups.map(([label, cards]) =>
              cards.length ? (
                <React.Fragment key={label}>
                  <div className="group-h">{label} · {cards.length}</div>
                  {cards.map((c) => (
                    <div key={c.id} className={`pick-row ${c.type === "tactic" ? "tactic-row" : ""}`}>
                      <span className="rt">{c.type === "tactic" ? "T" : c.overall}</span>
                      {c.type === "player" ? <Flag2 nation={c.nation} /> : null}
                      <span className="nm">{c.name}</span>
                      <span className="sl">{c.slots ? c.slots + "◆" : "0"}</span>
                      {c.type === "player" && (
                        <button className={`cap2 ${captainId === c.id ? "on" : ""}`} title="Make Captain" onClick={() => setCaptainId(c.id)}>★</button>
                      )}
                      <button className="rm" title="Remove" onClick={() => (c.type === "tactic" ? setTactical(null) : togglePlayer(c))}>✕</button>
                    </div>
                  ))}
                </React.Fragment>
              ) : null
            )}
          </div>
          <button
            className="btn btn-gold btn-big"
            disabled={!ready}
            onClick={() => onStart(tactical ? [...picks, tactical] : picks.slice(), captainId)}
          >
            {startLabel}
          </button>
        </div>
      </div>
      {inspect && <CardModal2 card={inspect} isCaptain={inspect.id === captainId} onClose={() => setInspect(null)} />}
    </div>
  );
}
Object.assign(window, { Builder3 });
