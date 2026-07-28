import { useState } from 'react'
import { api } from '../api/client'
import type { IncomeSummary, UpdateIncomeRequest } from '../api/types'
import { ars, usd, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { Panel, ScreenState, Tile } from './ui'

export function IncomeView({ periodId }: { periodId: number }) {
  const { data, error, loading, busy, run } = useScreen(periodId, api.income)

  if (!data) return <ScreenState loading={loading} error={error} />

  // La clave re-sincroniza el borrador con lo que quedó guardado en el servidor.
  return (
    <IncomeForm
      key={`${data.salaryArs}-${data.salaryUsd}-${data.referenceRate}-${data.cardDollarRate}-${data.payoneerDollarRate}-${data.conservativeBaseUsd}`}
      income={data}
      busy={busy}
      error={error}
      onSave={(body) => run(() => api.updateIncome(periodId, body))}
    />
  )
}

function IncomeForm({
  income,
  busy,
  error,
  onSave,
}: {
  income: IncomeSummary
  busy: boolean
  error: string | null
  onSave: (body: UpdateIncomeRequest) => void
}) {
  const saved: UpdateIncomeRequest = {
    salaryArs: income.salaryArs,
    salaryUsd: income.salaryUsd,
    referenceRate: income.referenceRate,
    cardDollarRate: income.cardDollarRate,
    payoneerDollarRate: income.payoneerDollarRate,
    conservativeBaseUsd: income.conservativeBaseUsd,
  }

  const [draft, setDraft] = useState<UpdateIncomeRequest>(saved)

  const dirty =
    draft.salaryArs !== saved.salaryArs ||
    draft.salaryUsd !== saved.salaryUsd ||
    draft.referenceRate !== saved.referenceRate ||
    draft.cardDollarRate !== saved.cardDollarRate ||
    draft.payoneerDollarRate !== saved.payoneerDollarRate ||
    draft.conservativeBaseUsd !== saved.conservativeBaseUsd

  const set = (key: keyof UpdateIncomeRequest) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <Panel
        title="Ingresos mensuales"
        note="El dólar de referencia convierte el plan; el dólar tarjeta calcula cuánto cuestan en pesos los consumos de crédito en USD."
      >
        <div className="field-grid">
          <label className="field">
            Sueldo en pesos (ARS)
            <input type="number" step="0.01" value={draft.salaryArs} onChange={set('salaryArs')} />
          </label>
          <label className="field">
            Sueldo en dólares (USD)
            <input type="number" step="0.01" value={draft.salaryUsd} onChange={set('salaryUsd')} />
          </label>
          <label className="field">
            Dólar de referencia (ARS por USD)
            <input type="number" step="0.01" value={draft.referenceRate} onChange={set('referenceRate')} />
          </label>
          <label className="field">
            Dólar tarjeta (ARS por USD)
            <input type="number" step="0.01" value={draft.cardDollarRate} onChange={set('cardDollarRate')} />
            <span className="field-hint">Cotización mensual para pagar en pesos los consumos de tarjeta en USD.</span>
          </label>
          <label className="field">
            Dólar Payoneer → Santander (ARS por USD)
            <input type="number" step="0.01" value={draft.payoneerDollarRate} onChange={set('payoneerDollarRate')} />
            <span className="field-hint">Cotización neta que recibís al cambiar tus USD a pesos.</span>
          </label>
          <label className="field">
            Base conservadora del plan (USD)
            <input type="number" step="0.01" value={draft.conservativeBaseUsd} onChange={set('conservativeBaseUsd')} />
            <span className="field-hint">Deliberadamente menor al ingreso real, para no sobreestimar.</span>
          </label>
        </div>

        <div className="button-row">
          <button className="primary" onClick={() => onSave(draft)} disabled={!dirty || busy}>
            Guardar ingresos
          </button>
          {dirty && (
            <button className="ghost" disabled={busy} onClick={() => setDraft(saved)}>
              Descartar
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Resultado del mes">
        <div className="tile-grid">
          <Tile
            label="Sueldo USD convertido a pesos"
            value={ars(income.salaryUsdInArs)}
            hint={`${usd(income.salaryUsd)} × ${ars(income.referenceRate)}`}
          />
          <Tile
            label="Ingreso total mensual"
            value={ars(income.totalIncomeArs)}
            hint="Sueldo en pesos + sueldo en dólares convertido"
          />
          <Tile
            label="Ingreso total equivalente"
            value={usdPrecise(income.totalIncomeUsd)}
            hint="Ingreso total en pesos / dólar de referencia"
          />
          <Tile
            label="Base conservadora"
            value={usdPrecise(income.conservativeBaseUsd)}
            hint={`Equivale a ${ars(income.conservativeBaseArs)}`}
          />
        </div>
      </Panel>
    </div>
  )
}
