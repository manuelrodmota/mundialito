// WORLD CUP CLASH v3 — run map (bracket) + locker room
function Crest3({ nation, year, size = 46, showYear = true }) {
  const src = window.WCC_DATA.crestSrc ? window.WCC_DATA.crestSrc(nation) : null;
  if (src) {
    return (
      <span className="crest3 has-img" style={{ "--cs": size + "px" }} title={nation + (year ? " " + year : "")}>
        <img src={src} alt={nation + " crest"} loading="lazy" draggable="false" />
        {showYear && year ? <span className="yr">{String(year).slice(2)}</span> : null}
      </span>
    );
  }
  const cols = window.WCC_DATA.NATIONS[nation] || ["#555", "#777", "#555"];
  return (
    <span className="crest3" style={{ "--cs": size + "px" }} title={nation + (year ? " " + year : "")}>
      {cols.map((c, i) => (<i key={i} style={{ background: c }}></i>))}
      {showYear && year ? <span className="yr">{String(year).slice(2)}</span> : null}
    </span>
  );
}

function TierStars({ n, max = 6 }) {
  return (
    <span className="tier-stars" title={n + "-star difficulty"}>
      {Array.from({ length: max }).map((_, i) => (<i key={i} className={i < n ? "" : "off"}></i>))}
    </span>
  );
}

function DeckModal3({ deck, captainId, onClose }) {
  const players = deck.filter((c) => c.type === "player").sort((a, b) => b.overall - a.overall);
  const tacticals = deck.filter((c) => c.type === "tactic");
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" style={{ flexDirection: "column", maxWidth: 520, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="info" style={{ maxWidth: "none", minHeight: 0, flex: 1 }}>
          <h3>Your deck · {deck.length} cards</h3>
          <div className="pick-rows" style={{ overflowY: "auto", minHeight: 0 }}>
            <div className="group-h">Players · {players.length}</div>
            {players.map((c) => (
              <div key={c.id} className="pick-row">
                <span className="rt">{c.overall}</span>
                <Flag2 nation={c.nation} />
                <span className="nm">{c.name}{c.id === captainId ? " ★" : ""}</span>
                <span className="sl">{c.slots ? c.slots + "◆" : "0"}</span>
              </div>
            ))}
            {tacticals.length > 0 && <div className="group-h">Tactical cards · {tacticals.length}</div>}
            {tacticals.map((c) => (
              <div key={c.id} className="pick-row tactic-row">
                <span className="rt">T</span>
                <span className="nm">{c.name}</span>
                <span className="sl">{c.slots}◆</span>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Bracket3({ run, onKickoff, onAbandon }) {
  const E3 = window.WCC3E;
  const F = window.WCC3.FORMATION_META;
  const [showDeck, setShowDeck] = useState(false);
  const team = run.opponent;
  const st = E3.STAGES[run.matchIndex];
  const isFinal = st.key === "final";
  const captain = run.deck.find((c) => c.id === run.captainId);

  return (
    <div className="screen bracket-screen" data-screen-label="bracket">
      <div className="stadium-bg"></div>
      <div className="bracket-head">
        <div className="kicker">Road to the Final</div>
        <h2>{isFinal ? "One match from glory" : "Match " + (run.matchIndex + 1) + " of 7"}</h2>
        <div className="sub">Win and your squad grows. Lose once, and the run is over.</div>
      </div>

      <div className="ladder">
        {E3.STAGES.map((s, i) => {
          const done = i < run.matchIndex;
          const now = i === run.matchIndex;
          const beaten = run.results[i];
          return (
            <div className="seg" key={s.key}>
              {i > 0 && <div className={`link ${i <= run.matchIndex ? "done" : ""}`}></div>}
              <div className={`lnode ${done ? "done" : ""} ${now ? "now" : ""} ${s.key === "final" ? "final" : ""}`}>
                <div className="dot">
                  {done && beaten ? <Crest3 nation={beaten.nation} year={beaten.year} size={44} showYear={false} />
                    : now ? <Crest3 nation={team.nation} year={team.year} size={44} showYear={false} />
                    : s.key === "final" ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 21 L18 21 M12 17 L12 21 M5 4 L19 4 L19 9 A7 7 0 0 1 5 9 Z"></path>
                        </svg>
                      )
                    : "?"}
                </div>
                <span className="stage">{s.short}</span>
                <span className="beaten">{done && beaten ? beaten.name : now ? "up next" : ""}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`next-panel ${isFinal ? "final-panel" : ""}`}>
        <Crest3 nation={team.nation} year={team.year} size={84} />
        <div className="meta">
          <span className="vs">{st.label} · your opponent</span>
          <h3>{team.name}</h3>
          <div className="chips">
            <TierStars n={st.stars} />
            <span className="fchip" data-f={team.preferredFormation}>
              {F[team.preferredFormation].label} {F[team.preferredFormation].shape}
            </span>
            {team.isChampion && <span className="chip" style={{ color: "var(--gold)", borderColor: "rgba(232,200,115,.5)" }}>WORLD CHAMPIONS</span>}
          </div>
          <div className="blurb">{team.blurb}</div>
        </div>
        <div className="actions3">
          <button className="btn btn-gold btn-big" onClick={onKickoff}>{isFinal ? "Play the Final" : "Kick off"}</button>
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 14px" }} onClick={() => setShowDeck(true)}>
            View deck · {run.deck.length}
          </button>
        </div>
      </div>

      <div className="deck-chip-row">
        <span className="chip">Captain <b>{captain ? captain.name : "—"}</b></span>
        <span className="chip">Defeated <b>{run.matchIndex}</b> / 7</span>
        <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={onAbandon}>Abandon run</button>
      </div>

      {showDeck && <DeckModal3 deck={run.deck} captainId={run.captainId} onClose={() => setShowDeck(false)} />}
    </div>
  );
}

function Locker3({ run, beaten, reward, onContinue, tacticalCap = 4 }) {
  const [chosenId, setChosenId] = useState(null);
  const [skipped, setSkipped] = useState(false);
  const [swapOutId, setSwapOutId] = useState(null);
  const [captainId, setCaptainId] = useState(run.captainId);
  const [inspect, setInspect] = useState(null);
  const nextStage = window.WCC3E.STAGES[run.matchIndex + 1];
  const players = run.deck.filter((c) => c.type === "player").sort((a, b) => b.overall - a.overall);
  const tacticals = run.deck.filter((c) => c.type === "tactic");
  const chosen = reward.offers.find((c) => c.id === chosenId) || null;
  // v8: Run tactical deck is capped at ~4 — once full, a reward becomes a SWAP (take it, exile one you hold)
  const atCap = tacticals.length >= tacticalCap;
  const needSwap = atCap && !!chosen;
  const decided = skipped || (chosen && (!needSwap || swapOutId));
  const netCount = run.deck.length + (chosen ? 1 : 0) - (chosen && swapOutId ? 1 : 0);

  return (
    <div className="screen locker" data-screen-label="locker-room">
      <div className="stadium-bg"></div>
      <div className="locker-head">
        <div>
          <h2>Locker room — you beat {beaten.name}</h2>
          <div className="hint">Collect your rewards, set your captain, then move on. Next up: {nextStage.label}.</div>
        </div>
        <span className="stage-tag">{run.matchIndex + 1} / 7 won</span>
      </div>
      <div className="locker-body">
        <div className="locker-col">
          <h4>New signing — joins your deck</h4>
          <div className="reward-stage">
            <div className="deal-in" onContextMenu={(e) => { e.preventDefault(); setInspect(reward.player); }}>
              <PCard card={reward.player} size={185} showSlots onClick={() => setInspect(reward.player)} />
            </div>
            <div className="note3" style={{ textAlign: "center" }}>
              {reward.player.name} · {reward.player.rarity.toUpperCase()} {reward.player.position} · ATK {reward.player.atk} / DEF {reward.player.def}
            </div>
          </div>
        </div>

        <div className="locker-col">
          <h4>Tactical card — choose 1 of 3, or skip</h4>
          <div className="offer-row">
            {reward.offers.map((c) => (
              <div
                key={c.id}
                className={`offer-card ${chosenId === c.id ? "chosen" : ""} ${decided && chosenId !== c.id ? "dimmed" : ""}`}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}
                onClick={() => { setChosenId(chosenId === c.id ? null : c.id); setSkipped(false); setSwapOutId(null); }}
              >
                {chosenId === c.id && <span className="pick-tag">{needSwap ? "SWAP IN" : "TAKING THIS"}</span>}
                <TCard card={c} size={158} showSlots />
              </div>
            ))}
          </div>
          {atCap
            ? <div className="note3">Tactical deck full ({tacticalCap} max). Take a card only by swapping one out — click a tactical in your deck to exile it, or skip.</div>
            : <div className="note3">A thicker deck means more tools but less consistency — skipping keeps your XI coming back around faster. You can carry up to {tacticalCap} tactical cards.</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`btn ${skipped ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 13, padding: "9px 16px" }}
              onClick={() => { setSkipped(!skipped); setChosenId(null); setSwapOutId(null); }}>
              {skipped ? "Skipping the card" : "Skip — keep the deck lean"}
            </button>
          </div>
        </div>

        <div className="locker-col">
          <h4>Your deck · {netCount} cards</h4>
          <div className="note3">Tap the star to change your captain — he is always in your opening hand and lifts his countrymen.</div>
          <div className="pick-rows" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
            <div className="group-h">Players · {players.length}</div>
            {players.map((c) => (
              <div key={c.id} className="pick-row">
                <span className="rt">{c.overall}</span>
                <Flag2 nation={c.nation} />
                <span className="nm">{c.name}</span>
                <button className={`cap2 ${captainId === c.id ? "on" : ""}`} title="Make Captain" onClick={() => setCaptainId(c.id)}>★</button>
              </div>
            ))}
            {(tacticals.length > 0 || chosen) && <div className="group-h">Tactical cards · {tacticals.length + (chosen ? 1 : 0) - (chosen && swapOutId ? 1 : 0)} / {tacticalCap}</div>}
            {tacticals.map((c) => (
              <div
                key={c.id}
                className={`pick-row tactic-row ${needSwap ? "swappable" : ""} ${swapOutId === c.id ? "swapping-out" : ""}`}
                onClick={needSwap ? () => setSwapOutId(swapOutId === c.id ? null : c.id) : undefined}
                title={needSwap ? "Click to exile this for the new card" : undefined}
              >
                <span className="rt">T</span>
                <span className="nm">{c.name}</span>
                {swapOutId === c.id && <span className="res l" style={{ marginLeft: "auto" }}>OUT</span>}
              </div>
            ))}
            {chosen && (
              <div className="pick-row tactic-row" style={{ borderColor: "var(--gold)" }}>
                <span className="rt">T</span>
                <span className="nm">{chosen.name} — {needSwap ? "swap in" : "new"}</span>
              </div>
            )}
          </div>
          <button className="btn btn-gold btn-big" disabled={!decided} onClick={() => onContinue(chosen, captainId, swapOutId)}>
            {decided ? "On to the " + nextStage.label + " →"
              : needSwap ? "Pick a tactical to swap out"
              : "Choose a tactical card or skip"}
          </button>
        </div>
      </div>
      {inspect && <CardModal2 card={inspect} onClose={() => setInspect(null)} />}
    </div>
  );
}

Object.assign(window, { Crest3, TierStars, Bracket3, Locker3, DeckModal3 });
