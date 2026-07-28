import { ars, percent, usdPrecise } from '../../lib/format'

const W = 760
const ROW = 42
const BAR = 24
const PAD = { top: 8, right: 126, bottom: 8, left: 162 }

interface Obligation {
  label: string
  amountArs: number
  amountUsd: number
  color: string
}

export function CurrencyFlowChart({
  obligations,
  referenceRate,
}: {
  obligations: Obligation[]
  referenceRate: number
}) {
  const values = obligations.map((item) =>
    item.amountUsd + (referenceRate > 0 ? item.amountArs / referenceRate : 0),
  )
  const grandTotal = values.reduce((sum, value) => sum + value, 0)
  const max = Math.max(...values, 1)
  const height = PAD.top + obligations.length * ROW + PAD.bottom
  const scale = (value: number) => (value / max) * (W - PAD.left - PAD.right)

  return (
    <div className="chart-holder">
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Pagos del mes por concepto">
        {obligations.map((item, index) => {
          const value = values[index]
          const width = Math.max(scale(value), 2)
          const y = PAD.top + index * ROW
          const originalAmount = item.amountArs > 0 ? ars(item.amountArs) : usdPrecise(item.amountUsd)

          return (
            <g key={item.label}>
              <text className="chart-label" x={PAD.left - 12} y={y + ROW / 2 + 4} textAnchor="end">
                {item.label}
              </text>
              <rect
                x={PAD.left}
                y={y + (ROW - BAR) / 2}
                width={width}
                height={BAR}
                rx={4}
                fill={item.color}
              />
              <text className="chart-value-label" x={PAD.left + width + 10} y={y + ROW / 2 + 4}>
                {originalAmount}
              </text>
              <title>
                {originalAmount} · {percent(grandTotal > 0 ? value / grandTotal : 0)} del total
              </title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
