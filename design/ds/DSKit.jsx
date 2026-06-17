// WORLD CUP CLASH — Design System: shared kit (helpers + sample data)
// Note: useState/useEffect are already declared globally by jsx/Card2.jsx
// (loaded first). Re-declaring them here would be a global const collision.

/* ---------- sample card objects (shape matches js/data2.js PLAYERS / TACTICS) ---------- */
const dsSamples = {
  legendary: { type: "player", name: "Mbappé", nation: "France", worldCup: 2026, position: "FWD", overall: 97, atk: 97, def: 53, cost: 5, rarity: "legendary", slots: 3 },
  epic: { type: "player", name: "De Bruyne", nation: "Belgium", worldCup: 2026, position: "MID", overall: 90, atk: 77, def: 70, cost: 4, rarity: "epic", slots: 2 },
  rare: { type: "player", name: "Pulisic", nation: "USA", worldCup: 2026, position: "FWD", overall: 85, atk: 85, def: 47, cost: 3, rarity: "rare", slots: 1 },
  common: { type: "player", name: "Borjan", nation: "Canada", worldCup: 2022, position: "GK", overall: 74, atk: 0, def: 79, cost: 2, rarity: "common", slots: 0 },
  keeper: { type: "player", name: "Courtois", nation: "Belgium", worldCup: 2026, position: "GK", overall: 91, atk: 0, def: 96, cost: 4, rarity: "epic", slots: 2 },
  defender: { type: "player", name: "Van Dijk", nation: "Netherlands", worldCup: 2026, position: "DEF", overall: 89, atk: 49, def: 89, cost: 4, rarity: "epic", slots: 2 },
};
const dsTactics = {
  instant: { type: "tactic", name: "VAR Review", category: "instant", cost: 2, slots: 2, rarity: "epic", effect: { kind: "var" }, text: "Cancel the opponent's biggest Tactic this round. If they played none, void their highest-rated revealed player instead." },
  skill: { type: "tactic", name: "Catenaccio", category: "skill", cost: 2, slots: 1, rarity: "rare", effect: { kind: "catenaccio" }, text: "Park the bus: +50% DEF total this round." },
  power: { type: "tactic", name: "Hand of God", category: "power", cost: 3, slots: 3, rarity: "legendary", effect: { kind: "handOfGod" }, text: "Once per match: this round, your attack ignores their defense entirely." },
};

/* ---------- layout helpers ---------- */
function Section({ id, eyebrow, title, lede, children }) {
  return (
    <section className="ds-section" id={id}>
      <div className="head">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children}
    </section>
  );
}
function Sub({ children }) { return <div className="ds-sub">{children}</div>; }
function Note({ children }) { return <p className="ds-note">{children}</p>; }
function Code({ children }) { return <code className="ds-inline-code">{children}</code>; }

function Frame({ children, caption, pitch, center }) {
  return (
    <div className="ds-frame">
      <div className={"stage" + (pitch ? " pitch-bg" : "") + (center ? " center" : "")}>{children}</div>
      {caption && <div className="caption">{caption}</div>}
    </div>
  );
}

function Tile({ label, sub, center, children }) {
  return (
    <div className="ds-tile">
      <div className={"demo" + (center ? " center" : "")}>{children}</div>
      <div className="lbl">{label}{sub && <span>{sub}</span>}</div>
    </div>
  );
}

/* ---------- color swatch ---------- */
function Swatch({ name, value, token, style }) {
  return (
    <div className="swatch">
      <div className="chip" style={style || { background: value }}></div>
      <div className="info">
        <div className="nm">{name}</div>
        {value && <div className="val">{value}</div>}
        {token && <div className="tok">{token}</div>}
      </div>
    </div>
  );
}

/* ---------- token table ---------- */
function TokenTable({ cols, rows }) {
  return (
    <table className="ds-table">
      <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((cell, j) => <td key={j} className={cell && cell.cls}>{cell && cell.node !== undefined ? cell.node : cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- code block with light syntax tinting ---------- */
function CodeBlock({ children }) {
  return (
    <div className="ds-code"><pre><code dangerouslySetInnerHTML={{ __html: children }} /></pre></div>
  );
}

/* crest used in scoreboard / strips */
function MiniCrest({ cols = ["#74ACDF", "#fff", "#74ACDF"], size = 46, year }) {
  return (
    <span className="crest3" style={{ "--cs": size + "px" }}>
      {cols.map((c, i) => <i key={i} style={{ background: c }} />)}
      {year && <span className="yr">{year}</span>}
    </span>
  );
}

Object.assign(window, { dsSamples, dsTactics, Section, Sub, Note, Code, Frame, Tile, Swatch, TokenTable, CodeBlock, MiniCrest });
