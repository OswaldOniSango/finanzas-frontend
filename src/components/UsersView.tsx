import { useState } from 'react'
import { api } from '../api/client'
import type { UserRole } from '../api/types'
import { useScreen } from '../lib/useScreen'
import { Panel, ScreenState, SelectField } from './ui'

const loadUsers = () => api.users()
const ROLES: { value: UserRole; label: string }[] = [
  { value: 'USER', label: 'Usuario' },
  { value: 'ADMIN', label: 'Administrador' },
]

export function UsersView() {
  const { data: users, error, loading, busy, run } = useScreen(0, loadUsers)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('USER')

  if (!users) return <ScreenState loading={loading} error={error} />

  const create = () => {
    run(async () => {
      await api.createUser(username, password, role)
      const next = await api.users()
      setUsername('')
      setPassword('')
      setRole('USER')
      return next
    })
  }

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <Panel title="Crear usuario" note="Cada usuario tendrá sus propios meses, gastos y tarjetas.">
        <div className="field-grid">
          <label className="field">
            Usuario
            <input value={username} disabled={busy} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="field">
            Contraseña
            <input
              type="password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="field-hint">Mínimo 8 caracteres.</span>
          </label>
          <label className="field">
            Rol
            <SelectField value={role} options={ROLES} disabled={busy} onCommit={setRole} />
          </label>
        </div>
        <div className="button-row">
          <button
            className="primary"
            disabled={busy || username.trim().length < 3 || password.length < 8}
            onClick={create}
          >
            Crear usuario
          </button>
        </div>
      </Panel>

      <Panel title="Usuarios existentes">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</td>
                  <td>
                    <span className={user.enabled ? 'badge good' : 'badge bad'}>
                      {user.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
