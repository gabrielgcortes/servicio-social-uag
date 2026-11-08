import { USE_MOCK } from './apiClient.js'
import { createMockSubjectService } from './mockSubjectService.js'
import { createHttpSubjectService } from './httpSubjectService.js'

/**
 * UI-facing contract shared by both adapters:
 * listarAsignaturas(planId), guardarAsignatura(planId, input, { source }),
 * asignarAsignatura(planId, key, cycle), quitarDelMapa(planId, subjectId),
 * moverAsignatura(planId, subjectId, cycle, targetId?, placeAfter?),
 * reordenarAsignatura(planId, subjectId, direction), eliminarAsignatura(planId, subjectId).
 *
 * Resolves { programId, subjects, electives, warnings, message? } scoped to ONE
 * plan. UI commits it atomically, preserving every other plan. Errors reject.
 */
export function createSubjectService({ useMock = USE_MOCK, ...options }) {
  return useMock ? createMockSubjectService(options) : createHttpSubjectService(options)
}
