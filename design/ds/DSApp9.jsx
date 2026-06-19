// WORLD CUP CLASH — Design System: app shell + nav
const { Foundations, Components, Patterns, Screens, DataModel } = window;

const NAV = [
  { group: "Foundations", items: [["color", "Color"], ["type", "Typography"], ["spacing", "Spacing"], ["radii", "Radii"], ["shadow", "Elevation"], ["motion", "Motion"]] },
  { group: "Components", items: [["buttons", "Buttons"], ["player-card", "Player card"], ["tactic-card", "Tactic card"], ["deck", "Card back & deck"], ["crests", "Crests & flags"], ["chips", "Chips & badges"]] },
  { group: "Patterns", items: [["scoreboard", "Scoreboard & clock"], ["piles", "Card piles"], ["limits", "Hand & tactical limits"], ["starcore", "Field cost & star core"], ["extratime", "Extra time"], ["meters", "Meters & gauges"], ["lanes", "Lanes & clash"]] },
  { group: "Run & meta", items: [["menu", "Title & hero"], ["bracket", "Run map"], ["builder", "Squad builder"], ["inputs", "Filters & inputs"], ["overlays", "Modals & overlays"]] },
  { group: "Implementation", items: [["data-model", "Data model"], ["react-api", "React API"]] },
];

function App() {
  const [active, setActive] = useState("color");
  useEffect(() => {
    const ids = NAV.flatMap((g) => g.items.map((i) => i[0]));
    const onScroll = () => {
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  };

  return (
    <React.Fragment>
      <div className="ds-amb" />
      <div className="ds-shell">
        <aside className="ds-side">
          <div className="ds-brand">
            <div className="mark">WC</div>
            <div className="t"><b>World Cup Clash</b><span>Design system</span></div>
          </div>
          <nav className="ds-nav">
            {NAV.map((g) => (
              <React.Fragment key={g.group}>
                <div className="ds-nav-group">{g.group}</div>
                {g.items.map(([id, label]) => (
                  <a key={id} href={"#" + id} className={active === id ? "active" : ""} onClick={(e) => go(e, id)}>{label}</a>
                ))}
              </React.Fragment>
            ))}
          </nav>
        </aside>

        <main className="ds-main">
          <div className="ds-wrap">
            <header className="ds-hero">
              <div className="kicker">Design system · v10</div>
              <h1>World Cup Clash</h1>
              <p>The complete visual language for the roguelike World Cup card game — built on Hiedra's purple accent, re-skinned for a dark stadium-night theme. Updated for the <b>v10 balance pass</b>, where quality beats quantity: a gentle per-round field cost (2 / 2 / 3 / 4), a <b>star-core stamina discount</b> that halves support cards beside a premium, diminishing returns on stacked lanes, a retuned xG curve, and <b>sudden-death</b> golden goal. The v9 builder change is here too — a premium core on the slot budget, with the bench rolled from random commons. The 90-minute match carries over — numeric scoreboard, match clock, 3-goal mercy marker, bench/exiled piles. Every token, component and pattern below renders live from the production CSS.</p>
              <div className="meta">
                <span className="pill"><b>Inter</b> · 400–800</span>
                <span className="pill"><b>4pt</b> grid</span>
                <span className="pill">Accent <b>#7F56D9</b> / <b>#E8C873</b></span>
                <span className="pill">Tokens · <b>design-system/tokens.css</b></span>
              </div>
            </header>

            <Foundations />
            <Components />
            <Patterns />
            <Screens />
            <DataModel />
          </div>
        </main>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
