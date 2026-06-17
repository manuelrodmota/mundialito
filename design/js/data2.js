// WORLD CUP CLASH v2 — data layer
// Derives v2 player cards (atk/def, slots, rarity) from the v1 pool (js/data.js must load first)
// and defines the 19 Tactic cards + extra common players for the 0-slot filler pool.

(function () {
  const base = window.WCC_DATA;

  // Extra journeyman commons (60–79) so 30-card squads always have filler
  const EXTRA = [
    ["Azzedine Ounahi", "Morocco", 2022, "MID", 79],
    ["Nayef Aguerd", "Morocco", 2022, "DEF", 78],
    ["Jawad El Yamiq", "Morocco", 2022, "DEF", 74],
    ["Wout Weghorst", "Netherlands", 2022, "FWD", 79],
    ["Davy Klaassen", "Netherlands", 2022, "MID", 77],
    ["Marten de Roon", "Netherlands", 2022, "MID", 76],
    ["Harry Souttar", "Australia", 2022, "DEF", 74],
    ["Jackson Irvine", "Australia", 2022, "MID", 73],
    ["Ben Davies", "Wales", 2022, "DEF", 77],
    ["Joe Allen", "Wales", 2022, "MID", 74],
    ["Kamal Miller", "Canada", 2022, "DEF", 70],
    ["Ismaël Koné", "Canada", 2026, "MID", 73],
    ["Tajon Buchanan", "Canada", 2026, "FWD", 74],
    ["Cyle Larin", "Canada", 2022, "FWD", 73],
    ["Milan Borjan", "Canada", 2022, "GK", 73],
    ["Alistair Johnston", "Canada", 2026, "DEF", 72],
    ["Kellyn Acosta", "USA", 2022, "MID", 71],
    ["Walker Zimmerman", "USA", 2022, "DEF", 74],
    ["Cristian Roldan", "USA", 2026, "MID", 70],
    ["Sean Johnson", "USA", 2022, "GK", 68],
    ["Luis Chávez", "Mexico", 2022, "MID", 74],
    ["Héctor Herrera", "Mexico", 2022, "MID", 75],
    ["César Montes", "Mexico", 2026, "DEF", 74],
    ["Alexis Vega", "Mexico", 2026, "FWD", 73],
    ["Jesús Gallardo", "Mexico", 2022, "DEF", 72],
    ["Hiroki Sakai", "Japan", 2022, "DEF", 74],
    ["Maya Yoshida", "Japan", 2022, "DEF", 75],
    ["Ko Itakura", "Japan", 2026, "DEF", 76],
    ["Ao Tanaka", "Japan", 2026, "MID", 74],
    ["Hidemasa Morita", "Japan", 2026, "MID", 76],
    ["Kim Young-gwon", "South Korea", 2022, "DEF", 74],
    ["Hwang In-beom", "South Korea", 2026, "MID", 76],
    ["Hwang Hee-chan", "South Korea", 2026, "FWD", 78],
    ["Nahitan Nández", "Uruguay", 2022, "MID", 78],
    ["Mathías Olivera", "Uruguay", 2026, "DEF", 77],
    ["Sebastián Coates", "Uruguay", 2022, "DEF", 76],
    ["Guillermo Varela", "Uruguay", 2022, "DEF", 72],
  ];

  // ---- v2 derivations (GDD §3, §5, §6) ----
  function rarityOf(o) {
    if (o >= 92) return "legendary";
    if (o >= 87) return "epic";
    if (o >= 80) return "rare";
    return "common";
  }
  const SLOTS = { common: 0, rare: 1, epic: 2, legendary: 3 };
  function costOf(o) {
    if (o <= 69) return 1;
    if (o <= 79) return 2;
    if (o <= 86) return 3;
    if (o <= 92) return 4;
    return 5;
  }
  function statsOf(pos, o) {
    if (pos === "FWD") return [o, Math.round(o * 0.55)];
    if (pos === "MID") return [Math.round(o * 0.85), Math.round(o * 0.78)];
    if (pos === "DEF") return [Math.round(o * 0.55), o];
    return [0, o + 5]; // GK — defense only
  }

  const tuples = [];
  const seen = new Set();
  base.POOL.filter((c) => c.position !== "EVENT").forEach((c) =>
    tuples.push([c.name, c.nation, c.worldCup, c.position, c.rating])
  );
  EXTRA.forEach((t) => tuples.push(t));

  const PLAYERS = [];
  tuples.forEach((t, i) => {
    const [name, nation, worldCup, position, overall] = t;
    const key = name + "·" + worldCup;
    if (seen.has(key)) return;
    seen.add(key);
    const [atk, def] = statsOf(position, overall);
    const rarity = rarityOf(overall);
    PLAYERS.push({
      id: "p" + i, type: "player",
      name, nation, worldCup, position, overall,
      atk, def,
      cost: costOf(overall),
      rarity, slots: SLOTS[rarity],
    });
  });

  // ---- Tactic cards (GDD §11) ----
  function T(name, category, cost, slots, kind, text) {
    const rarity = slots >= 3 ? "legendary" : slots === 2 ? "epic" : "rare";
    return { id: "t_" + kind, type: "tactic", name, category, cost, slots, rarity, effect: { kind }, text };
  }
  const TACTICS = [
    T("VAR Review", "instant", 2, 2, "var", "Cancel the opponent's biggest Tactic this round. If they played none, void their highest-rated revealed player instead."),
    T("Offside Trap", "instant", 2, 1, "offsideTrap", "Remove the highest-ATK card from the opponent's attack lane this round."),
    T("Referee's Whistle", "instant", 1, 1, "referee", "Book the opponent's highest-rated revealed player. If already Booked — RED CARD: exiled for the match."),
    T("Injury", "instant", 2, 2, "injury", "The opponent's highest-rated revealed player is Injured: −15 ATK / DEF for the rest of the match."),
    T("Water Break", "skill", 0, 1, "waterBreak", "Gain +3 stamina this round. Resolves the moment you play it."),
    T("Substitution", "skill", 1, 1, "substitution", "Discard up to 2 cards; draw that many +1. Resolves the moment you play it."),
    T("Tiki-Taka", "skill", 1, 1, "tikiTaka", "+1 ATK for every card in your attack lane this round."),
    T("Catenaccio", "skill", 2, 1, "catenaccio", "Park the bus: +50% DEF total this round."),
    T("Counter-Attack", "skill", 1, 1, "counterAttack", "If your DEF total holds their ATK total, deal the surplus as Morale damage on the break."),
    T("High Press", "skill", 1, 1, "highPress", "Opponent is Pressed next round (−10 DEF) and discards 1 random card."),
    T("Long Ball", "skill", 1, 1, "longBall", "Discard your 2 cheapest cards: deal 8 Morale damage, ignoring defense."),
    T("Nutmeg", "skill", 1, 1, "nutmeg", "Your best attacking FWD ignores the opponent's defense this round — its ATK is dealt directly."),
    T("Penalty Kick", "skill", 2, 2, "penalty", "If you have a FWD in your attack lane, deal 12 Morale damage, ignoring defense."),
    T("Halftime Team Talk", "skill", 1, 1, "teamTalk", "Remove all debuffs from your cards; draw 2."),
    T("Time Wasting", "skill", 1, 1, "timeWasting", "Opponent draws 1 fewer card next round; you heal 5 Morale."),
    T("Hand of God", "power", 3, 3, "handOfGod", "Once per match: this round, your attack ignores their defense entirely."),
    T("Fortress", "power", 3, 2, "fortress", "Persistent: +6 DEF total every round."),
    T("Talisman", "power", 2, 2, "talisman", "Persistent: your Captain's-nation cards get +3 ATK / +3 DEF."),
    T("Total Football", "power", 3, 3, "totalFootball", "Persistent: every player adds 50% of their other stat to the opposite lane."),
  ];

  window.WCC2 = { PLAYERS, TACTICS, NATIONS: base.NATIONS, SLOTS };
})();
