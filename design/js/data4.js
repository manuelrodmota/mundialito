// WORLD CUP CLASH v4 — tactical cards re-statted to xG / goals (GDD v4 §12)
// Loads after data2.js + data3.js. Replaces window.WCC2.TACTICS so the builder,
// reward offers and opponent decks all hand out v4 cards.

(function () {
  // gate: requiresPosition / requiresCount / where ("lineup" | "attack")
  function T(name, category, cost, slots, kind, text, gate) {
    const rarity = slots >= 3 ? "legendary" : slots === 2 ? "epic" : "rare";
    const effect = Object.assign({ kind }, gate || {});
    return { id: "t_" + kind, type: "tactic", name, category, cost, slots, rarity, effect, text };
  }

  const TACTICS4 = [
    T("VAR Review", "instant", 2, 2, "var",
      "Cancel one opposing tactical card played this round. They see you holding the screen."),
    T("Offside Trap", "instant", 2, 1, "offsideTrap",
      "Needs a DEF · Their highest-ATK attacker is flagged — he contributes 0 xG this round.",
      { requiresPosition: "DEF", requiresCount: 1 }),
    T("Referee's Whistle", "instant", 1, 1, "referee",
      "Book their best player on the pitch. Already booked → RED CARD, exiled for the match."),
    T("Injury", "instant", 2, 2, "injury",
      "Their best player on the pitch pulls up: −15 ATK / DEF for the rest of the match."),
    T("Water Break", "skill", 0, 1, "waterBreak",
      "Fresh legs — reset your fatigue to 0 and gain +2 stamina this round. Resolves instantly."),
    T("Substitution", "skill", 1, 1, "substitution",
      "Discard up to 2 cards, draw that many +1, and shed 8 fatigue. Resolves instantly."),
    T("Tiki-Taka", "skill", 1, 1, "tikiTaka",
      "Needs 2 MID · Passing triangles unlock the chance: +0.20 xG this round.",
      { requiresPosition: "MID", requiresCount: 2 }),
    T("Catenaccio", "skill", 2, 1, "catenaccio",
      "Needs 2 DEF · Park the bus: the opponent's xG against you is halved this round.",
      { requiresPosition: "DEF", requiresCount: 2 }),
    T("Counter-Attack", "skill", 1, 1, "counterAttack",
      "Needs a FWD · If your DEF holds their ATK this round, up to +0.40 xG on the break.",
      { requiresPosition: "FWD", requiresCount: 1 }),
    T("High Press", "skill", 1, 1, "highPress",
      "Needs 2 FWD/MID · Opponent is Pressed next round: −10 DEF and +6 fatigue.",
      { requiresPosition: ["FWD", "MID"], requiresCount: 2 }),
    T("Long Ball", "skill", 1, 1, "longBall",
      "Needs a FWD in attack · One ball over the top: +0.45 xG, ignoring their defense.",
      { requiresPosition: "FWD", requiresCount: 1, where: "attack" }),
    T("Nutmeg", "skill", 1, 1, "nutmeg",
      "Needs a FWD in attack · Your best FWD beats his man — his full ATK becomes xG, ignoring defense.",
      { requiresPosition: "FWD", requiresCount: 1, where: "attack" }),
    T("Penalty Kick", "skill", 2, 2, "penalty",
      "Needs a FWD in attack · The spot kick: +0.85 xG this round. Almost a goal.",
      { requiresPosition: "FWD", requiresCount: 1, where: "attack" }),
    T("Halftime Team Talk", "skill", 1, 1, "teamTalk",
      "Clear all debuffs from your cards, reset your fatigue to 0, and draw 2."),
    T("Time Wasting", "skill", 1, 1, "timeWasting",
      "Opponent draws 1 fewer card next round and loses their xG floor — a truly stifled round yields nothing."),
    T("Hand of God", "power", 3, 3, "handOfGod",
      "Needs a FWD in attack · Once per match: +1.0 xG — a goal from nowhere. Unstoppable.",
      { requiresPosition: "FWD", requiresCount: 1, where: "attack" }),
    T("Fortress", "power", 3, 2, "fortress",
      "Persistent: +8 to your effective DEF every round. The wall does not rest — but you still tire behind it."),
    T("Talisman", "power", 2, 2, "talisman",
      "Persistent: your Captain's countrymen get +3 ATK / +3 DEF."),
    T("Total Football", "power", 3, 3, "totalFootball",
      "Persistent: every player adds 50% of his other stat to the opposite lane."),
  ];

  // v4 replaces the v3 tactical set everywhere (builder, offers, opponent decks)
  window.WCC2.TACTICS = TACTICS4;
  window.WCC4 = { TACTICS: TACTICS4 };
})();
