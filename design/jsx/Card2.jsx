// WORLD CUP CLASH v2 — card components (player w/ ATK·DEF, tactic, modal)
const { useState, useEffect, useRef } = React;

function Flag2({ nation }) {
  const cols = window.WCC2.NATIONS[nation] || ["#555", "#777", "#555"];
  return (
    <span className="flag" title={nation}>
      {cols.map((c, i) => (<i key={i} style={{ background: c }}></i>))}
    </span>
  );
}

const POS_TINT2 = { GK: "#f2c14e", DEF: "#6ea8e8", MID: "#7fd99a", FWD: "#ef8a7c" };
function Silhouette2({ pos }) {
  const tint = POS_TINT2[pos] || "#ccc";
  return (
    <div className="silhouette">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="26" r="13" fill="rgba(0,0,0,0.34)"></circle>
        <path d="M22 88 C24 60 34 48 50 48 C66 48 76 60 78 88 Z" fill="rgba(0,0,0,0.34)"></path>
        <path d="M38 52 L50 64 L62 52 L58 49 L50 56 L42 49 Z" fill={tint} opacity="0.85"></path>
        <circle cx="50" cy="74" r="5.5" fill={tint} opacity="0.6"></circle>
      </svg>
    </div>
  );
}

function SlotPips({ n }) {
  if (!n) return <span className="slotpips zero">FREE</span>;
  return (
    <span className="slotpips">
      {Array.from({ length: n }).map((_, i) => (<i key={i}></i>))}
    </span>
  );
}

// rarity stat multiplier (GDD v5 §4) — common is ×1.0 so no badge
const RARITY_MULT5 = { rare: "1.1", epic: "1.2", legendary: "1.3", icon: "1.3" };

// status: {booked, injured} or undefined
function PCard({ card, size = 168, isCaptain, status, onClick, faceDown, className = "", showSlots, showMult }) {
  if (faceDown) {
    return (
      <div className={`wcard back ${className}`} style={{ "--cw": size + "px" }}>
        <div className="inner"><div className="backmark">WC</div></div>
      </div>
    );
  }
  return (
    <div
      className={`wcard v2 ${onClick ? "clickable" : ""} ${className}`}
      data-rarity={card.rarity}
      style={{ "--cw": size + "px" }}
      onClick={onClick}
    >
      <div className="cost" title="Stamina cost">{card.cost}</div>
      {showMult && RARITY_MULT5[card.rarity] && (
        <div className="rarmult5" data-rar={card.rarity} title={"Rarity multiplier — contributes " + RARITY_MULT5[card.rarity] + "× its stats to the lane"}>×{RARITY_MULT5[card.rarity]}</div>
      )}
      {isCaptain && <div className="captain-band">CAPTAIN</div>}
      {status && status.booked && <div className="st-booked" title="Booked — next whistle is a red"></div>}
      {status && status.injured && <div className="st-injured" title="Injured — −15 ATK/DEF">✚</div>}
      <div className="inner">
        <div className="top">
          <div className="ratpos">
            <div className="rating">{card.overall}</div>
            <div className="pos">{card.position}</div>
          </div>
          <Flag2 nation={card.nation} />
        </div>
        <div className="figure"><Silhouette2 pos={card.position} /></div>
        <div className="strip">
          <div className="pname">{card.name}</div>
          <div className="statrow">
            <span className="atk">⚔ {card.atk}</span>
            <span className="def">⛨ {card.def}</span>
          </div>
          <div className="meta"><span>{card.nation}</span><span>·</span><span>WC {card.worldCup}</span></div>
        </div>
      </div>
      {showSlots && <SlotPips n={card.slots} />}
    </div>
  );
}

const CAT_GLYPH = {
  instant: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ff9d92" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="rgba(232,85,74,0.25)"></polygon>
    </svg>
  ),
  skill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#82c0f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="rgba(62,148,222,0.18)"></circle>
      <path d="M12 3 L12 21 M3 12 L21 12"></path>
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ecd089" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21 L18 21 M12 17 L12 21 M5 4 L19 4 L19 9 A7 7 0 0 1 5 9 Z" fill="rgba(232,200,115,0.18)"></path>
    </svg>
  ),
};

function TCard({ card, size = 168, onClick, faceDown, className = "", showSlots }) {
  if (faceDown) {
    return (
      <div className={`wcard back ${className}`} style={{ "--cw": size + "px" }}>
        <div className="inner"><div className="backmark">WC</div></div>
      </div>
    );
  }
  return (
    <div
      className={`tcard ${onClick ? "clickable" : ""} ${className}`}
      data-cat={card.category}
      style={{ "--cw": size + "px" }}
      onClick={onClick}
    >
      <div className="cost" title="Stamina cost">{card.cost}</div>
      <div className="inner">
        <div className="cat">{card.category}</div>
        <div className="glyph">{CAT_GLYPH[card.category]}</div>
        <div className="tname">{card.name}</div>
        <div className="ttext">{card.text}</div>
      </div>
      {showSlots && <SlotPips n={card.slots} />}
    </div>
  );
}

function AnyCard(props) {
  return props.card.type === "tactic" ? <TCard {...props} /> : <PCard {...props} />;
}

const ROLE_TEXT2 = {
  FWD: "Forward — full ATK going forward, soft at the back (DEF = 55% of overall).",
  MID: "Midfielder — balanced (85% ATK / 78% DEF). 2+ MIDs played = +1 stamina next round.",
  DEF: "Defender — a wall (full DEF), limited going forward (55% ATK).",
  GK: "Goalkeeper — defense lane only. DEF = overall +5, ATK 0.",
};

function CardModal2({ card, isCaptain, status, showMult, onClose }) {
  if (!card) return null;
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <AnyCard card={card} size={230} isCaptain={isCaptain} status={status} showSlots />
        <div className="info">
          <h3>{card.name}</h3>
          {card.type === "player" ? (
            <React.Fragment>
              <div className="tag">{card.nation} · World Cup {card.worldCup} · {card.rarity.toUpperCase()} · {card.slots} slot{card.slots === 1 ? "" : "s"}</div>
              <div className="ab"><b>ATK {card.atk} / DEF {card.def}.</b> {ROLE_TEXT2[card.position]}</div>
              {showMult && RARITY_MULT5[card.rarity] && (
                <div className="ab"><b>Star quality.</b> {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)} cards contribute ×{RARITY_MULT5[card.rarity]} their stats each round — an effective ATK {Math.round(card.atk * parseFloat(RARITY_MULT5[card.rarity]))} / DEF {Math.round(card.def * parseFloat(RARITY_MULT5[card.rarity]))}.</div>
              )}
              <div className="ab"><b>Cost.</b> {card.cost} stamina to field, into attack or defense.</div>
              {status && (status.booked || status.injured) && (
                <div className="ab"><b>Status.</b> {status.booked ? "Booked — another whistle means a red card. " : ""}{status.injured ? "Injured — −15 ATK/DEF for the match." : ""}</div>
              )}
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="tag">{card.category.toUpperCase()} tactical card · {card.slots} slot{card.slots === 1 ? "" : "s"}</div>
              <div className="ab">{card.text}</div>
              <div className="ab"><b>Cost.</b> {card.cost} stamina.</div>
            </React.Fragment>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PCard, TCard, AnyCard, CardModal2, Flag2, SlotPips });
