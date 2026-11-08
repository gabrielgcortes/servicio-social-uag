import { useLayoutEffect, useRef, useState } from 'react'
import { USE_MOCK } from '../services/apiClient.js'
import { createSubjectService } from '../services/subjectService.js'
import { createMissingDeanerySubjects } from '../data/deaneryRequirements.js'
import { isPlanReadOnly } from '../utils/planStatus.js'
import { cloneCurriculumContent, mergeSubjectSnapshot } from '../utils/curriculumState.js'

/** Owns React storage and async orchestration; components never know the transport. */
export function useCurriculumSubjects({ programs, onNotify, acquireMutation, releaseMutation, useMock = USE_MOCK, initialData = { subjects: [], electives: [] }, serviceFactory = createSubjectService }) {
  const [curriculum, setCurriculum] = useState(initialData)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const snapshotRef = useRef({ programs, ...curriculum })
  useLayoutEffect(() => { snapshotRef.current = { programs, ...curriculum } }, [programs, curriculum])
  const getService = () => serviceFactory({ useMock, getSnapshot: () => snapshotRef.current })

  const commit = (result) => {
    const next = mergeSubjectSnapshot(snapshotRef.current, result)
    snapshotRef.current = { ...snapshotRef.current, ...next }
    setCurriculum(next)
  }
  const execute = async (operation, programId, ...args) => {
    if (!acquireMutation()) {
      onNotify('Espera a que termine la operación en curso.')
      return null
    }
    setPending({ operation, programId })
    setError('')
    try {
      const result = await getService()[operation](programId, ...args)
      commit(result)
      const warnings = result.warnings?.map((item) => item.message || item.detail || item.mensaje || item.code).filter(Boolean).join(' · ')
      if (result.message || warnings) onNotify([result.message, warnings].filter(Boolean).join(' '))
      return result
    } catch (cause) {
      if (cause.reconciledSnapshot) commit(cause.reconciledSnapshot)
      const message = cause.message || 'No se pudo completar la operación de asignaturas.'
      setError(message)
      onNotify(cause.reconciledSnapshot ? `${message} Se recargaron los datos del servidor para reflejar los cambios que sí se completaron.` : message)
      return null
    } finally {
      releaseMutation()
      setPending(null)
    }
  }

  const appendContent = (subjects, electives = []) => {
    const current = snapshotRef.current
    const next = { subjects: [...current.subjects, ...subjects], electives: [...current.electives, ...electives] }
    snapshotRef.current = { ...current, ...next }
    setCurriculum(next)
  }
  const copyPlanContent = (sourceProgram, newProgram, includeDeanery = false) => {
    // Server-side plan duplication already copies its content. The future HTTP
    // integration must call loadSubjects(newPlan.id), never fabricate remote IDs.
    if (!useMock) throw new Error('Carga el contenido del plan duplicado desde el servidor.')
    const content = cloneCurriculumContent(snapshotRef.current, sourceProgram, newProgram)
    const assigned = content.clonedSubjects.filter((item) => item.programId === newProgram.id)
    const extras = includeDeanery ? createMissingDeanerySubjects(newProgram, assigned) : []
    appendContent([...content.clonedSubjects, ...extras], content.clonedElectives)
    return content
  }
  const ensureDeanerySubjects = (program) => {
    if (!useMock || isPlanReadOnly(program)) return []
    const assigned = snapshotRef.current.subjects.filter((item) => item.programId === program.id)
    const added = createMissingDeanerySubjects(program, assigned)
    if (added.length) appendContent(added)
    return added
  }

  return {
    ...curriculum, pending, error, isMock: useMock, clearError: () => setError(''),
    saveSubject: (planId, input, options) => execute('guardarAsignatura', planId, input, options),
    assignSubject: (planId, key, cycle) => execute('asignarAsignatura', planId, key, cycle),
    removeSubject: (planId, subjectId) => execute('quitarDelMapa', planId, subjectId),
    moveSubject: (planId, subjectId, cycle, targetId, placeAfter) => execute('moverAsignatura', planId, subjectId, cycle, targetId, placeAfter),
    reorderSubject: (planId, subjectId, direction) => execute('reordenarAsignatura', planId, subjectId, direction),
    deleteSubject: (planId, subjectId) => execute('eliminarAsignatura', planId, subjectId),
    loadSubjects: (planId) => execute('listarAsignaturas', planId),
    copyPlanContent, ensureDeanerySubjects,
  }
}
