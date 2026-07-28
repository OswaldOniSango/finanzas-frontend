import { useState } from 'react'
import { api } from '../api/client'

export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(username, password)
      onLogin()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  const enterDemo = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.demoLogin()
      onLogin()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir la demostración')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <div className="login-mark" aria-hidden>$</div>
        <h1>Plan financiero</h1>
        <p>Ingresá para acceder a tus datos personales.</p>

        {error && <div className="error-banner">{error}</div>}

        <label className="field">
          Usuario
          <input
            autoComplete="username"
            autoFocus
            value={username}
            disabled={busy}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="field">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary login-submit" disabled={busy || !username || !password}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
        <div className="login-divider"><span>o</span></div>
        <button type="button" className="demo-login" disabled={busy} onClick={() => void enterDemo()}>
          Ver demostración
        </button>
        <div className="login-demo-hint">Datos ficticios · acceso de solo lectura</div>
      </form>
    </main>
  )
}
