// WORLD CUP CLASH v2 — lane-based match board
function Pips2({ cur, max }) {
  return (
    <div className="stamina-pips">
      {Array.from({ length: Math.max(max, cur) }).map((_, i) => (
        <span key={i} className={`pip ${i < cur ? "full" : ""}`}></span>
      ))}
      <span className="lbl">{cur}/{max}</span>
    </div>
  );
}

function Morale2({ P, name, T, shownMorale }) {
  const m = shownMorale != null ? shownMorale : P.morale;
  const pct = Math.max(0, (m / T.startMorale) * 100);
  const low = m <= T.stoppageAt;
  return (
    <div className="morale-block">
      <div className="morale-row">
        <span className="who">{name}</span>
        <span className={`num ${low ? "low" : ""}`}>{Math.max(0, m)}</span>
        <span style={{ fontSize: 11, color: "var(--txt-dim)" }}>morale</span>
      </div>
      <div className="morale-bar"><i className={low ? "low" : ""} style={{ width: pct + "%" }}></i></div>
    </div>
  );
}

function PileChips({ P, stoppage }) {
  return (
    <div className="count-chips">
      {P.onFormNext && <span className="chip flame">ON FORM next round</span>}
      {P.winStreak > 0 && <span className="chip">Streak <b>{P.winStreak}</b></span>}
      {P.pressedNext > 0 && <span className="chip stoppage">Pressed next round</span>}
      {stoppage && <span className="chip stoppage">STOPPAGE +3</span>}
      <span className="chip">Draw <b>{P.draw.length}</b></span>
      <span className="chip">Discard <b>{P.discard.length}</b></span>
      {P.exiled.length > 0 && <span className="chip">Sent off <b>{P.exiled.length}</b></span>}
    </div>
  );
}

function PowerShelf({ P, onInspect }) {
  if (!P.powers.length) return null;
  return (
    <div className="shelf">
      <span className="label">Powers</span>
      {P.powers.map((t) => (
        <span key={t.id} className="tchip" data-cat="power" onClick={() => onInspect(t)}>{t.name}</span>
      ))}
    </div>
  );
}

function Lane2({ title, kind, cards, mine, droppable, rejecting, faceDown, owner, state, lw, onZoneClick, onCardClick, onInspect }) {
  const crowded = cards.length > 4;
  return (
    <div
      className={`lane ${kind}-lane ${mine ? "mine" : ""} ${droppable ? "droppable" : ""} ${rejecting ? "rejecting" : ""}`}
      style={{ "--lw": lw + "px" }}
      onClick={droppable && onZoneClick ? onZoneClick : undefined}
    >
      <span className="lane-tag">{title}</span>
      {cards.length === 0 ? (
        <span className="lane-hint">{faceDown ? "—" : mine ? (droppable ? "Place here" : "Empty") : "Empty"}</span>
      ) : (
        <div className={`lane-cards ${crowded ? "crowded" : ""}`}>
          {cards.map((c, i) => (
            <div key={c.id + "_" + i} onContextMenu={(e) => { e.preventDefault(); if (!faceDown) onInspect(c); }}>
              <AnyCard
                card={c}
                size={lw}
                faceDown={faceDown}
                isCaptain={!faceDown && c.id === state.players[owner].captainId}
                status={!faceDown ? state.players[owner].cardStatus[c.id] : null}
                onClick={!faceDown && mine && onCardClick ? (e) => { e.stopPropagation(); onCardClick(c); } : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Clash2({ show, atk, def, mineAttacking, dmg }) {
  if (!show) return <div className="clash"></div>;
  const held = dmg <= 0;
  return (
    <div className="clash">
      <span className="num atk slam">⚔ {atk}</span>
      <span className="x">VS</span>
      <span className="num def slam" style={{ animationDelay: "90ms" }}>⛨ {def}</span>
      <span className={`res slam ${held ? "held" : "dmg"}`} style={{ animationDelay: "240ms" }}>
        {held ? "HELD" : `−${dmg} ${mineAttacking ? "to them" : "to you"}`}
      </span>
    </div>
  );
}

function Board2({ squad, captainId, tuning, motion, onExit, onRematch }) {
  const E = window.WCC2E;
  const matchRef = useRef(null);
  if (!matchRef.current) matchRef.current = E.newMatch(squad, captainId, tuning);
  const m = matchRef.current;
  const T = m.T;
  const juicy = motion !== "subtle";

  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);
  const [sel, setSel] = useState(null);
  const [stage, setStage] = useState(null); // null | flip | slam | after | readout
  const [subModal, setSubModal] = useState(null); // {card, tossed:[]}
  const [inspect, setInspect] = useState(null);
  const [shake, setShake] = useState(false);

  // viewport-adaptive card sizes
  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const lw = Math.max(54, Math.min(92, Math.round((vh - 320) / 2 / 1.42) - 6));
  const hw = Math.max(80, Math.min(118, Math.round(vh * 0.165)));

  const me = m.players[0], ai = m.players[1];
  const planning = m.phase === "plan" && !stage;
  const showingDuel = !!stage;
  const lanesMe = showingDuel && m.lastBoards ? m.lastBoards[0] : me.board;
  const lanesAi = showingDuel && m.lastBoards ? m.lastBoards[1] : ai.board;
  const aiFaceDown = planning;
  const revealed = stage && stage !== "preflip";
  const showTotals = stage === "slam" || stage === "after" || stage === "readout";
  const showReadout = stage === "readout";
  const showDmg = stage === "after" || stage === "readout";

  const tot = m.lastTotals;
  const dmgEvents = (m.lastEvents || []).filter((e) => e.t === "damage");
  const dmgTo = (who) => dmgEvents.filter((e) => e.to === who).reduce((s, e) => s + e.amount, 0);

  const selCard = sel ? me.hand.find((c) => c.id === sel) : null;
  const canAtk = selCard && E.canPlace(m, selCard, "attack");
  const canDef = selCard && E.canPlace(m, selCard, "defense");

  // morale shown: freeze at prevMorale until damage stage
  const frozen = showingDuel && !showDmg;
  const shownMe = frozen ? m.prevMorale[0] : me.morale;
  const shownAi = frozen ? m.prevMorale[1] : ai.morale;

  const handleHandClick = (c) => {
    if (!planning) return;
    if (c.type === "tactic") {
      if (sel === c.id) setSel(null);
      else setSel(c.id);
      return;
    }
    setSel(sel === c.id ? null : c.id);
  };

  const playSelTactic = () => {
    if (!selCard || selCard.type !== "tactic") return;
    if (selCard.effect.kind === "substitution") {
      setSubModal({ card: selCard, tossed: [] });
      setSel(null);
      return;
    }
    E.playTactic(m, selCard);
    setSel(null);
    rerender();
  };

  const placeSel = (lane) => {
    if (!selCard || selCard.type !== "player") return;
    if (E.place(m, selCard, lane)) { setSel(null); rerender(); }
  };

  const doReveal = () => {
    if (!planning) return;
    setSel(null);
    E.reveal(m);
    const totalDmg = m.roundDamage[0] + m.roundDamage[1];
    const seq = juicy
      ? [["preflip", 0], ["flip", 80], ["slam", 850], ["after", 1750], ["readout", 2600]]
      : [["flip", 0], ["slam", 200], ["after", 500], ["readout", 800]];
    seq.forEach(([s, t]) =>
      setTimeout(() => {
        setStage(s);
        if (s === "after" && juicy && totalDmg >= 15) {
          setShake(true);
          setTimeout(() => setShake(false), 520);
        }
      }, t)
    );
  };

  const nextRound = () => {
    setStage(null);
    E.startRound(m);
    rerender();
  };

  const ended = m.phase === "end" && (!stage || stage === "readout");
  const mvp = (() => {
    const e = Object.entries(me.contrib).sort((a, b) => b[1] - a[1])[0];
    if (!e) return null;
    return squad.find((c) => c.id === e[0]) || null;
  })();

  const committedCost = (laneCardsOf(me).reduce((s, c) => s + c.cost, 0)) + me.tactics.reduce((s, c) => s + c.cost, 0);
  function laneCardsOf(P) { return [...P.board.attack, ...P.board.defense]; }

  return (
    <div className={`screen board v2board ${shake ? "shake" : ""}`}>
      <div className="stadium-bg"></div>
      {m.stoppage && <div className="stoppage-tint"></div>}

      {/* opponent strip */}
      <div className="side-strip top">
        <div className="crest ai">LB</div>
        <Morale2 P={ai} name="Les Bleus AI" T={T} shownMorale={shownAi} />
        <PowerShelf P={ai} onInspect={setInspect} />
        <PileChips P={ai} stoppage={m.stoppage} />
      </div>

      {/* lanes */}
      <div className="zones">
        {planning && m.aiIntent && T.intent && (
          <div className="intent">Opponent committed <b>{m.aiIntent.cards}</b> card{m.aiIntent.cards === 1 ? "" : "s"} · <b>{m.aiIntent.stamina}</b> stamina</div>
        )}
        <div className="zcol">
          <Lane2 title="Their defense" kind="def" cards={lanesAi.defense} faceDown={aiFaceDown} owner={1} state={m} lw={lw} onInspect={setInspect} />
          <Clash2 show={showTotals && tot} atk={tot ? tot[0].atk : 0} def={tot ? tot[1].def : 0} mineAttacking={true} dmg={tot ? Math.max(0, tot[0].atk - tot[1].def) : 0} />
          <Lane2
            title="Your attack" kind="atk" mine cards={lanesMe.attack} owner={0} state={m} lw={lw}
            droppable={planning && canAtk} rejecting={planning && selCard && selCard.type === "player" && !canAtk}
            onZoneClick={() => placeSel("attack")}
            onCardClick={(c) => { E.recall(m, c); rerender(); }}
            onInspect={setInspect}
          />
        </div>
        <div className="zcol">
          <Lane2 title="Their attack" kind="atk" cards={lanesAi.attack} faceDown={aiFaceDown} owner={1} state={m} lw={lw} onInspect={setInspect} />
          <Clash2 show={showTotals && tot} atk={tot ? tot[1].atk : 0} def={tot ? tot[0].def : 0} mineAttacking={false} dmg={tot ? Math.max(0, tot[1].atk - tot[0].def) : 0} />
          <Lane2
            title="Your defense" kind="def" mine cards={lanesMe.defense} owner={0} state={m} lw={lw}
            droppable={planning && canDef} rejecting={planning && selCard && selCard.type === "player" && !canDef}
            onZoneClick={() => placeSel("defense")}
            onCardClick={(c) => { E.recall(m, c); rerender(); }}
            onInspect={setInspect}
          />
        </div>

        {/* damage floats */}
        {showDmg && dmgTo(1) > 0 && <div className="dmg-float" style={{ right: "12%", top: "-2px" }}>−{dmgTo(1)}</div>}
        {showDmg && dmgTo(0) > 0 && <div className="dmg-float" style={{ left: "12%", bottom: "8px" }}>−{dmgTo(0)}</div>}
      </div>

      {/* my tactics shelf + action dock */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 26px", position: "relative", zIndex: 5, minHeight: 34 }}>
        <span className="round-badge" style={{ position: "static", transform: "none" }}>ROUND <b>{m.round}</b></span>
        {(planning ? me.tactics : (m.lastBoards ? m.lastBoards[0].tactics.map((t) => t.card) : [])).length > 0 && (
          <div className="shelf">
            <span className="label">Your tactics</span>
            {(planning ? me.tactics.map((c) => ({ card: c })) : m.lastBoards[0].tactics).map(({ card, cancelled }) => (
              <span
                key={card.id}
                className={`tchip ${cancelled ? "cancelled" : ""}`}
                data-cat={card.category}
                title={planning ? "Click to take back" : card.text}
                onClick={() => { if (planning) { E.recall(m, card); rerender(); } else setInspect(card); }}
              >{card.name}</span>
            ))}
          </div>
        )}
        {showingDuel && m.lastBoards && m.lastBoards[1].tactics.length > 0 && (
          <div className="shelf">
            <span className="label">Their tactics</span>
            {m.lastBoards[1].tactics.map(({ card, cancelled }) => (
              <span key={card.id} className={`tchip ${cancelled ? "cancelled" : ""}`} data-cat={card.category} onClick={() => setInspect(card)}>{card.name}</span>
            ))}
          </div>
        )}
        <PowerShelf P={me} onInspect={setInspect} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 9, alignItems: "center" }}>
          {planning && selCard && selCard.type === "tactic" && (
            <button className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }} disabled={me.stamina < selCard.cost || (selCard.effect.kind === "handOfGod" && me.hogUsed)} onClick={playSelTactic}>
              Play {selCard.name} ({selCard.cost}⚡)
            </button>
          )}
          {planning && (
            <button className="btn btn-gold" onClick={doReveal}>
              {committedCost > 0 || me.tactics.length ? "Reveal" : "Pass round"}
            </button>
          )}
        </div>
      </div>

      {/* hand */}
      <div className="hand-dock" style={{ "--hw": hw + "px" }}>
        <div className="fan2">
          {me.hand.map((c) => {
            const afford = me.stamina >= c.cost && !(c.type === "tactic" && c.effect.kind === "handOfGod" && me.hogUsed);
            return (
              <div
                key={c.id}
                className={`hcard ${sel === c.id ? "selected" : ""} ${afford ? "" : "dim"}`}
                data-need={c.cost}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}
              >
                <AnyCard
                  card={c}
                  size={hw}
                  isCaptain={c.id === me.captainId}
                  status={me.cardStatus[c.id]}
                  onClick={() => (afford ? handleHandClick(c) : setInspect(c))}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* my strip */}
      <div className="side-strip bottom">
        <div className="crest">YOU</div>
        <Morale2 P={me} name="Your XI" T={T} shownMorale={shownMe} />
        <Pips2 cur={me.stamina} max={me.maxStamina} />
        <PileChips P={me} stoppage={m.stoppage} />
        <button className="btn btn-ghost" style={{ marginLeft: 8, padding: "8px 14px", fontSize: 13 }} onClick={onExit}>Concede</button>
      </div>

      {/* readout */}
      {showReadout && !ended && (
        <div className="readout">
          <h4>Round {m.round} — full report</h4>
          <div className="lines">
            {(m.lastEvents || []).map((e, i) => {
              if (e.t === "totals") return null;
              const cls = e.t === "instant" ? (e.red ? "l-red" : "l-instant")
                : e.t === "damage" ? "l-damage " + (e.to === 1 ? "to-them" : "")
                : e.t === "stoppage" ? "l-stoppage" : "";
              const text = e.t === "damage"
                ? (e.to === 0 ? `You take −${e.amount} · ${e.label}` : `They take −${e.amount} · ${e.label}`)
                : e.t === "stoppage" ? "STOPPAGE TIME — all damage +3 from here" : e.text;
              return <div key={i} className={`line ${cls}`}>{text}</div>;
            })}
            {dmgEvents.length === 0 && <div className="line">A cagey round — nothing gets through.</div>}
          </div>
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={nextRound}>
            Next round →
          </button>
        </div>
      )}

      {/* substitution modal */}
      {subModal && (
        <div className="modal-veil">
          <div className="modal-card" style={{ flexDirection: "column", alignItems: "center", maxWidth: 660 }}>
            <div className="info" style={{ maxWidth: "none", textAlign: "center" }}>
              <h3>Substitution</h3>
              <div className="tag">Pick up to 2 cards to discard — you'll draw that many +1.</div>
            </div>
            <div className="sub-list">
              {me.hand.filter((c) => c.id !== subModal.card.id).map((c) => (
                <div
                  key={c.id}
                  className={`scard ${subModal.tossed.includes(c.id) ? "tossed" : ""}`}
                  onClick={() => {
                    const t = subModal.tossed.includes(c.id)
                      ? subModal.tossed.filter((x) => x !== c.id)
                      : subModal.tossed.length < 2 ? [...subModal.tossed, c.id] : subModal.tossed;
                    setSubModal({ ...subModal, tossed: t });
                  }}
                >
                  <AnyCard card={c} size={108} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setSubModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                E.playTactic(m, subModal.card, { discardIds: subModal.tossed });
                setSubModal(null);
                rerender();
              }}>
                Discard {subModal.tossed.length}, draw {subModal.tossed.length + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* result overlay */}
      {ended && (
        <div className="overlay">
          {juicy && m.winner === 0 && Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="confetti" style={{
              left: Math.random() * 100 + "%",
              background: ["#e8c873", "#7f56d9", "#3fbf6f", "#5aa7e8", "#ef8a7c"][i % 5],
              animationDuration: 2.4 + Math.random() * 2 + "s",
              animationDelay: Math.random() * 1.6 + "s",
            }}></div>
          ))}
          <div className={`result-title ${m.winner === 0 ? "win" : m.winner === 1 ? "loss" : "draw"}`}>
            {m.winner === 0 ? "FULL TIME — YOU WIN" : m.winner === 1 ? "FULL TIME — DEFEAT" : "A DRAW"}
          </div>
          <div className="note">
            {m.winner === 0
              ? `Their morale broke after ${m.round} rounds. You dealt ${me.dealtTotal} total damage.`
              : m.winner === 1
                ? `Your morale gave out in round ${m.round}. Rework the squad and go again.`
                : "Both sides collapsed together. Football, eh."}
          </div>
          {mvp && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div className="mvp-tag">Player of the match</div>
              <PCard card={mvp} size={170} isCaptain={mvp.id === me.captainId} />
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-gold btn-big" onClick={onRematch}>Rematch</button>
            <button className="btn btn-ghost btn-big" onClick={onExit}>New squad</button>
          </div>
        </div>
      )}

      {inspect && <CardModal2 card={inspect} isCaptain={inspect.id === me.captainId} status={me.cardStatus[inspect.id] || ai.cardStatus[inspect.id]} onClose={() => setInspect(null)} />}
    </div>
  );
}
Object.assign(window, { Board2 });
