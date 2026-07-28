import type {
  ApartmentSummary,
  CardsSummary,
  ExpenseSummary,
  HistoryPoint,
  IncomeSummary,
  PeriodOverview,
  PeriodRef,
  PlanSummary,
  SaveCreditCardRequest,
  SaveExpenseItemRequest,
  SavePlanAllocationRequest,
  UpdateApartmentGoalRequest,
  UpdateIncomeRequest,
} from './types'

const BASE = '/api'

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.message ?? `Error ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Una llamada por pantalla. Cada mutación devuelve sólo la porción que tocó,
 * así que la pantalla activa se actualiza sin pedir el periodo entero.
 */
export const api = {
  // Periodos
  listPeriods: () => request<PeriodRef[]>('/periods'),
  latestPeriod: () => request<PeriodRef>('/periods/latest'),
  createPeriod: (year: number, month: number, cloneFromPeriodId: number | null) =>
    request<PeriodRef>('/periods', {
      method: 'POST',
      body: JSON.stringify({ year, month, cloneFromPeriodId }),
    }),
  deletePeriod: (periodId: number) => request<void>(`/periods/${periodId}`, { method: 'DELETE' }),

  // Resumen
  overview: (periodId: number) => request<PeriodOverview>(`/periods/${periodId}/overview`),
  updateNotes: (periodId: number, notes: string) =>
    request<PeriodOverview>(`/periods/${periodId}/notes`, { method: 'PUT', body: JSON.stringify({ notes }) }),

  // Ingresos
  income: (periodId: number) => request<IncomeSummary>(`/periods/${periodId}/income`),
  updateIncome: (periodId: number, body: UpdateIncomeRequest) =>
    request<IncomeSummary>(`/periods/${periodId}/income`, { method: 'PUT', body: JSON.stringify(body) }),

  // Gastos
  expenses: (periodId: number) => request<ExpenseSummary>(`/periods/${periodId}/expenses`),
  addExpense: (periodId: number, body: SaveExpenseItemRequest) =>
    request<ExpenseSummary>(`/periods/${periodId}/expenses`, { method: 'POST', body: JSON.stringify(body) }),
  updateExpense: (periodId: number, expenseId: number, body: SaveExpenseItemRequest) =>
    request<ExpenseSummary>(`/periods/${periodId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteExpense: (periodId: number, expenseId: number) =>
    request<ExpenseSummary>(`/periods/${periodId}/expenses/${expenseId}`, { method: 'DELETE' }),

  // Plan mensual
  plan: (periodId: number) => request<PlanSummary>(`/periods/${periodId}/allocations`),
  addAllocation: (periodId: number, body: SavePlanAllocationRequest) =>
    request<PlanSummary>(`/periods/${periodId}/allocations`, { method: 'POST', body: JSON.stringify(body) }),
  updateAllocation: (periodId: number, allocationId: number, body: SavePlanAllocationRequest) =>
    request<PlanSummary>(`/periods/${periodId}/allocations/${allocationId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAllocation: (periodId: number, allocationId: number) =>
    request<PlanSummary>(`/periods/${periodId}/allocations/${allocationId}`, { method: 'DELETE' }),

  // Tarjetas
  cards: (periodId: number) => request<CardsSummary>(`/periods/${periodId}/cards`),
  addCard: (periodId: number, body: SaveCreditCardRequest) =>
    request<CardsSummary>(`/periods/${periodId}/cards`, { method: 'POST', body: JSON.stringify(body) }),
  updateCard: (periodId: number, cardId: number, body: SaveCreditCardRequest) =>
    request<CardsSummary>(`/periods/${periodId}/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCard: (periodId: number, cardId: number) =>
    request<CardsSummary>(`/periods/${periodId}/cards/${cardId}`, { method: 'DELETE' }),

  // Apartamento
  apartment: (periodId: number) => request<ApartmentSummary>(`/periods/${periodId}/apartment`),
  updateApartmentGoal: (periodId: number, body: UpdateApartmentGoalRequest) =>
    request<ApartmentSummary>(`/periods/${periodId}/apartment-goal`, { method: 'PUT', body: JSON.stringify(body) }),

  // Histórico
  history: () => request<HistoryPoint[]>('/periods/history'),
}
