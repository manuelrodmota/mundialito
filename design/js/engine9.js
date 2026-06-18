// WORLD CUP CLASH v10 — the 90-minute match, balance pass (GDD v10 §4, §6, §7, §14, §15, §17)
// v10 changes vs v8 (the Monte-Carlo balance pass — quality now beats quantity):
//   • GENTLE PER-ROUND FIELD COST — the stamina to field a card is flattened to common 2 / rare 2 /
//     epic 3 / legendary 4 (deck-build SLOT costs unchanged), so premium decks can put 3–4 bodies on the pitch.
//   • STAR-CORE STAMINA DISCOUNT — in a lane with ≥1 premium, the most-expensive card pays full and every
//     other card in that lane is half-price (floor, min 1). An all-common lane gets no discount.
//   • DIMINISHING RETURNS ON LANE STACKING — a lane's contributions are sorted high→low and weighted
//     [1.00, 0.85, 0.70, 0.55, 0.40, 0.25], so the 4th–5th body adds little. A few strong cards beat a wall.
//   • RETUNED xG CURVE — /210 slope, 0.50 cap (was /150, 0.60) holds scoring to a lively ~5–6 goals/match.
//   • SUDDEN-DEATH EXTRA TIME — golden goal now resolves true sudden death: only the side that creates the
//     bigger chance can bank in a passage, so level games end in a round or two instead of trading into a marathon.
// v9 (deck build, see Builder9): the slot budget buys a PREMIUM core; the bench auto-fills with RANDOM commons.
// Carried over from v8/v7: minimum 5-card hand; ≤2 Tactical plays / half (4/match, single-use EXILED);
//   premium players LOCK until halftime / ET; 90' → 3-goal MERCY or most goals at full time.
// Pure logic, no UI. Reuses run-level helpers (STAGES, opponents, rewards) from engine3 (WCC3E).

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
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r2 = (v) => Math.round(v * 100) / 100;

  // ---- v10 balance constants (GDD §4, §6, §7, §15, §17) ----
  // Per-round stamina to FIELD a card — gentle curve, by rarity (slot costs are unchanged, see data2).
  const FIELD_COST = { common: 2, rare: 2, epic: 3, legendary: 4 };
  // Non-anchor cards in a lane holding ≥1 premium pay this fraction (floor, min 1).
  const STAR_DISCOUNT = 0.5;
  // Diminishing returns: a lane's contributions, sorted high→low, are weighted by these.
  const STACK_WEIGHTS = [1.00, 0.85, 0.70, 0.55, 0.40, 0.25];

  // The per-round field cost of one card (players by rarity; tacticals keep their own cost).
  function fieldCostOf(card) {
    if (!card) return 0;
    if (card.type === "tactic") return card.cost;
    return FIELD_COST[card.rarity] != null ? FIELD_COST[card.rarity] : card.cost;
  }
  // Exposed so the card UI can show the gentle field cost without forking the card component.
  window.fieldCostOf = fieldCostOf;

  // Stamina a single lane costs, applying the star-core discount (GDD §6).
  function laneStaminaCost(cards) {
    if (!cards || !cards.length) return 0;
    const hasPremium = cards.some((c) => c.rarity !== "common");
    let anchor = cards[0];
    cards.forEach((c) => { if (fieldCostOf(c) > fieldCostOf(anchor)) anchor = c; });
    let total = 0;
    cards.forEach((c) => {
      const base = fieldCostOf(c);
      total += (hasPremium && c !== anchor) ? Math.max(1, Math.floor(base * STAR_DISCOUNT)) : base;
    });
    return total;
  }
  // Total per-round stamina the player has committed to the pitch (both lanes, discounted).
  function playerStaminaSpent(P) {
    return laneStaminaCost(P.board.attack) + laneStaminaCost(P.board.defense);
  }
  // Marginal stamina to add `card` to a lane (accounts for how the discount shifts).
  function marginalCost(P, card, lane) {
    const before = laneStaminaCost(P.board[lane]);
    const after = laneStaminaCost([...P.board[lane], card]);
    return after - before;
  }
  // Derive remaining stamina from the committed lanes + tactical spend (the discount is holistic,
  // so we recompute rather than decrement per card).
  function recompStamina(P) {
    P.stamina = Math.max(0, P.maxStamina + P.tacticBonus - playerStaminaSpent(P) - P.tacticSpent);
  }

  // v10: combine a lane's per-card contributions with diminishing returns — sort high→low and weight,
  // so the 4th–5th body in a lane adds little (GDD §7, §17).
  function laneStack(contribs) {
    const s = contribs.slice().sort((a, b) => b - a);
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += s[i] * (i < STACK_WEIGHTS.length ? STACK_WEIGHTS[i] : 0);
    return sum;
  }

  // ---- tuning (GDD §15 — every value is a knob) ----
  const DEF_T = {
    mercyLead: 3, roundCap: 10, halftimeRound: 5,
    etRoundCap: 5, etXgMult: 2,
    xgFloor: 0.05, xgSlope: 210, xgCap: 0.50,
    // v8: draw back UP TO handSize each round (minimum hand 5); handCap is a soft ceiling so bonus
    //   draws (Team Talk +2, Substitution +1) aren't tossed. tacticalsPerHalf caps tactical PLAYS.
    openingHand: 5, handSize: 5, handCap: 12, tacticalsPerHalf: 2,
    // v5: stamina ramps for late escalation — base (R1–5), +2 (R6–8), +4 (R9–10)
    staminaPerRound: 8, slotBudget: 10,
    // v5: per-round player-card cap — base (R1–5), +1 (R6–8), +2 (R9–10)
    cardCapBase: 4,
    // v5: each card contributes stat × rarityMult to its lane (§4)
    rarityMult: { common: 1.0, rare: 1.1, epic: 1.2, legendary: 1.3 },
    prideBonus: 2, chemBonus: 2, formationSwing: 25,
    fatigueMax: 30, fatigueDiv: 60, fatigueRate: 3, pressFatigue: 6, pressDef: 10,
    counterXg: 0.40, momentumXg: 0.10, tikiTakaXg: 0.20,
    longBallXg: 0.45, penaltyXg: 0.85, hogXg: 1.0,
    fortressDef: 8, gkSaveXg: 0.06,
    intent: true,
  };

  // v5 ramps (GDD §6, §15) — keyed off the (tunable) base values; extra time runs at the top tier
  function staminaFor(T, round, extraTime) {
    const base = T.staminaPerRound;
    if (extraTime) return base + 4;
    return round <= 5 ? base : round <= 8 ? base + 2 : base + 4;
  }
  function cardCapFor(T, round, extraTime) {
    const base = T.cardCapBase;
    if (extraTime) return base + 2;
    return round <= 5 ? base : round <= 8 ? base + 1 : base + 2;
  }
  function rarityMultOf(T, rarity) {
    return (T.rarityMult && T.rarityMult[rarity] != null) ? T.rarityMult[rarity] : 1;
  }

  function fmults(T, f) {
    const s = T.formationSwing / 100;
    if (f === "offensive") return { a: 1 + s, d: 1 - s };
    if (f === "defensive") return { a: 1 - s, d: 1 + s };
    return { a: 1, d: 1 };
  }

  // ---- player-gated tacticals (GDD §12) ----
  const GATES = {
    offsideTrap: { pos: "DEF", n: 1, where: "lineup" },
    tikiTaka: { pos: "MID", n: 2, where: "lineup" },
    catenaccio: { pos: "DEF", n: 2, where: "lineup" },
    counterAttack: { pos: "FWD", n: 1, where: "lineup" },
    highPress: { pos: ["FWD", "MID"], n: 2, where: "lineup" },
    longBall: { pos: "FWD", n: 1, where: "attack" },
    nutmeg: { pos: "FWD", n: 1, where: "attack" },
    penalty: { pos: "FWD", n: 1, where: "attack" },
    handOfGod: { pos: "FWD", n: 1, where: "attack" },
  };
  function gateText(g) {
    const pos = Array.isArray(g.pos) ? g.pos.join("/") : g.pos;
    return "Needs " + (g.n > 1 ? g.n + " " + pos : "a " + pos) +
      (g.where === "attack" ? " in your attack lane" : " in your lineup");
  }
  function gateMet(P, kind) {
    const g = GATES[kind];
    if (!g) return true;
    const pool = g.where === "attack" ? P.board.attack : [...P.board.attack, ...P.board.defense];
    const n = pool.filter((c) => (Array.isArray(g.pos) ? g.pos.includes(c.position) : c.position === g.pos)).length;
    return n >= g.n;
  }
  function canPlayTactic(state, p, card) {
    const P = state.players[p];
    if (state.phase !== "plan") return { ok: false, why: "Planning is over" };
    if (card.effect.kind === "handOfGod" && P.hogUsed) return { ok: false, why: "Once per match — already used" };
    // v8: at most 2 tactical PLAYS per half (4 per match)
    if (P.tacticsThisHalf >= state.T.tacticalsPerHalf) return { ok: false, why: "Tactical limit reached — " + state.T.tacticalsPerHalf + " per half" };
    if (P.stamina < card.cost) return { ok: false, why: "Not enough stamina" };
    if (!gateMet(P, card.effect.kind)) return { ok: false, why: gateText(GATES[card.effect.kind]) };
    return { ok: true };
  }

  function newPlayer(cards, captainId, T) {
    const cap = cards.find((c) => c.id === captainId);
    return {
      goals: 0, xg: 0, xgTotal: 0, etXg: 0, fatigue: 0, scoredFirstAt: null,
      stamina: 0, maxStamina: 0,
      draw: shuffle(cards), hand: [], discard: [], locked: [], exiled: [],
      board: { attack: [], defense: [] }, tactics: [], powers: [],
      captainId, captainNation: cap ? cap.nation : null,
      formation: "balanced",
      winStreak: 0, onFormNow: false, onFormNext: false,
      pressedNow: 0, pressedNext: 0, pressFatigueNext: 0,
      floorZeroNow: false, floorZeroNext: false,
      tacticsThisHalf: 0,   // v8: tactical PLAYS used this half; cap = T.tacticalsPerHalf; reset at HT / ET
      tacticSpent: 0, tacticBonus: 0,   // v10: per-round stamina spent on / gained from tacticals (Water Break +2)
      drawPenaltyNext: 0, bonusStaminaNext: 0,
      cardStatus: {}, hogUsed: false, hogActive: false,
      contrib: {},
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
      T, round: 0, phase: "plan", winner: null, capReason: null,
      extraTime: false, etRound: 0, justEnteredET: false,
      opponent: team,
      players: [newPlayer(playerCards, captainId, T), newPlayer(ai.cards, ai.captainId, T)],
      aiIntent: null, reactions: [], lastEvents: [], lastBoards: null, lastTotals: null,
      offsideZeroed: [null, null],
      prev: { xg: [0, 0], goals: [0, 0], fatigue: [0, 0] },
      roundXg: [0, 0], roundGoals: [0, 0],
    };
    state.players[1].formation = team.preferredFormation;
    startRound(state);
    return state;
  }

  // v7 win ladder: 3-goal mercy → most goals at full time → golden-goal extra time (GDD §14).
  // Safety only: if extra time is still level after etRoundCap rounds, higher accumulated ET xG wins.
  function decideExtraTime(state) {
    const [A, B] = state.players;
    if (A.etXg !== B.etXg) {
      state.winner = A.etXg > B.etXg ? 0 : 1;
      state.capReason = "extra time stays level — decided on the run of play (" + r2(A.etXg) + " vs " + r2(B.etXg) + " xG)";
    } else {
      state.winner = (A.scoredFirstAt || 99) <= (B.scoredFirstAt || 99) ? 0 : 1;
      state.capReason = "dead level after extra time — the first goal of the night decides it";
    }
  }

  // Level at full time → a fresh golden-goal sprint: meters reset, locked stars + fatigue refreshed (GDD §14).
  function beginExtraTime(state) {
    const T = state.T;
    state.extraTime = true; state.etRound = 0; state.justEnteredET = true;
    state.players.forEach((P) => {
      P.xg = 0; P.etXg = 0; P.fatigue = 0;
      P.tacticsThisHalf = 0;   // v8: tactical allowance refreshes for extra time
      P.draw = shuffle([...P.draw, ...P.locked]);
      P.locked = [];
    });
  }

  function startRound(state) {
    if (state.winner != null) return;
    const T = state.T;
    state.justEnteredET = false;
    if (state.extraTime) state.etRound++;
    else state.round++;
    state.roundXg = [0, 0];
    state.roundGoals = [0, 0];
    state.reactions = [];
    state.offsideZeroed = [null, null];
    state.players.forEach((P, idx) => {
      P.board = { attack: [], defense: [] };
      P.tactics = [];
      P.pressedNow = P.pressedNext; P.pressedNext = 0;
      // Pressed also tires the back line (GDD §11)
      if (P.pressFatigueNext) {
        P.fatigue = clamp(P.fatigue + P.pressFatigueNext, 0, T.fatigueMax);
        P.pressFatigueNext = 0;
      }
      P.onFormNow = P.onFormNext; P.onFormNext = false;
      P.floorZeroNow = P.floorZeroNext; P.floorZeroNext = false;
      // v5: stamina ramps with the match — 8 (R1–5) → 10 (R6–8) → 12 (R9–10); extra time at the top tier (GDD §6)
      P.maxStamina = staminaFor(T, state.round, state.extraTime) + P.bonusStaminaNext;
      P.bonusStaminaNext = 0;
      // v10: stamina is derived from the (discounted) committed lanes + tactical spend each round
      P.tacticSpent = 0; P.tacticBonus = 0;
      recompStamina(P);
      if (state.round === 1 && !state.extraTime) {
        const ci = P.draw.findIndex((c) => c.id === P.captainId);
        if (ci >= 0) P.hand.push(P.draw.splice(ci, 1)[0]);
        drawCards(state, idx, T.openingHand - P.hand.length);
      } else {
        // v8: refill the hand back UP TO handSize (minimum hand 5), minus any draw penalty (Time Wasting)
        drawCards(state, idx, Math.max(0, T.handSize - P.hand.length - P.drawPenaltyNext));
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
  function laneCount(P) { return P.board.attack.length + P.board.defense.length; }
  function canPlace(state, card, lane) {
    const P = state.players[0];
    if (state.phase !== "plan" || card.type !== "player" || !P.hand.includes(card)) return false;
    if (card.position === "GK" && lane === "attack") return false;
    // v5: per-round player-card cap (attack + defense combined) — tacticals don't count (GDD §6)
    if (laneCount(P) >= cardCapFor(state.T, state.round, state.extraTime)) return false;
    // v10: the marginal stamina (after the star-core discount) must fit (GDD §6)
    return marginalCost(P, card, lane) <= P.stamina;
  }
  function place(state, card, lane) {
    if (!canPlace(state, card, lane)) return false;
    const P = state.players[0];
    P.hand = P.hand.filter((c) => c !== card);
    P.board[lane].push(card);
    recompStamina(P);
    return true;
  }
  function recall(state, card) {
    if (state.phase !== "plan") return;
    const P = state.players[0];
    if (laneCards(P).includes(card)) {
      removeFromLanes(P, card);
      P.hand.push(card);
      recompStamina(P);
    } else if (P.tactics.includes(card)) {
      P.tactics = P.tactics.filter((c) => c !== card);
      P.hand.push(card);
      P.tacticSpent = Math.max(0, P.tacticSpent - card.cost);
      recompStamina(P);
    }
  }

  // Tactical cards are face-up the moment they're played (GDD §7, §10).
  // The AI sees yours land and may answer — that's the telegraphing game.
  function playTactic(state, card, opts) {
    const P = state.players[0];
    if (card.type !== "tactic" || !P.hand.includes(card)) return false;
    const chk = canPlayTactic(state, 0, card);
    if (!chk.ok) return false;
    const k = card.effect.kind;
    P.tacticSpent += card.cost;
    P.hand = P.hand.filter((c) => c !== card);
    P.tacticsThisHalf += 1;   // v8: counts toward the 2-per-half cap
    if (k === "waterBreak") {
      P.fatigue = 0; P.tacticBonus += 2; P.exiled.push(card);
      recompStamina(P);
      return true;
    }
    if (k === "substitution") {
      const ids = (opts && opts.discardIds) || [];
      const toss = P.hand.filter((c) => ids.includes(c.id)).slice(0, 2);
      toss.forEach((c) => { P.hand = P.hand.filter((x) => x !== c); P.discard.push(c); });
      drawCards(state, 0, toss.length + 1);
      P.fatigue = clamp(P.fatigue - 8, 0, state.T.fatigueMax);
      P.exiled.push(card);
      recompStamina(P);
      return true;
    }
    if (k === "handOfGod") P.hogUsed = true;
    P.tactics.push(card);
    recompStamina(P);
    aiReact(state, card);
    return true;
  }

  // AI answers a telegraphed big swing with VAR if it can (GDD §10, §18)
  function aiReact(state, card) {
    const A = state.players[1];
    const big = card.slots >= 2 || ["penalty", "offsideTrap", "catenaccio", "nutmeg"].includes(card.effect.kind);
    if (!big) return;
    if (A.tactics.some((t) => t.effect.kind === "var")) return;
    const varCard = A.hand.find((c) => c.type === "tactic" && c.effect.kind === "var");
    if (!varCard || A.stamina < varCard.cost) return;
    A.tacticSpent += varCard.cost;
    A.hand = A.hand.filter((c) => c !== varCard);
    A.tactics.push(varCard);
    recompStamina(A);
    state.reactions.push("They answer your " + card.name + " with VAR Review");
    if (state.aiIntent) {
      state.aiIntent.cards += 1;
      state.aiIntent.stamina += varCard.cost;
    }
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
    // v5: each card contributes stat × rarityMult to its lane — stars visibly pop (GDD §4)
    const rm = rarityMultOf(T, card.rarity);
    a *= rm; d *= rm;
    let b = 0;
    if (card.nation === P.captainNation) b += T.prideBonus;
    if (P.powers.some((t) => t.effect.kind === "talisman") && card.nation === P.captainNation) b += 3;
    if (chem.has(card.nation)) b += T.chemBonus;
    if (card.position !== "GK") a += b;
    d += b;
    return { a: Math.max(0, a), d: Math.max(0, d) };
  }

  // GDD §7 order: synergies → formation → fatigue → (tacticals act on the xG step)
  function sideTotals(state, p, queue, nutmegCard) {
    const P = state.players[p], T = state.T;
    const notes = [];
    const chem = chemNations(P, T);
    const has = (k) => queue.some((q) => q.p === p && !q.cancelled && q.card.effect.kind === k);
    const tf = P.powers.some((t) => t.effect.kind === "totalFootball");
    const zeroId = state.offsideZeroed[p];
    const atkContribs = [], defContribs = [];
    let rarityUpA = 0, rarityUpD = 0;
    let atkBodies = 0, defBodies = 0;
    P.board.attack.forEach((c) => {
      if (c.id === zeroId || c === nutmegCard) return;
      const e = effStats(state, p, c, chem);
      atkContribs.push(e.a);
      atkBodies++;
      rarityUpA += c.atk * (rarityMultOf(T, c.rarity) - 1);
      if (tf) defContribs.push(e.d / 2);
    });
    P.board.defense.forEach((c) => {
      const e = effStats(state, p, c, chem);
      defContribs.push(e.d);
      defBodies++;
      rarityUpD += c.def * (rarityMultOf(T, c.rarity) - 1);
      if (tf) atkContribs.push(e.a / 2);
    });
    // v10: diminishing returns fold the lane's contributions down before synergies (GDD §7)
    let atk = laneStack(atkContribs);
    let def = laneStack(defContribs);
    if (tf) notes.push("Total Football: cross-lane spillover");
    if (atkBodies >= 4 || defBodies >= 4) notes.push("Crowded lane — extra bodies add little (diminishing returns)");
    if (rarityUpA >= 1 || rarityUpD >= 1) {
      const bits = [];
      if (rarityUpA >= 1) bits.push("+" + Math.round(rarityUpA) + " ATK");
      if (rarityUpD >= 1) bits.push("+" + Math.round(rarityUpD) + " DEF");
      notes.push("Star quality (rarity): " + bits.join(" / "));
    }
    if (chem.size) notes.push("Chemistry +" + T.chemBonus + "/+" + T.chemBonus + " (" + [...chem].join(", ") + ")");
    const fwds = P.board.attack.filter((c) => c.position === "FWD" && c.id !== zeroId).length;
    if (fwds >= 2) { atk += 5; notes.push("Strike partnership +5 ATK"); }
    const defs = P.board.defense.filter((c) => c.position === "DEF").length;
    if (defs >= 3) { def += 8; notes.push("Back line +8 DEF"); }
    const mids = laneCards(P).filter((c) => c.position === "MID").length;
    if (mids >= 2) { P.bonusStaminaNext += 1; notes.push("Midfield engine: +1 stamina next round"); }
    if (P.powers.some((t) => t.effect.kind === "fortress")) { def += T.fortressDef; notes.push("Fortress +" + T.fortressDef + " DEF"); }
    if (P.pressedNow) { def = Math.max(0, def - P.pressedNow); notes.push("Pressed −" + P.pressedNow + " DEF"); }
    const f = fmults(T, P.formation);
    const meta = D3().FORMATION_META[P.formation];
    if (P.formation !== "balanced")
      notes.push(meta.label + " (" + meta.shape + "): ATK ×" + f.a.toFixed(2) + " · DEF ×" + f.d.toFixed(2));
    let atkEff = Math.round(atk * f.a);
    let defEff = Math.round(def * f.d);
    // fatigue saps the back line (GDD §8)
    if (P.fatigue > 0) {
      const mult = 1 - P.fatigue / T.fatigueDiv;
      defEff = Math.round(defEff * mult);
      notes.push("Fatigue " + P.fatigue + ": DEF ×" + mult.toFixed(2));
    }
    // GK save quality — flat xG suppression on the opponent (GDD §7)
    const gks = P.board.defense.filter((c) => c.position === "GK").length;
    const gkSave = r2(gks * T.gkSaveXg);
    if (gks) notes.push("Keeper: −" + gkSave.toFixed(2) + " opponent xG");
    return { atk: atkEff, def: defEff, gkSave, formation: P.formation, notes };
  }

  // ---------- reveal & resolve (GDD §10) ----------
  function reveal(state) {
    if (state.phase !== "plan") return [];
    const T = state.T, P = state.players, ev = [];
    state.prev = {
      xg: [P[0].xg, P[1].xg],
      goals: [P[0].goals, P[1].goals],
      fatigue: [P[0].fatigue, P[1].fatigue],
    };
    const queue = [];
    [0, 1].forEach((p) => P[p].tactics.forEach((c) => queue.push({ p, card: c, cancelled: false, wasted: false })));
    const live = (p, k) => queue.filter((q) => q.p === p && !q.cancelled && !q.wasted && q.card.effect.kind === k);

    // re-validate role gates against the revealed lineup — recalled players void the card
    queue.forEach((q) => {
      if (!gateMet(P[q.p], q.card.effect.kind)) {
        q.wasted = true;
        ev.push({ t: "note", text: (q.p === 0 ? "Your " : "Their ") + q.card.name + " is wasted — " + gateText(GATES[q.card.effect.kind]).toLowerCase() });
      }
    });

    // 1. VAR — cancel one opposing tactical card
    const v = [live(0, "var")[0], live(1, "var")[0]];
    if (v[0] && v[1]) {
      v[0].cancelled = v[1].cancelled = true;
      ev.push({ t: "instant", text: "Both VAR reviews cancel each other out" });
    } else
      [0, 1].forEach((p) => {
        const q = v[p];
        if (!q) return;
        const o = 1 - p;
        const tg = queue.filter((x) => x.p === o && !x.cancelled && !x.wasted).sort((a, b) => b.card.slots - a.card.slots)[0];
        if (tg) { tg.cancelled = true; ev.push({ t: "instant", who: p, text: "VAR review overturns " + tg.card.name }); }
        else ev.push({ t: "instant", who: p, text: "VAR finds nothing to overturn" });
      });
    // 2. Offside trap — their best attacker contributes 0 xG this round
    [0, 1].forEach((p) => live(p, "offsideTrap").forEach(() => {
      const o = 1 - p;
      const tg = P[o].board.attack.slice().sort((a, b) => b.atk - a.atk)[0];
      if (tg) { state.offsideZeroed[o] = tg.id; ev.push({ t: "instant", who: p, text: "Offside trap — " + tg.name + " is flagged, no xG from him this round" }); }
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
    // 5. Team talk — debuffs gone, fatigue cleared, draw 2
    [0, 1].forEach((p) => live(p, "teamTalk").forEach(() => {
      Object.values(P[p].cardStatus).forEach((s) => (s.injured = false));
      P[p].pressedNow = 0;
      P[p].fatigue = 0;
      drawCards(state, p, 2, ev);
      ev.push({ t: "instant", who: p, text: (p === 0 ? "Your" : "Their") + " team talk — debuffs cleared, fresh legs, 2 cards drawn" });
    }));
    // 6. Powers attach
    queue.forEach((q) => {
      if (q.cancelled || q.wasted || q.card.category !== "power") return;
      const k = q.card.effect.kind;
      if (k === "handOfGod") P[q.p].hogActive = true;
      else if (!P[q.p].powers.some((t) => t.id === q.card.id)) P[q.p].powers.push(q.card);
    });
    // 7. Nutmeg targets
    const nut = [null, null];
    [0, 1].forEach((p) => {
      if (live(p, "nutmeg").length) {
        const chem = chemNations(P[p], T);
        nut[p] = P[p].board.attack
          .filter((c) => c.position === "FWD" && c.id !== state.offsideZeroed[p])
          .sort((a, b) => effStats(state, p, b, chem).a - effStats(state, p, a, chem).a)[0] || null;
      }
    });

    // snapshot boards for the reveal animation
    state.lastBoards = [0, 1].map((p) => ({
      attack: P[p].board.attack.slice(),
      defense: P[p].board.defense.slice(),
      tactics: queue.filter((q) => q.p === p).map((q) => ({ card: q.card, cancelled: q.cancelled || q.wasted })),
      formation: P[p].formation,
      offsideId: state.offsideZeroed[p],
    }));

    // 8. Effective totals
    const tot = [sideTotals(state, 0, queue, nut[0]), sideTotals(state, 1, queue, nut[1])];
    state.lastTotals = tot;
    ev.push({ t: "totals", tot });

    // 9. The xG step — both meters fill from the same snapshot (GDD §7, §12)
    const adds = [0, 1].map((s) => {
      const o = 1 - s;
      const parts = [];
      const floor = P[s].floorZeroNow ? 0 : T.xgFloor;
      if (P[s].floorZeroNow) parts.push({ label: "Time-wasted: no xG floor", amt: 0 });
      const delta = tot[s].atk - tot[o].def;
      let open = clamp(floor + Math.max(0, delta) / T.xgSlope, 0, T.xgCap);
      if (tot[o].gkSave > 0) {
        const before = open;
        open = Math.max(0, r2(open - tot[o].gkSave));
        parts.push({ label: "Open play (ATK " + tot[s].atk + " vs DEF " + tot[o].def + "), keeper saves −" + (before - open).toFixed(2), amt: open });
      } else {
        parts.push({ label: "Open play — ATK " + tot[s].atk + " vs DEF " + tot[o].def, amt: open });
      }
      let sum = open;
      if (live(s, "tikiTaka").length) { sum += T.tikiTakaXg; parts.push({ label: "Tiki-Taka", amt: T.tikiTakaXg }); }
      if (P[s].onFormNow) { sum += T.momentumXg; parts.push({ label: "On Form", amt: T.momentumXg }); }
      if (live(s, "counterAttack").length) {
        if (tot[s].def >= tot[o].atk) {
          const add = r2(Math.min(T.counterXg, 0.10 + (tot[s].def - tot[o].atk) / T.xgSlope));
          sum += add; parts.push({ label: "Counter-attack on the break", amt: add });
        } else ev.push({ t: "note", text: (s === 0 ? "Your" : "Their") + " counter-attack fizzles — the defense didn't hold" });
      }
      if (nut[s]) {
        const e = effStats(state, s, nut[s], chemNations(P[s], T));
        const add = r2(clamp(e.a / T.xgSlope, 0, T.xgCap));
        sum += add; parts.push({ label: "Nutmeg — " + nut[s].name + " goes straight through", amt: add });
      }
      if (live(s, "longBall").length) { sum += T.longBallXg; parts.push({ label: "Long ball over the top", amt: T.longBallXg }); }
      if (live(s, "penalty").length) { sum += T.penaltyXg; parts.push({ label: "PENALTY KICK", amt: T.penaltyXg }); }
      // Catenaccio halves everything except the Hand of God
      if (live(o, "catenaccio").length && sum > 0) {
        sum = r2(sum * 0.5);
        parts.push({ label: "Their Catenaccio halves it", amt: null });
      }
      if (P[s].hogActive) { sum += T.hogXg; parts.push({ label: "HAND OF GOD — a goal from nowhere", amt: T.hogXg }); }
      // Golden-goal extra time resolves fast — every chance counts double (GDD §14)
      if (state.extraTime) {
        const before = r2(sum);
        sum = r2(sum * T.etXgMult);
        if (sum > before) parts.push({ label: "Extra time — xG ×" + T.etXgMult, amt: r2(sum - before) });
      }
      return { sum: r2(sum), parts };
    });

    function applyXg(s, amt) {
      const A = P[s];
      state.roundXg[s] = amt;
      A.xg = r2(A.xg + amt);
      A.xgTotal = r2(A.xgTotal + amt);
      if (state.extraTime) A.etXg = r2(A.etXg + amt);
      ev.push({ t: "xg", who: s, amount: amt, parts: adds[s].parts });
      while (A.xg >= 1) {
        A.xg = r2(A.xg - 1);
        A.goals++;
        state.roundGoals[s]++;
        if (A.scoredFirstAt == null) A.scoredFirstAt = state.round;
        ev.push({ t: "goal", who: s, score: [P[0].goals, P[1].goals] });
      }
    }
    if (!state.extraTime) {
      [0, 1].forEach((s) => applyXg(s, adds[s].sum));
    } else {
      // v10: golden-goal extra time is TRUE sudden death — only the side that creates the bigger
      // chance can bank this passage; the other does NOT also score (GDD §14, §17).
      const a0 = adds[0].sum, a1 = adds[1].sum;
      const lead = a0 >= a1 ? 0 : 1, other = 1 - lead;
      applyXg(lead, lead === 0 ? a0 : a1);
      ev.push({ t: "note", text: (other === 0 ? "Your" : "Their") + " chance (" + (other === 0 ? a0 : a1).toFixed(2) + " xG) comes to nothing — in sudden death only the better chance counts" });
    }

    // 10. Utility skills that shape next round
    [0, 1].forEach((p) => {
      const o = 1 - p;
      live(p, "highPress").forEach(() => {
        P[o].pressedNext = T.pressDef;
        P[o].pressFatigueNext = T.pressFatigue;
        ev.push({ t: "note", text: "High press — " + (o === 0 ? "you are" : "they are") + " Pressed next round (−" + T.pressDef + " DEF, +" + T.pressFatigue + " fatigue)" });
      });
      live(p, "timeWasting").forEach(() => {
        P[o].drawPenaltyNext = 1;
        P[o].floorZeroNext = true;
        ev.push({ t: "note", text: (p === 0 ? "You waste" : "They waste") + " time — opponent draws 1 fewer and loses the xG floor next round" });
      });
    });

    // 11. Momentum — scoring (or 3 high-pressure rounds) puts you On Form (GDD §14)
    [0, 1].forEach((p) => {
      if (state.roundGoals[p] > 0) {
        P[p].onFormNext = true;
        P[p].winStreak = 0;
        ev.push({ t: "note", text: (p === 0 ? "You are" : "They are") + " ON FORM — +" + T.momentumXg.toFixed(2) + " xG next round" });
      } else if (state.roundXg[p] >= 0.30) {
        P[p].winStreak++;
        if (P[p].winStreak >= 3) {
          P[p].winStreak = 0;
          P[p].onFormNext = true;
          ev.push({ t: "note", text: (p === 0 ? "You are" : "They are") + " ON FORM — sustained pressure pays: +" + T.momentumXg.toFixed(2) + " xG next round" });
        }
      } else P[p].winStreak = 0;
    });

    // 12. MVP contribution — attackers credited when the round created real chances
    [0, 1].forEach((p) => {
      if (state.roundXg[p] > T.xgFloor) {
        const chem = chemNations(P[p], T);
        P[p].board.attack.forEach((c) => {
          if (c.id === state.offsideZeroed[p]) return;
          P[p].contrib[c.id] = (P[p].contrib[c.id] || 0) + effStats(state, p, c, chem).a;
        });
      }
    });

    // 13. Fatigue — defending tires you, attacking rests you (GDD §8)
    [0, 1].forEach((p) => {
      const dAtk = P[p].board.attack.length, dDef = P[p].board.defense.length;
      const delta = (dDef - dAtk) * T.fatigueRate;
      if (delta !== 0) {
        P[p].fatigue = clamp(P[p].fatigue + delta, 0, T.fatigueMax);
      }
    });
    // Halftime — both sides get fresh legs (GDD §8); locked stars return after cleanup, below
    if (state.round === T.halftimeRound && !state.extraTime) {
      P[0].fatigue = 0; P[1].fatigue = 0;
      P[0].tacticsThisHalf = 0; P[1].tacticsThisHalf = 0;   // v8: 2-per-half tactical allowance resets
      ev.push({ t: "halftime" });
    }

    // 14. Cleanup — v7 card flow (GDD §6): grays cycle, premium players bench, Tacticals are single-use
    [0, 1].forEach((p) => {
      laneCards(P[p]).forEach((c) => {
        if (c.rarity === "common") P[p].discard.push(c);   // grays → discard (infinite sustain)
        else P[p].locked.push(c);                          // premium → locked until halftime / ET
      });
      P[p].board = { attack: [], defense: [] };
      queue.filter((q) => q.p === p).forEach((q) => {
        const isActivePower = q.card.category === "power" && !q.cancelled && !q.wasted && q.card.effect.kind !== "handOfGod";
        // active Powers persist on the board (P.powers) — also single-use; everything else is EXILED
        if (!isActivePower) P[p].exiled.push(q.card);
      });
      P[p].tactics = [];
      P[p].hogActive = false;
      P[p].pressedNow = 0;
      P[p].floorZeroNow = false;
    });
    // Halftime stars return: locked premium players shuffle back into the draw pile (GDD §6)
    if (state.round === T.halftimeRound && !state.extraTime) {
      [0, 1].forEach((p) => {
        if (P[p].locked.length) { P[p].draw = shuffle([...P[p].draw, ...P[p].locked]); P[p].locked = []; }
      });
    }

    // 15. Win check — v7 ladder (GDD §14): 3-goal mercy → most goals at full time → golden-goal extra time
    const [A, B] = P;
    if (!state.extraTime) {
      if (A.goals - B.goals >= T.mercyLead) { state.winner = 0; state.capReason = "mercy rule — a " + T.mercyLead + "-goal lead ends it early"; }
      else if (B.goals - A.goals >= T.mercyLead) { state.winner = 1; state.capReason = "mercy rule — a " + T.mercyLead + "-goal lead ends it early"; }
      else if (state.round >= T.roundCap) {
        if (A.goals !== B.goals) { state.winner = A.goals > B.goals ? 0 : 1; state.capReason = "full time — the lead holds up"; }
        else { beginExtraTime(state); ev.push({ t: "extratime" }); }   // level at 90' → golden goal
      }
    } else {
      if (A.goals !== B.goals) { state.winner = A.goals > B.goals ? 0 : 1; state.capReason = "golden goal in extra time"; }
      else if (state.etRound >= T.etRoundCap) decideExtraTime(state);
    }
    state.phase = state.winner != null ? "end" : "roundEnd";
    state.lastEvents = ev;
    return ev;
  }

  // ---------- AI (xG/fatigue-aware, GDD §18) ----------
  function aiPlan(state) {
    const T = state.T, P = state.players[1], Y = state.players[0];
    let spent = 0;
    const aff = (c) => P.stamina >= c.cost;
    const find = (k) => P.hand.find((c) => c.type === "tactic" && c.effect.kind === k);
    const gateOkAI = (k) => gateMet(P, k);
    const playT = (c) => {
      if (P.tacticsThisHalf >= T.tacticalsPerHalf) return;   // v8: AI respects the 2-per-half cap
      P.tacticsThisHalf += 1;
      P.tacticSpent += c.cost; spent += c.cost;
      P.hand = P.hand.filter((x) => x !== c);
      const k = c.effect.kind;
      if (k === "waterBreak") { P.fatigue = 0; P.tacticBonus += 2; P.exiled.push(c); }
      else if (k === "substitution") {
        const toss = P.hand.filter((x) => x.type === "player" && x.rarity === "common").sort((a, b) => a.cost - b.cost).slice(0, 2);
        toss.forEach((x) => { P.hand = P.hand.filter((h) => h !== x); P.discard.push(x); });
        drawCards(state, 1, toss.length + 1);
        P.fatigue = clamp(P.fatigue - 8, 0, T.fatigueMax);
        P.exiled.push(c);
      } else {
        if (k === "handOfGod") P.hogUsed = true;
        P.tactics.push(c);
      }
      recompStamina(P);
    };
    const placeAI = (c, lane) => {
      const mc = marginalCost(P, c, lane);
      P.hand = P.hand.filter((x) => x !== c);
      P.board[lane].push(c);
      spent += mc;
      recompStamina(P);
    };

    // 0. Formation — defend a lead while fresh; attack to chase OR to rest tired legs
    const lead = P.goals - Y.goals;
    let form = state.opponent ? state.opponent.preferredFormation : "balanced";
    if (lead < 0 || P.fatigue >= 16 || Y.goals >= T.mercyLead - 1) form = "offensive";
    else if (lead > 0 && P.fatigue < 10 && Y.xg < 0.65) form = "defensive";
    P.formation = form;

    // 1. Fresh legs when the dial is high
    const wb = find("waterBreak");
    if (wb && P.fatigue >= 14) playT(wb);
    // 2. Substitution if hand is thin (also sheds fatigue)
    const sub = find("substitution");
    if (sub && aff(sub) && (P.hand.filter((c) => c.type === "player").length <= 2 || P.fatigue >= 20)) playT(sub);
    // 3. Early powers
    if (state.round <= 4)
      ["fortress", "talisman", "totalFootball"].forEach((k) => {
        const c = find(k);
        if (c && aff(c) && P.stamina >= c.cost + 2) playT(c);
      });
    // 4. Stamina split follows the formation
    const mode = form === "offensive" ? 0.7 : form === "defensive" ? 0.4 : 0.55;
    const hasInstants = P.hand.some((c) => c.type === "tactic" && c.category === "instant");
    const reserve = state.round >= 3 && hasInstants ? 2 : 0;
    // v5: with the per-round card cap, per-card QUALITY wins — field best stats first, not cheapest (GDD §6, §18)
    const cap = cardCapFor(T, state.round, state.extraTime);
    const atCap = () => laneCards(P).length >= cap;
    // 5. Fill attack (best ATK), then defense (best DEF), within stamina + cap
    const atkBudget = Math.round((P.stamina - reserve) * mode);
    let spentA = 0;
    P.hand.filter((c) => c.type === "player" && c.position !== "GK")
      .sort((a, b) => b.atk - a.atk)
      .forEach((c) => {
        if (atCap() || !P.hand.includes(c)) return;
        const mc = marginalCost(P, c, "attack");
        if (mc <= P.stamina && spentA + mc <= atkBudget) { placeAI(c, "attack"); spentA += mc; }
      });
    P.hand.filter((c) => c.type === "player")
      .sort((a, b) => b.def - a.def)
      .forEach((c) => {
        if (atCap() || !P.hand.includes(c)) return;
        const mc = marginalCost(P, c, "defense");
        if (mc <= P.stamina && P.stamina - mc >= reserve) placeAI(c, "defense");
      });

    // 6. Gated swings — only with the role on the pitch (GDD §12, §18)
    const pen = find("penalty");
    if (pen && aff(pen) && gateOkAI("penalty") && (P.xg >= 0.35 || lead < 0 || state.round >= 7)) playT(pen);
    const hog = find("handOfGod");
    if (hog && aff(hog) && !P.hogUsed && gateOkAI("handOfGod") && (Y.goals >= T.mercyLead - 1 || (lead < 0 && state.round >= 6))) playT(hog);
    const lb = find("longBall");
    if (lb && aff(lb) && gateOkAI("longBall") && lead < 0) playT(lb);
    const nutT = find("nutmeg");
    if (nutT && aff(nutT) && gateOkAI("nutmeg") && P.board.attack.some((c) => c.position === "FWD" && c.atk >= 85)) playT(nutT);
    const tt = find("tikiTaka");
    if (tt && aff(tt) && gateOkAI("tikiTaka") && P.board.attack.length >= 2) playT(tt);
    const cat = find("catenaccio");
    if (cat && aff(cat) && gateOkAI("catenaccio") && (Y.xg >= 0.55 || (lead > 0 && mode <= 0.45))) playT(cat);
    const ca = find("counterAttack");
    if (ca && aff(ca) && gateOkAI("counterAttack") && mode <= 0.45) playT(ca);
    const off = find("offsideTrap");
    if (off && aff(off) && gateOkAI("offsideTrap") && state.round >= 2 && mode <= 0.55) playT(off);
    const hp = find("highPress");
    if (hp && aff(hp) && gateOkAI("highPress") && state.round >= 2 && Y.fatigue < T.fatigueMax - 4) playT(hp);
    if (state.round >= 3) { const rf = find("referee"); if (rf && aff(rf)) playT(rf); }
    if (state.round >= 4) { const inj = find("injury"); if (inj && aff(inj)) playT(inj); }
    const tw = find("timeWasting");
    if (tw && aff(tw) && lead > 0 && state.round >= 6) playT(tw);

    state.aiIntent = { cards: laneCards(P).length + P.tactics.length, stamina: spent, formation: form };
  }

  // run-level helpers (bracket, opponents, rewards, preset XI) carry over from v3
  window.WCC9E = Object.assign({}, window.WCC3E, {
    newMatch, startRound, reveal,
    canPlace, place, recall, playTactic, canPlayTactic, setFormation,
    effStats, chemNations, status, fmults, GATES, gateText,
    staminaFor, cardCapFor, rarityMultOf, laneCount,
    fieldCostOf, laneStaminaCost, playerStaminaSpent, marginalCost,
  });
})();
