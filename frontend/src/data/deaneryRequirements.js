const baseSubject = (id, name, cycle, teacherHours, independentHours, credits, room = 'A', options = {}) => ({
  id,
  name,
  cycle,
  teacherHours,
  independentHours,
  credits,
  room,
  area: 'Universitaria',
  prerequisiteId: null,
  ...options,
})

export const deaneryPreestablishedSubjects = {
  'Diseño, Ciencia y Tecnología': [
    baseSubject('immersion', 'Inmersión a la profesión y su contexto', 1, 16, 32, 3),
    baseSubject('logic', 'Lógica y filosofía de la ciencia', 2, 48, 32, 5),
    baseSubject('language-1', 'Lengua extranjera I', 4, 64, 32, 6),
    baseSubject('anthropology', 'Antropología filosófica', 4, 48, 32, 5),
    baseSubject('language-2', 'Lengua extranjera II', 5, 64, 32, 6, 'A', { prerequisiteId: 'language-1' }),
    baseSubject('innovation-lab', 'Laboratorio de innovación', 5, 32, 48, 5),
    baseSubject('bioethics', 'Bioética', 6, 48, 32, 5),
    baseSubject('entrepreneurship-lab', 'Laboratorio de emprendimiento', 7, 32, 48, 5),
  ],
  'Ciencias Sociales, Económicas y Administrativas': [
    baseSubject('immersion', 'Inmersión a la profesión y su contexto', 1, 16, 32, 3),
    baseSubject('logic', 'Lógica y filosofía de la ciencia', 3, 48, 32, 5),
    baseSubject('language-1', 'Lengua extranjera I', 4, 64, 32, 6),
    baseSubject('innovation-lab', 'Laboratorio de innovación', 4, 32, 48, 5, 'O'),
    baseSubject('language-2', 'Lengua extranjera II', 5, 64, 32, 6, 'A', { prerequisiteId: 'language-1' }),
    baseSubject('anthropology', 'Antropología filosófica', 5, 48, 32, 5),
    baseSubject('entrepreneurship-lab', 'Laboratorio de emprendimiento', 6, 32, 48, 5, 'O'),
    baseSubject('professional-ethics', 'Ética profesional', 7, 48, 32, 5),
  ],
}

export function getDeaneryPreestablishedSubjects(deanery) {
  return deaneryPreestablishedSubjects[deanery] || []
}

export function normalizeSubjectName(name = '') {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-MX')
}

export function createMissingDeanerySubjects(program, assignedSubjects = []) {
  const requirements = getDeaneryPreestablishedSubjects(program.deanery)
  const assignedByName = new Map(assignedSubjects.map((subject) => [normalizeSubjectName(subject.name), subject]))
  const highestPosition = assignedSubjects.reduce((highest, subject) => {
    const position = Number(String(subject.key || '').match(/(\d{3})$/)?.[1] || 0)
    return Math.max(highest, position)
  }, 0)
  const keyByRequirementId = new Map()

  requirements.forEach((requirement) => {
    const existing = assignedByName.get(normalizeSubjectName(requirement.name))
    if (existing?.key) keyByRequirementId.set(requirement.id, existing.key)
  })

  let nextPosition = highestPosition
  return requirements.flatMap((requirement) => {
    if (assignedByName.has(normalizeSubjectName(requirement.name))) return []

    nextPosition += 1
    const key = `${program.mnemonic}${String(nextPosition).padStart(3, '0')}`
    keyByRequirementId.set(requirement.id, key)
    return [{
      programId: program.id,
      ownerProgramId: program.id,
      key,
      prerequisite: requirement.prerequisiteId ? keyByRequirementId.get(requirement.prerequisiteId) || null : null,
      type: 'Obligatoria',
      modality: program.modality,
      suggestedTeacher: '',
      programRef: '',
      substantial: false,
      capstone: false,
      practice: false,
      core: true,
      isElectiveSlot: false,
      deaneryRequirementId: requirement.id,
      ...requirement,
      id: `deanery-${program.id}-${requirement.id}`,
    }]
  })
}
