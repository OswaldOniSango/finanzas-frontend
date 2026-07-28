const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const usdFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usdPreciseFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const plainFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

export const ars = (value: number) => arsFormatter.format(value)

export const usd = (value: number) => usdFormatter.format(value)

export const usdPrecise = (value: number) => usdPreciseFormatter.format(value)

export const percent = (value: number) => percentFormatter.format(value)

export const plain = (value: number) => plainFormatter.format(value)

/** Abrevia importes grandes para ejes y etiquetas: 34.400 → 34,4 mil */
export const compact = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${plainFormatter.format(value / 1_000_000)}M`
  if (abs >= 1_000) return `${plainFormatter.format(Math.round(value / 100) / 10)} mil`
  return plainFormatter.format(value)
}

export const money = (value: number, currency: 'ARS' | 'USD') =>
  currency === 'ARS' ? ars(value) : usdPrecise(value)

export const monthsLabel = (months: number | null | undefined) => {
  if (months == null) return 'Sin estimación'
  if (months === 0) return 'Meta alcanzada'
  if (months === 1) return '1 mes'
  if (months < 12) return `${months} meses`

  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearPart = years === 1 ? '1 año' : `${years} años`
  return rest === 0 ? yearPart : `${yearPart} y ${rest} ${rest === 1 ? 'mes' : 'meses'}`
}

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  ESENCIAL: 'Esencial',
  FAMILIAR: 'Familiar',
  PERSONAL: 'Personal',
  DISCRECIONAL: 'Discrecional',
  VARIABLE: 'Variable',
}

export const CARD_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  CANCELADA: 'Cancelada',
}

export const ALLOCATION_ROLE_LABELS: Record<string, string> = {
  NONE: '—',
  PRESUPUESTO_GASTOS: 'Presupuesto de gastos',
  AHORRO_APARTAMENTO: 'Ahorro del apartamento',
}
