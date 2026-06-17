// Variant A — "MATCHDAY BROADCAST"
// Live-TV / esports overlay energy: angled lower-thirds, a score bug,
// glossy trading cards, tracking-wide caps. Dark blue-black + purple + gold.
(function () {
  const { Flag, Bust, PitchLines } = window.WCH;

  const CSS = `
  .va{font-family:var(--font-sans);color:#E9EAF2;background:
      radial-gradient(120% 90% at 80% -10%, rgba(127,86,217,.28), transparent 55%),
      radial-gradient(90% 70% at 0% 110%, rgba(20,40,90,.4), transparent 60%),
      #06080F;
      position:relative;overflow:hidden;height:100%;width:100%;}
  .va::before{content:"";position:absolute;inset:0;background-image:
      repeating-linear-gradient(115deg, rgba(255,255,255,.025) 0 2px, transparent 2px 7px);
      pointer-events:none;}
  .va-ey{font-size:11px;letter-spacing:.22em;font-weight:700;text-transform:uppercase;color:#B692F6;}
  .va-live{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;
      letter-spacing:.18em;color:#06080F;background:#FEC84B;padding:4px 10px;
      clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);}
  .va-live i{width:7px;height:7px;border-radius:50%;background:#06080F;animation:vablink 1.1s steps(2) infinite;}
  @keyframes vablink{50%{opacity:.25}}
  .va-slash{clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);}
  .va-btn{font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;color:#E9EAF2;
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
      padding:10px 16px;cursor:pointer;backdrop-filter:blur(8px);transition:.18s var(--ease-out);}
  .va-btn:hover{background:rgba(255,255,255,.12);}
  .va-card{position:relative;overflow:hidden;cursor:pointer;transition:transform .18s var(--ease-out),box-shadow .18s var(--ease-out);}
  .va-card:hover{box-shadow:0 14px 30px -8px rgba(0,0,0,.7);}
  .va-cw{position:relative;transition:transform .18s var(--ease-out);}
  .va-cw:hover{transform:translateY(-4px);}
  .va-card::after{content:"";position:absolute;inset:0;background:
      linear-gradient(125deg, rgba(255,255,255,.32) 0%, transparent 28%, transparent 70%, rgba(255,255,255,.12) 100%);
      mix-blend-mode:overlay;pointer-events:none;}
  .va-seg{font-size:12px;font-weight:700;letter-spacing:.04em;padding:9px 14px;color:#8A90A8;
      cursor:pointer;border-bottom:2px solid transparent;}
  .va-seg.on{color:#fff;border-color:#FEC84B;}
  .va-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;}
  .va-bar>i{display:block;height:100%;border-radius:99px;}
  `;
  const inject = () => { if (!document.getElementById('va-css')) { const s = document.createElement('style'); s.id = 'va-css'; s.textContent = CSS; document.head.appendChild(s); } };

  const RAR = {
    gold:   { face: 'linear-gradient(150deg,#FBD66A,#C8932B)', ink: '#3A2A06', glow: 'rgba(251,214,106,.45)' },
    purple: { face: 'linear-gradient(150deg,#B692F6,#6941C6)', ink: '#1B0F3A', glow: 'rgba(158,119,237,.5)' },
    silver: { face: 'linear-gradient(150deg,#E4E7EE,#9AA2B4)', ink: '#1D2435', glow: 'rgba(208,213,221,.4)' },
  };

  function Pips({ n = 3, ink }) {
    return (
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${i < n ? ink : 'rgba(0,0,0,.2)'}` }} />
        ))}
      </span>
    );
  }

  function BCard({ p, w = 138 }) {
    const c = RAR[p.rarity];
    return (
      <div className="va-cw" style={{ width: w }}>
      <div className="va-card" style={{ borderRadius: 12, background: c.face, color: c.ink, boxShadow: `0 0 0 1px rgba(255,255,255,.25), 0 8px 22px -10px ${c.glow}` }}>
        <div style={{ padding: '12px 12px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em' }}>{p.r}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', opacity: .8 }}>{p.pos}</div>
            </div>
            <Flag nation={p.nation} w={24} h={16} />
          </div>
          <div style={{ height: 66, display: 'grid', placeItems: 'center', margin: '2px 0' }}><Bust color={c.ink} size={60} opacity={.42} /></div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', borderTop: '1px solid rgba(0,0,0,.18)', paddingTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 800, marginTop: 5 }}>
            <span style={{ color: '#B42318' }}>×{p.atk}</span>
            <span style={{ color: '#175CD3' }}>⛨{p.def}</span>
            <span style={{ marginLeft: 'auto' }}><Pips ink={c.ink} /></span>
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .65, marginTop: 4, letterSpacing: '.03em' }}>{p.nation} · {p.wc}</div>
        </div>
      </div>
        <div style={{ position: 'absolute', top: -8, left: -8, width: 26, height: 26, borderRadius: '50%', background: '#17B26A', color: '#fff', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.4)', border: '2px solid #06080F', zIndex: 3 }}>{p.slot}</div>
      </div>
    );
  }

  // ------------------------------------------------------------- DECK SELECTOR
  function DeckA() {
    inject();
    const D = window.WCH.DECK;
    return (
      <div className="va" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* broadcast header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, padding: '22px 26px 16px' }}>
          <div style={{ background: 'linear-gradient(120deg,#7F56D9,#6941C6)', padding: '10px 22px 10px 16px' }} className="va-slash">
            <div className="va-ey" style={{ color: 'rgba(255,255,255,.7)' }}>Squad builder</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.05, whiteSpace: 'nowrap' }}>PICK YOUR STARTING XI</div>
          </div>
          <div style={{ fontSize: 12.5, color: '#9AA0B6', maxWidth: 360, paddingBottom: 4 }}>11 players · 10-slot budget · 1 tactical card. Commons are free — start hungry, build up over the run.</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button className="va-btn va-slash">Load preset XI</button>
            <button className="va-btn va-slash">Menu</button>
          </div>
        </div>

        {/* control bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <span className="va-seg on">Players</span>
          <span className="va-seg">Tactical cards</span>
          <span style={{ flex: 1, maxWidth: 230, marginLeft: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', padding: '8px 12px', fontSize: 12.5, color: '#7B829A', borderRadius: 8 }}>Search players</span>
          {['All World Cups', 'All nations', 'All positions', 'All rarities'].map((f) => (
            <span key={f} style={{ fontSize: 12, color: '#AEB4C8', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>{f} ▾</span>
          ))}
        </div>

        {/* body */}
        <div style={{ flex: 1, display: 'flex', gap: 20, padding: '18px 26px 24px', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 13, alignContent: 'start' }}>
            {D.map((p, i) => <BCard key={i} p={p} w="100%" />)}
          </div>
          {/* scoreboard sidebar */}
          <div style={{ width: 268, flex: '0 0 268px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(13,17,30,.7)', border: '1px solid rgba(255,255,255,.1)', borderTop: '3px solid #FEC84B', borderRadius: 12, padding: 18 }}>
              <div className="va-ey" style={{ color: '#FEC84B', marginBottom: 12 }}>Live squad</div>
              {[['Slot budget', '0 / 10', '#FEC84B', 0], ['Starting XI', '0 / 11', '#9E77ED', 0]].map(([l, v, col, pct]) => (
                <div key={l} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}><span style={{ color: '#C7CCDC' }}>{l}</span><span>{v}</span></div>
                  <div className="va-bar"><i style={{ width: pct + '%', background: col }} /></div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#838AA0', fontWeight: 600, marginTop: 4 }}>×avg 0 · ⛨avg 0 · no tactical card · 0 GKs</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="va-btn" style={{ flex: 1 }}>Fill with commons</button>
              <button className="va-btn" style={{ flex: '0 0 78px' }}>Clear</button>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button className="va-card va-slash" style={{ width: '100%', border: 'none', background: 'linear-gradient(120deg,#FBD66A,#E0A52E)', color: '#3A2A06', fontWeight: 800, fontSize: 15, padding: '18px 16px', letterSpacing: '.02em' }}>
                0/11 PLAYERS · 0/10 SLOTS · PICK A CAPTAIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- BATTLE
  function ScoreBug() {
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', boxShadow: '0 8px 26px -8px rgba(0,0,0,.7)' }}>
        <div className="va-slash" style={{ background: 'linear-gradient(120deg,#C1272D,#7A1518)', padding: '8px 26px 8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flag nation="Morocco" w={26} h={18} /><span style={{ fontWeight: 800, letterSpacing: '.08em' }}>MAR</span>
          <span style={{ fontSize: 26, fontWeight: 800, marginLeft: 4 }}>0</span>
        </div>
        <div style={{ background: '#0B0F1A', padding: '6px 18px', display: 'grid', placeItems: 'center', borderTop: '1px solid rgba(255,255,255,.1)', borderBottom: '1px solid rgba(255,255,255,.1)', whiteSpace: 'nowrap' }}>
          <div className="va-ey" style={{ color: '#FEC84B' }}>Round 1 / 10</div>
          <div style={{ fontSize: 10, color: '#8A90A8', letterSpacing: '.1em', fontWeight: 700 }}>HT @ 5</div>
        </div>
        <div className="va-slash" style={{ background: 'linear-gradient(120deg,#1B3A8A,#0B1E4F)', padding: '8px 16px 8px 26px', display: 'flex', alignItems: 'center', gap: 10, clipPath: 'polygon(14px 0,100% 0,100% 100%,0 100%)' }}>
          <span style={{ fontSize: 26, fontWeight: 800, marginRight: 4 }}>0</span>
          <span style={{ fontWeight: 800, letterSpacing: '.08em' }}>FRA</span><Flag nation="France" w={26} h={18} />
        </div>
      </div>
    );
  }

  function CardBack({ w = 84, h = 116 }) {
    return (
      <div style={{ width: w, height: h, borderRadius: 10, background: 'linear-gradient(150deg,#1a1f33,#0c1020)', border: '1px solid rgba(158,119,237,.4)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 20px -8px rgba(0,0,0,.7), inset 0 0 30px rgba(127,86,217,.18)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,.55)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: '#E9EAF2', background: 'radial-gradient(circle,#6941C6,#2C1C5F)' }}>WC</div>
      </div>
    );
  }

  function HandCard({ p }) {
    const c = RAR[p.rarity];
    return (
      <div className="va-cw" style={{ width: 116 }}>
      <div className="va-card" style={{ borderRadius: 11, background: c.face, color: c.ink, boxShadow: `0 0 0 1px rgba(255,255,255,.25),0 10px 24px -10px ${c.glow}` }}>
        <div style={{ padding: '10px 10px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{p.r}</div><div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', opacity: .8 }}>{p.pos}</div></div>
            <Flag nation={p.nation} w={20} h={14} />
          </div>
          <div style={{ height: 36, display: 'grid', placeItems: 'center' }}><Bust color={c.ink} size={36} opacity={.4} /></div>
          <div style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderTop: '1px solid rgba(0,0,0,.18)', paddingTop: 5 }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 800, marginTop: 3 }}><span style={{ color: '#B42318' }}>×{p.atk}</span><span style={{ color: '#175CD3' }}>⛨{p.def}</span></div>
        </div>
      </div>
        <div style={{ position: 'absolute', top: -7, left: -7, width: 23, height: 23, borderRadius: '50%', background: '#17B26A', color: '#fff', fontWeight: 800, fontSize: 12, display: 'grid', placeItems: 'center', border: '2px solid #06080F', zIndex: 3 }}>{p.slot}</div>
        {p.mult && <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', background: '#06080F', border: '1px solid #FEC84B', color: '#FEC84B', fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 99, zIndex: 3 }}>{p.mult}</div>}
      </div>
    );
  }

  function BattleA() {
    inject();
    const H = window.WCH.HAND, F = window.WCH.FORMATIONS;
    return (
      <div className="va" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* top hud */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px 10px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span className="va-live"><i />LIVE</span>
            <span style={{ fontSize: 12, color: '#9AA0B6', alignSelf: 'center' }}>Group match 1 · 0/4 players</span>
          </div>
          <div style={{ margin: '0 auto' }}><ScoreBug /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span className="va-btn va-slash">Draw 9</span>
            <span className="va-btn va-slash">Discard 0</span>
          </div>
        </div>

        {/* pitch */}
        <div style={{ flex: 1, margin: '4px 24px', borderRadius: 16, position: 'relative', overflow: 'hidden', background: 'linear-gradient(175deg,#0f3d28,#072116)', border: '1px solid rgba(255,255,255,.1)' }}>
          {/* stripes + lines */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 90px,transparent 90px 180px)' }} />
          <PitchLines stroke="rgba(255,255,255,.34)" sw={2} />
          {/* opponent intel ticker */}
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(6,8,15,.78)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 99, padding: '7px 18px', fontSize: 12.5, fontWeight: 700, backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#FEC84B' }}>OPPONENT</span> <span style={{ color: '#C7CCDC' }}>Defensive (5-4-1) · 3 cards · 8 stamina</span>
          </div>
          {/* zone columns */}
          <div style={{ position: 'absolute', inset: '54px 22px 22px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[['YOUR DEFENSE', '#53B1FD', []], ['YOUR ATTACK', '#F97066', []], ['THEIR ATTACK', '#F97066', [1]], ['THEIR DEFENSE', '#53B1FD', [1, 2]]].map(([t, col, cards], zi) => (
              <div key={zi} style={{ border: '1px dashed rgba(255,255,255,.16)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: 12 }}>
                  {cards.length ? cards.map((k) => <CardBack key={k} />) : <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, fontWeight: 600 }}>Empty</span>}
                </div>
                <div style={{ textAlign: 'center', padding: '8px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: col }}>{t}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* lower third — formation + hand + cta */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, padding: '14px 24px 22px' }}>
          <div>
            <div className="va-ey" style={{ marginBottom: 8 }}>Formation</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {F.map((f) => (
                <div key={f.name} className="va-slash" style={{ padding: '10px 14px', background: f.active ? 'linear-gradient(120deg,#FBD66A,#E0A52E)' : 'rgba(255,255,255,.05)', color: f.active ? '#3A2A06' : '#C7CCDC', border: f.active ? 'none' : '1px solid rgba(255,255,255,.12)', minWidth: 92 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{f.name}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', opacity: .85 }}>{f.tag}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .7 }}>ATK {f.atk} · DEF {f.def}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, margin: '0 auto', paddingBottom: 6 }}>
            {H.map((p, i) => <HandCard key={i} p={p} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {Array.from({ length: 8 }).map((_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: '#17B26A', boxShadow: '0 0 6px rgba(23,178,106,.8)' }} />)}
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9AA0B6', marginLeft: 4 }}>8/8</span>
            </div>
            <button className="va-card va-slash" style={{ border: 'none', background: 'linear-gradient(120deg,#FBD66A,#E0A52E)', color: '#3A2A06', fontWeight: 800, fontSize: 16, padding: '15px 34px', letterSpacing: '.03em' }}>PASS ROUND ▸</button>
          </div>
        </div>
      </div>
    );
  }

  window.DeckA = DeckA;
  window.BattleA = BattleA;
})();
