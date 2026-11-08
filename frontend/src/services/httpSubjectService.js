import { createApiClient } from './apiClient.js'
import { fromElementoDto, fromMateriaDto, toApiId, toMateriaDto } from './subjectDto.js'
import { requirePlan, requireWritablePlan, requireOwnedSubject, requireEditableCycle, requireEditableSubject, validateSubjectInput } from './subjectPolicies.js'

/** Prepared HTTP adapter. Not called by the default in-memory MVP. */
export function createHttpSubjectService({ getSnapshot, ...clientOptions }) {
  const request = createApiClient(clientOptions)
  const id = (value) => encodeURIComponent(toApiId(value))
  const semestersFor = async (planId) => {
    const data = await request(`/api/planes/${id(planId)}/semestres`)
    if (!Array.isArray(data)) throw new Error('El servidor no devolvió una lista de ciclos válida.')
    return data
  }
  const semesterFor = async (planId, cycle) => {
    const semester = (await semestersFor(planId)).find((item) => item.numero === Number(cycle))
    if (!semester) throw new Error(`El ciclo ${cycle} aún no está configurado en el servidor.`)
    return semester
  }
  const load = async (planId) => {
    const snapshot = getSnapshot()
    requirePlan(snapshot, planId)
    const [materias, semesters] = await Promise.all([
      request(`/api/planes/${id(planId)}/materias`), semestersFor(planId),
    ])
    if (!Array.isArray(materias)) throw new Error('El servidor no devolvió un catálogo válido.')
    const catalog = materias.map((dto) => fromMateriaDto(dto, planId, materias,
      [...snapshot.subjects, ...snapshot.electives].find((item) => item.ownerProgramId === planId && item.materiaId === dto.id)))
    const columns = await Promise.all(semesters.sort((a, b) => a.numero - b.numero).map(async (semester) => {
      const elements = await request(`/api/semestres/${id(semester.id)}/elementos`)
      if (!Array.isArray(elements)) throw new Error('El servidor no devolvió los elementos del ciclo.')
      return elements.sort((a, b) => a.orden - b.orden).map((dto) => fromElementoDto(dto, semester, planId, catalog))
    }))
    return { programId: planId, subjects: [...catalog.filter((item) => item.type !== 'Optativa'), ...columns.flat()], electives: catalog.filter((item) => item.type === 'Optativa'), warnings: [] }
  }
  const context = (planId) => {
    const snapshot = getSnapshot()
    return { snapshot, plan: requireWritablePlan(snapshot, planId) }
  }
  const execute = async (planId, operation, message) => {
    try {
      const warnings = await operation()
      return { ...await load(planId), warnings: warnings || [], message }
    } catch (error) {
      // Some existing API workflows require more than one request. Reconcile
      // any partial server success instead of pretending to roll it back.
      try { error.reconciledSnapshot = await load(planId) } catch { /* Keep the original error; the caller can retry loading. */ }
      throw error
    }
  }
  const move = async (planId, snapshot, subject, cycle, targetId, placeAfter) => {
    const semester = await semesterFor(planId, cycle)
    const items = snapshot.subjects.filter((item) => item.programId === planId && Number(item.cycle) === Number(cycle) && item.id !== subject.id)
    let position = items.length
    if (targetId != null) {
      const index = items.findIndex((item) => String(item.id) === String(targetId))
      if (index < 0) throw new Error('El destino no pertenece al ciclo seleccionado.')
      position = index + (placeAfter ? 1 : 0)
    }
    return request(`/api/elementos/${id(subject.elementId)}/mover`, { method: 'POST', body: { semestre_destino_id: toApiId(semester.id), posicion: position } })
  }

  const service = {
    isMock: false,
    listarAsignaturas: load,
    async guardarAsignatura(planId, input, { source = 'map' } = {}) {
      const { snapshot, plan } = context(planId)
      validateSubjectInput(input, source)
      const original = input.id == null ? null : requireOwnedSubject(snapshot, planId, input.id)
      if (original) {
        requireEditableSubject(snapshot, plan, original)
        if (Boolean(original.isElectiveSlot) !== Boolean(input.isElectiveSlot) || original.type !== input.type) throw new Error('El tipo de una asignatura existente no puede cambiarse.')
      }
      if (source === 'map' || original?.elementId) requireEditableCycle(plan, input.cycle)
      return execute(planId, async () => {
        const warnings = []
        let dto
        if (input.isElectiveSlot) {
          const body = { nombre: input.name.trim(), horas_docente: Number(input.teacherHours), horas_independientes: Number(input.independentHours) }
          const semester = await semesterFor(planId, input.cycle)
          dto = await request(original ? `/api/elementos/${id(original.elementId)}` : `/api/semestres/${id(semester.id)}/elementos`, {
            method: original ? 'PATCH' : 'POST', body: original ? body : { tipo: 'ESPACIO_OPTATIVO', ...body },
          })
        } else {
          const body = toMateriaDto(input, { ...snapshot, plan }, original)
          dto = await request(original ? `/api/materias/${id(original.materiaId)}` : `/api/planes/${id(planId)}/${input.type === 'Optativa' ? 'optativas' : 'materias'}`, { method: original ? 'PATCH' : 'POST', body })
          if (!dto?.materia?.id) throw new Error('El servidor no devolvió la materia guardada.')
          if (!original && source === 'map') {
            warnings.push(...(dto.warnings || []))
            const semester = await semesterFor(planId, input.cycle)
            dto = await request(`/api/semestres/${id(semester.id)}/elementos`, { method: 'POST', body: { tipo: 'MATERIA', materia_id: dto.materia.id } })
          }
        }
        warnings.push(...(dto?.warnings || []))
        if (original?.elementId && Number(original.cycle) !== Number(input.cycle)) {
          const moved = await move(planId, snapshot, original, input.cycle)
          warnings.push(...(moved.warnings || []))
        }
        return warnings
      }, 'La asignatura se guardó y el catálogo y el mapa se actualizaron.')
    },
    async asignarAsignatura(planId, key, cycle) {
      const { snapshot, plan } = context(planId)
      requireEditableCycle(plan, cycle)
      const subject = snapshot.subjects.find((item) => item.ownerProgramId === planId && item.key === key && !item.isElectiveSlot && item.type !== 'Optativa')
      if (!subject) throw new Error('No se encontró la asignatura en el catálogo de este plan.')
      if (snapshot.subjects.some((item) => item.programId === planId && item.key === key)) throw new Error('La asignatura ya está asignada al mapa.')
      return execute(planId, async () => {
        const semester = await semesterFor(planId, cycle)
        const dto = await request(`/api/semestres/${id(semester.id)}/elementos`, { method: 'POST', body: { tipo: 'MATERIA', materia_id: toApiId(subject.materiaId) } })
        return dto.warnings
      }, `Asignatura agregada al ciclo ${cycle}.`)
    },
    async quitarDelMapa(planId, subjectId) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableCycle(plan, subject.cycle)
      return execute(planId, async () => {
        await request(`/api/elementos/${id(subject.elementId)}`, { method: 'DELETE' })
      }, 'Elemento retirado del mapa; las materias permanecen en el catálogo.')
    },
    async moverAsignatura(planId, subjectId, cycle, targetId = null, placeAfter = false) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableCycle(plan, subject.cycle)
      requireEditableCycle(plan, cycle)
      if (String(subjectId) === String(targetId)) return load(planId)
      return execute(planId, async () => (await move(planId, snapshot, subject, cycle, targetId, placeAfter)).warnings, `Asignatura colocada en el ciclo ${cycle}.`)
    },
    async reordenarAsignatura(planId, subjectId, direction) {
      if (![-1, 1].includes(direction)) throw new Error('Dirección de reordenado no válida.')
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableCycle(plan, subject.cycle)
      const items = snapshot.subjects.filter((item) => item.programId === planId && Number(item.cycle) === Number(subject.cycle))
      const index = items.findIndex((item) => item.id === subject.id)
      if (index < 0) throw new Error('La asignatura no está en el mapa.')
      const target = index + direction
      if (target < 0 || target >= items.length) return load(planId)
      ;[items[index], items[target]] = [items[target], items[index]]
      return execute(planId, async () => {
        await request(`/api/semestres/${id(subject.semesterId)}/elementos/orden`, { method: 'PUT', body: { elemento_ids: items.map((item) => toApiId(item.elementId)) } })
      }, 'Orden de asignaturas actualizado.')
    },
    async eliminarAsignatura(planId, subjectId) {
      const { snapshot, plan } = context(planId)
      const subject = requireOwnedSubject(snapshot, planId, subjectId)
      requireEditableSubject(snapshot, plan, subject)
      if (subject.isElectiveSlot) throw new Error('Quita el espacio optativo desde el mapa.')
      return execute(planId, async () => {
        await request(`/api/materias/${id(subject.materiaId)}`, { method: 'DELETE' })
      }, 'Asignatura eliminada del catálogo.')
    },
  }
  return service
}
