// WORLD CUP CLASH — Design System: Foundations
const { Section, Sub, Note, Code, Frame, Swatch, TokenTable } = window;

function ColorBlock({ title, note, swatches }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <Sub>{title}</Sub>
      {note && <Note>{note}</Note>}
      <div className="ds-grid cols-4">
        {(swatches || []).map((s, i) => <Swatch key={i} {...s} />)}
      </div>
    </div>
  );
}

function Foundations() {
  return (
    <React.Fragment>
      {/* ============ COLOR ============ */}
      <Section id="color" eyebrow="Foundations" title="Color"
        lede="The UI is ~85% night-gray. Purple is the interactive accent (one CTA per view); gold is the trophy accent — captains, wins, the gameplay highlight. Surfaces are flat; the only gradients live on cards, buttons and meters.">

        <ColorBlock title="Surfaces — the night palette"
          note={<span>Darkest to lightest. <Code>--night-0</Code> is the page; <Code>--night-2</Code> is every panel, card and input.</span>}
          swatches={[
            { name: "Night 0", value: "#07090F", token: "--night-0" },
            { name: "Night 1", value: "#0C101A", token: "--night-1" },
            { name: "Night 2", value: "#131826", token: "--night-2" },
            { name: "Night 3", value: "#1C2334", token: "--night-3" },
          ]} />

        <ColorBlock title="Text & lines"
          swatches={[
            { name: "Text", value: "#EEF0F6", token: "--txt" },
            { name: "Text dim", value: "#98A0B3", token: "--txt-dim" },
            { name: "Hairline", value: "rgba(255,255,255,.10)", token: "--line", style: { background: "#131826", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.10)" } },
          ]} />

        <ColorBlock title="Brand & accent"
          note="Purple marks anything interactive or active. Gold marks reward, captaincy and the focus/selection ring. Never let both compete in one region.">
          <div />
        </ColorBlock>
        <div className="ds-grid cols-4" style={{ marginTop: -18, marginBottom: 30 }}>
          <Swatch name="Brand" value="#7F56D9" token="--brand" />
          <Swatch name="Brand gradient" token="--brand-grad" style={{ background: "linear-gradient(180deg,#8f68e3,#6941c6)" }} />
          <Swatch name="Gold" value="#E8C873" token="--gold" />
          <Swatch name="Gold gradient" token="--gold-grad" style={{ background: "linear-gradient(180deg,#f0d68a,#c89a2e)" }} />
        </div>

        <ColorBlock title="Semantic & stat inks"
          note="Mapped onto Hiedra's success / error / warning / info. ATK is red, DEF is blue — used everywhere stats appear.">
          <div />
        </ColorBlock>
        <div className="ds-grid cols-4" style={{ marginTop: -18, marginBottom: 30 }}>
          <Swatch name="Good / success" value="#3FBF6F" token="--good" />
          <Swatch name="Bad / damage" value="#E8554A" token="--bad" />
          <Swatch name="Warn / fatigue" value="#FF9E50" token="--warn" />
          <Swatch name="Info / defense" value="#58A9FF" token="--info" />
          <Swatch name="ATK" value="#FF5F4E" token="--atk" />
          <Swatch name="DEF" value="#58A9FF" token="--def" />
        </div>

        <ColorBlock title="Pitch greens"
          swatches={[
            { name: "Pitch bright", value: "#277249", token: "--pitch-bright" },
            { name: "Pitch", value: "#1E5C38", token: "--pitch" },
            { name: "Pitch deep", value: "#17452C", token: "--pitch-deep" },
            { name: "Pitch line", value: "rgba(255,255,255,.16)", token: "--pitch-line", style: { background: "#1e5c38", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.4)" } },
          ]} />

        <ColorBlock title="Position tints"
          note="Drive the player silhouette and any role coding.">
          <div />
        </ColorBlock>
        <div className="ds-grid cols-4" style={{ marginTop: -18, marginBottom: 30 }}>
          <Swatch name="GK" value="#F2C14E" token="--pos-gk" />
          <Swatch name="DEF" value="#6EA8E8" token="--pos-def" />
          <Swatch name="MID" value="#7FD99A" token="--pos-mid" />
          <Swatch name="FWD" value="#EF8A7C" token="--pos-fwd" />
        </div>

        <ColorBlock title="Card rarity surfaces"
          note={<span>The diagonal metallic gradient painted on each card's inner face, keyed by <Code>data-rarity</Code>. Each has a matching ink colour for legible text.</span>}>
          <div />
        </ColorBlock>
        <div className="ds-grid cols-3" style={{ marginTop: -18 }}>
          <Swatch name="Common · silver" token="--rar-common" style={{ background: "linear-gradient(155deg,#d9dde3,#aab2bd 38%,#8a93a0 60%,#c4cad3)" }} />
          <Swatch name="Rare · blue" token="--rar-rare" style={{ background: "linear-gradient(155deg,#5aa7e8,#2a64b8 40%,#1b3f86 65%,#3f83d6)" }} />
          <Swatch name="Epic · purple" token="--rar-epic" style={{ background: "linear-gradient(155deg,#b07ae8,#7a3fc0 40%,#4d2386 65%,#9257d8)" }} />
          <Swatch name="Legendary / Icon · gold" token="--rar-legendary" style={{ background: "linear-gradient(155deg,#f6e3a1,#d9b04f 38%,#a87d23 62%,#edd78f)" }} />
          <Swatch name="Event · red" token="--rar-event" style={{ background: "linear-gradient(155deg,#f06a6a,#b91c1c 45%,#7f1212 70%,#e25555)" }} />
        </div>
      </Section>

      {/* ============ TYPOGRAPHY ============ */}
      <Section id="type" eyebrow="Foundations" title="Typography"
        lede="Inter, weights 400–800. Display sizes use tight tracking; stats and scores use tabular figures. Eyebrows and tags are uppercase with wide tracking. No light weights, ever.">
        <div className="ds-frame"><div className="stage" style={{ display: "block", padding: "20px 40px" }}>
          {[
            { nm: "Display", det: "800 · 84px · -0.03em", el: <div style={{ fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", lineHeight: 1, background: "linear-gradient(180deg,#fff 30%,#b6bdd1)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>World Cup Clash</div> },
            { nm: "Title", det: "800 · 34px · -0.02em", el: <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em" }}>Group stage — match 1</div> },
            { nm: "Heading / H2", det: "800 · 24px", el: <div style={{ fontWeight: 800, fontSize: 24 }}>Build your XI</div> },
            { nm: "Sub-heading / H3", det: "700 · 20px", el: <div style={{ fontWeight: 700, fontSize: 20 }}>Your picks</div> },
            { nm: "Body large", det: "500 · 17px · lh 1.4", el: <div style={{ fontWeight: 500, fontSize: 17, color: "var(--txt-dim)" }}>Pick an XI. Create chances, convert your xG, score goals.</div> },
            { nm: "Body", det: "400 · 15px · lh 1.5", el: <div style={{ fontSize: 15, color: "var(--txt-dim)" }}>First to three wins. Survive seven matches against history's great teams.</div> },
            { nm: "Small / hint", det: "500 · 13px", el: <div style={{ fontSize: 13, color: "var(--txt-dim)" }}>Drag a card onto a lane to commit it.</div> },
            { nm: "Eyebrow / tag", det: "800 · 11px · 0.16em · UPPER", el: <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--brand)" }}>Round of 16</div> },
            { nm: "Numeric / score", det: "800 · tabular-nums", el: <div style={{ fontWeight: 800, fontSize: 34, fontVariantNumeric: "tabular-nums" }}>2 — 1</div> },
          ].map((r, i) => (
            <div className="ds-type-row" key={i}>
              <div className="spec"><div className="nm">{r.nm}</div><div className="det">{r.det}</div></div>
              <div className="sample">{r.el}</div>
            </div>
          ))}
        </div></div>
      </Section>

      {/* ============ SPACING ============ */}
      <Section id="spacing" eyebrow="Foundations" title="Spacing"
        lede="Everything is a multiple of 4px. Layouts breathe — 80px page padding on desktop, 16–24px inside mobile-scale chrome. Cards never touch: 16px minimum gap.">
        <div className="ds-frame"><div className="stage" style={{ display: "block", padding: "28px 40px" }}>
          {[["space-1", 4], ["space-2", 8], ["space-3", 12], ["space-4", 16], ["space-5", 20], ["space-6", 24], ["space-8", 32], ["space-10", 40], ["space-12", 48], ["space-16", 64], ["space-20", 80]].map(([t, px]) => (
            <div className="ds-space-row" key={t}>
              <div className="bar" style={{ width: px }} />
              <div className="lab"><b>{px}px</b><span>--{t}</span></div>
            </div>
          ))}
        </div></div>
      </Section>

      {/* ============ RADII ============ */}
      <Section id="radii" eyebrow="Foundations" title="Radii"
        lede="Inputs and buttons round at 8–10px; cards and lanes at 12px; modals at 16px; chips and crests are full pills.">
        <div className="ds-grid cols-3">
          {[["sm", 4, "tags, sticker frames"], ["md", 8, "inputs, ghost buttons"], ["lg", 10, "buttons, pick slots"], ["xl", 12, "cards, lanes, big buttons"], ["2xl", 16, "modals, panels"], ["full", 999, "chips, crests, meters"]].map(([n, px, use]) => (
            <div key={n}>
              <div className="ds-radius-box" style={{ borderRadius: px > 100 ? 48 : px }}>{px > 100 ? "999px" : px + "px"}</div>
              <div style={{ fontSize: 12.5, marginTop: 8 }}><b style={{ fontWeight: 700 }}>--radius-{n}</b> <span style={{ color: "var(--txt-dim)" }}>· {use}</span></div>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ SHADOWS ============ */}
      <Section id="shadow" eyebrow="Foundations" title="Elevation & glow"
        lede="Soft, layered, dark-friendly. Cards carry an inner top highlight plus an outer drop. Selection and reward states glow gold rather than darken.">
        <div className="ds-grid cols-3">
          {[
            ["--shadow-card", "0 4px 14px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25)"],
            ["--shadow-card-hover", "0 14px 30px rgba(0,0,0,.55)"],
            ["--shadow-panel", "0 18px 50px rgba(0,0,0,.45)"],
            ["--shadow-modal", "0 24px 60px rgba(0,0,0,.6)"],
            ["--shadow-focus-gold", "0 0 0 3px #e8c873"],
            ["--glow-gold", "0 0 22px rgba(232,200,115,.35)"],
          ].map(([t, v]) => (
            <div key={t}>
              <div className="ds-shadow-box" style={{ boxShadow: v }}>{t.replace("--", "")}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ MOTION ============ */}
      <Section id="motion" eyebrow="Foundations" title="Motion"
        lede="Subtle and fast. ease-out for entrances, ease-in-out for transforms; a gentle spring is reserved for card flips and clash slams. Everything respects prefers-reduced-motion.">
        <Sub>Easing</Sub>
        <TokenTable cols={["Token", "Curve", "Use"]} rows={[
          [{ node: "--ease-out", cls: "tok" }, { node: "cubic-bezier(0.16, 1, 0.3, 1)", cls: "val" }, { node: "entrances, deal-in, hovers", cls: "desc" }],
          [{ node: "--ease-in-out", cls: "tok" }, { node: "cubic-bezier(0.4, 0, 0.2, 1)", cls: "val" }, { node: "general transforms", cls: "desc" }],
          [{ node: "--ease-spring", cls: "tok" }, { node: "cubic-bezier(0.2, 0.8, 0.3, 1)", cls: "val" }, { node: "clash pops, score slams", cls: "desc" }],
        ]} />
        <Sub>Duration</Sub>
        <TokenTable cols={["Token", "Value", "Use"]} rows={[
          [{ node: "--dur-micro", cls: "tok" }, { node: "120ms", cls: "val" }, { node: "hover tints, chip toggles", cls: "desc" }],
          [{ node: "--dur-fast", cls: "tok" }, { node: "160ms", cls: "val" }, { node: "card lift / select", cls: "desc" }],
          [{ node: "--dur-base", cls: "tok" }, { node: "220ms", cls: "val" }, { node: "modal pop, readout slide", cls: "desc" }],
          [{ node: "--dur-slow", cls: "tok" }, { node: "420ms", cls: "val" }, { node: "deal-in, deck pulse, shake", cls: "desc" }],
          [{ node: "--dur-reveal", cls: "tok" }, { node: "520ms", cls: "val" }, { node: "card flip reveal", cls: "desc" }],
        ]} />
      </Section>
    </React.Fragment>
  );
}
window.Foundations = Foundations;
