interface RunNodeData {
  stage: string
  number: number | string
  done?: boolean
  now?: boolean
  final?: boolean
  beaten?: string
}

interface RunNodeProps extends RunNodeData {
  isLast: boolean
}

function RunNode({ stage, number, done, now, final: isFinal, beaten, isLast }: RunNodeProps) {
  const cls = [
    'lnode',
    done ? 'done' : '',
    now ? 'now' : '',
    isFinal ? 'final' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="seg" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div className={cls}>
        <div className="dot">{done ? '' : number}</div>
        <div className="stage">{stage}</div>
        <div className="beaten">{beaten ?? ''}</div>
      </div>
      {!isLast && <div className={`link${done ? ' done' : ''}`} />}
    </div>
  )
}

interface LadderProps {
  nodes: RunNodeData[]
}

/** Run map / bracket ladder — shows the 7-match knockout progression. */
export function Ladder({ nodes }: LadderProps) {
  return (
    <div className="ladder">
      {nodes.map((nd, i) => (
        <RunNode key={i} {...nd} isLast={i === nodes.length - 1} />
      ))}
    </div>
  )
}

export type { RunNodeData }
