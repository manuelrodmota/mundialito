// WORLD CUP CLASH v8 — match board: numeric scoreboard + match clock, 3-goal mercy, golden-goal
// extra time, bench (locked premium players) + exiled (single-use Tactical) piles.
// v8: draw back to a 5-card minimum hand; tactical plays capped at 2 per half (4/match) — a live
// counter sits beside the player-cap chip. Engine = WCC8E.

function Board8({ squad, captainId, team, stage, tuning, motion, showIntentFormation, onWin, onRunOver, onConcede }) {
  const E = window.WCC8E;
  const FM = window.WCC3.FORMATION_META;
  const matchRef = useRef(null);
  if (!matchRef.current) matchRef.current = E.newMatch(squad, captainId, team, tuning);
  const m = matchRef.current;
  useEffect(() => { window.__match7 = m; });
  const T = m.T;
  const juicy = motion !== "subtle";
  const isFinal = stage.key === "final";

  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);
  const [sel, setSel] = useState(null);
  const [stageAnim, setStageAnim] = useState(null); // preflip|flip|duelA|goalA|duelB|goalB|readout
  const [subModal, setSubModal] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [shake, setShake] = useState(false);

  // v6: deck-pile motion — deal cards out of the draw pile, sweep played cards to the discard pile
  const [flights, setFlights] = useState([]);
  const [dealtIds, setDealtIds] = useState([]);
  const [drawPulse, setDrawPulse] = useState(false);
  const [discardPulse, setDiscardPulse] = useState(false);
  const drawPileRef = useRef(null);
  const discardPileRef = useRef(null);

  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const lw = Math.max(62, Math.min(132, Math.round((vh - 330) * 0.225)));
  const hw = Math.max(80, Math.min(118, Math.round(vh * 0.165)));
  const laneH = Math.max(120, vh - 196 - Math.round(hw * 0.92) - 78);

  const me = m.players[0], ai = m.players[1];
  const planning = m.phase === "plan" && !stageAnim;
  const showingDuel = !!stageAnim;
  const lanesMe = showingDuel && m.lastBoards ? m.lastBoards[0] : me.board;
  const lanesAi = showingDuel && m.lastBoards ? m.lastBoards[1] : ai.board;
  const aiFaceDown = planning;
  const duel = stageAnim === "duelA" ? "A" : stageAnim === "duelB" ? "B" : null;
  const showReadout = stageAnim === "readout";

  // your meter updates once your attack resolves (duelA); theirs after duelB
  const ORDER = ["preflip", "flip", "duelA", "goalA", "duelB", "goalB", "readout"];
  const at = (s) => ORDER.indexOf(stageAnim) >= ORDER.indexOf(s);
  const meUpdated = !showingDuel || at("duelA");
  const aiUpdated = !showingDuel || at("duelB");
  const shown = (p, updated) => ({
    xg: updated ? m.players[p].xg : m.prev.xg[p],
    goals: updated ? m.players[p].goals : m.prev.goals[p],
    fatigue: updated ? m.players[p].fatigue : m.prev.fatigue[p],
  });
  const sMe = shown(0, meUpdated), sAi = shown(1, aiUpdated);

  // v5: per-round card cap + stamina ramp surfacing (GDD §6)
  const cardCap = E.cardCapFor(T, m.round, m.extraTime);
  const placedMe = me.board.attack.length + me.board.defense.length;
  const atCap = placedMe >= cardCap;
  const rampHint = m.round === 5 ? "Stamina & card cap rise next round"
    : m.round === 8 ? "Final push — stamina & cap rise at round 9" : null;

  const tot = m.lastTotals;
  const xgEv = (who) => (m.lastEvents || []).find((e) => e.t === "xg" && e.who === who);
  const lastScore = (who) => {
    const gs = (m.lastEvents || []).filter((e) => e.t === "goal" && e.who === who);
    return gs.length ? gs[gs.length - 1].score : [me.goals, ai.goals];
  };

  const selCard = sel ? me.hand.find((c) => c.id === sel) : null;
  const canAtk = selCard && E.canPlace(m, selCard, "attack");
  const canDef = selCard && E.canPlace(m, selCard, "defense");
  const tacChk = selCard && selCard.type === "tactic" ? E.canPlayTactic(m, 0, selCard) : null;

  const handleHandClick = (c) => {
    if (!planning) return;
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
    const gA = m.roundGoals[0], gB = m.roundGoals[1];
    const seq = [];
    let t = 0;
    const push = (s, dt) => { t += dt; seq.push([s, t]); };
    if (juicy) {
      seq.push(["preflip", 0]);
      push("flip", 80);
      push("duelA", 620);
      if (gA) push("goalA", 1500);
      push("duelB", gA ? 1900 : 1700);
      if (gB) push("goalB", 1500);
      push("readout", gB ? 1900 : 1550);
    } else {
      seq.push(["flip", 0]);
      push("duelA", 250);
      if (gA) push("goalA", 600);
      push("duelB", gA ? 1100 : 700);
      if (gB) push("goalB", 600);
      push("readout", gB ? 1100 : 700);
    }
    seq.forEach(([s, tt]) =>
      setTimeout(() => {
        setStageAnim(s);
        if ((s === "goalA" || s === "goalB") && juicy) {
          setShake(true);
          setTimeout(() => setShake(false), 520);
        }
      }, tt)
    );
  };

  const nextRound = () => {
    setStageAnim(null);
    E.startRound(m);
    rerender();
  };

  const ended = m.phase === "end" && (!stageAnim || stageAnim === "readout");
  const won = m.winner === 0;
  const mvp = (() => {
    const e = Object.entries(me.contrib).sort((a, b) => b[1] - a[1])[0];
    if (!e) return null;
    return squad.find((c) => c.id === e[0]) || null;
  })();

  // v7 result framing — mercy / full time / golden goal
  const endPrefix = m.capReason && m.capReason.startsWith("mercy") ? "MERCY RULE"
    : m.extraTime ? "GOLDEN GOAL" : "FULL TIME";
  const capUp = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const committedCost = (laneCardsOf(me).reduce((s, c) => s + c.cost, 0)) + me.tactics.reduce((s, c) => s + c.cost, 0);
  function laneCardsOf(P) { return [...P.board.attack, ...P.board.defense]; }

  const aiFormShown = planning ? null : (m.lastBoards ? m.lastBoards[1].formation : ai.formation);
  const aiTacticsShown = planning ? ai.tactics.map((c) => ({ card: c })) : (m.lastBoards ? m.lastBoards[1].tactics : []);
  const halftimeNow = (m.lastEvents || []).some((e) => e.t === "halftime");
  const etNow = (m.lastEvents || []).some((e) => e.t === "extratime");

  // deal-in: when a new round starts, re-fan the hand out of the draw pile
  useEffect(() => {
    setDealtIds(me.hand.map((c) => c.id));
    setDrawPulse(true);
    const t1 = setTimeout(() => setDealtIds([]), 1100);
    const t2 = setTimeout(() => setDrawPulse(false), 520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [m.round, m.etRound]);

  // discard sweep: when the round resolves, the played cards fly to the discard pile
  const flyDiscard = () => {
    const pile = discardPileRef.current;
    const lb = m.lastBoards && m.lastBoards[0];
    if (!pile || !lb) return;
    const n = lb.attack.length + lb.defense.length;
    if (!n) return;
    const r = pile.getBoundingClientRect();
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    const sx = window.innerWidth * 0.32, sy = window.innerHeight * 0.46;
    const list = Array.from({ length: Math.min(n, 6) }).map((_, i) => {
      const x0 = sx + (Math.random() - 0.5) * 220;
      const y0 = sy + (Math.random() - 0.5) * 150;
      return { id: "df" + Date.now() + "_" + i, x0, y0, dx: tx - x0, dy: ty - y0, delay: i * 75 };
    });
    setFlights(list);
    setDiscardPulse(true);
    setTimeout(() => setDiscardPulse(false), 520);
    setTimeout(() => setFlights([]), 800 + list.length * 75);
  };
  useEffect(() => {
    if (stageAnim === "readout" && juicy) flyDiscard();
  }, [stageAnim]);

  return (
    <div className={`screen board v4board ${shake ? "shake" : ""} ${m.extraTime ? "et-mode" : ""}`} data-screen-label={"match-" + stage.key}>
      <div className="stadium-bg"></div>

      {/* opponent strip */}
      <div className="side-strip top">
        <Crest3 nation={team.nation} year={team.year} size={46} />
        <div className="opp-id">
          <span className="nm">{team.name}</span>
          <span className="sub3"><TierStars n={stage.stars} />{team.isChampion ? "WORLD CHAMPIONS" : null}</span>
        </div>
        {aiFormShown && <span className="fchip" data-f={aiFormShown}>{FM[aiFormShown].label} {FM[aiFormShown].shape}</span>}
        <PowerShelf3 P={ai} onInspect={setInspect} />
        <Chips4 P={ai} T={T} />

        <CenterBoard7 team={team} sMe={sMe} sAi={sAi} T={T} round={m.round} extraTime={m.extraTime} etRound={m.etRound} ended={ended} winner={m.winner} shake={shake} />
      </div>

      {/* extra time — golden-goal beat */}
      {m.extraTime && !ended && (
        <div className="et-banner7">
          <span className="et-dot"></span>
          <b>EXTRA TIME</b><span className="et-sep">·</span>GOLDEN GOAL<span className="et-sep">·</span>next goal wins<span className="et-sep">·</span>xG ×{T.etXgMult}
        </div>
      )}

      {/* the pitch */}
      <div className="pitch-wrap4">
        <div className="pitch4" data-duel={duel || undefined}>
          <PitchMarkings4 />
          <div className="dirhint4 l">
            <span className="who4">You attack</span>
            <Chevrons4 dir="r" /><Chevrons4 dir="r" /><Chevrons4 dir="r" />
          </div>
          <div className="dirhint4 r">
            <Chevrons4 dir="l" /><Chevrons4 dir="l" /><Chevrons4 dir="l" />
            <span className="who4">They attack</span>
          </div>

          {planning && m.aiIntent && T.intent && (
            <div className="intent">
              Opponent: {showIntentFormation && <b>{FM[m.aiIntent.formation].label} ({FM[m.aiIntent.formation].shape}) · </b>}
              <b>{m.aiIntent.cards}</b> card{m.aiIntent.cards === 1 ? "" : "s"} · <b>{m.aiIntent.stamina}</b> stamina
              {ai.tactics.length > 0 && (
                <React.Fragment> · played {ai.tactics.map((c) => <b key={c.id} className="int-tac">{c.name}</b>).reduce((acc, x) => acc === null ? [x] : [...acc, ", ", x], null)}</React.Fragment>
              )}
            </div>
          )}
          {planning && m.reactions.length > 0 && (
            <div className="reaction4">{m.reactions[m.reactions.length - 1]}</div>
          )}

          <div className="p4-grid">
            <Lane4
              cls="l-ydef" title="Your defense" kind="def" mine cards={lanesMe.defense} owner={0} state={m} lw={lw} laneH={laneH} showMult
              droppable={planning && canDef} rejecting={planning && selCard && selCard.type === "player" && !canDef}
              onZoneClick={() => placeSel("defense")}
              onCardClick={(c) => { E.recall(m, c); rerender(); }}
              onInspect={setInspect}
            />
            <Lane4
              cls="l-yatk" title="Your attack" kind="atk" mine cards={lanesMe.attack} owner={0} state={m} lw={lw} laneH={laneH} showMult
              zeroId={showingDuel && m.lastBoards ? m.lastBoards[0].offsideId : null}
              droppable={planning && canAtk} rejecting={planning && selCard && selCard.type === "player" && !canAtk}
              onZoneClick={() => placeSel("attack")}
              onCardClick={(c) => { E.recall(m, c); rerender(); }}
              onInspect={setInspect}
            />
            <div className="p4-mid"></div>
            <Lane4 cls="l-tatk" title="Their attack" kind="atk" cards={lanesAi.attack} faceDown={aiFaceDown} owner={1} state={m} lw={lw} laneH={laneH} showMult
              zeroId={showingDuel && m.lastBoards ? m.lastBoards[1].offsideId : null} onInspect={setInspect} />
            <Lane4 cls="l-tdef" title="Their defense" kind="def" cards={lanesAi.defense} faceDown={aiFaceDown} owner={1} state={m} lw={lw} laneH={laneH} showMult onInspect={setInspect} />
          </div>

          {/* the duels — each attack resolves into an xG gain on the meter */}
          {stageAnim === "duelA" && tot && xgEv(0) && (
            <XgGain4 amount={xgEv(0).amount} parts={xgEv(0).parts} pos={{ right: "6%", top: "30%" }} />
          )}
          {(stageAnim === "duelB" || showReadout) && tot && xgEv(1) && (
            <XgGain4 amount={xgEv(1).amount} parts={xgEv(1).parts} pos={{ left: "6%", top: "30%" }} />
          )}
          {showReadout && tot && xgEv(0) && (
            <XgGain4 amount={xgEv(0).amount} parts={xgEv(0).parts} pos={{ right: "6%", top: "30%" }} />
          )}
        </div>
      </div>

      {/* tactics shelf + formation + action dock */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 26px", position: "relative", zIndex: 5, minHeight: 56 }}>
        <span className="stage-tag">{stage.label}</span>
        <span className={`cap-chip5 ${atCap ? "full" : ""}`} title="Players you can field this round — tactical cards don't count toward the cap">
          <b>{placedMe}</b>/{cardCap} players
        </span>
        <span className={`cap-chip5 tac ${me.tacticsThisHalf >= T.tacticalsPerHalf ? "full" : ""}`} title="Tactical cards played this half — single-use, at most 2 a half (4 per match). Resets at halftime.">
          <b>{me.tacticsThisHalf}</b>/{T.tacticalsPerHalf} tactics · half
        </span>
        <FormationPicker3
          value={me.formation}
          swing={T.formationSwing}
          disabled={!planning}
          onChange={(f) => { E.setFormation(m, f); rerender(); }}
        />
        {(planning ? me.tactics : (m.lastBoards ? m.lastBoards[0].tactics.map((t) => t.card) : [])).length > 0 && (
          <div className="shelf">
            <span className="label">Your tactical cards — visible to them</span>
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
        {aiTacticsShown.length > 0 && (
          <div className="shelf theirs4">
            <span className="label">Their tactical cards</span>
            {aiTacticsShown.map(({ card, cancelled }) => (
              <span key={card.id} className={`tchip ${cancelled ? "cancelled" : ""}`} data-cat={card.category} onClick={() => setInspect(card)}>{card.name}</span>
            ))}
          </div>
        )}
        <PowerShelf3 P={me} onInspect={setInspect} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 9, alignItems: "center" }}>
          {planning && selCard && selCard.type === "player" && atCap && (
            <span className="gate-hint4">Card cap reached — recall a player to field another</span>
          )}
          {planning && selCard && selCard.type === "tactic" && (
            <React.Fragment>
              {tacChk && !tacChk.ok && <span className="gate-hint4">{tacChk.why}</span>}
              <button className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }} disabled={!tacChk || !tacChk.ok} onClick={playSelTactic}>
                Play {selCard.name} ({selCard.cost}⚡)
              </button>
            </React.Fragment>
          )}
          {planning && (
            <button className="btn btn-gold" onClick={doReveal}>
              {committedCost > 0 || me.tactics.length ? "Lock in & reveal" : "Pass round"}
            </button>
          )}
        </div>
      </div>

      {/* hand */}
      <div className="hand-dock" style={{ "--hw": hw + "px" }}>
        <div className="pile-col7 left">
          <DeckPile7 kind="draw" count={me.draw.length} w={Math.round(hw * 0.5)} pileRef={drawPileRef} pulse={drawPulse} />
          <DeckPile7 kind="locked" count={me.locked.length} w={Math.round(hw * 0.5)} />
        </div>
        <div className="fan2">
          {me.hand.map((c, idx) => {
            const afford = me.stamina >= c.cost && !(c.type === "tactic" && c.effect.kind === "handOfGod" && me.hogUsed);
            const dealing = dealtIds.includes(c.id);
            return (
              <div
                key={c.id}
                className={`hcard ${sel === c.id ? "selected" : ""} ${afford ? "" : "dim"} ${dealing ? "dealing" : ""}`}
                style={dealing ? { animationDelay: idx * 55 + "ms" } : undefined}
                data-need={c.cost}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c); }}
              >
                <AnyCard
                  card={c}
                  size={hw}
                  isCaptain={c.id === me.captainId}
                  status={me.cardStatus[c.id]}
                  showMult
                  onClick={() => (afford ? handleHandClick(c) : setInspect(c))}
                />
              </div>
            );
          })}
        </div>
        <div className="pile-col7 right">
          <DeckPile7 kind="discard" count={me.discard.length} w={Math.round(hw * 0.5)} pileRef={discardPileRef} pulse={discardPulse} />
          <DeckPile7 kind="exiled" count={me.exiled.length} w={Math.round(hw * 0.5)} />
        </div>
      </div>

      {/* my strip */}
      <div className="side-strip bottom">
        <div className="crest">YOU</div>
        <span className="fchip" data-f={me.formation}>{FM[me.formation].label} {FM[me.formation].shape}</span>
        <Pips3 cur={me.stamina} max={me.maxStamina} />
        {rampHint && <span className="ramp-hint5">{rampHint}</span>}
        <Chips4 P={me} T={T} noPiles />
        <button className="btn btn-ghost" style={{ marginLeft: 8, padding: "8px 14px", fontSize: 13 }}
          onClick={() => { if (window.confirm("Concede the match? The run will be over.")) onConcede(); }}>
          Concede
        </button>
      </div>

      {/* GOAL — the money moment */}
      {stageAnim === "goalA" && <GoalBlast4 who={0} score={lastScore(0)} n={m.roundGoals[0]} />}
      {stageAnim === "goalB" && <GoalBlast4 who={1} score={lastScore(1)} n={m.roundGoals[1]} />}

      {/* readout */}
      {showReadout && !ended && (
        <div className="readout">
          <h4>{m.extraTime ? "Extra time — minute " + (90 + m.etRound * 5) : "Round " + m.round} — full report</h4>
          <div className="lines">
            {tot && (tot[0].notes.length + tot[1].notes.length > 0) && (
              <div className="line">{[...tot[0].notes.map((n) => "You — " + n), ...tot[1].notes.map((n) => "They — " + n)].join(" · ")}</div>
            )}
            {(m.lastEvents || []).map((e, i) => {
              if (e.t === "totals") return null;
              if (e.t === "xg") {
                const who = e.who === 0 ? "You" : "They";
                const detail = e.parts.map((p) => p.label + (p.amt != null && p.amt !== 0 ? " +" + p.amt.toFixed(2) : "")).join(" · ");
                return <div key={i} className={`line l-xg ${e.who === 0 ? "to-them" : ""}`}>{who} +{e.amount.toFixed(2)} xG — {detail}</div>;
              }
              if (e.t === "goal")
                return <div key={i} className="line l-goal">GOAL — {e.who === 0 ? "you make it" : "they make it"} {e.score[0]}–{e.score[1]}</div>;
              if (e.t === "halftime")
                return <div key={i} className="line l-halftime">HALFTIME (45') — fresh legs: benched stars return to your deck and fatigue clears for both sides</div>;
              if (e.t === "extratime")
                return <div key={i} className="line l-et">EXTRA TIME — golden goal: meters reset to 0, stars &amp; fatigue refreshed, every xG counts ×{T.etXgMult}</div>;
              const cls = e.t === "instant" ? (e.red ? "l-red" : "l-instant") : "";
              return <div key={i} className={`line ${cls}`}>{e.text}</div>;
            })}
          </div>
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={nextRound}>
            {m.extraTime ? "Next extra-time round →" : "Next round →"}
          </button>
        </div>
      )}

      {/* substitution modal */}
      {subModal && (
        <div className="modal-veil">
          <div className="modal-card" style={{ flexDirection: "column", alignItems: "center", maxWidth: 660 }}>
            <div className="info" style={{ maxWidth: "none", textAlign: "center" }}>
              <h3>Substitution</h3>
              <div className="tag">Pick up to 2 cards to discard — you'll draw that many +1, and shed 8 fatigue.</div>
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
          {juicy && won && Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="confetti" style={{
              left: Math.random() * 100 + "%",
              background: ["#e8c873", "#7f56d9", "#3fbf6f", "#5aa7e8", "#ef8a7c"][i % 5],
              animationDuration: 2.4 + Math.random() * 2 + "s",
              animationDelay: Math.random() * 1.6 + "s",
            }}></div>
          ))}
          <div className="final-score4">{me.goals} – {ai.goals}</div>
          <div className={`result-title ${won ? "win" : "loss"}`}>
            {endPrefix} — {won ? "YOU WIN" : "DEFEAT"}
          </div>
          <div className="note">
            {m.capReason
              ? `${capUp(m.capReason)}. You created ${me.xgTotal.toFixed(2)} xG to their ${ai.xgTotal.toFixed(2)}.`
              : won
                ? `${team.name} beaten. You created ${me.xgTotal.toFixed(2)} xG to their ${ai.xgTotal.toFixed(2)}.`
                : `${team.name} ended your run. One life — that's the World Cup.`}
          </div>
          {won && mvp && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div className="mvp-tag">Player of the match</div>
              <PCard card={mvp} size={170} isCaptain={mvp.id === me.captainId} />
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            {won ? (
              <button className="btn btn-gold btn-big" onClick={() => onWin({ rounds: m.round, goals: me.goals, mvp })}>
                {isFinal ? "Lift the trophy →" : "To the locker room →"}
              </button>
            ) : (
              <button className="btn btn-gold btn-big" onClick={onRunOver}>End run</button>
            )}
          </div>
        </div>
      )}

      {/* discard sweep ghosts */}
      {flights.map((f) => (
        <div key={f.id} className="discard-fly" style={{
          left: f.x0, top: f.y0,
          "--dx": f.dx + "px", "--dy": f.dy + "px",
          animationDelay: f.delay + "ms",
        }}></div>
      ))}

      {inspect && <CardModal2 card={inspect} isCaptain={inspect.id === me.captainId} status={me.cardStatus[inspect.id] || ai.cardStatus[inspect.id]} showMult onClose={() => setInspect(null)} />}
    </div>
  );
}
Object.assign(window, { Board8 });
