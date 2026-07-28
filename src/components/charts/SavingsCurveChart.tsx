import { useState } from 'react'
import type { ProjectionPoint } from '../../api/types'
import { compact, percent, usd } from '../../lib/format'

const W = 760
const H = 300
const PAD = { top: 20, right: 24, bottom: 34, left: 58 }

/**
 * Ahorro acumulado mes a mes contra la meta de efectivo. Una sola serie, así que
 * no lleva leyenda: el título del panel ya dice qué se está mirando.
 */
export function SavingsCurveChart({ points, goal }: { points: ProjectionPoint[]; goal: number }) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0) return <p className="empty">Sin proyección para mostrar.</p>

  const maxMonth = points[points.length - 1].month
  const maxValue = Math.max(goal, ...points.map((point) => point.accumulatedUsd)) || 1
  const top = niceCeiling(maxValue)

  const x = (month: number) => PAD.left + (month / maxMonth) * (W - PAD.left - PAD.right)
  const y = (value: number) => H - PAD.bottom - (value / top) * (H - PAD.top - PAD.bottom)

  const linePath = points.map((point, i) => `${i === 0 ? 'M' : 'L'}${x(point.month)},${y(point.accumulatedUsd)}`).join(' ')
  const areaPath = `${linePath} L${x(maxMonth)},${y(0)} L${x(0)},${y(0)} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * top)
  const monthTicks = points.filter((point) => point.month % 6 === 0)

  // Primer mes en el que el acumulado alcanza la meta: el punto que interesa marcar.
  const reached = goal > 0 ? points.find((point) => point.accumulatedUsd >= goal) ?? null : null
  const last = points[points.length - 1]
  const active = hover === null ? null : points[hover]

  return (
    <div className="chart-holder">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ahorro acumulado hacia la meta">
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {compact(tick)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="var(--series-1-wash)" />
        <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {goal > 0 && (
          <>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)} stroke="var(--text-muted)" strokeWidth={1.5} />
            <text className="chart-label" x={W - PAD.right} y={y(goal) - 7} textAnchor="end">
              Meta {usd(goal)}
            </text>
          </>
        )}

        {reached && (
          <>
            <circle cx={x(reached.month)} cy={y(reached.accumulatedUsd)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
            <text className="chart-value-label" x={x(reached.month)} y={y(reached.accumulatedUsd) - 12} textAnchor="middle">
              {reached.label}
            </text>
          </>
        )}

        <circle cx={x(last.month)} cy={y(last.accumulatedUsd)} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />

        {monthTicks.map((point) => (
          <text className="chart-tick" key={point.month} x={x(point.month)} y={H - PAD.bottom + 18} textAnchor="middle">
            {point.label}
          </text>
        ))}

        <line className="chart-axis-line" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />

        {active && (
          <>
            <line className="chart-axis-line" x1={x(active.month)} x2={x(active.month)} y1={PAD.top} y2={y(0)} />
            <circle cx={x(active.month)} cy={y(active.accumulatedUsd)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={W - PAD.left - PAD.right}
          height={H - PAD.top - PAD.bottom}
          fill="transparent"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const ratio = (event.clientX - box.left) / box.width
            setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * maxMonth))))
          }}
        />
      </svg>

      {active && (
        <div className="chart-tooltip" style={{ left: `${(x(active.month) / W) * 100}%`, top: 8, transform: 'translateX(-50%)' }}>
          <div className="chart-tooltip-title">
            {active.label} · mes {active.month}
          </div>
          <div className="chart-tooltip-row">
            <span className="legend-swatch" style={{ background: 'var(--series-1)' }} aria-hidden />
            {usd(active.accumulatedUsd)}
            {goal > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>{percent(active.accumulatedUsd / goal)} de la meta</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function niceCeiling(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}
