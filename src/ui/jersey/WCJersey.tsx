import { useMemo } from 'react'
import { buildJerseySVG } from './buildJerseySVG'
import { kitForNation } from './kits'
import './jersey.css'

interface WCJerseyProps {
  nation: string
  className?: string
}

/** Module-level cache so ~300 on-screen cards each pay the build cost at most once per nation. */
const svgCache = new Map<string, string>()

/** Procedural SVG football jersey in the player's national kit colours.
 * Sized 110%×119% of the figure box. No squad number.
 * The SVG is locally-generated from the KITS table — no untrusted input reaches dangerouslySetInnerHTML.
 */
export function WCJersey({ nation, className = '' }: WCJerseyProps) {
  const html = useMemo(() => {
    const cached = svgCache.get(nation)
    if (cached !== undefined) return cached
    const svg = buildJerseySVG(kitForNation(nation))
    svgCache.set(nation, svg)
    return svg
  }, [nation])

  return (
    <div
      className={`wc-jersey${className ? ' ' + className : ''}`}
      title={nation}
      // The SVG is locally-generated from trusted kit data — XSS-safe by construction.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
