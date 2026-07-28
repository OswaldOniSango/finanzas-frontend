import { useState } from 'react'
import type { GroupTotal } from '../../api/types'
import { ars, percent, usdPrecise } from '../../lib/format'

const W = 760
const ROW = 34
const BAR = 22
const PAD = { top: 8, right: 96, bottom: 8, left: 132 }

/**
 * Distribución de gastos por grupo. Barras horizontales en vez de torta: comparar
 * longitudes es mucho más preciso que comparar ángulos, y los nombres entran.
 */
export function ExpenseGroupsChart({ groups }: { groups: GroupTotal[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const visible = groups.filter((group) => group.amountUsd > 0)
  if (visible.length === 0) return <p className="empty">Todavía no hay gastos cargados.</p>

  const height = PAD.top + visible.length * ROW + PAD.bottom
  const max = Math.max(...visible.map((group) => group.amountUsd))
  const scale = (value: number) => (value / max) * (W - PAD.left - PAD.right)

  return (
    <div className="chart-holder">
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Gastos por grupo">
        {visible.map((group, index) => {
          const y = PAD.top + index * ROW
          const width = Math.max(scale(group.amountUsd), 2)
          return (
            <g
              key={group.label}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={0} y={y} width={W} height={ROW} fill="transparent" />
              <text className="chart-label" x={PAD.left - 12} y={y + ROW / 2 + 4} textAnchor="end">
                {group.label}
              </text>
              <rect
                x={PAD.left}
                y={y + (ROW - BAR) / 2}
                width={width}
                height={BAR}
                rx={4}
                fill="var(--series-1)"
                opacity={hover === null || hover === index ? 1 : 0.55}
              />
              <text className="chart-value-label" x={PAD.left + width + 10} y={y + ROW / 2 + 4}>
                {usdPrecise(group.amountUsd)}
              </text>
            </g>
          )
        })}
      </svg>

      {hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${(PAD.left / W) * 100}%`, top: PAD.top + hover * ROW - 6 }}
        >
          <div className="chart-tooltip-title">{visible[hover].label}</div>
          <div className="chart-tooltip-row">
            {usdPrecise(visible[hover].amountUsd)} · {ars(visible[hover].amountArs)}
          </div>
          <div className="chart-tooltip-row" style={{ color: 'var(--text-muted)' }}>
            {percent(visible[hover].share)} del gasto total
          </div>
        </div>
      )}
    </div>
  )
}
