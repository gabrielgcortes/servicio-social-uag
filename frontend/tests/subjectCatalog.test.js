import test from 'node:test'
import assert from 'node:assert/strict'
import { belongsToProgram, getCatalogSubjects, nextSubjectKey, upsertCatalogSubject } from '../src/utils/subjectCatalog.js'
import { validateCurriculum } from '../src/utils/validation.js'

const capstone = { id: 'new-capstone', key: 'LSW025', name: 'Prueba Capstone', capstone: true, type: 'Obligatoria', cycle: 7, credits: 6, teacherHours: 32, independentHours: 64 }

test('creating a capstone from catalog keeps it visible only in the chosen career', () => {
  const subjects = upsertCatalogSubject([], capstone, 'software')
  assert.equal(subjects[0].programId, null)
  assert.equal(subjects[0].ownerProgramId, 'software')
  const rows = getCatalogSubjects(subjects, [], 'software')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].name, 'Prueba Capstone')
  assert.equal(rows[0].capstone, true)
  assert.deepEqual(getCatalogSubjects(subjects, [], 'another-career'), [])
  assert.equal(belongsToProgram(subjects[0], 'software'), true)
})

test('editing an unassigned capstone updates its row and preserves ownership', () => {
  let subjects = upsertCatalogSubject([], capstone, 'software')
  subjects = upsertCatalogSubject(subjects, { ...subjects[0], name: 'Capstone corregida' }, 'software')
  assert.equal(subjects.length, 1)
  assert.equal(getCatalogSubjects(subjects, [], 'software')[0].name, 'Capstone corregida')
  assert.equal(subjects[0].programId, null)
})

test('saving an assigned subject preserves map placement', () => {
  const subjects = upsertCatalogSubject([{ ...capstone, programId: 'software' }], { ...capstone, name: 'Editada' }, 'software')
  assert.equal(subjects[0].programId, 'software')
  assert.equal(subjects[0].ownerProgramId, 'software')
})

test('catalog includes legacy subjects and electives and deduplicates map assignments', () => {
  const legacy = { ...capstone, programId: 'software' }
  const assignment = { ...legacy, id: 'assignment', catalogAssignment: true }
  const elective = { id: 'elective', key: 'OPT001', programId: 'software', type: 'Optativa' }
  const slot = { id: 'slot', programId: 'software', isElectiveSlot: true }
  assert.deepEqual(getCatalogSubjects([assignment, legacy, slot], [elective], 'software'), [legacy, elective])
})

test('new subject keys remain unique across assigned and unassigned catalog entries', () => {
  const subjects = [
    { key: 'LSW001' }, { key: 'LSW024' }, { key: '', isElectiveSlot: true },
    { key: 'OTHER999' }, { key: 'LSW-invalid' },
  ]
  assert.equal(nextSubjectKey(subjects, 'LSW'), 'LSW025')
  const saved = upsertCatalogSubject(subjects, capstone, 'software')
  assert.equal(nextSubjectKey(saved, 'LSW'), 'LSW026')
  assert.equal(nextSubjectKey([], 'LSW'), 'LSW001')
})

test('capstones count toward validation once assigned to the map', () => {
  const program = { id: 'software', level: 'Licenciatura', cycles: 8, deanery: 'Otro', modality: 'Escolarizada', minCredits: 0, maxCredits: 400, maxSubjects: 7, maxCycleCredits: 50, minHours: 0 }
  const subjects = upsertCatalogSubject(upsertCatalogSubject([], capstone, program.id), { ...capstone, id: 'second', key: 'LSW026', cycle: 8 }, program.id)
  const isMissingCapstone = (items) => validateCurriculum(items, program).some((item) => item.code === 'CAPSTONE_MINIMO')
  assert.equal(isMissingCapstone(subjects.filter((item) => item.programId === program.id)), true)
  const assigned = subjects.map((item) => ({ ...item, programId: program.id, catalogAssignment: true }))
  assert.equal(isMissingCapstone(assigned), false)
  assert.equal(getCatalogSubjects([...subjects, ...assigned], [], program.id).length, 2)
})
