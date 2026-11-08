import { belongsToProgram, nextSubjectKey } from '../utils/subjectCatalog.js'
import { requirePlan, requireWritablePlan, requireOwnedSubject, requireEditableCycle, requireEditableSubject, validateSubjectInput } from './subjectPolicies.js'

const newId = () => `subject-${globalThis.crypto.randomUUID()}`

/** Immutable plan-scoped snapshots: the adapter never owns a second store. */
export function createMockSubjectService({ getSnapshot }) {
  const context = (planId) => {
    const snapshot = getSnapshot()
    return { snapshot, plan: requireWritablePlan(snapshot, planId) }
  }
  const result = (snapshot, planId, message) => ({
    programId: planId,
    subjects: snapshot.subjects.filter((item) => belongsToProgram(item, planId)),
    electives: snapshot.electives.filter((item) => belongsToProgram(item, planId)),
    warnings: [], message,
  })

  const service = {
    isMock: true,
    async listarAsignaturas(planId) {
      const snapshot = getSnapshot()
      requirePlan(snapshot, planId)
      return result(snapshot, planId)
    },
    async guardarAsignatura(planId, input, { source = 'map' } = {}) {
      const { snapshot, plan } = context(planId)
      validateSubjectInput(input, source)
      const original = input.id == null ? null : requireOwnedSubject(snapshot, planId, input.id)
      if (original) {
        requireEditableSubject(snapshot, plan, original)
        if (Boolean(original.isElectiveSlot) !== Boolean(input.isElectiveSlot) || original.type !== input.type) throw new Error('El tipo de una asignatura existente no puede cambiarse.')
      }
      if (source === 'map' || original?.programId === planId && original.type !== 'Optativa') requireEditableCycle(plan, input.cycle)
      const own = [...snapshot.subjects, ...snapshot.electives].filter((item) => belongsToProgram(item, planId))
      const saved = {
        ...original, ...input, id: original?.id || newId(),
        key: input.isElectiveSlot ? '' : original?.key || nextSubjectKey(own, plan.mnemonic),
        name: input.name.trim(), teacherHours: Number(input.teacherHours), independentHours: Number(input.independentHours),
        credits: (Number(input.teacherHours) + Number(input.independentHours)) / 16,
        cycle: Number(input.cycle), ownerProgramId: planId,
        programId: source === 'map' || input.type === 'Optativa' ? planId : original?.programId ?? null,
      }
      const collection = saved.type === 'Optativa' && !saved.isElectiveSlot ? 'electives' : 'subjects'
      const items = snapshot[collection]
      const next = original ? items.map((item) => {
        if (item.id === original.id) return saved
        // Keep catalog and map copies synchronized without changing placement IDs.
        if (saved.key && item.key === original.key && belongsToProgram(item, planId)) {
          return { ...saved, id: item.id, programId: item.programId, cycle: item.cycle, catalogAssignment: item.catalogAssignment }
        }
        return item
      }) : [...items, saved]
      return result({ ...snapshot, [collection]: next }, planId,
        source === 'catalog' && !original && saved.type !== 'Optativa'
          ? 'Asignatura guardada en el catálogo de la carrera. Asígnala al mapa desde Materias disponibles para que cuente en la validación.'
          : 'La asignatura se guardó y las validaciones fueron recalculadas.')
    },
    async asignarAsignatura(planId, key, cycle) {
      const { snapshot, plan } = context(planId)
      requireEditableCycle(plan, cycle)
      const source = snapshot.subjects.find((item) => belongsToProgram(item, planId) && item.key === key && !item.isElectiveSlot && item.type !== 'Optativa')
      if (!source) throw new Error('No se encontró la asignatura en el catálogo de este plan.')
      if (snapshot.subjects.some((item) => item.programId === planId && item.key === key)) throw new Error('La asignatura ya está asignada al mapa.')
      const subjects = snapshot.subjects.map((item) => item.id === source.id ? { ...item, programId: planId, ownerProgramId: planId, cycle: Number(cycle) } : item)
      return result({ ...snapshot, subjects }, planId, `${source.name} se agregó al ciclo ${cycle}.`)
    },
    async quitarDelMapa(planId, subjectId) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      if (!snapshot.subjects.some((item) => item.id === subject.id && item.programId === planId)) throw new Error('La asignatura no está en el mapa.')
      requireEditableCycle(plan, subject.cycle)
      const hasCatalogEntry = subject.key && snapshot.subjects.some((item) => item.id !== subject.id && item.key === subject.key && belongsToProgram(item, planId))
      const subjects = subject.isElectiveSlot || hasCatalogEntry
        ? snapshot.subjects.filter((item) => item.id !== subject.id)
        : snapshot.subjects.map((item) => item.id === subject.id ? { ...item, programId: null, ownerProgramId: planId } : item)
      return result({ ...snapshot, subjects }, planId, subject.isElectiveSlot ? 'Espacio optativo eliminado del mapa.' : `${subject.name} se quitó del mapa y está disponible para asignarse.`)
    },
    async moverAsignatura(planId, subjectId, cycle, targetSubjectId = null, placeAfter = false) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      if (subject.programId !== planId || subject.type === 'Optativa' && !subject.isElectiveSlot) throw new Error('El elemento no está en el mapa curricular.')
      requireEditableCycle(plan, subject.cycle)
      requireEditableCycle(plan, cycle)
      if (String(subjectId) === String(targetSubjectId)) return result(snapshot, planId)
      const remaining = snapshot.subjects.filter((item) => item.id !== subject.id)
      const moved = { ...subject, cycle: Number(cycle) }
      let index
      if (targetSubjectId != null) {
        const target = requireOwnedSubject(snapshot, planId, targetSubjectId)
        if (target.programId !== planId || Number(target.cycle) !== Number(cycle)) throw new Error('El destino no pertenece al ciclo seleccionado.')
        index = remaining.findIndex((item) => item.id === target.id) + (placeAfter ? 1 : 0)
      } else {
        const last = remaining.findLastIndex((item) => item.programId === planId && Number(item.cycle) === Number(cycle))
        index = last >= 0 ? last + 1 : remaining.findIndex((item) => item.programId === planId && Number(item.cycle) > Number(cycle))
        if (index < 0) index = remaining.length
      }
      const subjects = [...remaining]
      subjects.splice(index, 0, moved)
      return result({ ...snapshot, subjects }, planId, `${subject.name} se colocó en el ciclo ${cycle}.`)
    },
    async reordenarAsignatura(planId, subjectId, direction) {
      if (![-1, 1].includes(direction)) throw new Error('Dirección de reordenado no válida.')
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableCycle(plan, subject.cycle)
      const cycle = snapshot.subjects.filter((item) => item.programId === planId && Number(item.cycle) === Number(subject.cycle))
      const position = cycle.findIndex((item) => item.id === subject.id)
      if (position < 0) throw new Error('La asignatura no está en el mapa.')
      const target = cycle[position + direction]
      if (!target) return result(snapshot, planId)
      return service.moverAsignatura(planId, subject.id, subject.cycle, target.id, direction > 0)
    },
    async eliminarAsignatura(planId, subjectId) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableSubject(snapshot, plan, subject)
      if (subject.isElectiveSlot) throw new Error('Quita el espacio optativo desde el mapa.')
      const own = (item) => belongsToProgram(item, planId)
      if ([...snapshot.subjects, ...snapshot.electives].some((item) => own(item) && subject.key && item.prerequisite === subject.key)) throw new Error('La asignatura es prerrequisito de otra materia. Actualiza la seriación antes de eliminarla.')
      const keep = (item) => !own(item) || (item.id !== subject.id && (!subject.key || item.key !== subject.key))
      return result({ ...snapshot, subjects: snapshot.subjects.filter(keep), electives: snapshot.electives.filter(keep) }, planId, 'Asignatura eliminada del catálogo.')
    },
  }
  return service
}
