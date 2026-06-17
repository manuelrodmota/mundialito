// WORLD CUP CLASH — Match Board
function StaminaPips({ p }) {
  return (
    <div className="stamina-pips">
      {Array.from({ length: p.maxStamina }).map((_, i) => (
        <span key={i} className={`pip ${i < p.stamina ? "full" : ""}`}></span>
      ))}
      <span className="lbl">{p.stamina}/{p.maxStamina}</span>
    </div>
  );
}

function MoraleBlock({ p, name, startMorale }) {
  const pct = Math.max(0, (p.morale / startMorale) * 100);
  const low = p.morale <= 15;
  return (
    <div className="morale-block">
      <div className="morale-row">
        <span className="who">{name}</span>
        <span className={`num ${low ? "low" : ""}`}>{Math.max(0, p.morale)}</span>
        <span style={{ fontSize: 11, color: "var(--txt-dim)" }}>morale</span>
      </div>
      <div className="morale-bar"><i className={low ? "low" : ""} style={{ width: pct + "%" }}></i></div>
      <StaminaPips p={p} />
    </div>
  );
}

function SideChips({ p, stoppage }) {
  return (
    <div className="count-chips">
      {p.momentumReady && <span className="chip flame">ON FORM +4</span>}
      {p.winStreak > 0 && !p.momentumReady && <span className="chip">Streak <b>{p.winStreak}</b></span>}
      {stoppage && <span className="chip stoppage">STOPPAGE TIME</span>}
      <span className="chip">Deck <b>{p.deck.length}</b></span>
      <span className="chip">Used <b>{p.used.length}</b></span>
    </div>
  );
}

function Board({ squad, captainId, tuning, motion, cardSize, onExit, onRematch }) {
  const E = window.WCC_ENGINE;
  const matchRef = useRef(null);
  if (!matchRef.current) matchRef.current = E.newMatch(squad, captainId, tuning);
  const m = matchRef.current;

  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);
  const [tossed, setTossed] = useState([]);
  const [selected, setSelected] = useState(null);
  const [anim, setAnim] = useState(null); // {stage, duel}
  const [inspect, setInspect] = useState(null);
  const [shake, setShake] = useState(false);
  const dmgByCard = useRef({});
  const T = m.T;
  const juicy = motion !== "subtle";

  // adapt card size to viewport height so the pitch always breathes
  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  cardSize = Math.min(cardSize, Math.max(110, Math.round(vh * 0.235)));

  const me = m.players[0], opp = m.players[1];
  const affordableIds = new Set(me.hand.filter((c) => c.cost <= me.stamina).map((c) => c.id));
  const forced = affordableIds.size === 0 && me.hand.length > 0
    ? me.hand.slice().sort((a, b) => a.cost - b.cost)[0].id : null;
  if (forced) affordableIds.add(forced);

  // ---- mulligan ----
  const doMulligan = (ids) => {
    E.mulligan(m, me.hand.filter((c) => !ids.includes(c.id)).map((c) => c.id));
    setTossed([]);
    rerender();
  };

  // ---- commit + animated resolve ----
  const commit = () => {
    if (!selected) return;
    const duel = E.commitAndResolve(m, selected);
    if (duel.winner === 0) {
      const id = duel.cards[0].id;
      dmgByCard.current[id] = (dmgByCard.current[id] || 0) + duel.damage;
    }
    setSelected(null);
    const seq = juicy
      ? [["facedown", 0], ["flip", 500], ["clash", 1250], ["damage", 1900], ["readout", 2500]]
      : [["flip", 0], ["damage", 350], ["readout", 800]];
    seq.forEach(([stage, t]) => {
      setTimeout(() => {
        setAnim({ stage, duel });
        if (stage === "clash" && juicy && duel.damage >= 15) {
          setShake(true);
          setTimeout(() => setShake(false), 520);
        }
      }, t);
    });
  };

  const nextRound = () => {
    setAnim(null);
    if (m.phase !== "end") { E.startRound(m); rerender(); }
    else rerender();
  };

  const flipped = anim && anim.stage !== "facedown";
  const clashing = anim && (anim.stage === "clash" || anim.stage === "damage" || anim.stage === "readout") && juicy;
  const showDamage = anim && (anim.stage === "damage" || anim.stage === "readout");
  const showReadout = anim && anim.stage === "readout";
  const duel = anim && anim.duel;
  const winnerSide = duel && duel.winner;

  const ended = m.phase === "end" && (!anim || anim.stage === "readout");
  const mvp = (() => {
    const entries = Object.entries(dmgByCard.current).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    const all = squad.concat();
    return all.find((c) => c.id === entries[0][0]);
  })();

  return (
    <div className={`screen board ${shake ? "shake" : ""}`}>
      <div className="stadium-bg"></div>
      {m.stoppage && <div className="stoppage-tint"></div>}

      {/* opponent strip */}
      <div className="side-strip top">
        <div className="crest ai">LB</div>
        <MoraleBlock p={opp} name="Les Bleus AI" startMorale={T.startMorale} />
        <SideChips p={opp} stoppage={m.stoppage} />
      </div>

      {/* opponent hand (face down) */}
      <div className="hand-zone opp">
        <div className="fan">
          {opp.hand.map((c, i) => (
            <div key={c.id + i} className="fan-card">
              <WCard card={c} size={Math.round(cardSize * 0.6)} faceDown />
            </div>
          ))}
        </div>
      </div>

      {/* pitch */}
      <div className="pitch">
        <div className="center-line"></div>
        <div className="round-badge">ROUND <b>{m.round}</b>{m.home === 0 ? " · HOME" : " · AWAY"}</div>
        <div className="duel-zone" style={{ "--cw": cardSize + "px" }}>
          {/* my card (left) */}
          <div className={`duel-slot ${clashing ? (winnerSide === 0 ? "lunge-r" : "recoil-l") : ""}`}>
            {anim ? (
              <div className="flip-wrap">
                <div className={`flip-card ${flipped ? "flipped" : ""}`}>
                  <WCard card={duel.cards[0]} size={cardSize} faceDown />
                  <div className="face front" style={{ transform: "rotateY(180deg)" }}>
                    <WCard card={duel.cards[0]} size={cardSize} isCaptain={duel.cards[0].id === me.captainId} />
                  </div>
                </div>
              </div>
            ) : selected ? (
              <WCard card={selected} size={cardSize} isCaptain={selected.id === me.captainId} />
            ) : (
              <div className="placeholder">Pick a card from your hand</div>
            )}
            {showDamage && duel && duel.loser === 0 && (
              <div className={`dmg-float ${duel.damage === 0 ? "zero" : ""}`} style={{ left: "20%", top: "8%" }}>
                {duel.damage === 0 ? "SAVED" : `−${duel.damage}`}
              </div>
            )}
          </div>

          <div className="vs-badge">VS</div>

          {/* AI card (right) */}
          <div className={`duel-slot ${clashing ? (winnerSide === 1 ? "lunge-l" : "recoil-r") : ""}`}>
            {anim ? (
              <div className="flip-wrap">
                <div className={`flip-card ${flipped ? "flipped" : ""}`}>
                  <WCard card={duel.cards[1]} size={cardSize} faceDown />
                  <div className="face front" style={{ transform: "rotateY(180deg)" }}>
                    <WCard card={duel.cards[1]} size={cardSize} isCaptain={duel.cards[1].id === opp.captainId} />
                  </div>
                </div>
              </div>
            ) : (
              <WCard card={null} size={cardSize} faceDown />
            )}
            {showDamage && duel && duel.loser === 1 && (
              <div className={`dmg-float ${duel.damage === 0 ? "zero" : ""}`} style={{ right: "20%", top: "8%" }}>
                {duel.damage === 0 ? "SAVED" : `−${duel.damage}`}
              </div>
            )}
          </div>

          {clashing && anim.stage === "clash" && <div className="impact-flash"></div>}
        </div>

        {/* readout */}
        {showReadout && duel && !ended && (
          <div className="duel-readout">
            <div className="headline">
              {duel.tie
                ? "Dead even — no damage"
                : duel.winner === 0
                  ? `You win the duel — ${duel.damage} damage`
                  : `Duel lost — you take ${duel.damage}`}
            </div>
            <div className="detail">
              {duel.eff[0].total} vs {duel.eff[1].total} effective · {duel.breakdown.join(" · ")}
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={nextRound}>Next round</button>
            </div>
          </div>
        )}
      </div>

      {/* commit bar */}
      {!anim && m.phase === "commit" && (
        <div className="commit-bar" style={{ "--cw": cardSize + "px" }}>
          <button className="btn btn-gold" disabled={!selected} onClick={commit}>
            {selected ? `Commit ${selected.name.split(" ").slice(-1)[0]} (${selected.cost}⚡)` : "Commit a card"}
          </button>
        </div>
      )}

      {/* my hand */}
      <div className="hand-zone me" style={{ "--cw": cardSize + "px" }}>
        <div className="fan">
          {me.hand.map((c) => {
            const ok = affordableIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`fan-card ${selected && selected.id === c.id ? "selected" : ""} ${ok ? "" : "unaffordable"}`}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}
              >
                <WCard
                  card={c}
                  size={cardSize}
                  isCaptain={c.id === me.captainId}
                  onClick={() => {
                    if (anim || m.phase !== "commit") return;
                    if (!ok) { setInspect(c); return; }
                    setSelected(selected && selected.id === c.id ? null : c);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* my strip */}
      <div className="side-strip bottom">
        <div className="crest">YOU</div>
        <MoraleBlock p={me} name="Your XI" startMorale={T.startMorale} />
        <SideChips p={me} stoppage={m.stoppage} />
        <button className="btn btn-ghost" style={{ marginLeft: 12, padding: "8px 16px", fontSize: 13 }} onClick={onExit}>Concede</button>
      </div>

      {/* mulligan overlay */}
      {m.phase === "mulligan" && (
        <div className="overlay">
          <h2>Your opening hand</h2>
          <div className="note">
            Click cards to send them back for a redraw — once only. Your Captain stays.
            {m.home === 0 ? " You're at home: +1 stamina in round 1." : " You're away: the AI kicks off with +1 stamina in round 1."}
          </div>
          <div className="mull-row">
            {me.hand.map((c) => {
              const isCap = c.id === me.captainId;
              return (
                <div
                  key={c.id}
                  className={`mull-card ${tossed.includes(c.id) ? "tossed" : ""}`}
                  onClick={() => {
                    if (isCap) return;
                    setTossed(tossed.includes(c.id) ? tossed.filter((x) => x !== c.id) : [...tossed, c.id]);
                  }}
                >
                  {isCap && <div className="lock">CAPTAIN</div>}
                  <WCard card={c} size={150} isCaptain={isCap} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary btn-big" onClick={() => doMulligan(tossed)}>
              {tossed.length ? `Redraw ${tossed.length} and kick off` : "Keep hand and kick off"}
            </button>
          </div>
        </div>
      )}

      {/* result overlay */}
      {ended && (
        <div className="overlay">
          {juicy && m.winner === 0 && Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: Math.random() * 100 + "%",
                background: ["#e8c873", "#7f56d9", "#3fbf6f", "#5aa7e8", "#ef8a7c"][i % 5],
                animationDuration: 2.4 + Math.random() * 2 + "s",
                animationDelay: Math.random() * 1.6 + "s",
              }}
            ></div>
          ))}
          <div className={`result-title ${m.winner === 0 ? "win" : m.winner === 1 ? "loss" : "draw"}`}>
            {m.winner === 0 ? "FULL TIME — YOU WIN" : m.winner === 1 ? "FULL TIME — DEFEAT" : "A DRAW"}
          </div>
          <div className="note">
            {m.winner === 0
              ? `The opposition's morale is broken after ${m.round} rounds.`
              : m.winner === 1
                ? `Your squad's morale gave out in round ${m.round}. Rebuild and go again.`
                : "Both squads collapsed together. Football, eh."}
          </div>
          {mvp && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div className="mvp-tag">Player of the match · {dmgByCard.current[mvp.id]} damage</div>
              <WCard card={mvp} size={180} isCaptain={mvp.id === me.captainId} />
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-gold btn-big" onClick={onRematch}>Rematch</button>
            <button className="btn btn-ghost btn-big" onClick={onExit}>New squad</button>
          </div>
        </div>
      )}

      {inspect && <CardModal card={inspect} isCaptain={inspect.id === me.captainId} onClose={() => setInspect(null)} />}
    </div>
  );
}
Object.assign(window, { Board });
