import { useState } from 'react'
import type { HistoryPoint } from '../../api/types'
import { compact, percent, usdPrecise } from '../../lib/format'
import { Legend } from '../ui'

const W = 760
const H = 300
const PAD = { top: 24, right: 20, bottom: 34, left: 58 }
const MAX_BAR = 24
const GAP = 2

/**
 * Cada columna es el ingreso base de ese mes, partido en lo que se fue en gastos
 * y lo que quedó disponible. La altura total muestra si el ingreso cambió; el
 * corte muestra cuánto se comprometió.
 */
export function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0) return <p className="empty">Todavía no hay meses cargados.</p>

  const top = niceCeiling(Math.max(...points.map((point) => point.conservativeBaseUsd)) || 1)
  const band = (W - PAD.left - PAD.right) / points.length
  const barWidth = Math.min(MAX_BAR, band * 0.6)

  const center = (index: number) => PAD.left + band * (index + 0.5)
  const y = (value: number) => H - PAD.bottom - (value / top) * (H - PAD.top - PAD.bottom)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * top)

  return (
    <div className="chart-holder">
      <Legend
        items={[
          { label: 'Gastos', color: 'var(--series-1)' },
          { label: 'Disponible', color: 'var(--series-2)' },
        ]}
      />

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución mensual del ingreso base">
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {compact(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const cx = center(index)
          const left = cx - barWidth / 2
          const expenses = Math.max(point.totalExpensesUsd, 0)
          const available = Math.max(point.availableAfterExpensesUsd, 0)
          const dim = hover !== null && hover !== index

          const expensesTop = y(expenses)
          const expensesHeight = Math.max(y(0) - expensesTop, 0)
          // El tramo disponible se apoya sobre el de gastos, con 2px de aire entre ambos.
          const availableBottom = expensesTop - GAP
          const availableHeight = Math.max(y(0) - y(available) - GAP, 0)

          return (
            <g key={point.periodId} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - band / 2} y={PAD.top} width={band} height={H - PAD.top - PAD.bottom} fill="transparent" />

              {expensesHeight > 0 && (
                <rect x={left} y={expensesTop} width={barWidth} height={expensesHeight} fill="var(--series-1)" opacity={dim ? 0.55 : 1} />
              )}
              {availableHeight > 0 && (
                <rect
                  x={left}
                  y={availableBottom - availableHeight}
                  width={barWidth}
                  height={availableHeight}
                  rx={4}
                  fill="var(--series-2)"
                  opacity={dim ? 0.55 : 1}
                />
              )}

              <text className="chart-value-label" x={cx} y={y(point.conservativeBaseUsd) - 9} textAnchor="middle">
                {compact(point.conservativeBaseUsd)}
              </text>
              <text className="chart-tick" x={cx} y={H - PAD.bottom + 18} textAnchor="middle">
                {point.label}
              </text>
            </g>
          )
        })}

        <line className="chart-axis-line" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>

      {hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${(center(hover) / W) * 100}%`, top: 20, transform: 'translateX(-50%)' }}
        >
          <div className="chart-tooltip-title">{points[hover].label}</div>
          <div className="chart-tooltip-row">
            <span className="legend-swatch" style={{ background: 'var(--series-1)' }} aria-hidden />
            Gastos {usdPrecise(points[hover].totalExpensesUsd)}
          </div>
          <div className="chart-tooltip-row">
            <span className="legend-swatch" style={{ background: 'var(--series-2)' }} aria-hidden />
            Disponible {usdPrecise(points[hover].availableAfterExpensesUsd)}
          </div>
          <div className="chart-tooltip-row" style={{ color: 'var(--text-muted)' }}>
            {percent(points[hover].committedIncomeRatio)} del ingreso comprometido
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
