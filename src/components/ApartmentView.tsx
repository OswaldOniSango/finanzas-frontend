import { useState } from 'react'
import { api } from '../api/client'
import type { ApartmentSummary, UpdateApartmentGoalRequest } from '../api/types'
import { monthsLabel, percent, usd, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { SavingsCurveChart } from './charts/SavingsCurveChart'
import { Panel, ScreenState, Tile } from './ui'

export function ApartmentView({ periodId }: { periodId: number }) {
  const { data, error, loading, busy, run } = useScreen(periodId, api.apartment)

  if (!data) return <ScreenState loading={loading} error={error} />

  return (
    <ApartmentDetail
      key={`${data.targetPriceUsd}-${data.downPaymentPercent}-${data.currentSavingsUsd}`}
      apartment={data}
      busy={busy}
      error={error}
      onSave={(body) => run(() => api.updateApartmentGoal(periodId, body))}
    />
  )
}

function ApartmentDetail({
  apartment,
  busy,
  error,
  onSave,
}: {
  apartment: ApartmentSummary
  busy: boolean
  error: string | null
  onSave: (body: UpdateApartmentGoalRequest) => void
}) {
  const saved: UpdateApartmentGoalRequest = {
    targetPriceUsd: apartment.targetPriceUsd,
    downPaymentPercent: apartment.downPaymentPercent,
    currentSavingsUsd: apartment.currentSavingsUsd,
  }

  const [draft, setDraft] = useState<UpdateApartmentGoalRequest>(saved)

  const dirty =
    draft.targetPriceUsd !== saved.targetPriceUsd ||
    draft.downPaymentPercent !== saved.downPaymentPercent ||
    draft.currentSavingsUsd !== saved.currentSavingsUsd

  const set = (key: keyof UpdateApartmentGoalRequest) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))

  const shortfall = apartment.plannedMonthlySavingUsd - apartment.monthlySavingUsd

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <Panel title="Meta del apartamento">
        <div className="field-grid">
          <label className="field">
            Precio objetivo (USD)
            <input type="number" step="0.01" value={draft.targetPriceUsd} onChange={set('targetPriceUsd')} />
          </label>
          <label className="field">
            Porcentaje para entrada y gastos
            <input type="number" step="0.01" min="0" max="1" value={draft.downPaymentPercent} onChange={set('downPaymentPercent')} />
            <span className="field-hint">Como fracción: 0,30 = 30%. Incluye margen de operación.</span>
          </label>
          <label className="field">
            Ahorros actuales (USD)
            <input type="number" step="0.01" value={draft.currentSavingsUsd} onChange={set('currentSavingsUsd')} />
          </label>
        </div>

        <div className="button-row">
          <button className="primary" onClick={() => onSave(draft)} disabled={!dirty || busy}>
            Guardar meta
          </button>
          {dirty && (
            <button className="ghost" disabled={busy} onClick={() => setDraft(saved)}>
              Descartar
            </button>
          )}
        </div>
      </Panel>

      <div className="tile-grid">
        <Tile
          label="Meses estimados"
          value={apartment.estimatedMonthsRounded === null ? '—' : String(apartment.estimatedMonthsRounded)}
          hint={
            apartment.estimatedCompletion
              ? `${monthsLabel(apartment.estimatedMonthsRounded)} · ${apartment.estimatedCompletion}`
              : 'Necesitás ahorro mensual positivo'
          }
          hero
        />
        <Tile
          label="Meta de efectivo"
          value={usd(apartment.cashGoalUsd)}
          hint={`${percent(apartment.downPaymentPercent)} de ${usd(apartment.targetPriceUsd)}`}
        />
        <Tile label="Monto pendiente" value={usd(apartment.pendingUsd)} hint={`Avance ${percent(apartment.goalProgress)}`} />
        <Tile
          label="Ahorro mensual real"
          value={usdPrecise(apartment.monthlySavingUsd)}
          hint={
            shortfall > 0
              ? `${usdPrecise(shortfall)} por debajo de lo que pide el plan`
              : 'Alcanza lo que pide el plan'
          }
          tone={shortfall > 0 ? 'bad' : 'good'}
        />
      </div>

      <Panel
        title="Proyección del ahorro"
        note="El ahorro mensual es el menor entre lo que asigna el plan y lo que realmente queda disponible después de gastos."
      >
        <SavingsCurveChart points={apartment.projection} goal={apartment.cashGoalUsd} />
      </Panel>

      <Panel title="Tabla de proyección" note="Los mismos datos del gráfico, mes a mes.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">Mes</th>
                <th>Periodo</th>
                <th className="num">Ahorro mensual</th>
                <th className="num">Acumulado</th>
                <th className="num">% de la meta</th>
              </tr>
            </thead>
            <tbody>
              {apartment.projection
                .filter((point) => point.month % 3 === 0)
                .map((point) => (
                  <tr key={point.month}>
                    <td className="num">{point.month}</td>
                    <td>{point.label}</td>
                    <td className="num">{usdPrecise(apartment.monthlySavingUsd)}</td>
                    <td className="num">{usdPrecise(point.accumulatedUsd)}</td>
                    <td className="num">
                      {apartment.cashGoalUsd > 0 ? percent(point.accumulatedUsd / apartment.cashGoalUsd) : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
