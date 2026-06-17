// WORLD CUP CLASH — Design System: Components
const { Section, Sub, Note, Code, Frame, Tile, dsSamples, dsTactics, PCard, TCard } = window;

function Components() {
  const [modal, setModal] = useState(null);
  return (
    <React.Fragment>
      {/* ============ BUTTONS ============ */}
      <Section id="buttons" eyebrow="Components" title="Buttons"
        lede="Three weights of intent. Gold is the primary call to action on menus and rewards; purple is the standard action; ghost is secondary. Hover darkens one step — no shrink on press.">
        <div className="ds-grid cols-3">
          <Tile label="Gold — primary CTA" sub="Start a run · reward confirm" center>
            <button className="btn btn-gold">Start a run</button>
            <button className="btn btn-gold btn-big">Kick off</button>
          </Tile>
          <Tile label="Brand — standard action" sub="Quick run · commit · reveal" center>
            <button className="btn btn-primary">Quick run</button>
            <button className="btn btn-primary" disabled>Disabled</button>
          </Tile>
          <Tile label="Ghost — secondary" sub="How to play · cancel · back" center>
            <button className="btn btn-ghost">How to play</button>
            <button className="btn btn-ghost btn-big">Back</button>
          </Tile>
        </div>
        <Note>Classes: <Code>.btn</Code> + <Code>.btn-gold</Code> / <Code>.btn-primary</Code> / <Code>.btn-ghost</Code>, optional <Code>.btn-big</Code>. Radius 10–12px, weight 700, 200ms transitions.</Note>
      </Section>

      {/* ============ PLAYER CARD ============ */}
      <Section id="player-card" eyebrow="Components" title="Player card"
        lede="The hero object. A 1 : 1.42 portrait with a metallic rarity surface, rating + position, nation flag, role silhouette, name and the ATK · DEF stat row. Stamina cost sits top-left; rarity multiplier bottom-left.">
        <Frame center caption={<span><b>Anatomy</b> — cost chip · rarity multiplier · captain band · rating/position · flag · silhouette · name · ATK·DEF. Click any card for its detail modal.</span>}>
          <div onClick={() => setModal({ card: dsSamples.legendary, isCaptain: true })}>
            <PCard card={dsSamples.legendary} size={196} isCaptain showSlots showMult onClick={() => setModal({ card: dsSamples.legendary, isCaptain: true })} />
          </div>
        </Frame>

        <Sub>Rarity surfaces</Sub>
        <Note>Set via <Code>data-rarity</Code> on <Code>.wcard</Code>. Rarity also drives slot cost (common 0 → legendary 3) and a stat multiplier badge (rare ×1.1 → legendary ×1.3).</Note>
        <Frame center caption="common · rare · epic · legendary · keeper (DEF-only)">
          {[dsSamples.common, dsSamples.rare, dsSamples.epic, dsSamples.legendary, dsSamples.keeper].map((c, i) => (
            <PCard key={i} card={c} size={150} showSlots showMult onClick={() => setModal({ card: c })} />
          ))}
        </Frame>

        <Sub>Frame variants</Sub>
        <Note>Wrap a region in <Code>.frame-modern</Code>, <Code>.frame-retro</Code> or <Code>.frame-night</Code> to re-skin every card inside it. Default (classic) needs no wrapper.</Note>
        <div className="ds-grid cols-4">
          {[["Classic", ""], ["Modern", "frame-modern"], ["Retro", "frame-retro"], ["Night", "frame-night"]].map(([nm, cls]) => (
            <div key={nm}>
              <div className={cls} style={{ display: "flex", justifyContent: "center", padding: "20px 0", background: "var(--night-1)", border: "1px solid var(--line)", borderRadius: 12 }}>
                <PCard card={dsSamples.epic} size={140} showSlots />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, textAlign: "center" }}>{nm}{cls && <span style={{ color: "var(--txt-dim)", fontWeight: 500 }}> · .{cls}</span>}</div>
            </div>
          ))}
        </div>

        <Sub>States & overlays</Sub>
        <Frame center caption="captain band · booked · injured · selected ring · unaffordable · face-down back">
          <PCard card={dsSamples.defender} size={132} isCaptain showSlots />
          <PCard card={dsSamples.rare} size={132} status={{ booked: true }} showSlots />
          <PCard card={dsSamples.epic} size={132} status={{ injured: true }} showSlots />
          <div className="fan-card selected" style={{ width: 132 }}><PCard card={dsSamples.legendary} size={132} /></div>
          <div className="fan-card unaffordable" style={{ width: 132 }}><PCard card={dsSamples.common} size={132} /></div>
          <PCard card={dsSamples.epic} size={132} faceDown />
        </Frame>
      </Section>

      {/* ============ TACTIC CARD ============ */}
      <Section id="tactic-card" eyebrow="Components" title="Tactic card"
        lede="Same footprint as a player card but content-led: a category eyebrow, a glyph in a ringed disc, a name and rules text. Three categories carry their own accent — instant (red), skill (blue), power (gold).">
        <Frame center caption={<span>Set via <Code>data-cat</Code>. instant = reactive interrupts · skill = one-off plays · power = persistent buffs.</span>}>
          {[dsTactics.instant, dsTactics.skill, dsTactics.power].map((c, i) => (
            <TCard key={i} card={c} size={168} showSlots onClick={() => setModal({ card: c })} />
          ))}
        </Frame>
      </Section>

      {/* ============ CARD BACK & DECK PILES ============ */}
      <Section id="deck" eyebrow="Components" title="Card back & deck piles"
        lede="The shared WC back marks any face-down card. Flanking the hand, draw and discard piles show live counts and pulse when dealt from or swept into.">
        <Frame center caption="card back · draw pile · discard pile · empty pile">
          <PCard card={dsSamples.epic} size={132} faceDown />
          <div className="deckpile5 draw" style={{ position: "static" }}>
            <div className="dp-stack" style={{ "--dw": "72px" }}>
              <div className="dp-card" style={{ transform: "translate(-3px,-3px)" }} />
              <div className="dp-card"><div className="dp-mark">WC</div></div>
            </div>
            <div className="dp-meta"><span className="dp-lab">Draw</span><span className="dp-count">18</span></div>
          </div>
          <div className="deckpile5 discard" style={{ position: "static" }}>
            <div className="dp-stack" style={{ "--dw": "72px" }}>
              <div className="dp-card"><div className="dp-mark">WC</div></div>
            </div>
            <div className="dp-meta"><span className="dp-lab">Discard</span><span className="dp-count">6</span></div>
          </div>
          <div className="deckpile5" style={{ position: "static" }}>
            <div className="dp-stack" style={{ "--dw": "72px" }}><div className="dp-card empty" /></div>
            <div className="dp-meta"><span className="dp-lab">Empty</span><span className="dp-count">0</span></div>
          </div>
        </Frame>
      </Section>

      {/* ============ CRESTS & FLAGS ============ */}
      <Section id="crests" eyebrow="Components" title="Crests & flags"
        lede="Nations are reduced to three-band striped chips. The round crest stamps a World Cup year; the player crest is a purple radial monogram.">
        <Frame center caption="nation crest (with year) · flag chips · player crest · AI crest">
          <MiniCrest cols={["#74ACDF", "#fff", "#74ACDF"]} size={54} year="'26" />
          <MiniCrest cols={["#0055A4", "#fff", "#EF4135"]} size={54} year="'26" />
          <span className="flag" style={{ width: 44, height: 30 }}>{["#009B3A", "#FEDF00", "#009B3A"].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
          <span className="flag" style={{ width: 44, height: 30 }}>{["#C8102E", "#fff", "#C8102E"].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
          <span className="crest">YOU</span>
          <span className="crest ai">AI</span>
        </Frame>
      </Section>

      {/* ============ CHIPS, TAGS & BADGES ============ */}
      <Section id="chips" eyebrow="Components" title="Chips, tags & badges"
        lede="Pill-shaped metadata. Count chips carry live numbers; status chips animate (flame, stoppage); stage and rarity badges classify a match or card.">
        <div className="ds-grid cols-2">
          <Tile label="Count & status chips">
            <span className="chip">Hand <b>5</b></span>
            <span className="chip">Stamina <b>7</b></span>
            <span className="chip flame">On a roll</span>
            <span className="chip stoppage">Stoppage</span>
            <span className="cap-chip5 full">Cards this round <b>3 / 3</b></span>
          </Tile>
          <Tile label="Tags & formation">
            <span className="stage-tag">Round of 16</span>
            <span className="fchip" data-f="offensive">Offensive</span>
            <span className="fchip" data-f="defensive">Defensive</span>
            <span className="ramp-hint5">+1 stamina ramp</span>
          </Tile>
          <Tile label="Tactic shelf chips" sub="played tactics, colour-keyed by category">
            <div className="shelf">
              <span className="label">You</span>
              <span className="tchip" data-cat="instant">VAR Review</span>
              <span className="tchip" data-cat="skill">Catenaccio</span>
              <span className="tchip" data-cat="power">Fortress</span>
              <span className="tchip cancelled" data-cat="skill">Nutmeg</span>
            </div>
          </Tile>
          <Tile label="Tier stars" sub="opponent difficulty">
            <span className="tier-stars">{Array.from({ length: 5 }).map((_, i) => <i key={i} className={i > 2 ? "off" : ""} />)}</span>
            <span className="tier-stars">{Array.from({ length: 5 }).map((_, i) => <i key={i} className={i > 0 ? "off" : ""} />)}</span>
          </Tile>
        </div>
      </Section>

      {modal && (
        <CardModal2 card={modal.card} isCaptain={modal.isCaptain} showMult={modal.card.type === "player"} onClose={() => setModal(null)} />
      )}
    </React.Fragment>
  );
}
window.Components = Components;
