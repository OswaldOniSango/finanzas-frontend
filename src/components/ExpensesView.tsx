import { api } from '../api/client'
import type { Currency, ExpenseLine, ExpenseType, PaymentMethod, SaveExpenseItemRequest } from '../api/types'
import { EXPENSE_TYPE_LABELS, ars, percent, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { ExpenseGroupsChart } from './charts/ExpenseGroupsChart'
import { NumberField, Panel, ScreenState, SelectField, TextField, Tile } from './ui'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
]

const TYPES = (Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((value) => ({
  value,
  label: EXPENSE_TYPE_LABELS[value],
}))

const toRequest = (line: ExpenseLine): SaveExpenseItemRequest => ({
  category: line.category,
  detail: line.detail,
  amount: line.amount,
  currency: line.currency,
  paymentMethod: line.paymentMethod,
  expenseType: line.expenseType,
  expenseGroup: line.expenseGroup,
  note: line.note,
  sortOrder: line.sortOrder,
})

export function ExpensesView({ periodId }: { periodId: number }) {
  const { data: expenses, error, loading, busy, run } = useScreen(periodId, api.expenses)

  if (!expenses) return <ScreenState loading={loading} error={error} />

  const groupNames = Array.from(new Set(expenses.lines.map((line) => line.expenseGroup)))
  const totalsByPaymentMethod = expenses.lines.reduce(
    (totals, line) => {
      totals[line.paymentMethod].ars += line.amountArs
      totals[line.paymentMethod].usd += line.amountUsd
      return totals
    },
    {
      DEBIT: { ars: 0, usd: 0 },
      CREDIT: { ars: 0, usd: 0 },
    },
  )

  const patch = (line: ExpenseLine, changes: Partial<SaveExpenseItemRequest>) =>
    run(() => api.updateExpense(periodId, line.id, { ...toRequest(line), ...changes }))

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <div className="tile-grid">
        <Tile label="Total de gastos" value={usdPrecise(expenses.totalUsd)} hint={ars(expenses.totalArs)} />
        <Tile
          label="Disponible después de gastos"
          value={usdPrecise(expenses.availableAfterExpensesUsd)}
          hint={ars(expenses.availableAfterExpensesArs)}
          tone={expenses.availableAfterExpensesUsd >= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="Ingreso comprometido"
          value={percent(expenses.committedIncomeRatio)}
          hint={`Base ${usdPrecise(expenses.baseIncomeUsd)}`}
        />
        <Tile
          label="Presupuesto objetivo"
          value={expenses.targetBudgetUsd == null ? '—' : usdPrecise(expenses.targetBudgetUsd)}
          hint={
            expenses.differenceVsBudgetUsd == null
              ? 'Marcá una línea del plan como presupuesto'
              : expenses.differenceVsBudgetUsd >= 0
                ? `Te sobran ${usdPrecise(expenses.differenceVsBudgetUsd)}`
                : `Te faltan ${usdPrecise(Math.abs(expenses.differenceVsBudgetUsd))}`
          }
          tone={expenses.withinBudget ? 'good' : 'bad'}
        />
      </div>

      <Panel
        title="Gastos mensuales"
        note="Indicá si cada gasto se pagó con débito o crédito; la conversión se recalcula sola con el dólar de referencia."
        actions={
          <button
            disabled={busy}
            onClick={() =>
              run(() =>
                api.addExpense(periodId, {
                  category: 'Nuevo gasto',
                  detail: null,
                  amount: 0,
                  currency: 'ARS',
                  paymentMethod: 'DEBIT',
                  expenseType: 'VARIABLE',
                  expenseGroup: groupNames[0] ?? 'Otros',
                  note: null,
                }),
              )
            }
          >
            Agregar gasto
          </button>
        }
      >
        <h3>Totales según la lista</h3>
        <div className="tile-grid">
          <Tile
            label="Total pagado con débito"
            value={ars(totalsByPaymentMethod.DEBIT.ars)}
            hint={`Equivalente a ${usdPrecise(totalsByPaymentMethod.DEBIT.usd)}`}
          />
          <Tile
            label="Total pagado con crédito"
            value={ars(totalsByPaymentMethod.CREDIT.ars)}
            hint={`Equivalente a ${usdPrecise(totalsByPaymentMethod.CREDIT.usd)}`}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Detalle</th>
                <th className="num">Monto</th>
                <th>Moneda</th>
                <th>Medio de pago</th>
                <th>Tipo</th>
                <th>Grupo</th>
                <th className="num">ARS</th>
                <th className="num">USD</th>
                <th className="num">% del total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <TextField value={line.category} disabled={busy} ariaLabel="Categoría" onCommit={(category) => patch(line, { category })} />
                  </td>
                  <td>
                    <TextField value={line.detail ?? ''} disabled={busy} ariaLabel="Detalle" onCommit={(detail) => patch(line, { detail })} />
                  </td>
                  <td className="num">
                    <NumberField value={line.amount} disabled={busy} ariaLabel="Monto" onCommit={(amount) => patch(line, { amount })} />
                  </td>
                  <td>
                    <SelectField value={line.currency} options={CURRENCIES} disabled={busy} ariaLabel="Moneda" onCommit={(currency) => patch(line, { currency })} />
                  </td>
                  <td>
                    <SelectField
                      value={line.paymentMethod}
                      options={PAYMENT_METHODS}
                      disabled={busy}
                      ariaLabel="Medio de pago"
                      onCommit={(paymentMethod) => patch(line, { paymentMethod })}
                    />
                  </td>
                  <td>
                    <SelectField value={line.expenseType} options={TYPES} disabled={busy} ariaLabel="Tipo" onCommit={(expenseType) => patch(line, { expenseType })} />
                  </td>
                  <td>
                    <TextField value={line.expenseGroup} disabled={busy} ariaLabel="Grupo" onCommit={(expenseGroup) => patch(line, { expenseGroup })} />
                  </td>
                  <td className="num">{ars(line.amountArs)}</td>
                  <td className="num">{usdPrecise(line.amountUsd)}</td>
                  <td className="num">{percent(line.shareOfTotal)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="ghost danger"
                        disabled={busy}
                        onClick={() => run(() => api.deleteExpense(periodId, line.id))}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.lines.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    Todavía no cargaste gastos en este mes.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>Total</td>
                <td className="num">{ars(expenses.totalArs)}</td>
                <td className="num">{usdPrecise(expenses.totalUsd)}</td>
                <td className="num">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel title="Distribución por grupo" note="Ordenado de mayor a menor, medido en dólares.">
        <ExpenseGroupsChart groups={expenses.byGroup} />
      </Panel>

      <Panel title="Distribución por tipo" note="Cuánto de tu gasto es realmente recortable.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="num">USD</th>
                <th className="num">ARS</th>
                <th className="num">% del total</th>
              </tr>
            </thead>
            <tbody>
              {expenses.byType.map((group) => (
                <tr key={group.label}>
                  <td>{EXPENSE_TYPE_LABELS[group.label] ?? group.label}</td>
                  <td className="num">{usdPrecise(group.amountUsd)}</td>
                  <td className="num">{ars(group.amountArs)}</td>
                  <td className="num">{percent(group.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
