// WORLD CUP CLASH — Card components
const { useState, useEffect, useRef } = React;

function Flag({ nation }) {
  const cols = (window.WCC_DATA.NATIONS[nation] || ["#555", "#777", "#555"]);
  return (
    <span className="flag" title={nation}>
      {cols.map((c, i) => (<i key={i} style={{ background: c }}></i>))}
    </span>
  );
}

// Original geometric player silhouette (jersey + head), tinted by position
const POS_TINT = { GK: "#f2c14e", DEF: "#6ea8e8", MID: "#7fd99a", FWD: "#ef8a7c", EVENT: "#fff" };
function Silhouette({ pos, dark }) {
  const tint = POS_TINT[pos] || "#ccc";
  const body = dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.34)";
  if (pos === "EVENT") {
    return (
      <div className="silhouette">
        <svg viewBox="0 0 100 100">
          <rect x="34" y="18" width="32" height="48" rx="5" fill="#fff" opacity="0.92" transform="rotate(8 50 42)" />
          <rect x="38" y="24" width="24" height="6" rx="2" fill="#b91c1c" transform="rotate(8 50 42)" />
          <rect x="38" y="34" width="24" height="3" rx="1.5" fill="#7f1212" opacity="0.5" transform="rotate(8 50 42)" />
          <rect x="38" y="40" width="18" height="3" rx="1.5" fill="#7f1212" opacity="0.5" transform="rotate(8 50 42)" />
        </svg>
      </div>
    );
  }
  return (
    <div className="silhouette">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="26" r="13" fill={body} />
        <path d="M22 88 C24 60 34 48 50 48 C66 48 76 60 78 88 Z" fill={body} />
        <path d="M38 52 L50 64 L62 52 L58 49 L50 56 L42 49 Z" fill={tint} opacity="0.85" />
        <circle cx="50" cy="74" r="5.5" fill={tint} opacity="0.6" />
      </svg>
    </div>
  );
}

function abilityLabel(ab) {
  if (!ab || ab.kind === "none") return null;
  if (ab.n != null) return `${ab.kind} ${ab.n}`;
  if (ab.kind === "RedCard") return "Red Card";
  return ab.kind;
}

const ABILITY_TEXT = {
  Clinical: (n) => `Deals +${n} extra Morale damage when this card wins a duel.`,
  Resilient: (n) => `Take ${n} less damage when this card loses a duel.`,
  Clutch: (n) => `+${n} effective rating while your Morale is 15 or less.`,
  Wall: (n) => `Prevents ${n} damage the first time you'd take damage this round.`,
  Tempo: () => `When played, gain +1 max stamina next round.`,
  Vision: () => `When played, draw 1 card.`,
  Counter: (n) => `+${n} effective rating if you lost the previous duel.`,
  Penalty: () => `Wins tied duels and deals 5 damage on a tie.`,
  RedCard: () => `Opponent discards 1 random card. No duel damage this round.`,
  none: () => `No special ability.`,
};
const ROLE_TEXT = {
  FWD: "Forward — Clinical instinct: +2 damage on duel wins.",
  MID: "Midfielder — Tempo: +1 max stamina next round when played.",
  DEF: "Defender — Resilient: take 3 less damage on duel losses.",
  GK: "Goalkeeper — The Wall: can't win duels, but fully blocks this round's damage.",
  EVENT: "Event — a moment of chaos, not a player.",
};

function WCard({ card, size = 168, isCaptain, onClick, faceDown, className = "" }) {
  if (faceDown) {
    return (
      <div className={`wcard back ${className}`} style={{ "--cw": size + "px" }}>
        <div className="inner"><div className="backmark">WC</div></div>
      </div>
    );
  }
  const rarity = card.position === "EVENT" ? "event" : card.rarity;
  const abl = abilityLabel(card.ability);
  return (
    <div
      className={`wcard ${onClick ? "clickable" : ""} ${className}`}
      data-rarity={rarity}
      style={{ "--cw": size + "px" }}
      onClick={onClick}
    >
      <div className="cost" title="Stamina cost">{card.cost}</div>
      {isCaptain && <div className="captain-band">CAPTAIN</div>}
      <div className="inner">
        <div className="top">
          <div className="ratpos">
            <div className="rating">{card.rating}</div>
            <div className="pos">{card.position === "EVENT" ? "EVT" : card.position}</div>
          </div>
          <Flag nation={card.nation} />
        </div>
        <div className="figure"><Silhouette pos={card.position} /></div>
        <div className="strip">
          <div className="pname">{card.name}</div>
          <div className="meta"><span>{card.nation}</span><span>·</span><span>WC {card.worldCup}</span></div>
          {abl && <span className="ability-tag">{abl}</span>}
        </div>
      </div>
    </div>
  );
}

function CardModal({ card, isCaptain, onClose }) {
  if (!card) return null;
  const ab = card.ability || { kind: "none" };
  const abText = (ABILITY_TEXT[ab.kind] || ABILITY_TEXT.none)(ab.n);
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <WCard card={card} size={230} isCaptain={isCaptain} />
        <div className="info">
          <h3>{card.name}</h3>
          <div className="tag">{card.nation} · World Cup {card.worldCup} · {card.rarity.toUpperCase()}</div>
          <div className="ab"><b>Role.</b> {ROLE_TEXT[card.position]}</div>
          <div className="ab"><b>{ab.kind === "none" ? "Ability" : abilityLabel(card.ability)}.</b> {abText}</div>
          <div className="ab"><b>Cost.</b> {card.cost} stamina to commit.</div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WCard, CardModal, Flag, abilityLabel });
