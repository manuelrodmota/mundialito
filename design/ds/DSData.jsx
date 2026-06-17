// WORLD CUP CLASH — Design System: Data model & React component API
const { Section, Sub, Note, Code, TokenTable } = window;

function Pre({ children }) {
  return <div className="ds-code"><pre><code>{children}</code></pre></div>;
}

function DataModel() {
  return (
    <React.Fragment>
      <Section id="data-model" eyebrow="Implementation" title="Data model"
        lede="Two card types share a footprint but differ in payload. Player cards carry stats and a nation; tactic cards carry a category, an effect kind and rules text. Derived fields (rarity, slots, cost, stats) come from a player's overall rating.">

        <Sub>Player card</Sub>
        <Pre>{`type PlayerCard = {
  id: string;            // "p12"
  type: "player";
  name: string;          // "Mbappé"
  nation: string;        // "France" — keys into NATIONS for the flag
  worldCup: number;      // 2026
  position: "GK" | "DEF" | "MID" | "FWD";
  overall: number;       // 0–99 — the source of every derived stat
  atk: number;           // derived from position + overall
  def: number;           // derived from position + overall
  cost: number;          // 1–5 stamina to field
  rarity: "common" | "rare" | "epic" | "legendary";
  slots: number;         // deck-building cost: 0 / 1 / 2 / 3
};`}</Pre>

        <Sub>Tactic card</Sub>
        <Pre>{`type TacticCard = {
  id: string;            // "t_var"
  type: "tactic";
  name: string;          // "VAR Review"
  category: "instant" | "skill" | "power";
  cost: number;          // stamina to play
  slots: number;         // 1 / 2 / 3
  rarity: "rare" | "epic" | "legendary";  // = f(slots)
  effect: { kind: string; /* + gate fields */ };
  text: string;          // rules copy shown on the card
};`}</Pre>

        <Sub>Derivation rules</Sub>
        <Note>Keep these centralised so a card's look and its balance never drift apart. From <Code>js/data2.js</Code>:</Note>
        <Pre>{`// rarity from overall rating
rarityOf(o) = o >= 92 ? "legendary"
            : o >= 87 ? "epic"
            : o >= 80 ? "rare"
            : "common";

// deck-build slot cost by rarity
SLOTS = { common: 0, rare: 1, epic: 2, legendary: 3 };

// stamina cost by rating band
costOf(o) = o <= 69 ? 1 : o <= 79 ? 2 : o <= 86 ? 3 : o <= 92 ? 4 : 5;

// ATK / DEF split by position (of overall)
statsOf(pos, o) =
  pos === "FWD" ? [o,            round(o*0.55)] :   // lethal, leaky
  pos === "MID" ? [round(o*0.85), round(o*0.78)] :  // balanced
  pos === "DEF" ? [round(o*0.55), o] :              // a wall
                  [0,            o + 5];            // GK — DEF only

// tactic rarity from slots
T.rarity = slots >= 3 ? "legendary" : slots === 2 ? "epic" : "rare";`}</Pre>

        <Sub>Rarity → visuals → gameplay</Sub>
        <TokenTable cols={["Rarity", "data-rarity", "Slots", "Stat ×", "Surface"]} rows={[
          [{ node: <b>Common</b> }, { node: "common", cls: "tok" }, "0", "×1.0", { node: <span><span className="dot" style={{ background: "linear-gradient(155deg,#d9dde3,#8a93a0)" }} />silver</span> }],
          [{ node: <b>Rare</b> }, { node: "rare", cls: "tok" }, "1", "×1.1", { node: <span><span className="dot" style={{ background: "linear-gradient(155deg,#5aa7e8,#1b3f86)" }} />blue</span> }],
          [{ node: <b>Epic</b> }, { node: "epic", cls: "tok" }, "2", "×1.2", { node: <span><span className="dot" style={{ background: "linear-gradient(155deg,#b07ae8,#4d2386)" }} />purple</span> }],
          [{ node: <b>Legendary / Icon</b> }, { node: "legendary", cls: "tok" }, "3", "×1.3", { node: <span><span className="dot" style={{ background: "linear-gradient(155deg,#f6e3a1,#a87d23)" }} />gold</span> }],
          [{ node: <b>Event</b> }, { node: "event", cls: "tok" }, "—", "—", { node: <span><span className="dot" style={{ background: "linear-gradient(155deg,#f06a6a,#7f1212)" }} />red</span> }],
        ]} />
      </Section>

      <Section id="react-api" eyebrow="Implementation" title="React component API"
        lede="The render layer is two presentational components — PCard and TCard — plus an AnyCard switch and a CardModal2 detail view. They're pure: pass a card object and flags, get a card. All sizing flows from one prop.">

        <Sub>Card components</Sub>
        <Pre>{`<PCard
  card={card}            // PlayerCard
  size={168}             // px width; height = size × 1.42 (--card-ratio)
  isCaptain={false}      // shows the CAPTAIN band
  status={{ booked, injured }}   // optional status overlays
  faceDown={false}       // renders the WC card back
  showSlots={false}      // slot pips bottom-right
  showMult={false}       // rarity ×multiplier badge bottom-left
  onClick={fn}           // makes it .clickable (hover lift)
  className=""           // extra classes (selected / unaffordable / dim …)
/>

<TCard card={tactic} size={168} showSlots onClick={fn} />

<AnyCard card={card} … />   // dispatches on card.type
<CardModal2 card={card} isCaptain showMult onClose={fn} />`}</Pre>

        <Sub>Sizing — one variable, everywhere</Sub>
        <Note>A card has no fixed dimensions. Set <Code>--cw</Code> (card width) and the entire card — frame, fonts, cost chip, badges — scales from it via <Code>calc()</Code>. Pass <Code>size</Code> and the component writes the variable for you.</Note>
        <Pre>{`.wcard { width: var(--cw, 168px); height: calc(var(--cw) * 1.42); }
.wcard .rating { font-size: calc(var(--cw) * 0.19); }
.wcard .cost   { width: calc(var(--cw) * 0.21); … }

// React just sets the variable:
<div className="wcard" style={{ "--cw": size + "px" }}>`}</Pre>
        <Note>Common sizes in use: hand <b>116px</b>, lanes <b>92–100px</b>, builder grid <b>150px</b>, detail modal <b>230px</b>, deck pile back <b>70px</b>.</Note>

        <Sub>Theming with tokens</Sub>
        <Pre>{`// 1. import the foundation once, before component CSS
@import "design-system/tokens.css";

// 2. components read var(--token); never hard-code a hex
.btn-primary { background: var(--brand-grad); }
.morale-bar i.low { background: linear-gradient(90deg, var(--bad), #f0907f); }

// 3. re-skin a whole region by wrapping it:
<div className="frame-night"> … cards render in dark glass … </div>`}</Pre>

        <Sub>File map</Sub>
        <TokenTable cols={["Layer", "File(s)", "Owns"]} rows={[
          [{ node: <b>Tokens</b> }, { node: "design-system/tokens.css", cls: "tok" }, { node: "all colours, type, spacing, motion", cls: "desc" }],
          [{ node: <b>Foundations</b> }, { node: "css/base.css", cls: "tok" }, { node: "reset, buttons, menu, modal, backdrop", cls: "desc" }],
          [{ node: <b>Cards</b> }, { node: "css/cards.css", cls: "tok" }, { node: ".wcard frames, rarities, variants", cls: "desc" }],
          [{ node: <b>Board</b> }, { node: "css/board.css + v2…v6.css", cls: "tok" }, { node: "lanes, scoreboard, meters, juice", cls: "desc" }],
          [{ node: <b>Data</b> }, { node: "js/data*.js", cls: "tok" }, { node: "pool, derivations, tactics, nations", cls: "desc" }],
          [{ node: <b>Components</b> }, { node: "jsx/Card2.jsx, Board*.jsx", cls: "tok" }, { node: "PCard / TCard / widgets", cls: "desc" }],
        ]} />
      </Section>
    </React.Fragment>
  );
}
window.DataModel = DataModel;
