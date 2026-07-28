import { useCallback, useEffect, useState } from 'react'
import { api } from './api/client'
import type { PeriodRef, UserRole } from './api/types'
import { ApartmentView } from './components/ApartmentView'
import { CardsView } from './components/CardsView'
import { CashFlowView } from './components/CashFlowView'
import { ExpensesView } from './components/ExpensesView'
import { HistoryView } from './components/HistoryView'
import { IncomeView } from './components/IncomeView'
import { LoginView } from './components/LoginView'
import { PlanView } from './components/PlanView'
import { SummaryView } from './components/SummaryView'
import { UsersView } from './components/UsersView'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos mensuales' },
  { id: 'flujo', label: 'Flujo por moneda' },
  { id: 'plan', label: 'Plan mensual' },
  { id: 'tarjetas', label: 'Tarjetas' },
  { id: 'apartamento', label: 'Apartamento' },
  { id: 'historico', label: 'Histórico' },
  { id: 'usuarios', label: 'Usuarios' },
] as const

type TabId = (typeof TABS)[number]['id']

/**
 * El armazón sólo elige mes y pestaña. Los datos los pide cada pantalla:
 * al montarse hace su única llamada, así que cambiar de pestaña trae
 * exactamente lo que esa pantalla dibuja y nada más.
 */
export default function App() {
  const [authenticated, setAuthenticated] = useState(api.hasSession())
  const [role, setRole] = useState<UserRole | null>(api.getRole())

  useEffect(() => api.onUnauthorized(() => {
    setAuthenticated(false)
    setRole(null)
  }), [])

  if (!authenticated) {
    return <LoginView onLogin={() => {
      setAuthenticated(true)
      setRole(api.getRole())
    }} />
  }

  return (
    <FinancialApp
      role={role}
      onLogout={() => {
        api.logout()
        setAuthenticated(false)
        setRole(null)
      }}
    />
  )
}

function FinancialApp({ role, onLogout }: { role: UserRole | null; onLogout: () => void }) {
  const [periods, setPeriods] = useState<PeriodRef[]>([])
  const [periodId, setPeriodId] = useState<number | null>(null)
  const [tab, setTab] = useState<TabId>('resumen')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periodsLoaded, setPeriodsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    api
      .listPeriods()
      .then((list) => {
        if (cancelled) return
        setPeriods(list)
        setPeriodId(list[0]?.id ?? null)
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo conectar con la API')
      })
      .finally(() => {
        if (!cancelled) setPeriodsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const createFirstPeriod = useCallback(async () => {
    const now = new Date()
    setBusy(true)
    setError(null)
    try {
      const created = await api.createPeriod(now.getFullYear(), now.getMonth() + 1, null)
      setPeriods(await api.listPeriods())
      setPeriodId(created.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el primer mes')
    } finally {
      setBusy(false)
    }
  }, [])

  const createNextPeriod = useCallback(async () => {
    const current = periods.find((period) => period.id === periodId)
    if (!current) return

    const next = current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: current.month + 1 }

    setBusy(true)
    setError(null)
    try {
      const created = await api.createPeriod(next.year, next.month, current.id)
      setPeriods(await api.listPeriods())
      setPeriodId(created.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el periodo')
    } finally {
      setBusy(false)
    }
  }, [periods, periodId])

  if (periodId === null) {
    return (
      <div className="app">
        <h1 className="app-title">Plan financiero</h1>
        {error ? (
          <div className="error-banner">{error}</div>
        ) : !periodsLoaded ? (
          <p className="empty">Cargando…</p>
        ) : (
          <div className="empty-state">
            <p>Todavía no tenés ningún mes cargado.</p>
            <button className="primary" disabled={busy} onClick={() => void createFirstPeriod()}>
              Crear mi primer mes
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Plan financiero</h1>
          <div className="app-subtitle">Ingresos, gastos, tarjetas y la meta del apartamento</div>
        </div>

        <div className="header-controls">
          <select
            value={periodId}
            disabled={busy}
            aria-label="Periodo"
            onChange={(event) => setPeriodId(Number(event.target.value))}
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => void createNextPeriod()}>
            Nuevo mes
          </button>
          <button className="ghost" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <nav className="tabs" role="tablist">
        {TABS.filter((item) => item.id !== 'usuarios' || role === 'ADMIN').map((item) => (
          <button
            key={item.id}
            className="tab"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'resumen' && <SummaryView periodId={periodId} />}
      {tab === 'ingresos' && <IncomeView periodId={periodId} />}
      {tab === 'gastos' && <ExpensesView periodId={periodId} />}
      {tab === 'flujo' && <CashFlowView periodId={periodId} />}
      {tab === 'plan' && <PlanView periodId={periodId} />}
      {tab === 'tarjetas' && <CardsView periodId={periodId} />}
      {tab === 'apartamento' && <ApartmentView periodId={periodId} />}
      {tab === 'historico' && <HistoryView periodId={periodId} />}
      {tab === 'usuarios' && role === 'ADMIN' && <UsersView />}
    </div>
  )
}
