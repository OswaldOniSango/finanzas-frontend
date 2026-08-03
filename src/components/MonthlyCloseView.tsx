import { api } from '../api/client'
import type { ExpenseLine, ExpenseSummary, IncomeSummary, MonthlyActuals, PaymentMethod } from '../api/types'
import { ars, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { NumberField, Panel, ScreenState, Tile } from './ui'

interface MonthlyCloseData {
  income: IncomeSummary
  expenses: ExpenseSummary
  actuals: MonthlyActuals
}

const loadMonthlyClose = async (periodId: number): Promise<MonthlyCloseData> => {
  const [income, expenses, actuals] = await Promise.all([
    api.income(periodId),
    api.expenses(periodId),
    api.monthlyActuals(periodId),
  ])
  return { income, expenses, actuals }
}

const isRent = (line: ExpenseLine) =>
  line.category.toLocaleLowerCase('es').includes('apartamento') ||
  (line.detail ?? '').toLocaleLowerCase('es').includes('alquiler')

const total = (
  lines: ExpenseLine[],
  currency: 'ARS' | 'USD',
  paymentMethod?: PaymentMethod,
  excludeRent = false,
) =>
  lines
    .filter((line) =>
      line.currency === currency &&
      (paymentMethod === undefined || line.paymentMethod === paymentMethod) &&
      (!excludeRent || !isRent(line)))
    .reduce((sum, line) => sum + line.amount, 0)

const signedUsd = (value: number) => `${value > 0 ? '+' : ''}${usdPrecise(value)}`
const signedArs = (value: number) => `${value > 0 ? '+' : ''}${ars(value)}`

export function MonthlyCloseView({ periodId }: { periodId: number }) {
  const { data, error, loading, busy, run } = useScreen(periodId, loadMonthlyClose)

  if (!data) return <ScreenState loading={loading} error={error} />

  const { income, expenses, actuals } = data
  const patch = (changes: Partial<MonthlyActuals>) =>
    run(async () => {
      const next = { ...actuals, ...changes }
      return {
        income,
        expenses,
        actuals: await api.updateMonthlyActuals(periodId, {
          actualPayoneerRate: next.actualPayoneerRate,
          usdExchanged: next.usdExchanged,
          cardPaymentsArs: next.cardPaymentsArs,
          notes: next.notes,
        }),
      }
    })

  const rentArs = expenses.lines
    .filter((line) => line.currency === 'ARS' && isRent(line))
    .reduce((sum, line) => sum + line.amount, 0)
  const debitArs = total(expenses.lines, 'ARS', 'DEBIT', true)
  const plannedCardsArs = total(expenses.lines, 'ARS', 'CREDIT', true)
  const plannedCardsUsd = total(expenses.lines, 'USD', 'CREDIT')
  const plannedCardsInArs = plannedCardsArs + plannedCardsUsd * income.cardDollarRate
  const plannedArsNeeded = rentArs + debitArs + plannedCardsInArs
  const plannedArsMissing = Math.max(plannedArsNeeded - income.salaryArs, 0)
  const plannedUsdExchange = income.payoneerDollarRate > 0
    ? plannedArsMissing / income.payoneerDollarRate
    : 0

  const effectiveRate = actuals.actualPayoneerRate
  const exchangeDeviationUsd = actuals.usdExchanged - plannedUsdExchange
  const exchangeDeviationArs = actuals.arsReceived - plannedArsMissing
  const plannedCardsEquivalentUsd = income.payoneerDollarRate > 0
    ? plannedCardsInArs / income.payoneerDollarRate
    : 0
  const cardsDeviationEquivalentUsd = actuals.cardPaymentsUsd - plannedCardsEquivalentUsd
  const hasActuals = effectiveRate > 0 && (actuals.usdExchanged > 0 || actuals.cardPaymentsArs > 0)
  const outsidePlan = hasActuals && (exchangeDeviationUsd > 0.01 || cardsDeviationEquivalentUsd > 0.01)

  const adjustment = !hasActuals
    ? 'Cargá los importes reales al terminar el mes para obtener el análisis.'
    : cardsDeviationEquivalentUsd > 0.01
      ? `Pagaste ${usdPrecise(cardsDeviationEquivalentUsd)} más en tarjetas que lo previsto. Revisá consumos con crédito y aumentá ese presupuesto si fueron gastos inevitables.`
      : exchangeDeviationUsd > 0.01
        ? `Tuviste que cambiar ${usdPrecise(exchangeDeviationUsd)} más de lo previsto. Revisá gastos con débito y la cotización estimada para el próximo mes.`
        : 'El cierre quedó dentro del plan. Podés mantener los límites actuales para el próximo mes.'

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <div className="tile-grid">
        <Tile
          label="Resultado del mes"
          value={!hasActuals ? 'Pendiente' : outsidePlan ? 'Fuera del plan' : 'Dentro del plan'}
          tone={!hasActuals ? undefined : outsidePlan ? 'bad' : 'good'}
        />
        <Tile label="USD que cambiaste" value={hasActuals ? usdPrecise(actuals.usdExchanged) : '—'} hint={hasActuals ? `Plan: ${usdPrecise(plannedUsdExchange)} · Desvío ${signedUsd(exchangeDeviationUsd)}` : 'Falta cargar el cierre'} tone={!hasActuals ? undefined : exchangeDeviationUsd <= 0 ? 'good' : 'bad'} />
        <Tile
          label="Gasto real en tarjetas"
          value={hasActuals ? usdPrecise(actuals.cardPaymentsUsd) : '—'}
          hint={hasActuals ? `Pagaste ${ars(actuals.cardPaymentsArs)} · Desvío ${signedUsd(cardsDeviationEquivalentUsd)}` : 'Se calcula desde el pago en ARS'}
          tone={!hasActuals ? undefined : cardsDeviationEquivalentUsd <= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="Cotización efectiva"
          value={hasActuals ? ars(effectiveRate) : '—'}
          hint={`Plan Payoneer: ${ars(income.payoneerDollarRate)}`}
          tone={effectiveRate === 0 ? undefined : effectiveRate >= income.payoneerDollarRate ? 'good' : 'bad'}
        />
      </div>

      <Panel
        title="Lo que realmente pasó"
        note="Estos importes son el cierre real. Se guardan por separado para no alterar tu planificación original."
      >
        <div className="actuals-form-grid">
          <label className="field">
            Dólar Payoneer real (ARS por USD)
            <NumberField value={actuals.actualPayoneerRate} disabled={busy} ariaLabel="Dólar Payoneer real" onCommit={(actualPayoneerRate) => patch({ actualPayoneerRate })} />
          </label>
          <label className="field">
            USD que terminaste cambiando
            <NumberField value={actuals.usdExchanged} disabled={busy} ariaLabel="USD realmente cambiados" onCommit={(usdExchanged) => patch({ usdExchanged })} />
          </label>
          <label className="field">
            Total pagado en tarjetas en ARS
            <NumberField value={actuals.cardPaymentsArs} disabled={busy} ariaLabel="Pago real de tarjetas en ARS" onCommit={(cardPaymentsArs) => patch({ cardPaymentsArs })} />
          </label>
          <div className="actuals-derived">
            <span>ARS recibidos automáticamente</span>
            <strong>{effectiveRate > 0 ? ars(actuals.arsReceived) : '—'}</strong>
            <small>USD cambiados × dólar Payoneer real</small>
          </div>
          <div className="actuals-derived">
            <span>Tarjetas equivalentes en USD</span>
            <strong>{effectiveRate > 0 ? usdPrecise(actuals.cardPaymentsUsd) : '—'}</strong>
            <small>Pago de tarjetas en ARS ÷ dólar Payoneer real</small>
          </div>
        </div>
        <label className="field actuals-notes">
          Qué ocurrió este mes
          <textarea
            defaultValue={actuals.notes ?? ''}
            key={actuals.notes ?? ''}
            disabled={busy}
            maxLength={1000}
            placeholder="Ej.: cambié más dólares porque la tarjeta cerró por encima de lo estimado."
            onBlur={(event) => {
              const notes = event.target.value.trim() || null
              if (notes !== actuals.notes) patch({ notes })
            }}
          />
        </label>
      </Panel>

      <Panel title="Plan vs. cierre real" note="Un valor positivo significa que terminaste usando o pagando más de lo previsto.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Concepto</th><th className="num">Plan</th><th className="num">Real</th><th className="num">Desvío</th></tr>
            </thead>
            <tbody>
              <tr><td>USD cambiados</td><td className="num">{usdPrecise(plannedUsdExchange)}</td><td className="num">{usdPrecise(actuals.usdExchanged)}</td><td className="num">{signedUsd(exchangeDeviationUsd)}</td></tr>
              <tr><td>ARS recibidos</td><td className="num">{ars(plannedArsMissing)}</td><td className="num">{ars(actuals.arsReceived)}</td><td className="num">{signedArs(exchangeDeviationArs)}</td></tr>
              <tr><td>Tarjetas equivalentes en USD</td><td className="num">{usdPrecise(plannedCardsEquivalentUsd)}</td><td className="num">{hasActuals ? usdPrecise(actuals.cardPaymentsUsd) : '—'}</td><td className="num">{hasActuals ? signedUsd(cardsDeviationEquivalentUsd) : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Qué ajustar para el próximo mes">
        <p className="actuals-adjustment">{adjustment}</p>
      </Panel>
    </div>
  )
}
