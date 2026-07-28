import { api } from '../api/client'
import type { HistoryPoint } from '../api/types'
import { ars, percent, usd, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { HistoryChart } from './charts/HistoryChart'
import { Panel, ScreenState, Tile } from './ui'

/** Se vuelve a pedir cuando cambia el mes activo, porque un mes nuevo suma un punto. */
export function HistoryView({ periodId }: { periodId: number }) {
  const { data, error, loading } = useScreen(periodId, api.history)

  if (!data) return <ScreenState loading={loading} error={error} />

  return <History history={data} />
}

function History({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <Panel title="Histórico mensual">
        <p className="empty">Todavía no hay meses cerrados para comparar.</p>
      </Panel>
    )
  }

  const first = history[0]
  const last = history[history.length - 1]
  const expenseDelta = last.totalExpensesUsd - first.totalExpensesUsd
  const savingsDelta = last.currentSavingsUsd - first.currentSavingsUsd

  return (
    <div className="section">
      <div className="tile-grid">
        <Tile label="Meses registrados" value={String(history.length)} hint={`Desde ${first.label} hasta ${last.label}`} />
        <Tile
          label="Gastos del último mes"
          value={usdPrecise(last.totalExpensesUsd)}
          hint={
            history.length < 2
              ? 'Necesitás un segundo mes para comparar'
              : `${expenseDelta >= 0 ? '+' : ''}${usdPrecise(expenseDelta)} vs ${first.label}`
          }
          tone={history.length < 2 ? undefined : expenseDelta <= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="Ahorro acumulado"
          value={usd(last.currentSavingsUsd)}
          hint={history.length < 2 ? `Avance ${percent(last.goalProgress)}` : `+${usd(savingsDelta)} desde ${first.label}`}
          tone={savingsDelta > 0 ? 'good' : undefined}
        />
        <Tile
          label="Ingreso comprometido"
          value={percent(last.committedIncomeRatio)}
          hint={`Disponible ${usdPrecise(last.availableAfterExpensesUsd)}`}
        />
      </div>

      <Panel
        title="Ingreso base: gastos vs. disponible"
        note="Cada columna es el ingreso base de ese mes; el corte muestra cuánto se fue en gastos."
      >
        <HistoryChart points={history} />
      </Panel>

      <Panel title="Detalle mes a mes">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Dólar ref.</th>
                <th className="num">Ingreso total</th>
                <th className="num">Base del plan</th>
                <th className="num">Gastos</th>
                <th className="num">Disponible</th>
                <th className="num">Comprometido</th>
                <th className="num">Ahorro mensual</th>
                <th className="num">Ahorro acumulado</th>
                <th className="num">Avance meta</th>
                <th className="num">Deuda tarjetas</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((point) => (
                <tr key={point.periodId}>
                  <td>{point.label}</td>
                  <td className="num">{ars(point.referenceRate)}</td>
                  <td className="num">{usdPrecise(point.totalIncomeUsd)}</td>
                  <td className="num">{usdPrecise(point.conservativeBaseUsd)}</td>
                  <td className="num">{usdPrecise(point.totalExpensesUsd)}</td>
                  <td className="num">{usdPrecise(point.availableAfterExpensesUsd)}</td>
                  <td className="num">{percent(point.committedIncomeRatio)}</td>
                  <td className="num">{usdPrecise(point.monthlySavingUsd)}</td>
                  <td className="num">{usd(point.currentSavingsUsd)}</td>
                  <td className="num">{percent(point.goalProgress)}</td>
                  <td className="num">{usdPrecise(point.cardsBalanceUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
