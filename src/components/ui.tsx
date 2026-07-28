import type { ReactNode } from 'react'

export function Panel({
  title,
  actions,
  note,
  children,
}: {
  title?: string
  actions?: ReactNode
  note?: string
  children: ReactNode
}) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          {title && <h2 className="panel-title">{title}</h2>}
          {actions}
        </div>
      )}
      {note && <p className="panel-note">{note}</p>}
      {children}
    </section>
  )
}

export function Tile({
  label,
  value,
  hint,
  tone,
  hero,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'good' | 'bad'
  hero?: boolean
}) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className={hero ? 'tile-value hero' : 'tile-value'}>{value}</div>
      {hint && <div className={tone ? `tile-hint ${tone}` : 'tile-hint'}>{hint}</div>}
    </div>
  )
}

/**
 * Input numérico que deja escribir libremente y sólo avisa al padre cuando el
 * campo pierde el foco, para no disparar un recálculo por cada tecla.
 */
export function NumberField({
  value,
  onCommit,
  step,
  disabled,
  ariaLabel,
}: {
  value: number
  onCommit: (next: number) => void
  step?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <input
      className="num"
      type="number"
      step={step ?? '0.01'}
      defaultValue={value}
      key={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onBlur={(event) => {
        const next = Number(event.target.value)
        if (!Number.isNaN(next) && next !== value) {
          onCommit(next)
        } else {
          event.target.value = String(value)
        }
      }}
    />
  )
}

export function TextField({
  value,
  onCommit,
  disabled,
  ariaLabel,
}: {
  value: string
  onCommit: (next: string) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      key={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onBlur={(event) => {
        const next = event.target.value
        if (next !== value) onCommit(next)
      }}
    />
  )
}

export function SelectField<T extends string>({
  value,
  options,
  onCommit,
  disabled,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onCommit: (next: T) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onCommit(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Estado de una pantalla mientras pide sus datos o si la llamada falló. */
export function ScreenState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <div className="error-banner">{error}</div>
  if (loading) return <p className="empty">Cargando…</p>
  return null
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span className="legend-item" key={item.label}>
          <span className="legend-swatch" style={{ background: item.color }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  )
}
