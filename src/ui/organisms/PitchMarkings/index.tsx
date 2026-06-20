/** Football field markings ported from design/jsx/Board4Widgets.jsx `PitchMarkings4`.
 * Renders the center circle, half-line, penalty boxes, goals, corner arcs, spots,
 * and the WC center mark on top of the green pitch background.
 */
export function PitchMarkings() {
  return (
    <>
      <div className="pl bound" />
      <div className="pl half" />
      <div className="pl circle" />
      <div className="pl spot" />
      {(['l', 'r'] as const).map((s) => (
        <span key={s}>
          <div className={`pl box ${s}`} />
          <div className={`pl six ${s}`} />
          <div className={`pl arc ${s}`} />
          <div className={`pl pspot ${s}`} />
          <div className={`pl goalbox ${s}`} />
        </span>
      ))}
      {(['tl', 'bl', 'tr', 'br'] as const).map((c) => (
        <div key={c} className={`pl corner ${c}`} />
      ))}
      <div className="center-mark4">WC</div>
    </>
  )
}
