export type Currency = 'ARS' | 'USD'

export type ExpenseType = 'ESENCIAL' | 'FAMILIAR' | 'PERSONAL' | 'DISCRECIONAL' | 'VARIABLE'

export type PaymentMethod = 'DEBIT' | 'CREDIT'

export type CardStatus = 'PENDIENTE' | 'EN_CURSO' | 'CANCELADA'

export type PlanStage = 'SALIDA_DE_TARJETAS' | 'AHORRO_APARTAMENTO'

export type AllocationRole = 'NONE' | 'PRESUPUESTO_GASTOS' | 'AHORRO_APARTAMENTO'

export type UserRole = 'ADMIN' | 'USER' | 'DEMO'

export interface AppUser {
  id: number
  username: string
  role: UserRole
  enabled: boolean
}

export interface PeriodRef {
  id: number
  year: number
  month: number
  label: string
}

export interface IncomeSummary {
  salaryArs: number
  salaryUsd: number
  referenceRate: number
  cardDollarRate: number
  payoneerDollarRate: number
  salaryUsdInArs: number
  totalIncomeArs: number
  totalIncomeUsd: number
  conservativeBaseUsd: number
  conservativeBaseArs: number
}

export interface ExpenseLine {
  id: number
  category: string
  detail: string | null
  amount: number
  currency: Currency
  paymentMethod: PaymentMethod
  expenseType: ExpenseType
  expenseGroup: string
  note: string | null
  sortOrder: number
  amountArs: number
  amountUsd: number
  shareOfTotal: number
}

export interface GroupTotal {
  label: string
  amountArs: number
  amountUsd: number
  share: number
}

export interface ExpenseSummary {
  lines: ExpenseLine[]
  byGroup: GroupTotal[]
  byType: GroupTotal[]
  totalArs: number
  totalUsd: number
  baseIncomeArs: number
  baseIncomeUsd: number
  availableAfterExpensesArs: number
  availableAfterExpensesUsd: number
  committedIncomeRatio: number
  targetBudgetArs: number | null
  targetBudgetUsd: number | null
  differenceVsBudgetArs: number | null
  differenceVsBudgetUsd: number | null
  withinBudget: boolean
}

export interface PlanLine {
  id: number
  concept: string
  percentage: number
  amountUsd: number
  amountArs: number
  objective: string | null
  allocationRole: AllocationRole
  sortOrder: number
}

export interface PlanStageSummary {
  stage: PlanStage
  label: string
  lines: PlanLine[]
  totalPercentage: number
  totalUsd: number
  totalArs: number
  balanced: boolean
}

/** La pantalla del plan: las etapas más la base que reparten. */
export interface PlanSummary {
  conservativeBaseUsd: number
  referenceRate: number
  stages: PlanStageSummary[]
}

export interface CardLine {
  id: number
  name: string
  balance: number
  currency: Currency
  minimumPayment: number
  annualRatePercent: number
  dueDate: string | null
  monthlyPayment: number
  status: CardStatus
  sortOrder: number
  balanceArs: number
  balanceUsd: number
  monthlyPaymentArs: number
  monthlyPaymentUsd: number
  balanceAfterPayment: number
  balanceAfterPaymentUsd: number
  payoffMonths: number | null
}

export interface CardsSummary {
  lines: CardLine[]
  totalBalanceUsd: number
  totalBalanceArs: number
  totalMinimumPaymentUsd: number
  totalMonthlyPaymentUsd: number
  totalMonthlyPaymentArs: number
  totalBalanceAfterPaymentUsd: number
  estimatedPayoffMonths: number | null
}

export interface ProjectionPoint {
  month: number
  label: string
  accumulatedUsd: number
}

export interface ApartmentSummary {
  targetPriceUsd: number
  downPaymentPercent: number
  cashGoalUsd: number
  currentSavingsUsd: number
  plannedMonthlySavingUsd: number
  availableAfterExpensesUsd: number
  monthlySavingUsd: number
  pendingUsd: number
  goalProgress: number
  estimatedMonths: number | null
  estimatedMonthsRounded: number | null
  estimatedCompletion: string | null
  projection: ProjectionPoint[]
}

/**
 * Lo que dibuja la pantalla de resumen: un número de cada área, más el
 * apartamento entero porque ahí va la curva de ahorro.
 */
export interface PeriodOverview {
  period: PeriodRef
  notes: string | null
  referenceRate: number
  totalIncomeUsd: number
  conservativeBaseUsd: number
  totalExpensesUsd: number
  expenseCount: number
  availableAfterExpensesUsd: number
  committedIncomeRatio: number
  targetBudgetUsd: number | null
  withinBudget: boolean
  cardsBalanceUsd: number
  cardsPayoffMonths: number | null
  apartment: ApartmentSummary
}

export interface HistoryPoint {
  periodId: number
  year: number
  month: number
  label: string
  referenceRate: number
  totalIncomeUsd: number
  conservativeBaseUsd: number
  totalExpensesUsd: number
  availableAfterExpensesUsd: number
  committedIncomeRatio: number
  monthlySavingUsd: number
  currentSavingsUsd: number
  goalProgress: number
  cardsBalanceUsd: number
}

export interface SaveExpenseItemRequest {
  category: string
  detail: string | null
  amount: number
  currency: Currency
  paymentMethod: PaymentMethod
  expenseType: ExpenseType
  expenseGroup: string
  note?: string | null
  sortOrder?: number | null
}

export interface SaveCreditCardRequest {
  name: string
  balance: number
  currency: Currency
  minimumPayment: number
  annualRatePercent: number
  dueDate: string | null
  monthlyPayment: number
  status: CardStatus
  sortOrder?: number | null
}

export interface SavePlanAllocationRequest {
  stage: PlanStage
  concept: string
  percentage: number
  objective: string | null
  allocationRole: AllocationRole
  sortOrder?: number | null
}

export interface UpdateIncomeRequest {
  salaryArs: number
  salaryUsd: number
  referenceRate: number
  cardDollarRate: number
  payoneerDollarRate: number
  conservativeBaseUsd: number
}

export interface UpdateApartmentGoalRequest {
  targetPriceUsd: number
  downPaymentPercent: number
  currentSavingsUsd: number
}
