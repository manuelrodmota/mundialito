// Shared data + tiny helpers for the WorldCupHeartstone explorations.
// Exposed on window.WCH so every variant file can read the same numbers.
(function () {
  const FLAGS = {
    Argentina: ['#75AADB', '#FFFFFF', '#75AADB'],
    France: ['#0055A4', '#FFFFFF', '#EF4135'],
    Norway: ['#BA0C2F', '#FFFFFF', '#00205B'],
    England: ['#F2F4F7', '#EF4135', '#F2F4F7'],
    Brazil: ['#009C3B', '#FFDF00', '#009C3B'],
    Spain: ['#AA151B', '#F1BF00', '#AA151B'],
    Croatia: ['#FF0000', '#FFFFFF', '#171796'],
    Portugal: ['#046A38', '#DA291C', '#FFE000'],
    Germany: ['#000000', '#DD0000', '#FFCE00'],
    Japan: ['#FFFFFF', '#BC002D', '#FFFFFF'],
    Belgium: ['#000000', '#FAE042', '#ED2939'],
    USA: ['#3C3B6E', '#FFFFFF', '#B22234'],
    Morocco: ['#C1272D', '#006233', '#C1272D'],
  };

  function Flag({ nation, w = 22, h = 15, radius = 3, style = {} }) {
    const bands = FLAGS[nation] || ['#667085', '#98A2B3', '#667085'];
    return (
      <span
        style={{
          display: 'inline-flex',
          width: w,
          height: h,
          borderRadius: radius,
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
          flex: '0 0 auto',
          ...style,
        }}
      >
        {bands.map((c, i) => (
          <span key={i} style={{ flex: 1, background: c }} />
        ))}
      </span>
    );
  }

  // Player silhouette (the bust glyph used on every card).
  function Bust({ color = 'currentColor', size = 56, opacity = 0.5 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
        <circle cx="12" cy="8" r="4" fill={color} />
        <path d="M3 21c0-4.5 4-7 9-7s9 2.5 9 7" fill={color} />
      </svg>
    );
  }

  // Deck-selector grid — slot cost, rating, stats, rarity.
  const DECK = [
    { r: 98, pos: 'FWD', name: 'LIONEL MESSI', atk: 98, def: 54, nation: 'Argentina', wc: 'WC 2022', slot: 5, rarity: 'gold' },
    { r: 97, pos: 'FWD', name: 'KYLIAN MBAPPÉ', atk: 97, def: 53, nation: 'France', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 96, pos: 'FWD', name: 'ERLING HAALAND', atk: 96, def: 53, nation: 'Norway', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 96, pos: 'FWD', name: 'KYLIAN MBAPPÉ', atk: 96, def: 53, nation: 'France', wc: 'WC 2022', slot: 5, rarity: 'gold' },
    { r: 95, pos: 'MID', name: 'JUDE BELLINGHAM', atk: 81, def: 74, nation: 'England', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 95, pos: 'FWD', name: 'VINÍCIUS JR', atk: 95, def: 52, nation: 'Brazil', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 95, pos: 'FWD', name: 'LIONEL MESSI', atk: 95, def: 52, nation: 'Argentina', wc: 'WC 2014', slot: 5, rarity: 'gold' },
    { r: 94, pos: 'FWD', name: 'LAMINE YAMAL', atk: 94, def: 52, nation: 'Spain', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 94, pos: 'MID', name: 'RODRI', atk: 80, def: 73, nation: 'Spain', wc: 'WC 2026', slot: 5, rarity: 'gold' },
    { r: 92, pos: 'MID', name: 'LUKA MODRIC', atk: 78, def: 72, nation: 'Croatia', wc: 'WC 2022', slot: 4, rarity: 'purple' },
    { r: 92, pos: 'FWD', name: 'C. RONALDO', atk: 92, def: 51, nation: 'Portugal', wc: 'WC 2022', slot: 4, rarity: 'purple' },
    { r: 92, pos: 'MID', name: 'K. DE BRUYNE', atk: 78, def: 72, nation: 'Belgium', wc: 'WC 2018', slot: 4, rarity: 'purple' },
  ];

  // Battle hand.
  const HAND = [
    { r: 94, pos: 'FWD', name: 'LIONEL MESSI', atk: 94, def: 52, nation: 'Argentina', wc: 'WC 2018', slot: 5, rarity: 'gold', mult: '×1.3' },
    { r: 79, pos: 'MID', name: 'RITSU DOAN', atk: 67, def: 68, nation: 'Japan', wc: 'WC 2022', slot: 2, rarity: 'silver' },
    { r: 90, pos: 'MID', name: 'JAMAL MUSIALA', atk: 77, def: 71, nation: 'Germany', wc: 'WC 2026', slot: 4, rarity: 'purple', mult: '×1.2' },
    { r: 79, pos: 'FWD', name: 'CLINT DEMPSEY', atk: 79, def: 43, nation: 'USA', wc: 'WC 2014', slot: 2, rarity: 'silver' },
    { r: 78, pos: 'FWD', name: 'RICARDO PEPI', atk: 78, def: 43, nation: 'USA', wc: 'WC 2026', slot: 2, rarity: 'silver' },
  ];

  const FORMATIONS = [
    { name: '3-4-3', tag: 'OFFENSIVE', atk: '×1.25', def: '×0.75' },
    { name: '4-3-3', tag: 'BALANCED', atk: '×1', def: '×1', active: true },
    { name: '5-4-1', tag: 'DEFENSIVE', atk: '×0.75', def: '×1.25' },
  ];

  // Full football-pitch markings, drawn horizontally (goals at left & right).
  // viewBox stretches to fill its container; non-scaling strokes stay crisp.
  function PitchLines({ stroke = 'rgba(255,255,255,.4)', sw = 2, glow = null }) {
    const wrap = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };
    if (glow) wrap.filter = `drop-shadow(0 0 5px ${glow})`;
    const dot = (cx, cy) => <circle cx={cx} cy={cy} r="3.5" fill={stroke} stroke="none" />;
    return (
      <svg viewBox="0 0 1100 400" preserveAspectRatio="none" style={wrap}>
        <g stroke={stroke} strokeWidth={sw} fill="none" vectorEffect="non-scaling-stroke" style={{ vectorEffect: 'non-scaling-stroke' }}>
          <rect x="5" y="5" width="1090" height="390" rx="6" vectorEffect="non-scaling-stroke" />
          <line x1="550" y1="5" x2="550" y2="395" vectorEffect="non-scaling-stroke" />
          <circle cx="550" cy="200" r="60" vectorEffect="non-scaling-stroke" />
          {dot(550, 200)}
          {/* left half */}
          <rect x="5" y="98" width="150" height="204" vectorEffect="non-scaling-stroke" />
          <rect x="5" y="152" width="54" height="96" vectorEffect="non-scaling-stroke" />
          {dot(106, 200)}
          <path d="M155 150 A 60 60 0 0 1 155 250" vectorEffect="non-scaling-stroke" />
          <rect x="5" y="172" width="9" height="56" vectorEffect="non-scaling-stroke" />
          {/* right half */}
          <rect x="945" y="98" width="150" height="204" vectorEffect="non-scaling-stroke" />
          <rect x="1041" y="152" width="54" height="96" vectorEffect="non-scaling-stroke" />
          {dot(994, 200)}
          <path d="M945 150 A 60 60 0 0 0 945 250" vectorEffect="non-scaling-stroke" />
          <rect x="1086" y="172" width="9" height="56" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    );
  }

  window.WCH = { FLAGS, Flag, Bust, DECK, HAND, FORMATIONS, PitchLines };
})();
