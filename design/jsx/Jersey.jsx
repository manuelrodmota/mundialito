// WORLD CUP CLASH — per-nation jersey art (replaces the role silhouette in the card figure)
// Ported from the jersey gallery. Exposes window.WCJersey (React component) + window.buildJerseySVG.
(function () {
  // ---- silhouette: crew neck + sharp set-in sleeves ----
  const BODY = "M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46 C182,52 196,57 212,63 C228,70 243,79 254,89 C259,95 262,101 262,109 L260,135 Q259,141 252,140 L219,127 Q214,126 214,133 L211,295 Q211,302 202,302 L98,302 Q89,302 89,295 L86,133 Q86,126 81,127 L48,140 Q41,141 40,135 L38,109 C38,101 41,95 46,89 C57,79 72,70 88,63 C104,57 118,52 132,46 Z";
  const COLLAR = "M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46";
  const SEAM_L = "M131,49 C105,66 90,98 86,131";
  const SEAM_R = "M169,49 C195,66 210,98 214,131";
  const CUFF_L = "M40,135 L81,127";
  const CUFF_R = "M260,135 L219,127";

  function fillEl(kit) {
    const w = 300, h = 340;
    if (kit.pattern === "stripes") {
      let r = `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`;
      const sw = 23;
      for (let x = 46; x < w; x += sw * 2) r += `<rect x="${x}" y="0" width="${sw}" height="${h}" fill="${kit.stripe}"/>`;
      return r;
    }
    if (kit.pattern === "checker") {
      let r = `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`;
      const s = 26;
      for (let y = 0, j = 0; y < h; y += s, j++)
        for (let x = 0, i = 0; x < w; x += s, i++)
          if ((i + j) % 2 === 0) r += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${kit.stripe}"/>`;
      return r;
    }
    return `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`;
  }

  let gid = 0;
  function buildJerseySVG(kit) {
    const id = "wcj" + (gid++);
    let knit = "";
    for (let x = 44; x < 256; x += 7) knit += `<line x1="${x}" y1="0" x2="${x}" y2="340" stroke="#000" stroke-width="0.7" opacity="0.04"/>`;
    const trim = kit.trim;
    return `<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip${id}"><path d="${BODY}"/></clipPath>
        <linearGradient id="sh${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.06"/>
          <stop offset="0.15" stop-color="#000" stop-opacity="0.17"/>
          <stop offset="0.24" stop-color="#000" stop-opacity="0.04"/>
          <stop offset="0.31" stop-color="#000" stop-opacity="0.26"/>
          <stop offset="0.42" stop-color="#000" stop-opacity="0.02"/>
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="0.58" stop-color="#000" stop-opacity="0.02"/>
          <stop offset="0.69" stop-color="#000" stop-opacity="0.26"/>
          <stop offset="0.76" stop-color="#000" stop-opacity="0.04"/>
          <stop offset="0.85" stop-color="#000" stop-opacity="0.17"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.06"/>
        </linearGradient>
        <linearGradient id="sheen${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.36" stop-color="#fff" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="0.64" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g clip-path="url(#clip${id})">
        ${fillEl(kit)}
        ${knit}
        <rect x="0" y="0" width="300" height="340" fill="url(#sh${id})"/>
        <rect x="0" y="0" width="300" height="340" fill="url(#sheen${id})"/>
        <path d="M122,150 Q128,225 122,296" stroke="#000" stroke-width="4" fill="none" opacity="0.07" stroke-linecap="round"/>
        <path d="M178,150 Q172,225 178,296" stroke="#000" stroke-width="4" fill="none" opacity="0.07" stroke-linecap="round"/>
        <ellipse cx="150" cy="120" rx="46" ry="28" fill="#fff" opacity="0.06"/>
      </g>
      <path d="${BODY}" fill="none" stroke="${trim}" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="${SEAM_L}" fill="none" stroke="${trim}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
      <path d="${SEAM_R}" fill="none" stroke="${trim}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
      <path d="${COLLAR}" fill="none" stroke="${trim}" stroke-width="10" stroke-linecap="round"/>
      <path d="${COLLAR}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <path d="${CUFF_L}" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${CUFF_R}" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // ---- per-nation kits (keyed by the app's nation names) ----
  const S = (base, trim) => ({ pattern: "solid", base, trim });
  const KITS = {
    Argentina: { pattern: "stripes", base: "#74ACDF", stripe: "#FFFFFF", trim: "#0A1A3F" },
    France: S("#1E2A78", "#FFFFFF"),
    Brazil: S("#FCD116", "#00843D"),
    England: S("#FFFFFF", "#0A1A3F"),
    Portugal: S("#A50021", "#006847"),
    Spain: S("#C60B1E", "#FCD116"),
    Germany: S("#FFFFFF", "#111111"),
    Netherlands: S("#F36C21", "#111111"),
    Belgium: S("#C8102E", "#FCD116"),
    Croatia: { pattern: "checker", base: "#FFFFFF", stripe: "#D52B1E", trim: "#0A1A3F" },
    Uruguay: S("#5C9BD6", "#14274E"),
    Italy: S("#1A47B8", "#FFFFFF"),
    Morocco: S("#C1272D", "#006233"),
    Japan: S("#14215B", "#FFFFFF"),
    USA: S("#FFFFFF", "#0A1A3F"),
    "United States": S("#FFFFFF", "#0A1A3F"),
    Mexico: S("#006847", "#FFFFFF"),
    Senegal: S("#FFFFFF", "#00853F"),
    Poland: S("#FFFFFF", "#DC143C"),
    "South Korea": S("#C8102E", "#14215B"),
    Norway: S("#C8102E", "#00205B"),
    Canada: S("#D52B1E", "#FFFFFF"),
    Nigeria: S("#008751", "#FFFFFF"),
    Cameroon: S("#007A5E", "#FCD116"),
    Egypt: S("#CE1126", "#FFFFFF"),
    Algeria: S("#FFFFFF", "#007A3D"),
    Sweden: S("#FFCD00", "#1E4FA0"),
    Denmark: S("#C8102E", "#FFFFFF"),
    Scotland: S("#14274E", "#FFFFFF"),
    Wales: S("#C8102E", "#FFFFFF"),
    Australia: S("#FFCD00", "#00843D"),
    Iran: S("#FFFFFF", "#C8102E"),
    Qatar: S("#7A1F3D", "#FFFFFF"),
    "Saudi Arabia": S("#FFFFFF", "#006C35"),
    Ecuador: S("#FFD100", "#1E4FA0"),
    Colombia: S("#FCD116", "#1E4FA0"),
    Chile: S("#D52B1E", "#0039A6"),
    Hungary: S("#CE2939", "#FFFFFF"),
    Georgia: S("#FFFFFF", "#E2231A"),
    Serbia: S("#C6363C", "#0C4076"),
    Switzerland: S("#D52B1E", "#FFFFFF"),
    Ghana: S("#FFFFFF", "#CE1126"),
    Slovenia: S("#FFFFFF", "#005DA4"),
    Russia: S("#FFFFFF", "#0039A6"),
    "Ivory Coast": S("#FF7900", "#007A3D"),
    "Côte d'Ivoire": S("#FF7900", "#007A3D"),
    Tunisia: S("#E70013", "#FFFFFF"),
    "Costa Rica": S("#CE1126", "#002B7F"),
    Austria: S("#ED2939", "#FFFFFF"),
    Bosnia: S("#1A4FA0", "#FCD116"),
    "Bosnia & Herzegovina": S("#1A4FA0", "#FCD116"),
    "Türkiye": S("#E30A17", "#FFFFFF"),
    Turkey: S("#E30A17", "#FFFFFF"),
    Czechia: S("#D7141A", "#FFFFFF"),
    "Czech Republic": S("#D7141A", "#FFFFFF"),
    Paraguay: { pattern: "stripes", base: "#D52B1E", stripe: "#FFFFFF", trim: "#14274E" },
    "Cape Verde": S("#1A4FA0", "#CE1126"),
    "South Africa": S("#FCB514", "#007A4D"),
    "DR Congo": S("#2477C9", "#CE1126"),
    Jordan: S("#FFFFFF", "#CE1126"),
    Uzbekistan: S("#FFFFFF", "#1565C0"),
    Iraq: S("#FFFFFF", "#CE1126"),
    "Curaçao": S("#1A4FA0", "#FCD116"),
    Curacao: S("#1A4FA0", "#FCD116"),
    Haiti: S("#14387F", "#D21034"),
    Panama: S("#DA121A", "#072357"),
    "New Zealand": S("#111111", "#FFFFFF"),
  };

  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
  }
  // fallback: derive a kit from the simplified flag bands
  function fallbackKit(nation) {
    const bands = (window.WCC2 && window.WCC2.NATIONS && window.WCC2.NATIONS[nation]) || ["#6B7280", "#9AA3B2", "#6B7280"];
    let base = bands[0];
    if (isLight(base) && !isLight(bands[1])) base = bands[1];
    let trim = bands.find((c) => c.toLowerCase() !== base.toLowerCase()) || "#111111";
    return { pattern: "solid", base, trim };
  }
  function kitFor(nation) {
    return KITS[nation] || fallbackKit(nation);
  }

  // inject svg sizing once
  if (!document.getElementById("wc-jersey-style")) {
    const st = document.createElement("style");
    st.id = "wc-jersey-style";
    st.textContent = ".wc-jersey{width:110%;height:119%;display:flex;align-items:center;justify-content:center}.wc-jersey svg{width:100%;height:100%;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}";
    document.head.appendChild(st);
  }

  function WCJersey({ nation, className }) {
    const html = React.useMemo(() => buildJerseySVG(kitFor(nation)), [nation]);
    return React.createElement("div", {
      className: "wc-jersey " + (className || ""),
      title: nation,
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  window.buildJerseySVG = buildJerseySVG;
  window.kitForNation = kitFor;
  window.WCJersey = WCJersey;
})();
