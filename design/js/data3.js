// WORLD CUP CLASH v3 — historic opponent teams + formations (GDD v3 §8, §13)
// Loads after data.js + data2.js. Placements are tunable design, not facts.

(function () {
  // same derivations as data2 (kept local so this file stands alone)
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
    return [0, o + 5];
  }
  function mkPlayer(id, name, nation, year, pos, overall) {
    const [atk, def] = statsOf(pos, overall);
    const rarity = rarityOf(overall);
    return {
      id, type: "player", name, nation, worldCup: year, position: pos,
      overall, atk, def, cost: costOf(overall), rarity, slots: SLOTS[rarity],
    };
  }

  const FORMATION_META = {
    offensive: { label: "Offensive", shape: "3-4-3" },
    balanced: { label: "Balanced", shape: "4-3-3" },
    defensive: { label: "Defensive", shape: "5-4-1" },
  };

  // ---- historic team pool (squad: [name, pos, overall]) ----
  const RAW_TEAMS = [
    // ============ TIER D — plucky underdogs (group) ============
    { id: "sau94", nation: "Saudi Arabia", year: 1994, tier: "D", pref: "balanced",
      blurb: "Al-Owairan's 70-yard solo run made them the surprise of USA '94.",
      tacs: ["waterBreak", "counterAttack", "timeWasting"],
      squad: [
        ["Mohammed Al-Deayea", "GK", 73], ["Mohammed Al-Khlaiwi", "DEF", 70], ["Ahmed Madani", "DEF", 69],
        ["Abdullah Zubromawi", "DEF", 67], ["Mohammed Al-Jawad", "DEF", 68], ["Khalid Al-Muwallid", "MID", 72],
        ["Fuad Amin", "MID", 71], ["Fahad Al-Bishi", "MID", 70], ["Saeed Al-Owairan", "FWD", 79],
        ["Sami Al-Jaber", "FWD", 76], ["Fahad Al-Ghesheyan", "FWD", 68],
      ] },
    { id: "crc14", nation: "Costa Rica", year: 2014, tier: "D", pref: "defensive",
      blurb: "Topped a group of champions, then Navas carried them to a quarter-final.",
      tacs: ["catenaccio", "counterAttack", "timeWasting"],
      squad: [
        ["Keylor Navas", "GK", 85], ["Giancarlo González", "DEF", 75], ["Óscar Duarte", "DEF", 74],
        ["Michael Umaña", "DEF", 72], ["Júnior Díaz", "DEF", 71], ["Celso Borges", "MID", 75],
        ["Yeltsin Tejeda", "MID", 71], ["Christian Bolaños", "MID", 74], ["Bryan Ruiz", "FWD", 78],
        ["Joel Campbell", "FWD", 77], ["Marco Ureña", "FWD", 70],
      ] },
    { id: "can22", nation: "Canada", year: 2022, tier: "D", pref: "balanced",
      blurb: "Back at the World Cup after 36 years, all heart and fast breaks.",
      tacs: ["highPress", "waterBreak"],
      squad: [
        ["Milan Borjan", "GK", 73], ["Alistair Johnston", "DEF", 72], ["Kamal Miller", "DEF", 70],
        ["Steven Vitória", "DEF", 71], ["Richie Laryea", "DEF", 71], ["Atiba Hutchinson", "MID", 74],
        ["Stephen Eustáquio", "MID", 75], ["Tajon Buchanan", "MID", 75], ["Alphonso Davies", "FWD", 84],
        ["Jonathan David", "FWD", 80], ["Cyle Larin", "FWD", 73],
      ] },
    { id: "sen02", nation: "Senegal", year: 2002, tier: "D", pref: "balanced",
      blurb: "Beat the holders France on opening night and never looked scared.",
      tacs: ["highPress", "counterAttack", "waterBreak"],
      squad: [
        ["Tony Sylva", "GK", 74], ["Ferdinand Coly", "DEF", 73], ["Lamine Diatta", "DEF", 75],
        ["Aliou Cissé", "DEF", 72], ["Omar Daf", "DEF", 70], ["Papa Bouba Diop", "MID", 79],
        ["Salif Diao", "MID", 74], ["Khalilou Fadiga", "MID", 78], ["El Hadji Diouf", "FWD", 82],
        ["Henri Camara", "FWD", 78], ["Souleymane Diallo", "FWD", 71],
      ] },

    // ============ TIER C — solid dark horses (R16+) ============
    { id: "kor02", nation: "South Korea", year: 2002, tier: "C", pref: "balanced",
      blurb: "Hiddink's tireless pressing machine ran all the way to a home semi-final.",
      tacs: ["highPress", "waterBreak", "substitution"],
      squad: [
        ["Lee Woon-jae", "GK", 77], ["Hong Myung-bo", "DEF", 83], ["Choi Jin-cheul", "DEF", 76],
        ["Kim Tae-young", "DEF", 75], ["Lee Young-pyo", "DEF", 77], ["Yoo Sang-chul", "MID", 78],
        ["Kim Nam-il", "MID", 76], ["Park Ji-sung", "MID", 81], ["Lee Chun-soo", "FWD", 77],
        ["Seol Ki-hyeon", "FWD", 76], ["Ahn Jung-hwan", "FWD", 79],
      ] },
    { id: "cro98", nation: "Croatia", year: 1998, tier: "C", pref: "balanced",
      blurb: "Šuker's golden boot dragged a debutant nation to third place.",
      tacs: ["counterAttack", "longBall", "waterBreak"],
      squad: [
        ["Drazen Ladić", "GK", 78], ["Slaven Bilić", "DEF", 81], ["Igor Štimac", "DEF", 80],
        ["Dario Šimić", "DEF", 79], ["Robert Jarni", "DEF", 80], ["Zvonimir Boban", "MID", 86],
        ["Robert Prosinečki", "MID", 84], ["Aljoša Asanović", "MID", 82], ["Mario Stanić", "MID", 78],
        ["Davor Šuker", "FWD", 88], ["Goran Vlaović", "FWD", 77],
      ] },
    { id: "usa94", nation: "USA", year: 1994, tier: "C", pref: "defensive",
      blurb: "Hosts with nothing to lose — organized, stubborn, dangerous on the break.",
      tacs: ["counterAttack", "timeWasting", "waterBreak"],
      squad: [
        ["Tony Meola", "GK", 76], ["Alexi Lalas", "DEF", 75], ["Marcelo Balboa", "DEF", 74],
        ["Fernando Clavijo", "DEF", 71], ["Paul Caligiuri", "MID", 73], ["Tab Ramos", "MID", 77],
        ["Thomas Dooley", "MID", 75], ["John Harkes", "MID", 74], ["Mike Sorber", "MID", 71],
        ["Eric Wynalda", "FWD", 77], ["Earnie Stewart", "FWD", 74],
      ] },
    { id: "mar22", nation: "Morocco", year: 2022, tier: "C", pref: "defensive",
      blurb: "The wall of Qatar — first African side to reach a World Cup semi-final.",
      tacs: ["catenaccio", "counterAttack", "fortress"],
      squad: [
        ["Yassine Bounou", "GK", 85], ["Achraf Hakimi", "DEF", 86], ["Romain Saïss", "DEF", 80],
        ["Nayef Aguerd", "DEF", 79], ["Noussair Mazraoui", "DEF", 80], ["Sofyan Amrabat", "MID", 83],
        ["Azzedine Ounahi", "MID", 79], ["Selim Amallah", "MID", 76], ["Hakim Ziyech", "FWD", 84],
        ["Youssef En-Nesyri", "FWD", 81], ["Sofiane Boufal", "FWD", 78],
      ] },

    // ============ TIER B — genuine contenders (QF+) ============
    { id: "ned78", nation: "Netherlands", year: 1978, tier: "B", pref: "offensive",
      blurb: "Cruyff stayed home; they still carved their way to a second straight final.",
      tacs: ["tikiTaka", "longBall", "waterBreak"],
      squad: [
        ["Jan Jongbloed", "GK", 76], ["Ruud Krol", "DEF", 87], ["Wim Rijsbergen", "DEF", 80],
        ["Ernie Brandts", "DEF", 79], ["Wim Suurbier", "DEF", 81], ["Johan Neeskens", "MID", 88],
        ["Arie Haan", "MID", 85], ["Willy van de Kerkhof", "MID", 81], ["Wim Jansen", "MID", 81],
        ["Johnny Rep", "FWD", 85], ["Rob Rensenbrink", "FWD", 88],
      ] },
    { id: "por06", nation: "Portugal", year: 2006, tier: "B", pref: "balanced",
      blurb: "Figo's last dance and a young Ronaldo — semi-finalists with bite.",
      tacs: ["nutmeg", "referee", "waterBreak"],
      squad: [
        ["Ricardo", "GK", 81], ["Ricardo Carvalho", "DEF", 86], ["Fernando Meira", "DEF", 80],
        ["Miguel", "DEF", 80], ["Nuno Valente", "DEF", 78], ["Maniche", "MID", 84],
        ["Costinha", "MID", 80], ["Deco", "MID", 88], ["Luís Figo", "FWD", 89],
        ["Cristiano Ronaldo", "FWD", 86], ["Pauleta", "FWD", 82],
      ] },
    { id: "bel18", nation: "Belgium", year: 2018, tier: "B", pref: "offensive",
      blurb: "The golden generation at full power — that counter against Japan still stings.",
      tacs: ["counterAttack", "highPress", "waterBreak"],
      squad: [
        ["Thibaut Courtois", "GK", 90], ["Vincent Kompany", "DEF", 85], ["Toby Alderweireld", "DEF", 84],
        ["Jan Vertonghen", "DEF", 83], ["Thomas Meunier", "DEF", 80], ["Axel Witsel", "MID", 83],
        ["Marouane Fellaini", "MID", 79], ["Kevin De Bruyne", "MID", 92], ["Dries Mertens", "FWD", 84],
        ["Eden Hazard", "FWD", 92], ["Romelu Lukaku", "FWD", 88],
      ] },
    { id: "col14", nation: "Colombia", year: 2014, tier: "B", pref: "offensive",
      blurb: "James lit up Brazil with the goal of the tournament.",
      tacs: ["tikiTaka", "penalty", "waterBreak"],
      squad: [
        ["David Ospina", "GK", 82], ["Juan Camilo Zúñiga", "DEF", 78], ["Mario Yepes", "DEF", 77],
        ["Cristián Zapata", "DEF", 76], ["Pablo Armero", "DEF", 77], ["Carlos Sánchez", "MID", 79],
        ["Abel Aguilar", "MID", 76], ["Juan Cuadrado", "MID", 84], ["James Rodríguez", "MID", 90],
        ["Teófilo Gutiérrez", "FWD", 79], ["Carlos Bacca", "FWD", 80],
      ] },

    // ============ TIER A — all-time greats (SF+) ============
    { id: "ned74", nation: "Netherlands", year: 1974, tier: "A", pref: "offensive",
      blurb: "Total Football. Cruyff's orange machine where every player was every position.",
      tacs: ["totalFootball", "tikiTaka", "highPress"],
      squad: [
        ["Jan Jongbloed", "GK", 75], ["Ruud Krol", "DEF", 88], ["Wim Suurbier", "DEF", 82],
        ["Wim Rijsbergen", "DEF", 80], ["Arie Haan", "MID", 86], ["Wim van Hanegem", "MID", 88],
        ["Johan Neeskens", "MID", 90], ["Wim Jansen", "MID", 82], ["Johnny Rep", "FWD", 86],
        ["Johan Cruyff", "FWD", 96], ["Rob Rensenbrink", "FWD", 86],
      ] },
    { id: "hun54", nation: "Hungary", year: 1954, tier: "A", pref: "offensive",
      blurb: "The Mighty Magyars — unbeaten for four years, terrifying for ninety minutes.",
      tacs: ["tikiTaka", "penalty", "waterBreak"],
      squad: [
        ["Gyula Grosics", "GK", 82], ["Jenő Buzánszky", "DEF", 78], ["Gyula Lóránt", "DEF", 79],
        ["Mihály Lantos", "DEF", 78], ["József Bozsik", "MID", 89], ["József Zakariás", "MID", 80],
        ["Nándor Hidegkuti", "MID", 91], ["Sándor Kocsis", "FWD", 93], ["Ferenc Puskás", "FWD", 96],
        ["Zoltán Czibor", "FWD", 88], ["Mihály Tóth", "FWD", 78],
      ] },
    { id: "bra82", nation: "Brazil", year: 1982, tier: "A", pref: "offensive",
      blurb: "Maybe the most beautiful team never to win it. Zico, Sócrates, Falcão.",
      tacs: ["tikiTaka", "nutmeg", "waterBreak"],
      squad: [
        ["Waldir Peres", "GK", 77], ["Leandro", "DEF", 84], ["Oscar", "DEF", 81],
        ["Luizinho", "DEF", 80], ["Júnior", "DEF", 87], ["Toninho Cerezo", "MID", 86],
        ["Falcão", "MID", 91], ["Sócrates", "MID", 93], ["Zico", "MID", 95],
        ["Éder", "FWD", 88], ["Serginho", "FWD", 76],
      ] },
    { id: "cro18", nation: "Croatia", year: 2018, tier: "A", pref: "balanced",
      blurb: "Three straight extra-times on the way to the final. They simply refused to lose.",
      tacs: ["timeWasting", "counterAttack", "teamTalk"],
      squad: [
        ["Danijel Subašić", "GK", 81], ["Šime Vrsaljko", "DEF", 80], ["Dejan Lovren", "DEF", 81],
        ["Domagoj Vida", "DEF", 80], ["Ivan Strinić", "DEF", 77], ["Marcelo Brozović", "MID", 83],
        ["Ivan Rakitić", "MID", 87], ["Luka Modrić", "MID", 95], ["Ivan Perišić", "FWD", 85],
        ["Mario Mandžukić", "FWD", 85], ["Ante Rebić", "FWD", 80],
      ] },

    // ============ TIER S — world champions (Final only) ============
    { id: "bra70", nation: "Brazil", year: 1970, tier: "S", champ: true, pref: "offensive",
      blurb: "Pelé, Jairzinho, Rivellino, Tostão — football's high-water mark in Mexican sun.",
      tacs: ["tikiTaka", "nutmeg", "penalty", "waterBreak"],
      squad: [
        ["Félix", "GK", 76], ["Carlos Alberto", "DEF", 89], ["Brito", "DEF", 82],
        ["Wilson Piazza", "DEF", 82], ["Everaldo", "DEF", 80], ["Clodoaldo", "MID", 85],
        ["Gérson", "MID", 90], ["Rivellino", "MID", 92], ["Jairzinho", "FWD", 93],
        ["Tostão", "FWD", 91], ["Pelé", "FWD", 98],
      ] },
    { id: "ita82", nation: "Italy", year: 1982, tier: "S", champ: true, pref: "defensive",
      blurb: "Catenaccio perfected. Zoff's wall, Gentile's shadow, Rossi's six goals.",
      tacs: ["catenaccio", "fortress", "referee", "counterAttack"],
      squad: [
        ["Dino Zoff", "GK", 91], ["Claudio Gentile", "DEF", 88], ["Gaetano Scirea", "DEF", 91],
        ["Fulvio Collovati", "DEF", 83], ["Antonio Cabrini", "DEF", 86], ["Giuseppe Bergomi", "DEF", 82],
        ["Marco Tardelli", "MID", 89], ["Giancarlo Antognoni", "MID", 84], ["Gabriele Oriali", "MID", 80],
        ["Bruno Conti", "FWD", 87], ["Paolo Rossi", "FWD", 93],
      ] },
    { id: "arg86", nation: "Argentina", year: 1986, tier: "S", champ: true, pref: "offensive",
      blurb: "One man, one tournament. The Hand of God and the Goal of the Century.",
      tacs: ["handOfGod", "nutmeg", "referee", "waterBreak"],
      squad: [
        ["Nery Pumpido", "GK", 80], ["Oscar Ruggeri", "DEF", 86], ["José Luis Brown", "DEF", 83],
        ["José Luis Cuciuffo", "DEF", 79], ["Julio Olarticoechea", "DEF", 79], ["Sergio Batista", "MID", 81],
        ["Ricardo Giusti", "MID", 80], ["Jorge Burruchaga", "MID", 87], ["Héctor Enrique", "MID", 80],
        ["Jorge Valdano", "FWD", 88], ["Diego Maradona", "FWD", 98],
      ] },
    { id: "fra98", nation: "France", year: 1998, tier: "S", champ: true, pref: "balanced",
      blurb: "Zidane's two headers and the meanest back line of the decade.",
      tacs: ["fortress", "teamTalk", "penalty", "waterBreak"],
      squad: [
        ["Fabien Barthez", "GK", 87], ["Lilian Thuram", "DEF", 89], ["Laurent Blanc", "DEF", 88],
        ["Marcel Desailly", "DEF", 90], ["Bixente Lizarazu", "DEF", 85], ["Didier Deschamps", "MID", 87],
        ["Emmanuel Petit", "MID", 84], ["Christian Karembeu", "MID", 80], ["Zinedine Zidane", "MID", 95],
        ["Youri Djorkaeff", "FWD", 86], ["Stéphane Guivarc'h", "FWD", 72],
      ] },
    { id: "bra02", nation: "Brazil", year: 2002, tier: "S", champ: true, pref: "offensive",
      blurb: "The three R's — Ronaldo's redemption, eight goals and a fifth star.",
      tacs: ["nutmeg", "penalty", "tikiTaka", "waterBreak"],
      squad: [
        ["Marcos", "GK", 84], ["Cafu", "DEF", 88], ["Lúcio", "DEF", 86],
        ["Edmílson", "DEF", 83], ["Roberto Carlos", "DEF", 89], ["Gilberto Silva", "MID", 83],
        ["Kléberson", "MID", 80], ["Juninho Paulista", "MID", 81], ["Ronaldinho", "MID", 93],
        ["Rivaldo", "FWD", 94], ["Ronaldo", "FWD", 97],
      ] },
    { id: "esp10", nation: "Spain", year: 2010, tier: "S", champ: true, pref: "balanced",
      blurb: "Tiki-taka at its peak — they passed teams to sleep, then Iniesta woke them up.",
      tacs: ["tikiTaka", "highPress", "timeWasting", "waterBreak"],
      squad: [
        ["Iker Casillas", "GK", 91], ["Carles Puyol", "DEF", 89], ["Gerard Piqué", "DEF", 87],
        ["Sergio Ramos", "DEF", 87], ["Joan Capdevila", "DEF", 80], ["Sergio Busquets", "MID", 87],
        ["Xabi Alonso", "MID", 88], ["Xavi", "MID", 95], ["Andrés Iniesta", "MID", 94],
        ["Pedro", "FWD", 83], ["David Villa", "FWD", 90],
      ] },
    { id: "ger14", nation: "Germany", year: 2014, tier: "S", champ: true, pref: "balanced",
      blurb: "The 7-1 machine. Relentless structure with a super-sub for the final.",
      tacs: ["substitution", "penalty", "highPress", "waterBreak"],
      squad: [
        ["Manuel Neuer", "GK", 93], ["Philipp Lahm", "DEF", 90], ["Mats Hummels", "DEF", 89],
        ["Jérôme Boateng", "DEF", 87], ["Benedikt Höwedes", "DEF", 81], ["Bastian Schweinsteiger", "MID", 89],
        ["Sami Khedira", "MID", 84], ["Toni Kroos", "MID", 91], ["Mesut Özil", "MID", 88],
        ["Thomas Müller", "FWD", 90], ["Miroslav Klose", "FWD", 86],
      ] },
    { id: "arg22", nation: "Argentina", year: 2022, tier: "S", champ: true, pref: "balanced",
      blurb: "Messi's coronation, the greatest final ever played, and Dibu's glove.",
      tacs: ["penalty", "timeWasting", "referee", "waterBreak"],
      squad: [
        ["Emiliano Martínez", "GK", 89], ["Nahuel Molina", "DEF", 82], ["Cristian Romero", "DEF", 86],
        ["Nicolás Otamendi", "DEF", 85], ["Nicolás Tagliafico", "DEF", 81], ["Rodrigo De Paul", "MID", 85],
        ["Enzo Fernández", "MID", 87], ["Alexis Mac Allister", "MID", 86], ["Ángel Di María", "FWD", 88],
        ["Lionel Messi", "FWD", 98], ["Julián Álvarez", "FWD", 88],
      ] },
  ];

  const TIER_STARS = { D: 2, C: 3, B: 4, A: 5, S: 6 };

  const TEAMS = RAW_TEAMS.map((t, ti) => ({
    id: t.id,
    name: t.nation + " " + t.year,
    nation: t.nation,
    year: t.year,
    tier: t.tier,
    stars: TIER_STARS[t.tier],
    preferredFormation: t.pref,
    isChampion: !!t.champ,
    blurb: t.blurb,
    tacticalKinds: t.tacs,
    squad: t.squad.map((s, i) => mkPlayer("h" + ti + "_" + i, s[0], t.nation, t.year, s[1], s[2])),
    strength: Math.round(t.squad.reduce((sum, s) => sum + s[2], 0) / t.squad.length),
  }));

  let cloneN = 0;
  function cloneTactical(t) {
    cloneN++;
    return Object.assign({}, t, { id: t.id + "_c" + cloneN });
  }
  function tacticalByKind(k) {
    return window.WCC2.TACTICS.find((t) => t.effect.kind === k);
  }

  // an opponent's match deck: era XI + signature tactical cards
  function teamDeck(team) {
    const tac = team.tacticalKinds.map(tacticalByKind).filter(Boolean).map(cloneTactical);
    const cap = team.squad.slice().sort((a, b) => b.overall - a.overall)[0];
    return { cards: [...team.squad, ...tac], captainId: cap.id };
  }

  window.WCC3 = { TEAMS, teamDeck, cloneTactical, tacticalByKind, FORMATION_META, TIER_STARS };
})();
