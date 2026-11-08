// Ownership is independent of placement: removing a subject from the map
// must keep it in its program's catalog.
export function belongsToProgram(subject, programId) {
  return programId != null && (subject.ownerProgramId ?? subject.programId) === programId
}

export function getCatalogSubjects(subjects, electives, programId) {
  const catalog = new Map()
  for (const subject of [...subjects, ...electives]) {
    if (!belongsToProgram(subject, programId) || subject.isElectiveSlot) continue
    const identity = subject.key || subject.id
    const current = catalog.get(identity)
    if (!current || (current.catalogAssignment && !subject.catalogAssignment)) catalog.set(identity, subject)
  }
  return [...catalog.values()]
}

export function upsertCatalogSubject(subjects, saved, programId) {
  const original = subjects.find((subject) => subject.id === saved.id && belongsToProgram(subject, programId))
  const updated = { ...saved, programId: original?.programId ?? null, ownerProgramId: programId }
  return original
    ? subjects.map((subject) => subject.id === original.id ? updated : subject)
    : [...subjects, updated]
}

export function nextSubjectKey(subjects, mnemonic) {
  const positions = subjects.flatMap((subject) => {
    if (!subject.key?.startsWith(mnemonic)) return []
    const suffix = subject.key.slice(mnemonic.length)
    return /^\d+$/.test(suffix) ? [Number(suffix)] : []
  })
  return `${mnemonic}${String(Math.max(0, ...positions) + 1).padStart(3, '0')}`
}
