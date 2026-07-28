import { useState } from 'react'
import { api } from '../api/client'
import type { PeriodOverview } from '../api/types'
import { ars, monthsLabel, percent, usd, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { SavingsCurveChart } from './charts/SavingsCurveChart'
import { Panel, ScreenState, Tile } from './ui'

export function SummaryView({ periodId }: { periodId: number }) {
  const { data, error, loading, busy, run } = useScreen(periodId, api.overview)

  if (!data) return <ScreenState loading={loading} error={error} />

  return (
    <Overview
      overview={data}
      busy={busy}
      error={error}
      onSaveNotes={(notes) => run(() => api.updateNotes(periodId, notes))}
    />
  )
}

function Overview({
  overview,
  busy,
  error,
  onSaveNotes,
}: {
  overview: PeriodOverview
  busy: boolean
  error: string | null
  onSaveNotes: (notes: string) => void
}) {
  const { apartment } = overview
  const savedNotes = overview.notes ?? ''
  const [notes, setNotes] = useState(savedNotes)

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <Panel title={`Plan financiero — ${overview.period.label}`}>
        <div className="tile-grid">
          <Tile
            label="Meses estimados para la meta"
            value={apartment.estimatedMonthsRounded === null ? '—' : String(apartment.estimatedMonthsRounded)}
            hint={
              apartment.estimatedCompletion
                ? `${monthsLabel(apartment.estimatedMonthsRounded)} · llegás en ${apartment.estimatedCompletion}`
                : 'Cargá un ahorro mensual para estimarlo'
            }
            hero
          />
          <Tile
            label="Ahorro mensual para el apartamento"
            value={usdPrecise(apartment.monthlySavingUsd)}
            hint={
              apartment.monthlySavingUsd < apartment.plannedMonthlySavingUsd
                ? `El plan pedía ${usdPrecise(apartment.plannedMonthlySavingUsd)}; no alcanza el disponible`
                : 'Coincide con lo que pide el plan'
            }
            tone={apartment.monthlySavingUsd < apartment.plannedMonthlySavingUsd ? 'bad' : 'good'}
          />
          <Tile
            label="Avance de la meta"
            value={percent(apartment.goalProgress)}
            hint={`${usd(apartment.currentSavingsUsd)} de ${usd(apartment.cashGoalUsd)}`}
          />
        </div>
      </Panel>

      <div className="tile-grid">
        <Tile
          label="Ingreso total equivalente"
          value={usdPrecise(overview.totalIncomeUsd)}
          hint={`Dólar de referencia ${ars(overview.referenceRate)}`}
        />
        <Tile
          label="Base conservadora del plan"
          value={usdPrecise(overview.conservativeBaseUsd)}
          hint="Sobre esta base se reparten los porcentajes"
        />
        <Tile
          label="Gastos mensuales cargados"
          value={usdPrecise(overview.totalExpensesUsd)}
          hint={`${overview.expenseCount} conceptos`}
        />
        <Tile
          label="Disponible después de gastos"
          value={usdPrecise(overview.availableAfterExpensesUsd)}
          hint={overview.availableAfterExpensesUsd >= 0 ? 'Queda margen' : 'Los gastos superan el ingreso base'}
          tone={overview.availableAfterExpensesUsd >= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="Ingreso comprometido"
          value={percent(overview.committedIncomeRatio)}
          hint={
            overview.targetBudgetUsd == null
              ? 'Sin presupuesto objetivo definido'
              : overview.withinBudget
                ? `Dentro del presupuesto de ${usdPrecise(overview.targetBudgetUsd)}`
                : `Sobre el presupuesto de ${usdPrecise(overview.targetBudgetUsd)}`
          }
          tone={overview.withinBudget ? 'good' : 'bad'}
        />
        <Tile
          label="Deuda de tarjetas"
          value={usdPrecise(overview.cardsBalanceUsd)}
          hint={
            overview.cardsPayoffMonths
              ? `Se cancela en ${monthsLabel(overview.cardsPayoffMonths)} al ritmo actual`
              : 'Sin saldo pendiente'
          }
          tone={overview.cardsBalanceUsd > 0 ? 'bad' : 'good'}
        />
      </div>

      <Panel
        title="Camino hacia la meta"
        note={`Ahorro acumulado proyectado a ${usdPrecise(apartment.monthlySavingUsd)} por mes, partiendo de ${usd(apartment.currentSavingsUsd)}.`}
      >
        <SavingsCurveChart points={apartment.projection} goal={apartment.cashGoalUsd} />
      </Panel>

      <Panel title="Reglas principales">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Reglas del plan" />
        <div className="button-row">
          <button className="primary" onClick={() => onSaveNotes(notes)} disabled={notes === savedNotes || busy}>
            Guardar reglas
          </button>
          {notes !== savedNotes && <span className="field-hint">Hay cambios sin guardar</span>}
        </div>
      </Panel>
    </div>
  )
}
