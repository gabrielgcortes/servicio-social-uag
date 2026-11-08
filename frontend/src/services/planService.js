import { PLAN_STATUSES, STATUS_CODES } from '../utils/planStatus.js'

import { USE_MOCK } from './apiClient.js'
export { USE_MOCK } from './apiClient.js'
const API_URL = import.meta.env?.VITE_API_URL || ''

/**
 * Injects the React snapshot; the mock never maintains a second mutable store.
 * Switch VITE_USE_MOCK=false to use FastAPI. Mutations return a plan DTO.
 * The API enum `estado` is translated at this boundary into the UI `status`.
 * FastAPI must enforce authorization, validation and archiving transactionally.
 */
export function createPlanService({ getSnapshot, useMock = USE_MOCK, fetchImpl = globalThis.fetch }) {
  async function request(planId, suffix, method, body, mock) {
    if (useMock) {
      const snapshot = getSnapshot()
      const plan = snapshot.programs.find((item) => item.id === planId)
      if (!plan) throw new Error('No se encontró el plan curricular.')
      return mock(plan, snapshot)
    }
    const response = await fetchImpl(`${API_URL}/api/planes/${encodeURIComponent(planId)}${suffix}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : `No se pudo actualizar el plan (${response.status}).`)
    if (!data?.id) throw new Error('El servidor no devolvió un plan válido.')
    const status = Object.entries(STATUS_CODES).find(([, code]) => code === data.estado)?.[0] || data.status
    if (!PLAN_STATUSES.includes(status)) throw new Error('El servidor devolvió un estado desconocido.')
    const source = getSnapshot().programs.find((plan) => plan.id === planId)
    return {
      ...source, ...data, id: String(data.id), status,
      careerId: data.carrera_id ?? source?.careerId,
      plan: data.clave ?? source?.plan,
      mnemonic: data.mnemonico ?? source?.mnemonic,
      effectiveFrom: data.vigente_desde ?? source?.effectiveFrom,
      updated: 'Ahora',
    }
  }

  const change = (plan, status, metadata = {}) => ({ ...plan, ...metadata, status, updated: 'Ahora' })
  const requireStatus = (plan, status) => {
    if (plan.status !== status) throw new Error(`Esta acción requiere un plan en estado ${status}.`)
  }
  return {
    async solicitarRevisionPlan(planId) {
      return request(planId, '/solicitar-revision', 'POST', undefined, (plan, snapshot) => {
        requireStatus(plan, 'Borrador')
        const errors = snapshot.validations(plan).filter((item) => item.severity === 'error').length
        if (errors) throw new Error(`Corrige los ${errors} errores bloqueantes para solicitar revisión`)
        return change(plan, 'En revisión', { reviewRequestedAt: new Date().toISOString() })
      })
    },
    async aprobarPlan(planId) {
      return request(planId, '/aprobar', 'POST', undefined, (plan) => {
        requireStatus(plan, 'En revisión')
        return change(plan, 'Vigente', { effectiveFrom: new Date().toISOString() })
      })
    },
    async rechazarPlan(planId, { motivo }) {
      if (!motivo?.trim()) throw new Error('Escribe el motivo de devolución.')
      return request(planId, '/rechazar', 'POST', { motivo: motivo.trim() }, (plan) => {
        requireStatus(plan, 'En revisión')
        return change(plan, 'Borrador', { reviewNotes: motivo.trim(), reviewedAt: new Date().toISOString() })
      })
    },
    async cambiarEstadoPlan(planId, nuevoEstado) {
      if (!PLAN_STATUSES.includes(nuevoEstado)) throw new Error('Estado de plan no válido.')
      // PATCH also supports the explicit MVP manual override from ProgramForm.
      return request(planId, '', 'PATCH', { estado: STATUS_CODES[nuevoEstado] }, (plan) => change(plan, nuevoEstado, {
        ...(nuevoEstado === 'Vigente' ? { effectiveFrom: new Date().toISOString() } : {}),
      }))
    },
    async duplicarPlan(planId, payload) {
      return request(planId, '/duplicar', 'POST', { clave: payload.plan, descripcion: payload.name, estado: 'BORRADOR' }, (plan) => ({
        ...plan, ...payload, id: `program-${globalThis.crypto.randomUUID()}`,
        careerId: plan.careerId || plan.mnemonic.trim().toLocaleUpperCase('es-MX'),
        status: 'Borrador', currentCycle: 0, reviewNotes: '', reviewRequestedAt: null,
        reviewedAt: null, effectiveFrom: null, archivedAt: null, updated: 'Ahora',
      }))
    },
  }
}
