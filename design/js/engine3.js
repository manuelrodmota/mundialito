// WORLD CUP CLASH v3 — run engine: formations, historic opponents, rewards (pure logic, no UI)
(function () {
  const D = () => window.WCC2;
  const D3 = () => window.WCC3;

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const DEF_T = {
    startMorale: 50, openingHand: 5, drawPerRound: 3, handCap: 8,
    staminaPerRound: 8, slotBudget: 10, xiSize: 11,
    stoppageAt: 10, stoppageBonus: 3, momentumBonus: 6,
    prideBonus: 2, chemBonus: 2, roundCap: 25, intent: true,
    counterCap: 15, formationSwing: 25,
  };

  function fmults(T, f) {
    const s = T.formationSwing / 100;
    if (f === "offensive") return { a: 1 + s, d: 1 - s };
    if (f === "defensive") return { a: 1 - s, d: 1 + s };
    return { a: 1, d: 1 };
  }

  function newPlayer(cards, captainId, T) {
    const cap = cards.find((c) => c.id === captainId);
    return {
      morale: T.startMorale, stamina: 0, maxStamina: 0,
      draw: shuffle(cards), hand: [], discard: [], exiled: [],
      board: { attack: [], defense: [] }, tactics: [], powers: [],
      captainId, captainNation: cap ? cap.nation : null,
      formation: "balanced",
      winStreak: 0, onFormNow: false, onFormNext: false,
      pressedNow: 0, pressedNext: 0, drawPenaltyNext: 0, bonusStaminaNext: 0,
      cardStatus: {}, hogUsed: false, hogActive: false,
      contrib: {}, dealtTotal: 0,
    };
  }

  function status(P, c) {
    return P.cardStatus[c.id] || (P.cardStatus[c.id] = { booked: false, injured: false, red: false });
  }

  function drawCards(state, p, n, ev) {
    const P = state.players[p];
    for (let i = 0; i < n; i++) {
      if (!P.draw.length) {
        if (!P.discard.length) return;
        P.draw = shuffle(P.discard);
        P.discard = [];
        ev && ev.push({ t: "note", text: (p === 0 ? "Your" : "Their") + " discard pile shuffles back into the deck" });
      }
      const c = P.draw.shift();
      if (P.hand.length >= state.T.handCap) {
        P.discard.push(c);
        ev && ev.push({ t: "note", text: (p === 0 ? "Your hand is full — " : "Their hand is full — ") + c.name + " goes to the discard" });
      } else P.hand.push(c);
    }
  }

  function laneCards(P) { return [...P.board.attack, ...P.board.defense]; }
  function removeFromLanes(P, card) {
    ["attack", "defense"].forEach((l) => (P.board[l] = P.board[l].filter((c) => c !== card)));
  }

  // ---------- match / round ----------
  function newMatch(playerCards, captainId, team, tuning) {
    const T = Object.assign({}, DEF_T, tuning || {});
    const ai = D3().teamDeck(team);
    const state = {
      T, round: 0, stoppage: false, phase: "plan", winner: null,
      opponent: team,
      players: [newPlayer(playerCards, captainId, T), newPlayer(ai.cards, ai.captainId, T)],
      aiIntent: null, lastEvents: [], lastBoards: null, lastTotals: null,
      prevMorale: [T.startMorale, T.startMorale], roundDamage: [0, 0],
    };
    state.players[1].formation = team.preferredFormation;
    startRound(state);
    return state;
  }

  function startRound(state) {
    if (state.winner != null) return;
    state.round++;
    const T = state.T;
    if (state.round > T.roundCap) {
      const [a, b] = state.players;
      state.winner = a.morale === b.morale ? "draw" : a.morale > b.morale ? 0 : 1;
      state.phase = "end";
      return;
    }
    state.roundDamage = [0, 0];
    state.players.forEach((P, idx) => {
      P.board = { attack: [], defense: [] };
      P.tactics = [];
      P.pressedNow = P.pressedNext; P.pressedNext = 0;
      P.onFormNow = P.onFormNext; P.onFormNext = false;
      // GDD §6 — flat stamina: refreshes to the same ceiling every round, no growth, no banking.
      // Water Break / Midfield Engine bonuses stack on top for one round only.
      P.maxStamina = T.staminaPerRound;
      P.stamina = P.maxStamina + P.bonusStaminaNext;
      P.bonusStaminaNext = 0;
      if (state.round === 1) {
        const ci = P.draw.findIndex((c) => c.id === P.captainId);
        if (ci >= 0) P.hand.push(P.draw.splice(ci, 1)[0]);
        drawCards(state, idx, T.openingHand - P.hand.length);
      } else {
        drawCards(state, idx, Math.max(0, T.drawPerRound - P.drawPenaltyNext));
        P.drawPenaltyNext = 0;
      }
    });
    aiPlan(state);
    state.phase = "plan";
  }

  // ---------- player (p0) actions ----------
  function setFormation(state, f) {
    if (state.phase !== "plan") return;
    if (!["offensive", "balanced", "defensive"].includes(f)) return;
    state.players[0].formation = f;
  }
  function canPlace(state, card, lane) {
    const P = state.players[0];
    return state.phase === "plan" && card.type === "player" &&
      P.hand.includes(card) && P.stamina >= card.cost &&
      !(card.position === "GK" && lane === "attack");
  }
  function place(state, card, lane) {
    if (!canPlace(state, card, lane)) return false;
    const P = state.players[0];
    P.hand = P.hand.filter((c) => c !== card);
    P.board[lane].push(card);
    P.stamina -= card.cost;
    return true;
  }
  function recall(state, card) {
    if (state.phase !== "plan") return;
    const P = state.players[0];
    if (laneCards(P).includes(card)) {
      removeFromLanes(P, card);
      P.hand.push(card);
      P.stamina += card.cost;
    } else if (P.tactics.includes(card)) {
      P.tactics = P.tactics.filter((c) => c !== card);
      P.hand.push(card);
      P.stamina += card.cost;
    }
  }
  function playTactic(state, card, opts) {
    const P = state.players[0];
    if (state.phase !== "plan" || card.type !== "tactic" || !P.hand.includes(card) || P.stamina < card.cost) return false;
    const k = card.effect.kind;
    if (k === "handOfGod" && P.hogUsed) return false;
    P.stamina -= card.cost;
    P.hand = P.hand.filter((c) => c !== card);
    if (k === "waterBreak") { P.stamina += 3; P.discard.push(card); return true; }
    if (k === "substitution") {
      const ids = (opts && opts.discardIds) || [];
      const toss = P.hand.filter((c) => ids.includes(c.id)).slice(0, 2);
      toss.forEach((c) => { P.hand = P.hand.filter((x) => x !== c); P.discard.push(c); });
      drawCards(state, 0, toss.length + 1);
      P.discard.push(card);
      return true;
    }
    P.tactics.push(card);
    return true;
  }

  // ---------- effective stats ----------
  function chemNations(P, T) {
    const cnt = {};
    laneCards(P).forEach((c) => (cnt[c.nation] = (cnt[c.nation] || 0) + 1));
    return new Set(Object.keys(cnt).filter((n) => cnt[n] >= 3));
  }
  function effStats(state, p, card, chem) {
    const P = state.players[p], T = state.T;
    const st = P.cardStatus[card.id] || {};
    let a = card.atk, d = card.def;
    if (st.injured) { a -= 15; d -= 15; }
    let b = 0;
    if (card.nation === P.captainNation) b += T.prideBonus;
    if (P.powers.some((t) => t.effect.kind === "talisman") && card.nation === P.captainNation) b += 3;
    if (chem.has(card.nation)) b += T.chemBonus;
    if (card.position !== "GK") a += b;
    d += b;
    return { a: Math.max(0, a), d: Math.max(0, d) };
  }

  function sideTotals(state, p, queue, nutmegCard) {
    const P = state.players[p], T = state.T;
    const notes = [];
    const chem = chemNations(P, T);
    const has = (k) => queue.some((q) => q.p === p && !q.cancelled && q.card.effect.kind === k);
    const tf = P.powers.some((t) => t.effect.kind === "totalFootball");
    let atk = 0, def = 0;
    P.board.attack.forEach((c) => {
      const e = effStats(state, p, c, chem);
      if (c === nutmegCard) return;
      atk += e.a;
      if (tf) def += Math.round(e.d / 2);
    });
    P.board.defense.forEach((c) => {
      const e = effStats(state, p, c, chem);
      def += e.d;
      if (tf) atk += Math.round(e.a / 2);
    });
    if (tf) notes.push("Total Football: cross-lane spillover");
    if (chem.size) notes.push("Chemistry +" + T.chemBonus + "/+" + T.chemBonus + " (" + [...chem].join(", ") + ")");
    const fwds = P.board.attack.filter((c) => c.position === "FWD").length;
    if (fwds >= 2) { atk += 5; notes.push("Strike partnership +5 ATK"); }
    const defs = P.board.defense.filter((c) => c.position === "DEF").length;
    if (defs >= 3) { def += 8; notes.push("Back line +8 DEF"); }
    const mids = laneCards(P).filter((c) => c.position === "MID").length;
    if (mids >= 2) { P.bonusStaminaNext += 1; notes.push("Midfield engine: +1 stamina next round"); }
    if (has("tikiTaka")) { const n = P.board.attack.length; atk += n; notes.push("Tiki-Taka +" + n + " ATK"); }
    if (P.onFormNow) { atk += T.momentumBonus; def += T.momentumBonus; notes.push("ON FORM +" + T.momentumBonus + " / +" + T.momentumBonus); }
    if (has("catenaccio")) { def = Math.floor(def * 1.5); notes.push("Catenaccio: DEF ×1.5"); }
    if (P.powers.some((t) => t.effect.kind === "fortress")) { def += 6; notes.push("Fortress +6 DEF"); }
    if (P.pressedNow) { def = Math.max(0, def - P.pressedNow); notes.push("Pressed −" + P.pressedNow + " DEF"); }
    // GDD §8 — formation multiplier, applied after synergies/powers, before the exchange
    const f = fmults(T, P.formation);
    const meta = D3().FORMATION_META[P.formation];
    if (P.formation !== "balanced")
      notes.push(meta.label + " (" + meta.shape + "): ATK ×" + f.a.toFixed(2) + " · DEF ×" + f.d.toFixed(2));
    return { atk: Math.round(atk * f.a), def: Math.round(def * f.d), formation: P.formation, notes };
  }

  // ---------- reveal & resolve ----------
  function reveal(state) {
    if (state.phase !== "plan") return [];
    const T = state.T, P = state.players, ev = [];
    state.prevMorale = [P[0].morale, P[1].morale];
    const queue = [];
    [0, 1].forEach((p) => P[p].tactics.forEach((c) => queue.push({ p, card: c, cancelled: false })));
    const live = (p, k) => queue.filter((q) => q.p === p && !q.cancelled && q.card.effect.kind === k);

    // 1. VAR
    const v = [live(0, "var")[0], live(1, "var")[0]];
    if (v[0] && v[1]) {
      v[0].cancelled = v[1].cancelled = true;
      ev.push({ t: "instant", text: "Both VAR reviews cancel each other out" });
    } else
      [0, 1].forEach((p) => {
        const q = v[p];
        if (!q) return;
        const o = 1 - p;
        const tg = queue.filter((x) => x.p === o && !x.cancelled).sort((a, b) => b.card.slots - a.card.slots)[0];
        if (tg) { tg.cancelled = true; ev.push({ t: "instant", who: p, text: "VAR review cancels " + tg.card.name }); }
        else {
          const lc = laneCards(P[o]).slice().sort((a, b) => b.overall - a.overall)[0];
          if (lc) { removeFromLanes(P[o], lc); P[o].discard.push(lc); ev.push({ t: "instant", who: p, text: "VAR voids " + lc.name + " — off the board this round" }); }
          else ev.push({ t: "instant", who: p, text: "VAR finds nothing to review" });
        }
      });
    // 2. Offside trap
    [0, 1].forEach((p) => live(p, "offsideTrap").forEach(() => {
      const o = 1 - p;
      const tg = P[o].board.attack.slice().sort((a, b) => b.atk - a.atk)[0];
      if (tg) { removeFromLanes(P[o], tg); P[o].discard.push(tg); ev.push({ t: "instant", who: p, text: "Offside trap — " + tg.name + " is flagged off" }); }
      else ev.push({ t: "instant", who: p, text: "Offside trap snaps shut on an empty attack" });
    }));
    // 3. Referee
    [0, 1].forEach((p) => live(p, "referee").forEach(() => {
      const o = 1 - p;
      const tg = laneCards(P[o]).slice().sort((a, b) => b.overall - a.overall)[0];
      if (!tg) { ev.push({ t: "instant", who: p, text: "The referee waves play on" }); return; }
      const st = status(P[o], tg);
      if (st.booked) {
        st.red = true;
        removeFromLanes(P[o], tg);
        P[o].exiled.push(tg);
        ev.push({ t: "instant", who: p, red: true, text: "RED CARD — " + tg.name + " is sent off for the rest of the match" });
      } else { st.booked = true; ev.push({ t: "instant", who: p, text: tg.name + " goes into the book (yellow)" }); }
    }));
    // 4. Injury
    [0, 1].forEach((p) => live(p, "injury").forEach(() => {
      const o = 1 - p;
      const tg = laneCards(P[o]).slice().sort((a, b) => b.overall - a.overall)[0];
      if (tg) { status(P[o], tg).injured = true; ev.push({ t: "instant", who: p, text: tg.name + " pulls up injured — −15 ATK/DEF for the match" }); }
    }));
    // 5. Team talk
    [0, 1].forEach((p) => live(p, "teamTalk").forEach(() => {
      Object.values(P[p].cardStatus).forEach((s) => (s.injured = false));
      P[p].pressedNow = 0;
      drawCards(state, p, 2, ev);
      ev.push({ t: "instant", who: p, text: (p === 0 ? "Your" : "Their") + " halftime team talk — debuffs cleared, 2 cards drawn" });
    }));
    // 6. Powers attach
    queue.forEach((q) => {
      if (q.cancelled || q.card.category !== "power") return;
      const k = q.card.effect.kind;
      if (k === "handOfGod") { P[q.p].hogActive = true; P[q.p].hogUsed = true; }
      else if (!P[q.p].powers.some((t) => t.id === q.card.id)) P[q.p].powers.push(q.card);
    });
    // 7. Nutmeg targets
    const nut = [null, null];
    [0, 1].forEach((p) => {
      if (live(p, "nutmeg").length) {
        const chem = chemNations(P[p], T);
        nut[p] = P[p].board.attack
          .filter((c) => c.position === "FWD")
          .sort((a, b) => effStats(state, p, b, chem).a - effStats(state, p, a, chem).a)[0] || null;
      }
    });

    // snapshot boards for the reveal animation (post-instants, pre-cleanup)
    state.lastBoards = [0, 1].map((p) => ({
      attack: P[p].board.attack.slice(),
      defense: P[p].board.defense.slice(),
      tactics: queue.filter((q) => q.p === p).map((q) => ({ card: q.card, cancelled: q.cancelled })),
      formation: P[p].formation,
    }));

    // 8. Totals (formation multipliers applied inside)
    const tot = [sideTotals(state, 0, queue, nut[0]), sideTotals(state, 1, queue, nut[1])];
    state.lastTotals = tot;
    ev.push({ t: "totals", tot });

    const hit = (to, amount, label) => {
      if (amount <= 0) return;
      if (state.stoppage) { amount += T.stoppageBonus; label += " (+" + T.stoppageBonus + " stoppage time)"; }
      P[to].morale -= amount;
      state.roundDamage[1 - to] += amount;
      P[1 - to].dealtTotal += amount;
      ev.push({ t: "damage", to, amount, label });
    };

    // 9. Exchanges (both directions)
    [0, 1].forEach((a) => {
      const d = 1 - a;
      let x = Math.max(0, tot[a].atk - tot[d].def);
      let lbl = "Open play — ATK " + tot[a].atk + " vs DEF " + tot[d].def;
      if (P[a].hogActive && tot[a].atk > 0) { x = tot[a].atk; lbl = "HAND OF GOD — the defense doesn't exist"; }
      if (x > 0) hit(d, x, lbl);
      else ev.push({ t: "blocked", to: d, text: (a === 0 ? "Your" : "Their") + " attack is absorbed — ATK " + tot[a].atk + " vs DEF " + tot[d].def });
      if (nut[a]) {
        const e = effStats(state, a, nut[a], chemNations(P[a], T));
        hit(d, e.a, "Nutmeg — " + nut[a].name + " goes straight through");
      }
      if (live(a, "penalty").length) {
        if (P[a].board.attack.some((c) => c.position === "FWD")) hit(d, 12, "Penalty kick converted");
        else ev.push({ t: "note", text: (a === 0 ? "Your" : "Their") + " penalty is wasted — no FWD in attack" });
      }
      live(a, "longBall").forEach(() => {
        const cheap = P[a].hand.slice().sort((x1, x2) => x1.cost - x2.cost).slice(0, 2);
        cheap.forEach((c) => { P[a].hand = P[a].hand.filter((h) => h !== c); P[a].discard.push(c); });
        hit(d, 8, "Long ball over the top");
      });
    });
    // 10. Counter-attacks (capped — GDD §9)
    [0, 1].forEach((p) => {
      const o = 1 - p;
      if (live(p, "counterAttack").length && tot[p].def >= tot[o].atk) {
        const s = Math.min(T.counterCap, tot[p].def - tot[o].atk);
        if (s > 0) hit(o, s, "Counter-attack on the break (cap " + T.counterCap + ")");
        else ev.push({ t: "note", text: "Counter-attack fizzles — no surplus" });
      }
    });
    // 11. Utility skills
    [0, 1].forEach((p) => {
      const o = 1 - p;
      live(p, "highPress").forEach(() => {
        P[o].pressedNext = 10;
        if (P[o].hand.length) {
          const i = Math.floor(Math.random() * P[o].hand.length);
          const c = P[o].hand.splice(i, 1)[0];
          P[o].discard.push(c);
          ev.push({ t: "note", text: "High press — " + (o === 0 ? "you discard " : "they discard ") + c.name + "; Pressed next round" });
        } else ev.push({ t: "note", text: "High press — " + (o === 0 ? "you are" : "they are") + " Pressed next round" });
      });
      live(p, "timeWasting").forEach(() => {
        P[p].morale = Math.min(T.startMorale, P[p].morale + 5);
        P[o].drawPenaltyNext = 1;
        ev.push({ t: "note", text: (p === 0 ? "You waste" : "They waste") + " time — +5 morale, opponent draws 1 fewer next round" });
      });
    });
    // 12. Momentum
    [0, 1].forEach((p) => {
      if (state.roundDamage[p] > 0) {
        P[p].winStreak++;
        if (P[p].winStreak >= 3) {
          P[p].winStreak = 0;
          P[p].onFormNext = true;
          ev.push({ t: "note", text: (p === 0 ? "You are" : "They are") + " ON FORM — +" + T.momentumBonus + " to both totals next round" });
        }
      } else P[p].winStreak = 0;
    });
    // 13. MVP contribution tracking
    [0, 1].forEach((p) => {
      if (state.roundDamage[p] > 0) {
        const chem = chemNations(P[p], T);
        P[p].board.attack.forEach((c) => { P[p].contrib[c.id] = (P[p].contrib[c.id] || 0) + effStats(state, p, c, chem).a; });
      }
    });
    // 14. Cleanup
    [0, 1].forEach((p) => {
      laneCards(P[p]).forEach((c) => P[p].discard.push(c));
      P[p].board = { attack: [], defense: [] };
      queue.filter((q) => q.p === p).forEach((q) => {
        if (q.card.category === "power" && !q.cancelled) {
          if (q.card.effect.kind === "handOfGod") P[p].exiled.push(q.card);
        } else P[p].discard.push(q.card);
      });
      P[p].tactics = [];
      P[p].hogActive = false;
      P[p].pressedNow = 0;
    });
    // 15. Stoppage time
    if (!state.stoppage && P.some((x) => x.morale <= T.stoppageAt)) {
      state.stoppage = true;
      ev.push({ t: "stoppage" });
    }
    // 16. Win check
    const [A, B] = P;
    if (A.morale <= 0 && B.morale <= 0)
      state.winner = state.roundDamage[0] === state.roundDamage[1] ? "draw" : state.roundDamage[0] > state.roundDamage[1] ? 0 : 1;
    else if (B.morale <= 0) state.winner = 0;
    else if (A.morale <= 0) state.winner = 1;
    state.phase = state.winner != null ? "end" : "roundEnd";
    state.lastEvents = ev;
    return ev;
  }

  // ---------- AI (historic team, formation-aware) ----------
  function aiPlan(state) {
    const T = state.T, P = state.players[1], Y = state.players[0];
    let spent = 0;
    const aff = (c) => P.stamina >= c.cost;
    const find = (k) => P.hand.find((c) => c.type === "tactic" && c.effect.kind === k);
    const playT = (c) => {
      P.stamina -= c.cost; spent += c.cost;
      P.hand = P.hand.filter((x) => x !== c);
      const k = c.effect.kind;
      if (k === "waterBreak") { P.stamina += 3; P.discard.push(c); }
      else if (k === "substitution") {
        const toss = P.hand.filter((x) => x.type === "player" && x.rarity === "common").sort((a, b) => a.cost - b.cost).slice(0, 2);
        toss.forEach((x) => { P.hand = P.hand.filter((h) => h !== x); P.discard.push(x); });
        drawCards(state, 1, toss.length + 1);
        P.discard.push(c);
      } else P.tactics.push(c);
    };
    const placeAI = (c, lane) => {
      P.stamina -= c.cost; spent += c.cost;
      P.hand = P.hand.filter((x) => x !== c);
      P.board[lane].push(c);
    };

    // 0. Formation — preferred shape, switched situationally (GDD §8, §18)
    // Morale thresholds scale with startMorale so tuning the knob keeps the AI sane.
    const M = T.startMorale;
    let form = state.opponent ? state.opponent.preferredFormation : "balanced";
    if (P.morale <= Math.round(M * 0.3)) form = "defensive";
    else if (Y.morale <= Math.round(M * 0.25)) form = "offensive";
    P.formation = form;

    // 1. Water break when the hand is rich
    const handCost = P.hand.filter((c) => c.type === "player").reduce((s, c) => s + c.cost, 0);
    const wb = find("waterBreak");
    if (wb && handCost > P.stamina + 2) playT(wb);
    // 2. Substitution if hand is thin
    const sub = find("substitution");
    if (sub && aff(sub) && P.hand.filter((c) => c.type === "player").length <= 2) playT(sub);
    // 3. Early powers
    if (state.round <= 4)
      ["fortress", "talisman", "totalFootball"].forEach((k) => {
        const c = find(k);
        if (c && aff(c) && P.stamina >= c.cost + 2) playT(c);
      });
    // 4. Stamina split follows the formation
    const mode = form === "offensive" ? 0.7 : form === "defensive" ? 0.4 : 0.55;
    // 5. Reserve stamina for instants in the mid game
    const hasInstants = P.hand.some((c) => c.type === "tactic" && c.category === "instant");
    const reserve = state.round >= 3 && hasInstants ? 2 : 0;
    // 6. Fill attack lane (best ATK per cost), then defense (best DEF per cost)
    const atkBudget = Math.round((P.stamina - reserve) * mode);
    let spentA = 0;
    P.hand.filter((c) => c.type === "player" && c.position !== "GK")
      .sort((a, b) => b.atk / b.cost - a.atk / a.cost)
      .forEach((c) => {
        if (P.hand.includes(c) && spentA + c.cost <= atkBudget && aff(c)) { placeAI(c, "attack"); spentA += c.cost; }
      });
    P.hand.filter((c) => c.type === "player")
      .sort((a, b) => b.def / b.cost - a.def / a.cost)
      .forEach((c) => {
        if (P.hand.includes(c) && aff(c) && P.stamina - c.cost >= reserve) placeAI(c, "defense");
      });
    // 7. Finishers & situational tactical cards
    const pen = find("penalty");
    if (pen && aff(pen) && P.board.attack.some((c) => c.position === "FWD") && (Y.morale <= Math.round(M * 0.2) || state.round >= 7)) playT(pen);
    const lb = find("longBall");
    if (lb && aff(lb) && Y.morale <= Math.round(M * 0.12) && P.hand.filter((c) => c.type === "player").length >= 2) playT(lb);
    const nutT = find("nutmeg");
    if (nutT && aff(nutT) && P.board.attack.some((c) => c.position === "FWD" && c.atk >= 85)) playT(nutT);
    const hog = find("handOfGod");
    if (hog && aff(hog) && !P.hogUsed && Y.morale <= Math.round(M * 0.3) && P.board.attack.length >= 2) playT(hog);
    if (state.round >= 3) { const rf = find("referee"); if (rf && aff(rf)) playT(rf); }
    if (state.round >= 4) { const inj = find("injury"); if (inj && aff(inj)) playT(inj); }
    const off = find("offsideTrap");
    if (off && aff(off) && state.round >= 2 && mode <= 0.55) playT(off);
    const ca = find("counterAttack");
    if (ca && aff(ca) && mode <= 0.45) playT(ca);
    const cat = find("catenaccio");
    if (cat && aff(cat) && mode <= 0.45 && P.board.defense.length >= 2) playT(cat);
    const hp = find("highPress");
    if (hp && aff(hp) && state.round >= 2) playT(hp);
    const tw = find("timeWasting");
    if (tw && aff(tw) && P.morale <= T.startMorale - 10) playT(tw);
    const tt = find("tikiTaka");
    if (tt && aff(tt) && P.board.attack.length >= 3) playT(tt);

    state.aiIntent = { cards: laneCards(P).length + P.tactics.length, stamina: spent, formation: form };
  }

  // ================= THE RUN (GDD §2, §5, §13) =================
  const STAGES = [
    { key: "g1", label: "Group Match 1", short: "G1", stars: 1, tiers: { D: 4, C: 1 } },
    { key: "g2", label: "Group Match 2", short: "G2", stars: 1, tiers: { D: 3, C: 2 } },
    { key: "g3", label: "Group Match 3", short: "G3", stars: 2, tiers: { D: 1, C: 3, B: 1 } },
    { key: "r16", label: "Round of 16", short: "R16", stars: 3, tiers: { C: 2, B: 3 } },
    { key: "qf", label: "Quarter-final", short: "QF", stars: 4, tiers: { B: 3, A: 2 } },
    { key: "sf", label: "Semi-final", short: "SF", stars: 5, tiers: { A: 1 } },
    { key: "final", label: "The Final", short: "FINAL", stars: 6, tiers: { S: 1 } },
  ];

  function weightedPick(items, weightOf) {
    const total = items.reduce((s, it) => s + weightOf(it), 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= weightOf(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  function nextOpponent(run) {
    const st = STAGES[run.matchIndex];
    let pool = D3().TEAMS.filter((t) => st.tiers[t.tier] && !run.defeated.includes(t.id));
    if (st.key === "final") pool = pool.filter((t) => t.isChampion);
    if (!pool.length) pool = D3().TEAMS.filter((t) => st.tiers[t.tier]);
    return weightedPick(pool, (t) => st.tiers[t.tier]);
  }

  // +1 random player, rarity odds rise by stage (GDD §5)
  const REWARD_ODDS = [
    { common: 70, rare: 22, epic: 7, legendary: 1 },   // group
    { common: 55, rare: 28, epic: 13, legendary: 4 },  // r16 / qf
    { common: 40, rare: 30, epic: 22, legendary: 8 },  // sf
  ];
  function rewardPlayer(run) {
    const i = run.matchIndex;
    const odds = i <= 2 ? REWARD_ODDS[0] : i <= 4 ? REWARD_ODDS[1] : REWARD_ODDS[2];
    let r = Math.random() * 100, rarity = "common";
    for (const k of ["common", "rare", "epic", "legendary"]) {
      r -= odds[k];
      if (r <= 0) { rarity = k; break; }
    }
    const have = new Set(run.deck.map((c) => c.id));
    let pool = D().PLAYERS.filter((c) => c.rarity === rarity && !have.has(c.id));
    if (!pool.length) pool = D().PLAYERS.filter((c) => !have.has(c.id));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // choose-1-of-3 tactical card offer (clones, so duplicates stay distinct)
  function tacticalOffers() {
    const pool = D().TACTICS.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3).map((t) => D3().cloneTactical(t));
  }

  // ---------- preset XI ----------
  function byName(n, wc) { return D().PLAYERS.find((c) => c.name === n && (!wc || c.worldCup === wc)); }
  function tByKind(k) { return D().TACTICS.find((t) => t.effect.kind === k); }

  // hungry-but-viable starting XI: 1 legendary, 2 epics, 2 rares, 6 commons + Water Break = 10 slots
  function presetXI() {
    const stars = [
      byName("Lionel Messi", 2022),          // 98 · 3 slots
      byName("Julián Alvarez", 2026),        // 90 · 2
      byName("Emiliano Martínez", 2026),     // 88 GK · 2
      byName("Nicolás Otamendi", 2022),      // 84 · 1
      byName("Enzo Fernández", 2022),        // 85 · 1
    ].filter(Boolean);
    const commons = [
      ["Héctor Herrera", 2022], ["Luis Chávez", 2022], ["César Montes", 2026],
      ["Walker Zimmerman", 2022], ["Nahitan Nández", 2022], ["Sebastián Coates", 2022],
    ].map(([n, y]) => byName(n, y)).filter(Boolean);
    const tac = D3().cloneTactical(tByKind("waterBreak"));
    return { cards: [...stars, ...commons, tac], captainId: stars[0].id };
  }

  window.WCC3E = {
    newMatch, startRound, reveal,
    canPlace, place, recall, playTactic, setFormation,
    effStats, chemNations, status, fmults,
    STAGES, nextOpponent, rewardPlayer, tacticalOffers, presetXI,
  };
})();
