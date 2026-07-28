import { api } from '../api/client'
import type { ExpenseLine, ExpenseSummary, IncomeSummary, PaymentMethod } from '../api/types'
import { ars, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { CurrencyFlowChart } from './charts/CurrencyFlowChart'
import { NumberField, Panel, ScreenState, Tile } from './ui'

interface CashFlowData {
  income: IncomeSummary
  expenses: ExpenseSummary
}

const loadCashFlow = async (periodId: number): Promise<CashFlowData> => {
  const [income, expenses] = await Promise.all([api.income(periodId), api.expenses(periodId)])
  return { income, expenses }
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
    .filter(
      (line) =>
        line.currency === currency &&
        (paymentMethod === undefined || line.paymentMethod === paymentMethod) &&
        (!excludeRent || !isRent(line)),
    )
    .reduce((sum, line) => sum + line.amount, 0)

export function CashFlowView({ periodId }: { periodId: number }) {
  const { data, error, loading, busy, run } = useScreen(periodId, loadCashFlow)

  if (!data) return <ScreenState loading={loading} error={error} />

  const { income, expenses } = data
  const rentArs = expenses.lines
    .filter((line) => line.currency === 'ARS' && isRent(line))
    .reduce((sum, line) => sum + line.amount, 0)
  const debitArs = total(expenses.lines, 'ARS', 'DEBIT', true)
  const creditArs = total(expenses.lines, 'ARS', 'CREDIT', true)
  const debitUsd = total(expenses.lines, 'USD', 'DEBIT')
  const creditUsd = total(expenses.lines, 'USD', 'CREDIT')
  const creditUsdInArs = creditUsd * income.cardDollarRate
  const cardExpensesArs = creditArs + creditUsdInArs
  const expensesArs = rentArs + debitArs + cardExpensesArs
  const expensesUsd = debitUsd

  const arsMissing = Math.max(expensesArs - income.salaryArs, 0)
  const usdToExchange = income.payoneerDollarRate > 0 ? arsMissing / income.payoneerDollarRate : 0
  const remainingArs = Math.max(income.salaryArs - expensesArs, 0)
  const remainingUsd = income.salaryUsd - expensesUsd - usdToExchange
  const uncoveredArs = Math.max(-remainingUsd, 0) * income.payoneerDollarRate

  const obligations = [
    { label: 'Alquiler', amountArs: rentArs, amountUsd: 0, color: 'var(--series-1)' },
    { label: 'Otros gastos con débito', amountArs: debitArs, amountUsd: 0, color: 'var(--series-2)' },
    { label: 'Gastos de tarjeta (crédito)', amountArs: cardExpensesArs, amountUsd: 0, color: 'var(--critical)' },
    { label: 'Gastos con débito en USD', amountArs: 0, amountUsd: debitUsd, color: 'var(--series-3)' },
  ].filter((item) => item.amountArs > 0 || item.amountUsd > 0)

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <Panel title="1. Lo que tenés hoy" note="Tus ingresos antes de pagar los gastos de este mes.">
        <div className="tile-grid flow-two-columns">
          <Tile label="Tenés en pesos" value={ars(income.salaryArs)} />
          <Tile label="Tenés en dólares" value={usdPrecise(income.salaryUsd)} />
        </div>
      </Panel>

      <Panel title="2. Lo que tenés que pagar" note="Separado para que veas de dónde sale el total.">
        <div className="card-dollar-field">
          <label className="field">
            Dólar tarjeta de este mes (ARS por USD)
            <NumberField
              value={income.cardDollarRate}
              disabled={busy}
              ariaLabel="Dólar tarjeta de este mes"
              onCommit={(cardDollarRate) =>
                run(async () => {
                  await api.updateIncome(periodId, {
                    salaryArs: income.salaryArs,
                    salaryUsd: income.salaryUsd,
                    referenceRate: income.referenceRate,
                    cardDollarRate,
                    payoneerDollarRate: income.payoneerDollarRate,
                    conservativeBaseUsd: income.conservativeBaseUsd,
                  })
                  return loadCashFlow(periodId)
                })
              }
            />
            <span className="field-hint">
              Tus {usdPrecise(creditUsd)} de tarjeta cuestan {ars(creditUsdInArs)} a esta cotización.
            </span>
          </label>
          <label className="field">
            Dólar Payoneer → Santander de este mes
            <NumberField
              value={income.payoneerDollarRate}
              disabled={busy}
              ariaLabel="Dólar Payoneer a Santander de este mes"
              onCommit={(payoneerDollarRate) =>
                run(async () => {
                  await api.updateIncome(periodId, {
                    salaryArs: income.salaryArs,
                    salaryUsd: income.salaryUsd,
                    referenceRate: income.referenceRate,
                    cardDollarRate: income.cardDollarRate,
                    payoneerDollarRate,
                    conservativeBaseUsd: income.conservativeBaseUsd,
                  })
                  return loadCashFlow(periodId)
                })
              }
            />
            <span className="field-hint">
              Cotización neta que recibís al pasar tus USD de Payoneer a pesos en Santander.
            </span>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pago</th>
                <th className="num">En ARS</th>
                <th className="num">Importe original USD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alquiler</td>
                <td className="num">{ars(rentArs)}</td>
                <td className="num">—</td>
              </tr>
              <tr>
                <td>Otros gastos con débito</td>
                <td className="num">{ars(debitArs)}</td>
                <td className="num">{usdPrecise(debitUsd)}</td>
              </tr>
              <tr>
                <td>Gastos de tarjeta (crédito)</td>
                <td className="num">{ars(cardExpensesArs)}</td>
                <td className="num">{usdPrecise(creditUsd)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total a pagar desde pesos</td>
                <td className="num">{ars(expensesArs)}</td>
                <td className="num">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel title="3. El cambio que necesitás hacer">
        {arsMissing > 0 ? (
          <div className="exchange-callout">
            <div>
              <div className="exchange-label">Cambiá</div>
              <div className="exchange-value">{usdPrecise(usdToExchange)}</div>
            </div>
            <div className="exchange-arrow" aria-hidden>→</div>
            <div>
              <div className="exchange-label">Para recibir</div>
              <div className="exchange-value">{ars(arsMissing)}</div>
            </div>
          </div>
        ) : (
          <div className="exchange-callout">
            <div>
              <div className="exchange-label">No necesitás cambiar dólares</div>
              <div className="exchange-value">Tus pesos alcanzan</div>
            </div>
          </div>
        )}
        <p className="flow-explanation">
          Tenés {ars(income.salaryArs)} y necesitás {ars(expensesArs)} para alquiler, débito y tarjeta.
          Para obtener los pesos faltantes, el cálculo cambia tus USD de Payoneer a {ars(income.payoneerDollarRate)}.
        </p>
      </Panel>

      {uncoveredArs > 0 && (
        <div className="error-banner">
          Aun cambiando todos los dólares disponibles, faltarían {ars(uncoveredArs)} para pagar todo.
        </div>
      )}

      <Panel title="4. Después de pagar todo" note="Este es el dinero que realmente te queda libre.">
        <div className="tile-grid flow-two-columns">
          <Tile
            label="Te quedan en pesos"
            value={ars(remainingArs)}
            tone={remainingArs > 0 ? 'good' : undefined}
          />
          <Tile
            label="Te quedan en dólares"
            value={usdPrecise(remainingUsd)}
            tone={remainingUsd >= 0 ? 'good' : 'bad'}
          />
        </div>
      </Panel>

      <Panel title="En qué se va el dinero" note="Comparación de todos los pagos usando el dólar de referencia.">
        <CurrencyFlowChart obligations={obligations} referenceRate={income.referenceRate} />
      </Panel>
    </div>
  )
}
