import { api } from '../api/client'
import type { CardLine, CardStatus, Currency, SaveCreditCardRequest } from '../api/types'
import { CARD_STATUS_LABELS, ars, money, monthsLabel, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { NumberField, Panel, ScreenState, SelectField, TextField, Tile } from './ui'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
]

const STATUSES = (Object.keys(CARD_STATUS_LABELS) as CardStatus[]).map((value) => ({
  value,
  label: CARD_STATUS_LABELS[value],
}))

const toRequest = (card: CardLine): SaveCreditCardRequest => ({
  name: card.name,
  balance: card.balance,
  currency: card.currency,
  minimumPayment: card.minimumPayment,
  annualRatePercent: card.annualRatePercent,
  dueDate: card.dueDate,
  monthlyPayment: card.monthlyPayment,
  status: card.status,
  sortOrder: card.sortOrder,
})

export function CardsView({ periodId }: { periodId: number }) {
  const { data: cards, error, loading, busy, run } = useScreen(periodId, api.cards)

  if (!cards) return <ScreenState loading={loading} error={error} />

  const patch = (card: CardLine, changes: Partial<SaveCreditCardRequest>) =>
    run(() => api.updateCard(periodId, card.id, { ...toRequest(card), ...changes }))

  // La regla del plan es atacar primero la tarjeta con mayor CFT.
  const priority = [...cards.lines]
    .filter((card) => card.balance > 0)
    .sort((a, b) => b.annualRatePercent - a.annualRatePercent)[0]

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <div className="tile-grid">
        <Tile
          label="Límite mensual de tarjetas"
          value={ars(cards.monthlyLimitArs)}
          hint={usdPrecise(cards.monthlyLimitUsd)}
        />
        <Tile
          label="Consumido con mis tarjetas"
          value={ars(cards.creditExpensesArs)}
          hint={usdPrecise(cards.creditExpensesUsd)}
          tone={cards.creditExpensesUsd > cards.monthlyLimitUsd ? 'bad' : undefined}
        />
        <Tile
          label="Crédito externo"
          value={ars(cards.externalCreditExpensesArs)}
          hint={usdPrecise(cards.externalCreditExpensesUsd)}
        />
        <Tile
          label="Disponible para tarjetas"
          value={ars(cards.availableLimitArs)}
          hint={usdPrecise(cards.availableLimitUsd)}
          tone={cards.availableLimitUsd >= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="Deuda total"
          value={usdPrecise(cards.totalBalanceUsd)}
          hint={ars(cards.totalBalanceArs)}
          tone={cards.totalBalanceUsd > 0 ? 'bad' : 'good'}
        />
        <Tile
          label="Pago mensual comprometido"
          value={usdPrecise(cards.totalMonthlyPaymentUsd)}
          hint={`Mínimos: ${usdPrecise(cards.totalMinimumPaymentUsd)}`}
        />
        <Tile label="Saldo después del pago" value={usdPrecise(cards.totalBalanceAfterPaymentUsd)} />
        <Tile
          label="Tiempo hasta cancelar"
          value={monthsLabel(cards.estimatedPayoffMonths)}
          hint="Estimado sin intereses; sirve para priorizar, no como cronograma"
        />
      </div>

      <Panel
        title="Límite mensual de tarjetas"
        note="Este límite corresponde únicamente al mes seleccionado. El consumo se calcula con los gastos marcados como crédito."
      >
        <div className="field-grid">
          <label className="field">
            Límite total en USD
            <NumberField
              value={cards.monthlyLimitUsd}
              disabled={busy}
              ariaLabel="Límite mensual de tarjetas en USD"
              onCommit={(monthlyLimitUsd) => run(() => api.updateCardLimit(periodId, monthlyLimitUsd))}
            />
            <span className="field-hint">Se convierte automáticamente a pesos.</span>
          </label>
          <label className="field">
            Límite total en ARS
            <NumberField
              value={cards.monthlyLimitArs}
              disabled={busy || cards.referenceRate <= 0}
              ariaLabel="Límite mensual de tarjetas en ARS"
              onCommit={(monthlyLimitArs) =>
                run(() => api.updateCardLimit(periodId, monthlyLimitArs / cards.referenceRate))
              }
            />
            <span className="field-hint">
              Se convierte automáticamente usando el dólar de referencia de {ars(cards.referenceRate)}.
            </span>
          </label>
        </div>
      </Panel>

      {priority && (
        <Panel title="Prioridad de pago">
          <p className="panel-note" style={{ margin: 0 }}>
            Atacá primero <strong>{priority.name}</strong>: es la de mayor tasa ({priority.annualRatePercent}%) con saldo pendiente de{' '}
            {money(priority.balance, priority.currency)}.
          </p>
        </Panel>
      )}

      <Panel
        title="Control de tarjetas"
        actions={
          <button
            disabled={busy}
            onClick={() =>
              run(() =>
                api.addCard(periodId, {
                  name: `Tarjeta ${cards.lines.length + 1}`,
                  balance: 0,
                  currency: 'ARS',
                  minimumPayment: 0,
                  annualRatePercent: 0,
                  dueDate: null,
                  monthlyPayment: 0,
                  status: 'PENDIENTE',
                }),
              )
            }
          >
            Agregar tarjeta
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th className="num">Saldo</th>
                <th>Moneda</th>
                <th className="num">Pago mínimo</th>
                <th className="num">Tasa / CFT %</th>
                <th>Vencimiento</th>
                <th className="num">Pago mensual</th>
                <th className="num">Saldo luego del pago</th>
                <th className="num">Meses</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cards.lines.map((card) => (
                <tr key={card.id}>
                  <td>
                    <TextField value={card.name} disabled={busy} ariaLabel="Nombre" onCommit={(name) => patch(card, { name })} />
                  </td>
                  <td className="num">
                    <NumberField value={card.balance} disabled={busy} ariaLabel="Saldo" onCommit={(balance) => patch(card, { balance })} />
                  </td>
                  <td>
                    <SelectField value={card.currency} options={CURRENCIES} disabled={busy} ariaLabel="Moneda" onCommit={(currency) => patch(card, { currency })} />
                  </td>
                  <td className="num">
                    <NumberField value={card.minimumPayment} disabled={busy} ariaLabel="Pago mínimo" onCommit={(minimumPayment) => patch(card, { minimumPayment })} />
                  </td>
                  <td className="num">
                    <NumberField value={card.annualRatePercent} disabled={busy} ariaLabel="Tasa" onCommit={(annualRatePercent) => patch(card, { annualRatePercent })} />
                  </td>
                  <td>
                    <input
                      type="date"
                      defaultValue={card.dueDate ?? ''}
                      key={card.dueDate ?? 'sin-fecha'}
                      disabled={busy}
                      aria-label="Vencimiento"
                      onBlur={(event) => {
                        const next = event.target.value || null
                        if (next !== card.dueDate) patch(card, { dueDate: next })
                      }}
                    />
                  </td>
                  <td className="num">
                    <NumberField value={card.monthlyPayment} disabled={busy} ariaLabel="Pago mensual" onCommit={(monthlyPayment) => patch(card, { monthlyPayment })} />
                  </td>
                  <td className="num">{money(card.balanceAfterPayment, card.currency)}</td>
                  <td className="num">{card.payoffMonths ?? '—'}</td>
                  <td>
                    <SelectField value={card.status} options={STATUSES} disabled={busy} ariaLabel="Estado" onCommit={(status) => patch(card, { status })} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="ghost danger"
                        disabled={busy}
                        onClick={() => run(() => api.deleteCard(periodId, card.id))}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cards.lines.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    No hay tarjetas cargadas.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total (USD)</td>
                <td className="num">{usdPrecise(cards.totalBalanceUsd)}</td>
                <td colSpan={2} />
                <td colSpan={2} />
                <td className="num">{usdPrecise(cards.totalMonthlyPaymentUsd)}</td>
                <td className="num">{usdPrecise(cards.totalBalanceAfterPaymentUsd)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  )
}
