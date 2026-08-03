import { api } from '../api/client'
import type { AllocationRole, PlanLine, PlanStage, SavePlanAllocationRequest } from '../api/types'
import { ALLOCATION_ROLE_LABELS, ars, percent, usdPrecise } from '../lib/format'
import { useScreen } from '../lib/useScreen'
import { NumberField, Panel, ScreenState, SelectField, TextField } from './ui'

const ROLES = (Object.keys(ALLOCATION_ROLE_LABELS) as AllocationRole[]).map((value) => ({
  value,
  label: ALLOCATION_ROLE_LABELS[value],
}))

const toRequest = (line: PlanLine, stage: PlanStage): SavePlanAllocationRequest => ({
  stage,
  concept: line.concept,
  percentage: line.percentage,
  objective: line.objective,
  allocationRole: line.allocationRole,
  sortOrder: line.sortOrder,
})

export function PlanView({ periodId }: { periodId: number }) {
  const { data: plan, error, loading, busy, run } = useScreen(periodId, api.plan)

  if (!plan) return <ScreenState loading={loading} error={error} />

  const patch = (line: PlanLine, stage: PlanStage, changes: Partial<SavePlanAllocationRequest>) =>
    run(() => api.updateAllocation(periodId, line.id, { ...toRequest(line, stage), ...changes }))
  const apartmentStage = plan.stages.filter((stage) => stage.stage === 'AHORRO_APARTAMENTO')

  return (
    <div className="section">
      {error && <div className="error-banner">{error}</div>}

      <p className="panel-note">
        Organizá cómo querés distribuir la base conservadora de {usdPrecise(plan.conservativeBaseUsd)} para ahorrar para el
        apartamento. Los porcentajes deberían sumar 100%. Marcá la línea correspondiente como{' '}
        <strong>Ahorro del apartamento</strong> para alimentar la proyección.
      </p>

      {apartmentStage.map((stage) => (
        <Panel
          key={stage.stage}
          title={stage.label}
          actions={
            <div className="button-row" style={{ margin: 0 }}>
              <span className={stage.balanced ? 'badge good' : 'badge bad'}>
                {stage.balanced ? 'Suma 100%' : `Suma ${percent(stage.totalPercentage)}`}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api.addAllocation(periodId, {
                      stage: stage.stage,
                      concept: 'Nuevo concepto',
                      percentage: 0,
                      objective: null,
                      allocationRole: 'NONE',
                    }),
                  )
                }
              >
                Agregar línea
              </button>
            </div>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="num">%</th>
                  <th className="num">USD</th>
                  <th className="num">ARS</th>
                  <th>Objetivo</th>
                  <th>Rol</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stage.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <TextField
                        value={line.concept}
                        disabled={busy}
                        ariaLabel="Concepto"
                        onCommit={(concept) => patch(line, stage.stage, { concept })}
                      />
                    </td>
                    <td className="num">
                      <NumberField
                        value={line.percentage}
                        step="0.01"
                        disabled={busy}
                        ariaLabel="Porcentaje"
                        onCommit={(percentage) => patch(line, stage.stage, { percentage })}
                      />
                    </td>
                    <td className="num">{usdPrecise(line.amountUsd)}</td>
                    <td className="num">{ars(line.amountArs)}</td>
                    <td>
                      <TextField
                        value={line.objective ?? ''}
                        disabled={busy}
                        ariaLabel="Objetivo"
                        onCommit={(objective) => patch(line, stage.stage, { objective })}
                      />
                    </td>
                    <td>
                      <SelectField
                        value={line.allocationRole}
                        options={ROLES}
                        disabled={busy}
                        ariaLabel="Rol"
                        onCommit={(allocationRole) => patch(line, stage.stage, { allocationRole })}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="ghost danger"
                          disabled={busy}
                          onClick={() => run(() => api.deleteAllocation(periodId, line.id))}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stage.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty">
                      Esta etapa no tiene líneas cargadas.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{percent(stage.totalPercentage)}</td>
                  <td className="num">{usdPrecise(stage.totalUsd)}</td>
                  <td className="num">{ars(stage.totalArs)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  )
}
