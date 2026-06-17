// Variant B — "TACTICS ROOM"
// Tonal inversion: warm paper, editorial display type, the pitch as a printed
// tactics diagram, refined monochrome card tiles with a rarity hairline.
(function () {
  const { Flag, Bust, PitchLines } = window.WCH;

  const CSS = `
  .vb{font-family:var(--font-sans);color:#101828;background:#F4F2EC;height:100%;width:100%;
      position:relative;overflow:hidden;}
  .vb-ey{font-size:11px;letter-spacing:.26em;font-weight:700;text-transform:uppercase;color:#7F56D9;}
  .vb-h{font-weight:600;letter-spacing:-.025em;color:#101828;}
  .vb-rule{height:1px;background:#D7D3C7;}
  .vb-tab{font-size:13px;font-weight:600;color:#98A2B3;padding-bottom:8px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;}
  .vb-tab.on{color:#101828;border-color:#101828;}
  .vb-drop{font-size:12.5px;font-weight:500;color:#475467;padding:8px 12px;border:1px solid #D7D3C7;
      border-radius:999px;background:#FBFAF6;white-space:nowrap;}
  .vb-card{background:#FFFFFF;border:1px solid #E6E3DA;border-radius:6px;cursor:pointer;position:relative;
      transition:.18s var(--ease-out);}
  .vb-card:hover{border-color:#101828;transform:translateY(-3px);box-shadow:0 12px 24px -14px rgba(16,24,40,.4);}
  .vb-cta{font-family:inherit;font-size:14px;font-weight:600;color:#fff;background:#101828;border:none;
      border-radius:8px;padding:16px;cursor:pointer;letter-spacing:.01em;transition:.18s var(--ease-out);}
  .vb-cta:hover{background:#1D2939;}
  .vb-ghost{font-family:inherit;font-size:13px;font-weight:600;color:#344054;background:transparent;
      border:1px solid #D7D3C7;border-radius:8px;padding:10px 16px;cursor:pointer;}
  .vb-ghost:hover{background:#FBFAF6;}
  .vb-mono{font-variant-numeric:tabular-nums;}
  `;
  const inject = () => { if (!document.getElementById('vb-css')) { const s = document.createElement('style'); s.id = 'vb-css'; s.textContent = CSS; document.head.appendChild(s); } };

  const STRIPE = { gold: '#C8932B', purple: '#7F56D9', silver: '#98A2B3' };

  function TileCard({ p }) {
    const stripe = STRIPE[p.rarity];
    return (
      <div className="vb-card" style={{ overflow: 'hidden' }}>
        <div style={{ height: 3, background: stripe }} />
        <div style={{ padding: '12px 13px 11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span className="vb-mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.03em', lineHeight: .9 }}>{p.r}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#98A2B3' }}>{p.pos}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag nation={p.nation} w={20} h={14} />
              <span style={{ width: 19, height: 19, borderRadius: '50%', border: '1.5px solid #101828', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }} className="vb-mono">{p.slot}</span>
            </div>
          </div>
          <div style={{ height: 60, display: 'grid', placeItems: 'center', margin: '4px 0' }}><Bust color="#101828" size={54} opacity={.16} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="vb-rule" style={{ margin: '8px 0 7px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: '#475467' }} className="vb-mono">
            <span>ATK <b style={{ color: '#101828' }}>{p.atk}</b></span>
            <span>DEF <b style={{ color: '#101828' }}>{p.def}</b></span>
          </div>
          <div style={{ fontSize: 10, color: '#98A2B3', fontWeight: 500, marginTop: 5 }}>{p.nation} · {p.wc}</div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- DECK
  function DeckB() {
    inject();
    const D = window.WCH.DECK;
    return (
      <div className="vb" style={{ display: 'flex', flexDirection: 'column', padding: '36px 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="vb-ey">Squad builder</div>
            <h1 className="vb-h" style={{ fontSize: 44, lineHeight: 1.02, margin: '10px 0 8px' }}>Pick your<br />starting XI</h1>
            <p style={{ fontSize: 13.5, color: '#667085', maxWidth: 440, margin: 0 }}>11 players on a 10-slot budget, plus at most 1 tactical card. Commons are free — start hungry, build up over the run.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="vb-ghost">Load preset XI</button>
            <button className="vb-ghost">Menu</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, margin: '26px 0 18px' }}>
          <span className="vb-tab on">Players</span>
          <span className="vb-tab">Tactical cards</span>
          <span style={{ flex: 1 }} />
          {['All World Cups', 'All nations', 'All positions', 'All rarities'].map((f) => <span key={f} className="vb-drop">{f}</span>)}
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 28, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, alignContent: 'start' }}>
            {D.map((p, i) => <TileCard key={i} p={p} />)}
          </div>
          <div style={{ width: 250, flex: '0 0 250px', borderLeft: '1px solid #D7D3C7', paddingLeft: 26, display: 'flex', flexDirection: 'column' }}>
            <div className="vb-ey" style={{ color: '#101828' }}>Team sheet</div>
            {[['Slot budget', '0', '10'], ['Starting XI', '0', '11']].map(([l, a, b]) => (
              <div key={l} style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475467' }}>{l}</span>
                  <span className="vb-mono" style={{ fontSize: 22, fontWeight: 600 }}>{a}<span style={{ color: '#98A2B3', fontSize: 15 }}> / {b}</span></span>
                </div>
                <div className="vb-rule" style={{ marginTop: 10, background: '#E6E3DA' }}><div style={{ width: 0, height: 2, background: '#7F56D9', marginTop: -0.5 }} /></div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: '#98A2B3', fontWeight: 500, marginTop: 18, lineHeight: 1.6 }}>
              ATK avg 0 · DEF avg 0<br />No tactical card · 0 GKs
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="vb-ghost" style={{ flex: 1 }}>Fill with commons</button>
              <button className="vb-ghost">Clear</button>
            </div>
            <button className="vb-cta" style={{ marginTop: 'auto' }}>0/11 players · pick a captain</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- BATTLE
  function PitchTile({ w = 78, h = 108 }) {
    return (
      <div style={{ width: w, height: h, borderRadius: 6, background: '#fff', border: '1px solid #cdd6cd', display: 'grid', placeItems: 'center', boxShadow: '0 6px 14px -8px rgba(16,40,24,.4)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #2f6b46', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#2f6b46' }}>WC</div>
      </div>
    );
  }

  function HandTile({ p }) {
    const stripe = STRIPE[p.rarity];
    return (
      <div className="vb-card" style={{ width: 104, overflow: 'visible' }}>
        <div style={{ height: 3, background: stripe, borderRadius: '6px 6px 0 0' }} />
        <div style={{ padding: '9px 10px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="vb-mono" style={{ fontSize: 24, fontWeight: 600, lineHeight: .9, letterSpacing: '-.03em' }}>{p.r}</span>
            <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #101828', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }} className="vb-mono">{p.slot}</span>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: '#98A2B3' }}>{p.pos}</div>
          <div style={{ height: 30, display: 'grid', placeItems: 'center', margin: '2px 0' }}><Bust color="#101828" size={30} opacity={.16} /></div>
          <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="vb-mono" style={{ display: 'flex', gap: 9, fontSize: 10, fontWeight: 600, color: '#475467', marginTop: 4 }}><span>A {p.atk}</span><span>D {p.def}</span></div>
        </div>
        {p.mult && <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', background: '#101828', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }} className="vb-mono">{p.mult}</div>}
      </div>
    );
  }

  function BattleB() {
    inject();
    const H = window.WCH.HAND, F = window.WCH.FORMATIONS;
    const line = 'rgba(47,107,70,.45)';
    return (
      <div className="vb" style={{ display: 'flex', flexDirection: 'column', padding: '24px 32px 26px' }}>
        {/* header — scoreline as editorial numerals */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Flag nation="Morocco" w={30} h={20} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Morocco 2022</div>
              <div style={{ fontSize: 11, color: '#98A2B3', fontWeight: 500 }}>Group match 1 · 0/4 players</div>
            </div>
            <span className="vb-mono" style={{ fontSize: 40, fontWeight: 600, marginLeft: 8 }}>0</span>
          </div>
          <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
            <div className="vb-ey" style={{ color: '#101828' }}>Round 1 / 10</div>
            <div style={{ fontSize: 11, color: '#98A2B3', fontWeight: 500 }}>Halftime at round 5</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="vb-mono" style={{ fontSize: 40, fontWeight: 600 }}>0</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>France</div>
              <div style={{ fontSize: 11, color: '#98A2B3', fontWeight: 500 }}>Defensive 5-4-1</div>
            </div>
            <Flag nation="France" w={30} h={20} />
          </div>
        </div>

        {/* tactics board */}
        <div style={{ flex: 1, margin: '18px 0', borderRadius: 12, background: '#E7EEE6', border: '1px solid #cdd6cd', position: 'relative', overflow: 'hidden' }}>
          <PitchLines stroke={line} sw={1.5} />
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#FBFAF6', border: '1px solid #D7D3C7', borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#7F56D9' }}>Opponent</span> <span style={{ color: '#475467' }}>· Defensive (5-4-1) · 3 cards · 8 stamina</span>
          </div>
          <div style={{ position: 'absolute', inset: '52px 26px 26px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[['Your defense', []], ['Your attack', []], ['Their attack', [1]], ['Their defense', [1, 2]]].map(([t, cards], zi) => (
              <div key={zi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: zi < 3 ? `1px dashed ${line}` : 'none', gap: 10, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {cards.length ? cards.map((k) => <PitchTile key={k} />) : <span style={{ color: 'rgba(47,107,70,.5)', fontSize: 12, fontWeight: 600, fontStyle: 'italic' }}>Empty</span>}
                </div>
                <div style={{ position: 'absolute', bottom: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#2f6b46' }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div>
            <div className="vb-ey" style={{ color: '#101828', marginBottom: 8 }}>Formation</div>
            <div style={{ display: 'flex', border: '1px solid #D7D3C7', borderRadius: 8, overflow: 'hidden', background: '#FBFAF6' }}>
              {F.map((f) => (
                <div key={f.name} style={{ padding: '9px 14px', background: f.active ? '#101828' : 'transparent', color: f.active ? '#fff' : '#475467', borderRight: '1px solid #D7D3C7' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }} className="vb-mono">{f.name}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', opacity: .8 }}>{f.tag}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, margin: '0 auto', paddingBottom: 4 }}>
            {H.map((p, i) => <HandTile key={i} p={p} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {Array.from({ length: 8 }).map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f6b46' }} />)}
              <span style={{ fontSize: 11, color: '#98A2B3', fontWeight: 600, marginLeft: 4 }}>8/8</span>
            </div>
            <button className="vb-cta" style={{ padding: '14px 34px', fontSize: 15 }}>Pass round</button>
          </div>
        </div>
      </div>
    );
  }

  window.DeckB = DeckB;
  window.BattleB = BattleB;
})();
