import { belongsToProgram } from './subjectCatalog.js'

/** Apply a service result atomically without overwriting other plans. */
export function mergeSubjectSnapshot(current, result) {
  if (result?.programId == null || !Array.isArray(result.subjects) || !Array.isArray(result.electives)) throw new Error('El servicio devolvió un catálogo no válido.')
  if ([...result.subjects, ...result.electives].some((item) => !belongsToProgram(item, result.programId))) throw new Error('El servicio devolvió materias de otro plan.')
  return {
    subjects: [...current.subjects.filter((item) => !belongsToProgram(item, result.programId)), ...result.subjects],
    electives: [...current.electives.filter((item) => !belongsToProgram(item, result.programId)), ...result.electives],
  }
}

export function cloneCurriculumContent(snapshot, sourceProgram, newProgram) {
  const remapKey = (key) => key && newProgram.mnemonic !== sourceProgram.mnemonic && key.startsWith(sourceProgram.mnemonic)
    ? `${newProgram.mnemonic}${key.slice(sourceProgram.mnemonic.length)}` : key
  const clone = (item) => ({
    ...item, id: `subject-${globalThis.crypto.randomUUID()}`,
    programId: item.programId ? newProgram.id : null, ownerProgramId: newProgram.id,
    // Remote identities may never be reused in another plan.
    materiaId: undefined, elementId: undefined, semesterId: undefined,
    key: remapKey(item.key), prerequisite: remapKey(item.prerequisite),
  })
  return {
    clonedSubjects: snapshot.subjects.filter((item) => belongsToProgram(item, sourceProgram.id)).map(clone),
    clonedElectives: snapshot.electives.filter((item) => belongsToProgram(item, sourceProgram.id)).map(clone),
  }
}
