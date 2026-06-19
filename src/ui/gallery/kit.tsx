import type { CSSProperties, ReactNode } from 'react'

/** Gallery section wrapper. */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string
  eyebrow?: string
  title: string
  lede?: string
  children?: ReactNode
}) {
  return (
    <section className="ds-section" id={id}>
      <div className="head">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children}
    </section>
  )
}

export function Sub({ children }: { children: ReactNode }) {
  return <div className="ds-sub">{children}</div>
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="ds-note">{children}</p>
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="ds-inline-code">{children}</code>
}

export function Frame({
  children,
  caption,
  pitch,
  center,
}: {
  children: ReactNode
  caption?: ReactNode
  pitch?: boolean
  center?: boolean
}) {
  return (
    <div className="ds-frame">
      <div className={'stage' + (pitch ? ' pitch-bg' : '') + (center ? ' center' : '')}>
        {children}
      </div>
      {caption && <div className="caption">{caption}</div>}
    </div>
  )
}

export function Tile({
  label,
  sub,
  center,
  children,
}: {
  label: string
  sub?: string
  center?: boolean
  children: ReactNode
}) {
  return (
    <div className="ds-tile">
      <div className={'demo' + (center ? ' center' : '')}>{children}</div>
      <div className="lbl">
        {label}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

export function Swatch({
  name,
  value,
  token,
  style,
}: {
  name: string
  value?: string
  token?: string
  style?: CSSProperties
}) {
  return (
    <div className="swatch">
      <div className="chip" style={style ?? { background: value }} />
      <div className="info">
        <div className="nm">{name}</div>
        {value && <div className="val">{value}</div>}
        {token && <div className="tok">{token}</div>}
      </div>
    </div>
  )
}

type TableCell = string | { node: ReactNode; cls?: string }

export function TokenTable({
  cols,
  rows,
}: {
  cols: string[]
  rows: TableCell[][]
}) {
  return (
    <table className="ds-table">
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => {
              if (typeof cell === 'string') return <td key={j}>{cell}</td>
              return (
                <td key={j} className={cell.cls}>
                  {cell.node}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

