export const PLAN_STATUSES = ['Borrador', 'En revisión', 'Vigente', 'Histórico']
export const STATUS_CODES = { Borrador: 'BORRADOR', 'En revisión': 'EN_REVISION', Vigente: 'VIGENTE', Histórico: 'HISTORICO' }
export const statusStyles = {
  Borrador: 'bg-amber-50 text-amber-700 ring-amber-200',
  'En revisión': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Vigente: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Histórico: 'bg-slate-100 text-slate-600 ring-slate-200',
}
export const isPlanReadOnly = (program) => !program || ['En revisión', 'Histórico'].includes(program.status)

// careerId is the persistent identity; mnemonic supports the existing demo data.
export const careerIdentity = (program) => program.careerId != null ? String(program.careerId) : program.mnemonic.trim().toLocaleUpperCase('es-MX')

export function applyPlanUpdate(programs, updatedPlan) {
  return programs.map((plan) => {
    if (plan.id === updatedPlan.id) return updatedPlan
    if (updatedPlan.status === 'Vigente' && plan.status === 'Vigente' && careerIdentity(plan) === careerIdentity(updatedPlan)) {
      return { ...plan, status: 'Histórico', archivedAt: updatedPlan.effectiveFrom, updated: 'Ahora' }
    }
    return plan
  })
}
