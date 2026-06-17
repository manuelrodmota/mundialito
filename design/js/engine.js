// WORLD CUP CLASH — game engine (pure logic, no UI)
(function () {
  const D = () => window.WCC_DATA;

  // ---------- utils ----------
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor((rng ? rng() : Math.random()) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- squad rolling ----------
  // Rating-band weights per GDD §4
  const BANDS = [
    { min: 68, max: 79, w: 60 },
    { min: 80, max: 84, w: 25 },
    { min: 85, max: 89, w: 10 },
    { min: 90, max: 94, w: 4 },
    { min: 95, max: 99, w: 1 },
  ];

  function rollSquad(picks) {
    const pickedIds = new Set(picks.map((c) => c.id));
    const pool = D().POOL.filter((c) => !pickedIds.has(c.id));
    const rolled = [];
    const usedIds = new Set(pickedIds);
    let guard = 0;
    while (rolled.length < 21 && guard++ < 5000) {
      // pick band by weight
      let r = Math.random() * 100;
      let band = BANDS[0];
      for (const b of BANDS) {
        if (r < b.w) { band = b; break; }
        r -= b.w;
      }
      const candidates = pool.filter(
        (c) => !usedIds.has(c.id) && c.rating >= band.min && c.rating <= band.max
      );
      if (!candidates.length) continue;
      const card = candidates[Math.floor(Math.random() * candidates.length)];
      usedIds.add(card.id);
      rolled.push(card);
    }
    // fill if bands exhausted
    if (rolled.length < 21) {
      for (const c of shuffle(pool)) {
        if (rolled.length >= 21) break;
        if (!usedIds.has(c.id)) { usedIds.add(c.id); rolled.push(c); }
      }
    }
    return rolled;
  }

  // Scripted AI squad: France-flavored, deterministic-ish
  function aiSquad() {
    const pool = D().POOL;
    const byName = (n, wc) => pool.find((c) => c.name === n && (!wc || c.worldCup === wc));
    const picks = [
      byName("Kylian Mbappé", 2026),
      byName("Antoine Griezmann", 2022),
      byName("William Saliba"),
      byName("Aurélien Tchouaméni"),
      byName("Mike Maignan"),
    ].filter(Boolean);
    while (picks.length < 5) picks.push(pool[Math.floor(Math.random() * pool.length)]);
    const rolled = rollSquad(picks);
    return { picks, rolled, captainId: picks[0].id };
  }

  // ---------- match setup ----------
  function newPlayer(squadCards, captainId, T) {
    const deck = shuffle(squadCards.slice());
    // opening hand: captain + 4 random
    const ci = deck.findIndex((c) => c.id === captainId);
    const captain = ci >= 0 ? deck.splice(ci, 1)[0] : null;
    const hand = captain ? [captain] : [];
    while (hand.length < T.openingHand && deck.length) hand.push(deck.shift());
    return {
      morale: T.startMorale,
      maxStamina: 0,
      stamina: 0,
      tempoNext: 0,
      deck,
      hand,
      used: [],
      captainId,
      winStreak: 0,
      momentumReady: false,
      lostLast: false,
      fatigue: 0,
      mulliganed: false,
    };
  }

  function newMatch(playerSquad, playerCaptainId, tuning) {
    const T = Object.assign(
      { startMorale: 50, openingHand: 5, handCap: 8, staminaCap: 10, stoppageAt: 10, momentumBonus: 4, prideBonus: 2 },
      tuning || {}
    );
    const ai = aiSquad();
    const home = Math.random() < 0.5 ? 0 : 1;
    const state = {
      T,
      round: 0,
      home,
      stoppage: false,
      players: [
        newPlayer(playerSquad, playerCaptainId, T),
        newPlayer(ai.picks.concat(ai.rolled), ai.captainId, T),
      ],
      committed: [null, null],
      phase: "mulligan", // mulligan → commit → reveal → end
      winner: null,
      log: [],
      lastDuel: null,
      aiInfo: ai,
    };
    return state;
  }

  function mulligan(state, keepIds) {
    const p = state.players[0];
    const keep = p.hand.filter((c) => c.id === p.captainId || keepIds.includes(c.id));
    const back = p.hand.filter((c) => !keep.includes(c));
    p.deck = shuffle(p.deck.concat(back));
    while (keep.length < state.T.openingHand && p.deck.length) keep.push(p.deck.shift());
    p.hand = keep;
    p.mulliganed = true;
    // AI auto-mulligan: throw back cards costing 4+ except captain
    const a = state.players[1];
    const aKeep = a.hand.filter((c) => c.id === a.captainId || c.cost <= 3);
    const aBack = a.hand.filter((c) => !aKeep.includes(c));
    a.deck = shuffle(a.deck.concat(aBack));
    while (aKeep.length < state.T.openingHand && a.deck.length) aKeep.push(a.deck.shift());
    a.hand = aKeep;
    startRound(state);
  }

  // ---------- round flow ----------
  function drawCard(state, idx, events) {
    const p = state.players[idx];
    if (p.deck.length === 0) {
      p.fatigue += 1;
      const dmg = 1 + p.fatigue; // 2, 3, 4...
      p.morale -= dmg;
      events && events.push({ type: "fatigue", who: idx, amount: dmg });
      return null;
    }
    const card = p.deck.shift();
    if (p.hand.length >= state.T.handCap) {
      p.used.push(card);
      events && events.push({ type: "burn", who: idx, card });
      return null;
    }
    p.hand.push(card);
    return card;
  }

  function startRound(state) {
    state.round += 1;
    state.phase = "commit";
    state.committed = [null, null];
    const events = [];
    state.players.forEach((p, idx) => {
      let max = Math.min(state.T.staminaCap, state.round + 2);
      if (state.round === 1 && state.home === idx) max += 1;
      max += p.tempoNext;
      p.tempoNext = 0;
      p.maxStamina = Math.min(state.T.staminaCap, max);
      p.stamina = p.maxStamina;
      drawCard(state, idx, events);
    });
    state.roundEvents = events;
    checkWin(state, null);
    return events;
  }

  function affordable(state, idx) {
    const p = state.players[idx];
    const ok = p.hand.filter((c) => c.cost <= p.stamina);
    return ok.length ? ok : p.hand.slice().sort((a, b) => a.cost - b.cost).slice(0, 1); // forced cheapest
  }

  // ---------- effective rating ----------
  function effective(state, idx, card) {
    const p = state.players[idx];
    const parts = [{ label: "Base", v: card.rating }];
    let total = card.rating;
    const captain = p.hand.concat(p.used, p.deck, [card]).find((c) => c.id === p.captainId);
    const captainNation = captain ? captain.nation : null;
    if (captainNation && card.nation === captainNation && card.nation !== "—") {
      total += state.T.prideBonus; parts.push({ label: "Captain's pride", v: state.T.prideBonus });
    }
    const ab = card.ability || { kind: "none" };
    if (ab.kind === "Clutch" && p.morale <= 15) { total += ab.n; parts.push({ label: "Clutch", v: ab.n }); }
    if (ab.kind === "Counter" && p.lostLast) { total += ab.n; parts.push({ label: "Counter", v: ab.n }); }
    if (p.momentumReady) { total += state.T.momentumBonus; parts.push({ label: "On form", v: state.T.momentumBonus }); }
    return { total, parts };
  }

  // ---------- duel resolution ----------
  function resolveDuel(state) {
    const [ca, cb] = state.committed;
    const T = state.T;
    const events = [];
    const pa = state.players[0], pb = state.players[1];

    // on-play effects
    [ca, cb].forEach((card, idx) => {
      const p = state.players[idx];
      p.stamina -= Math.min(card.cost, p.stamina);
      const ab = card.ability || {};
      if (card.position === "MID" || ab.kind === "Tempo") {
        let n = (card.position === "MID" ? 1 : 0) + (ab.kind === "Tempo" ? 1 : 0);
        p.tempoNext += n;
        events.push({ type: "tempo", who: idx, n });
      }
      if (ab.kind === "Vision") {
        drawCard(state, idx, events);
        events.push({ type: "vision", who: idx });
      }
    });

    const redA = ca.ability && ca.ability.kind === "RedCard";
    const redB = cb.ability && cb.ability.kind === "RedCard";

    const ea = effective(state, 0, ca);
    const eb = effective(state, 1, cb);
    // GK / RedCard: rating 0 for dealing
    const dealA = ca.position === "GK" || redA ? 0 : ea.total;
    const dealB = cb.position === "GK" || redB ? 0 : eb.total;

    const duel = {
      cards: [ca, cb],
      eff: [ea, eb],
      deal: [dealA, dealB],
      winner: null,
      loser: null,
      damage: 0,
      breakdown: [],
      tie: false,
      events,
    };

    // momentum consumed on play
    [pa, pb].forEach((p) => { if (p.momentumReady) p.momentumReady = false; });

    // Red card: discard + no damage either way
    if (redA || redB) {
      if (redA && pb.hand.length) {
        const i = Math.floor(Math.random() * pb.hand.length);
        const disc = pb.hand.splice(i, 1)[0];
        pb.used.push(disc);
        events.push({ type: "discard", who: 1, card: disc });
      }
      if (redB && pa.hand.length) {
        const i = Math.floor(Math.random() * pa.hand.length);
        const disc = pa.hand.splice(i, 1)[0];
        pa.used.push(disc);
        events.push({ type: "discard", who: 0, card: disc });
      }
      duel.tie = true;
      duel.breakdown.push("Red card — no duel damage this round");
      finishDuel(state, duel, null, null, 0);
      return duel;
    }

    if (dealA === dealB) {
      // tie — Penalty wins it
      const penA = ca.ability && ca.ability.kind === "Penalty";
      const penB = cb.ability && cb.ability.kind === "Penalty";
      if (penA !== penB) {
        const w = penA ? 0 : 1, l = 1 - w;
        duel.breakdown.push("Tie broken by Penalty — 5 damage");
        applyDamage(state, duel, w, l, 5, true);
      } else {
        duel.tie = true;
        duel.breakdown.push("Dead even — no damage");
        finishDuel(state, duel, null, null, 0);
      }
      return duel;
    }

    const w = dealA > dealB ? 0 : 1;
    const l = 1 - w;
    const wCard = duel.cards[w], lCard = duel.cards[l];
    const wP = state.players[w], lP = state.players[l];
    let dmg = Math.abs(dealA - dealB);
    duel.breakdown.push(`Rating gap ${dmg}`);

    // Clinical (+): FWD role +2, Clinical keyword +N
    if (wCard.position === "FWD") { dmg += 2; duel.breakdown.push("Clinical instinct +2"); }
    if (wCard.ability && wCard.ability.kind === "Clinical") { dmg += wCard.ability.n; duel.breakdown.push(`Clinical +${wCard.ability.n}`); }
    // Resilient (−): DEF role −3, Resilient keyword −N, Wall keyword −N
    if (lCard.position === "DEF") { dmg -= 3; duel.breakdown.push("Resilient −3"); }
    if (lCard.ability && lCard.ability.kind === "Resilient") { dmg -= lCard.ability.n; duel.breakdown.push(`Resilient −${lCard.ability.n}`); }
    if (lCard.ability && lCard.ability.kind === "Wall") { dmg -= lCard.ability.n; duel.breakdown.push(`Wall −${lCard.ability.n}`); }
    // GK save: negate entirely
    let saved = false;
    if (lCard.position === "GK") { saved = true; duel.breakdown.push("The save — all damage prevented"); }
    // Stoppage time
    if (state.stoppage) { dmg += 2; duel.breakdown.push("Stoppage time +2"); }
    dmg = Math.max(0, dmg);
    if (saved) dmg = 0;

    applyDamage(state, duel, w, l, dmg, false);
    return duel;
  }

  function applyDamage(state, duel, w, l, dmg, fromTie) {
    const lP = state.players[l], wP = state.players[w];
    lP.morale -= dmg;
    duel.winner = w; duel.loser = l; duel.damage = dmg;
    // momentum
    wP.winStreak += 1;
    lP.winStreak = 0;
    if (wP.winStreak >= 3) { wP.winStreak = 0; wP.momentumReady = true; duel.events.push({ type: "onform", who: w }); }
    wP.lostLast = false;
    lP.lostLast = true;
    finishDuel(state, duel, w, l, dmg);
  }

  function finishDuel(state, duel, w, l, dmg) {
    // stoppage trigger
    if (!state.stoppage && state.players.some((p) => p.morale <= state.T.stoppageAt)) {
      state.stoppage = true;
      duel.events.push({ type: "stoppage" });
    }
    // move to used
    state.committed.forEach((c, idx) => { if (c) state.players[idx].used.push(c); });
    state.lastDuel = duel;
    checkWin(state, duel);
    state.phase = state.winner == null ? "reveal" : "end";
  }

  function checkWin(state, duel) {
    const [a, b] = state.players;
    if (a.morale <= 0 && b.morale <= 0) {
      state.winner = duel && duel.winner != null ? duel.winner : "draw";
    } else if (a.morale <= 0) state.winner = 1;
    else if (b.morale <= 0) state.winner = 0;
    if (state.winner != null) state.phase = "end";
  }

  // ---------- scripted AI commit ----------
  // Predictable demo opponent:
  //  - estimates your play as a mid-rating affordable card
  //  - early rounds (1-3): lowest-rated affordable card
  //  - has lethal? plays its strongest affordable
  //  - holds 93+ icons until round 7+ unless lethal
  function aiCommit(state) {
    const me = state.players[1], you = state.players[0];
    const options = affordable(state, 1);
    const sorted = options.slice().sort((a, b) => a.rating - b.rating);
    const best = sorted[sorted.length - 1];
    const worst = sorted[0];
    // lethal check: best deal vs typical defense
    const bestEff = effective(state, 1, best).total;
    const typicalYou = 78;
    const estDmg = Math.max(0, bestEff - typicalYou) + (best.position === "FWD" ? 2 : 0) + (state.stoppage ? 2 : 0);
    if (you.morale <= estDmg && best.position !== "GK") return best;
    if (state.round <= 3) return worst;
    // mid game: best non-icon affordable
    const nonIcon = sorted.filter((c) => c.rating < 93 && c.position !== "GK");
    if (state.round < 7 && nonIcon.length) return nonIcon[nonIcon.length - 1];
    // late game: strongest
    const nonGK = sorted.filter((c) => c.position !== "GK");
    return (nonGK.length ? nonGK[nonGK.length - 1] : best);
  }

  function commitAndResolve(state, playerCard) {
    state.committed = [playerCard, aiCommit(state)];
    const p = state.players[0];
    p.hand = p.hand.filter((c) => c.id !== playerCard.id);
    const a = state.players[1];
    a.hand = a.hand.filter((c) => c.id !== state.committed[1].id);
    return resolveDuel(state);
  }

  window.WCC_ENGINE = {
    rollSquad,
    aiSquad,
    newMatch,
    mulligan,
    startRound,
    affordable,
    effective,
    commitAndResolve,
  };
})();
