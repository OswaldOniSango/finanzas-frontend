import { useState } from 'react'
import { api } from '../api/client'
import type { Currency, ExpenseLine, ExpenseType, PaymentMethod, SaveExpenseItemRequest } from '../api/types'
import { EXPENSE_TYPE_LABELS, ars, percent, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { ExpenseGroupsChart } from './charts/ExpenseGroupsChart'
import { Panel, ScreenState, Tile } from './ui'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
]

type CardLimitScope = 'OWN' | 'EXTERNAL'

const CARD_LIMIT_SCOPES: { value: CardLimitScope; label: string }[] = [
  { value: 'OWN', label: 'Sí, mi tarjeta' },
  { value: 'EXTERNAL', label: 'No, crédito externo' },
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
  countsTowardCardLimit: line.countsTowardCardLimit,
  expenseType: line.expenseType,
  expenseGroup: line.expenseGroup,
  note: line.note,
  sortOrder: line.sortOrder,
})

const emptyExpense = (expenseGroup = 'Otros'): SaveExpenseItemRequest => ({
  category: '',
  detail: null,
  amount: 0,
  currency: 'ARS',
  paymentMethod: 'DEBIT',
  countsTowardCardLimit: true,
  expenseType: 'VARIABLE',
  expenseGroup,
  note: null,
})

export function ExpensesView({ periodId }: { periodId: number }) {
  const { data: expenses, error, loading, busy, run } = useScreen(periodId, api.expenses)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draft, setDraft] = useState<SaveExpenseItemRequest>(emptyExpense)
  const [editingExpense, setEditingExpense] = useState<ExpenseLine | null>(null)

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

  const closeAddModal = () => {
    setShowAddModal(false)
    setEditingExpense(null)
    setDraft(emptyExpense(groupNames[0]))
  }

  const saveExpense = () => {
    const request = {
      ...draft,
      category: draft.category.trim(),
      detail: draft.detail?.trim() || null,
      expenseGroup: draft.expenseGroup.trim() || 'Otros',
      note: draft.note?.trim() || null,
    }
    if (!request.category) return

    run(() =>
      (editingExpense
        ? api.updateExpense(periodId, editingExpense.id, request)
        : api.addExpense(periodId, request)
      ).then((next) => {
        closeAddModal()
        return next
      }),
    )
  }

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      {showAddModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) closeAddModal()
          }}
        >
          <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="new-expense-title">
            <div className="modal-head">
              <div>
                <h2 id="new-expense-title">{editingExpense ? 'Editar gasto' : 'Agregar gasto'}</h2>
                <p>{editingExpense ? 'Actualizá los datos de este gasto.' : 'Registrá un nuevo gasto para el mes seleccionado.'}</p>
              </div>
              <button className="modal-close" aria-label="Cerrar" disabled={busy} onClick={closeAddModal}>×</button>
            </div>

            <div className="modal-form-grid">
              <label className="field">
                Categoría
                <input autoFocus value={draft.category} placeholder="Ej.: Supermercado" onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
              </label>
              <label className="field">
                Detalle
                <input value={draft.detail ?? ''} placeholder="Opcional" onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} />
              </label>
              <label className="field">
                Monto
                <input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))} />
              </label>
              <label className="field">
                Moneda
                <select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as Currency }))}>
                  {CURRENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                Medio de pago
                <select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}>
                  {PAYMENT_METHODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {draft.paymentMethod === 'CREDIT' && (
                <label className="field">
                  Cuenta para mi límite
                  <select value={draft.countsTowardCardLimit ? 'OWN' : 'EXTERNAL'} onChange={(event) => setDraft((current) => ({ ...current, countsTowardCardLimit: event.target.value === 'OWN' }))}>
                    {CARD_LIMIT_SCOPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                Tipo
                <select value={draft.expenseType} onChange={(event) => setDraft((current) => ({ ...current, expenseType: event.target.value as ExpenseType }))}>
                  {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                Grupo
                <input list="expense-group-options" value={draft.expenseGroup} onChange={(event) => setDraft((current) => ({ ...current, expenseGroup: event.target.value }))} />
                <datalist id="expense-group-options">{groupNames.map((group) => <option key={group} value={group} />)}</datalist>
              </label>
            </div>

            <div className="modal-actions">
              {editingExpense && (
                <button
                  className="ghost danger modal-delete"
                  disabled={busy}
                  onClick={() => run(() => api.deleteExpense(periodId, editingExpense.id).then((next) => { closeAddModal(); return next }))}
                >
                  Eliminar gasto
                </button>
              )}
              <button className="ghost" disabled={busy} onClick={closeAddModal}>Cancelar</button>
              <button className="primary" disabled={busy || !draft.category.trim()} onClick={saveExpense}>
                {editingExpense ? 'Guardar cambios' : 'Guardar gasto'}
              </button>
            </div>
          </section>
        </div>
      )}

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
          <button disabled={busy} onClick={() => { setEditingExpense(null); setDraft(emptyExpense(groupNames[0])); setShowAddModal(true) }}>
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
            value={ars(expenses.creditExpensesArs)}
            hint={`Equivalente a ${usdPrecise(expenses.creditExpensesUsd)}`}
          />
          <Tile
            label="Consumos con mis tarjetas"
            value={ars(expenses.ownCardExpensesArs)}
            hint={`Equivalente a ${usdPrecise(expenses.ownCardExpensesUsd)}`}
          />
          <Tile
            label="Crédito externo"
            value={ars(expenses.externalCreditExpensesArs)}
            hint={`Equivalente a ${usdPrecise(expenses.externalCreditExpensesUsd)}`}
          />
          <Tile
            label="Límite mensual de tarjetas"
            value={ars(expenses.cardMonthlyLimitArs)}
            hint={usdPrecise(expenses.cardMonthlyLimitUsd)}
          />
          <Tile
            label="Disponible para gastar con crédito"
            value={ars(expenses.availableCardLimitArs)}
            hint={usdPrecise(expenses.availableCardLimitUsd)}
            tone={expenses.availableCardLimitUsd >= 0 ? 'good' : 'bad'}
          />
        </div>

        <div className="compact-expense-list">
          {expenses.lines.map((line) => (
            <button
              className="compact-expense-card"
              key={line.id}
              disabled={busy}
              onClick={() => {
                setEditingExpense(line)
                setDraft(toRequest(line))
                setShowAddModal(true)
              }}
            >
              <div className="compact-expense-info">
                <strong>{line.category}</strong>
                <span>{line.detail || line.expenseGroup}</span>
                <div className="compact-expense-badges">
                  <span className="badge">{line.paymentMethod === 'CREDIT' ? 'Crédito' : 'Débito'}</span>
                  <span className="badge">{EXPENSE_TYPE_LABELS[line.expenseType]}</span>
                  {line.paymentMethod === 'CREDIT' && !line.countsTowardCardLimit && (
                    <span className="badge">Crédito externo</span>
                  )}
                </div>
              </div>
              <div className="compact-expense-amount">
                <strong>{line.currency === 'ARS' ? ars(line.amount) : usdPrecise(line.amount)}</strong>
                <span>{line.currency === 'ARS' ? usdPrecise(line.amountUsd) : ars(line.amountArs)}</span>
                <small>{percent(line.shareOfTotal)} del total</small>
              </div>
              <span className="compact-expense-chevron" aria-hidden>›</span>
            </button>
          ))}
          {expenses.lines.length === 0 && (
            <div className="compact-expense-empty">
              <strong>Todavía no cargaste gastos</strong>
              <span>Usá “Agregar gasto” para registrar el primero.</span>
            </div>
          )}
        </div>

        {expenses.lines.length > 0 && (
          <div className="compact-expense-total">
            <span>Total de {expenses.lines.length} {expenses.lines.length === 1 ? 'gasto' : 'gastos'}</span>
            <div><strong>{ars(expenses.totalArs)}</strong><span>{usdPrecise(expenses.totalUsd)}</span></div>
          </div>
        )}
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
