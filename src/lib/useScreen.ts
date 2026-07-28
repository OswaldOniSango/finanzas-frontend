import { useCallback, useEffect, useState } from 'react'

const message = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback

export interface Screen<T> {
  data: T | null
  error: string | null
  loading: boolean
  busy: boolean
  /** Ejecuta una mutación que devuelve esta misma porción y la deja como estado. */
  run: (action: () => Promise<T>) => void
}

/**
 * Los datos de una pantalla: se piden al entrar y cada vez que cambia el mes.
 *
 * Las fórmulas encadenan las pantallas entre sí — tocar el dólar de referencia
 * mueve gastos, plan y apartamento — así que pedir de nuevo al activar la
 * pantalla es lo que mantiene todo coherente sin traer el periodo entero.
 */
export function useScreen<T>(periodId: number, load: (periodId: number) => Promise<T>): Screen<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    load(periodId)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch((cause) => {
        if (!cancelled) setError(message(cause, 'No se pudieron cargar los datos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [periodId, load])

  const run = useCallback((action: () => Promise<T>) => {
    setBusy(true)
    setError(null)

    action()
      .then(setData)
      .catch((cause) => setError(message(cause, 'No se pudo guardar el cambio')))
      .finally(() => setBusy(false))
  }, [])

  return { data, error, loading, busy, run }
}
