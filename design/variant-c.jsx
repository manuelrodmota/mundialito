// Variant C — "ARCADE STACK"
// Neon-brutalist synthwave arcade: hard offset shadows, thick borders, a glowing
// grid floor, segmented meters, mono readouts. Loud and game-forward.
(function () {
  const { Flag, Bust, PitchLines } = window.WCH;

  const CSS = `
  .vc{font-family:var(--font-sans);color:#EDEAFF;background:#08070D;height:100%;width:100%;
      position:relative;overflow:hidden;}
  .vc::before{content:"";position:absolute;inset:0;background-image:
      linear-gradient(rgba(158,119,237,.07) 1px,transparent 1px),
      linear-gradient(90deg,rgba(158,119,237,.07) 1px,transparent 1px);
      background-size:34px 34px;pointer-events:none;}
  .vc-mono{font-family:var(--font-mono);}
  .vc-ttl{font-weight:800;letter-spacing:.02em;text-transform:uppercase;
      text-shadow:0 0 14px rgba(158,119,237,.7);}
  .vc-chip{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:.06em;
      text-transform:uppercase;padding:8px 12px;border:2px solid #2c2740;color:#9A93C8;
      background:#0E0C18;cursor:pointer;}
  .vc-chip.on{color:#08070D;background:#9E77ED;border-color:#9E77ED;box-shadow:3px 3px 0 #53B1FD;}
  .vc-btn{font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:.06em;
      text-transform:uppercase;color:#EDEAFF;background:#0E0C18;border:2px solid #3a3458;
      padding:10px 16px;cursor:pointer;transition:.12s var(--ease-out);}
  .vc-btn:hover{border-color:#9E77ED;box-shadow:3px 3px 0 #9E77ED;transform:translate(-1px,-1px);}
  .vc-card{position:relative;background:#0D0B16;border:2px solid;cursor:pointer;transition:.12s var(--ease-out);}
  .vc-card:hover{transform:translate(-2px,-2px);}
  .vc-card::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 3px);pointer-events:none;}
  .vc-cta{font-family:var(--font-mono);font-weight:800;letter-spacing:.04em;text-transform:uppercase;
      background:#FEC84B;color:#08070D;border:2px solid #FEC84B;cursor:pointer;
      box-shadow:5px 5px 0 #D92D20;transition:.12s var(--ease-out);}
  .vc-cta:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 #D92D20;}
  .vc-seg{display:flex;gap:3px;}
  .vc-seg>i{flex:1;height:9px;background:#1c1830;}
  `;
  const inject = () => { if (!document.getElementById('vc-css')) { const s = document.createElement('style'); s.id = 'vc-css'; s.textContent = CSS; document.head.appendChild(s); } };

  const NEON = {
    gold:   { c: '#FEC84B', glow: 'rgba(254,200,75,.6)' },
    purple: { c: '#B692F6', glow: 'rgba(158,119,237,.6)' },
    silver: { c: '#9FB3D1', glow: 'rgba(159,179,209,.5)' },
  };

  function CCard({ p }) {
    const n = NEON[p.rarity];
    return (
      <div className="vc-card" style={{ borderColor: n.c, boxShadow: `4px 4px 0 ${n.c}` }}>
        <div style={{ position: 'absolute', top: -10, left: -10, width: 26, height: 26, background: '#17B26A', color: '#08070D', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', border: '2px solid #08070D', boxShadow: '0 0 10px rgba(23,178,106,.8)', zIndex: 2 }} className="vc-mono">{p.slot}</div>
        <div style={{ padding: '12px 12px 11px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="vc-mono" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: n.c, textShadow: `0 0 12px ${n.glow}` }}>{p.r}</div>
              <div className="vc-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7C76A8' }}>{p.pos}</div>
            </div>
            <Flag nation={p.nation} w={22} h={15} radius={0} />
          </div>
          <div style={{ height: 64, display: 'grid', placeItems: 'center', margin: '2px 0' }}><Bust color={n.c} size={58} opacity={.35} /></div>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.02em', borderTop: `2px solid ${n.c}`, paddingTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="vc-mono" style={{ display: 'flex', gap: 10, fontSize: 11.5, fontWeight: 700, marginTop: 5 }}>
            <span style={{ color: '#F97066' }}>ATK {p.atk}</span><span style={{ color: '#53B1FD' }}>DEF {p.def}</span>
          </div>
          <div className="vc-mono" style={{ fontSize: 9, color: '#5e5982', marginTop: 4, letterSpacing: '.04em' }}>{p.nation.toUpperCase()} · {p.wc}</div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- DECK
  function DeckC() {
    inject();
    const D = window.WCH.DECK;
    return (
      <div className="vc" style={{ display: 'flex', flexDirection: 'column', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="vc-mono" style={{ fontSize: 11, letterSpacing: '.3em', color: '#53B1FD', fontWeight: 700 }}>// SQUAD_BUILDER</div>
            <h1 className="vc-ttl" style={{ fontSize: 36, margin: '8px 0 6px', color: '#fff' }}>Pick Your Starting XI</h1>
            <div className="vc-mono" style={{ fontSize: 12, color: '#8b85b8' }}>11 PLAYERS · 10-SLOT BUDGET · 1 TACTICAL · COMMONS FREE</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="vc-btn">Load preset XI</button>
            <button className="vc-btn">Menu</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '22px 0 16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="vc-chip on">Players</span>
          <span className="vc-chip">Tactical cards</span>
          <span className="vc-chip" style={{ minWidth: 150, color: '#5e5982' }}>Search_</span>
          {['World Cups', 'Nations', 'Positions', 'Rarities'].map((f) => <span key={f} className="vc-chip">{f} ▾</span>)}
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 22, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16, alignContent: 'start' }}>
            {D.map((p, i) => <CCard key={i} p={p} />)}
          </div>
          <div style={{ width: 262, flex: '0 0 262px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: '2px solid #3a3458', background: '#0C0A15', padding: 18, boxShadow: '4px 4px 0 #2c2740' }}>
              <div className="vc-mono" style={{ fontSize: 11, letterSpacing: '.2em', color: '#FEC84B', fontWeight: 700, marginBottom: 16 }}>[ CONSOLE ]</div>
              {[['SLOT BUDGET', '00/10', '#FEC84B'], ['STARTING XI', '00/11', '#B692F6']].map(([l, v, col]) => (
                <div key={l} style={{ marginBottom: 16 }}>
                  <div className="vc-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 7 }}><span style={{ color: '#9A93C8' }}>{l}</span><span style={{ color: col }}>{v}</span></div>
                  <div className="vc-seg">{Array.from({ length: 10 }).map((_, i) => <i key={i} />)}</div>
                </div>
              ))}
              <div className="vc-mono" style={{ fontSize: 10, color: '#5e5982', marginTop: 4, letterSpacing: '.04em' }}>ATK_AVG 0 · DEF_AVG 0 · GK 0</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="vc-btn" style={{ flex: 1 }}>Fill commons</button>
              <button className="vc-btn">Clear</button>
            </div>
            <button className="vc-cta" style={{ marginTop: 'auto', padding: '18px 14px', fontSize: 13 }}>0/11 · 0/10 · PICK CAPTAIN</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- BATTLE
  function CardBack({ w = 78, h = 110 }) {
    return (
      <div style={{ width: w, height: h, border: '2px solid #9E77ED', background: 'linear-gradient(160deg,#1a1530,#0c0a18)', display: 'grid', placeItems: 'center', boxShadow: '4px 4px 0 rgba(158,119,237,.45), inset 0 0 22px rgba(158,119,237,.25)' }}>
        <div className="vc-mono" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #B692F6', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: '#EDEAFF', textShadow: '0 0 10px rgba(158,119,237,.9)' }}>WC</div>
      </div>
    );
  }

  function HandCard({ p }) {
    const n = NEON[p.rarity];
    return (
      <div className="vc-card" style={{ width: 110, borderColor: n.c, boxShadow: `4px 4px 0 ${n.c}` }}>
        <div style={{ position: 'absolute', top: -9, left: -9, width: 22, height: 22, background: '#17B26A', color: '#08070D', fontWeight: 800, fontSize: 11, display: 'grid', placeItems: 'center', border: '2px solid #08070D', zIndex: 2 }} className="vc-mono">{p.slot}</div>
        <div style={{ padding: '10px 10px 9px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div className="vc-mono" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: n.c, textShadow: `0 0 10px ${n.glow}` }}>{p.r}</div><div className="vc-mono" style={{ fontSize: 9, color: '#7C76A8', letterSpacing: '.12em' }}>{p.pos}</div></div>
            <Flag nation={p.nation} w={18} h={13} radius={0} />
          </div>
          <div style={{ height: 32, display: 'grid', placeItems: 'center' }}><Bust color={n.c} size={32} opacity={.32} /></div>
          <div style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderTop: `2px solid ${n.c}`, paddingTop: 5 }}>{p.name}</div>
          <div className="vc-mono" style={{ display: 'flex', gap: 7, fontSize: 9.5, fontWeight: 700, marginTop: 3 }}><span style={{ color: '#F97066' }}>A{p.atk}</span><span style={{ color: '#53B1FD' }}>D{p.def}</span></div>
        </div>
        {p.mult && <div className="vc-mono" style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#08070D', border: '2px solid #FEC84B', color: '#FEC84B', fontSize: 10.5, fontWeight: 800, padding: '1px 8px' }}>{p.mult}</div>}
      </div>
    );
  }

  function BattleC() {
    inject();
    const H = window.WCH.HAND, F = window.WCH.FORMATIONS;
    return (
      <div className="vc" style={{ display: 'flex', flexDirection: 'column', padding: '18px 24px 22px' }}>
        {/* HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px solid #3a3458', padding: '7px 12px', background: '#0C0A15' }}>
            <Flag nation="Morocco" w={26} h={18} radius={0} />
            <div><div style={{ fontSize: 12, fontWeight: 800 }}>MAR</div><div className="vc-mono" style={{ fontSize: 9, color: '#7C76A8' }}>2022</div></div>
            <span className="vc-mono" style={{ fontSize: 28, fontWeight: 800, color: '#FEC84B', textShadow: '0 0 12px rgba(254,200,75,.7)' }}>0</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="vc-btn">Draw 9</span><span className="vc-btn">Discard 0</span>
          </div>
          <div style={{ margin: '0 auto', textAlign: 'center', border: '2px solid #9E77ED', padding: '6px 22px', boxShadow: '3px 3px 0 rgba(158,119,237,.5)', background: '#0C0A15' }}>
            <div className="vc-mono" style={{ fontSize: 14, fontWeight: 800, color: '#B692F6', letterSpacing: '.1em' }}>ROUND 01/10</div>
            <div className="vc-mono" style={{ fontSize: 9, color: '#7C76A8', letterSpacing: '.16em' }}>HALFTIME @ 5</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px solid #3a3458', padding: '7px 12px', background: '#0C0A15' }}>
            <span className="vc-mono" style={{ fontSize: 28, fontWeight: 800, color: '#53B1FD', textShadow: '0 0 12px rgba(83,177,253,.7)' }}>0</span>
            <div><div style={{ fontSize: 12, fontWeight: 800 }}>FRA</div><div className="vc-mono" style={{ fontSize: 9, color: '#7C76A8' }}>2022</div></div>
            <Flag nation="France" w={26} h={18} radius={0} />
          </div>
        </div>

        {/* arena */}
        <div style={{ flex: 1, margin: '14px 0', border: '2px solid #2c2740', position: 'relative', overflow: 'hidden', background: 'radial-gradient(110% 80% at 50% 50%, rgba(23,178,106,.13), transparent 68%), radial-gradient(120% 100% at 50% 100%, rgba(158,119,237,.16), transparent 60%), #0A0912' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(83,177,253,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(83,177,253,.10) 1px,transparent 1px)', backgroundSize: '46px 46px' }} />
          <PitchLines stroke="rgba(83,177,253,.6)" sw={2} glow="rgba(83,177,253,.7)" />
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', border: '2px solid #FEC84B', background: '#08070D', padding: '6px 16px', boxShadow: '3px 3px 0 rgba(254,200,75,.4)' }} className="vc-mono">
            <span style={{ color: '#FEC84B', fontWeight: 800, fontSize: 12, letterSpacing: '.08em' }}>OPPONENT</span> <span style={{ color: '#9A93C8', fontSize: 12 }}>DEFENSIVE 5-4-1 · 3 CARDS · 8 STAMINA</span>
          </div>
          <div style={{ position: 'absolute', inset: '54px 22px 22px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[['YOUR DEFENSE', '#53B1FD', []], ['YOUR ATTACK', '#F97066', []], ['THEIR ATTACK', '#F97066', [1]], ['THEIR DEFENSE', '#53B1FD', [1, 2]]].map(([t, col, cards], zi) => (
              <div key={zi} style={{ border: `2px dashed ${col}44`, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: 10 }}>
                  {cards.length ? cards.map((k) => <CardBack key={k} />) : <span className="vc-mono" style={{ color: 'rgba(255,255,255,.22)', fontSize: 12, fontWeight: 700 }}>[ EMPTY ]</span>}
                </div>
                <div className="vc-mono" style={{ textAlign: 'center', padding: '7px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: col, borderTop: `2px solid ${col}44` }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div>
            <div className="vc-mono" style={{ fontSize: 10, letterSpacing: '.2em', color: '#FEC84B', fontWeight: 700, marginBottom: 8 }}>FORMATION</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {F.map((f) => (
                <div key={f.name} style={{ padding: '9px 12px', border: '2px solid', borderColor: f.active ? '#FEC84B' : '#3a3458', background: f.active ? '#FEC84B' : '#0C0A15', color: f.active ? '#08070D' : '#9A93C8', boxShadow: f.active ? '3px 3px 0 #D92D20' : 'none' }}>
                  <div className="vc-mono" style={{ fontWeight: 800, fontSize: 14 }}>{f.name}</div>
                  <div className="vc-mono" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em' }}>{f.tag}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, margin: '0 auto', paddingBottom: 6 }}>
            {H.map((p, i) => <HandCard key={i} p={p} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {Array.from({ length: 8 }).map((_, i) => <span key={i} style={{ width: 10, height: 14, background: '#17B26A', boxShadow: '0 0 6px rgba(23,178,106,.8)' }} />)}
              <span className="vc-mono" style={{ fontSize: 11, color: '#7C76A8', fontWeight: 700, marginLeft: 5 }}>8/8</span>
            </div>
            <button className="vc-cta" style={{ padding: '16px 36px', fontSize: 16 }}>PASS ROUND ▸</button>
          </div>
        </div>
      </div>
    );
  }

  window.DeckC = DeckC;
  window.BattleC = BattleC;
})();
