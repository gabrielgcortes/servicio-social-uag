import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubjectService } from '../src/services/subjectService.js'
import { mergeSubjectSnapshot, cloneCurriculumContent } from '../src/utils/curriculumState.js'
import { getCatalogSubjects } from '../src/utils/subjectCatalog.js'
import { toMateriaDto, fromMateriaDto } from '../src/services/subjectDto.js'

const plan = { id: 'p', mnemonic: 'PRU', status: 'Borrador', cycles: 8, currentCycle: 3 }
const input = { name: 'Prueba capstone', type: 'Obligatoria', area: 'Profesional', modality: 'Escolarizada', teacherHours: 32, independentHours: 64, cycle: 7, capstone: true, room: 'L', substantial: true }
function setup(subjects = [], electives = [], status = 'Borrador') {
  let snapshot = { programs: [{ ...plan, status }], subjects, electives }
  const service = createSubjectService({ useMock: true, getSnapshot: () => snapshot, fetchImpl: () => { throw new Error('El MVP no debe usar la red') } })
  return { service, get snapshot() { return snapshot }, async run(operation, ...args) {
    const result = await service[operation]('p', ...args)
    snapshot = { ...snapshot, ...mergeSubjectSnapshot(snapshot, result) }
    return result
  } }
}

test('mock lifecycle: create catalog capstone, assign, edit, move, remove and delete without network', async () => {
  const state = setup()
  await state.run('guardarAsignatura', input, { source: 'catalog' })
  const created = state.snapshot.subjects[0]
  assert.equal(created.key, 'PRU001')
  assert.equal(created.capstone, true)
  assert.equal(created.programId, null)
  await state.run('asignarAsignatura', created.key, 7)
  assert.equal(state.snapshot.subjects[0].programId, 'p')
  await state.run('guardarAsignatura', { ...state.snapshot.subjects[0], name: 'Capstone corregida' }, { source: 'map' })
  assert.equal(getCatalogSubjects(state.snapshot.subjects, [], 'p')[0].name, 'Capstone corregida')
  await state.run('moverAsignatura', created.id, 8)
  assert.equal(state.snapshot.subjects[0].cycle, 8)
  await state.run('quitarDelMapa', created.id)
  assert.equal(state.snapshot.subjects[0].programId, null)
  assert.equal(state.snapshot.subjects[0].ownerProgramId, 'p')
  await state.run('eliminarAsignatura', created.id)
  assert.equal(state.snapshot.subjects.length, 0)
})

test('new map subject is assigned; elective offerings and slots stay separate', async () => {
  const state = setup()
  await state.run('guardarAsignatura', input)
  await state.run('guardarAsignatura', { ...input, type: 'Optativa', name: 'Optativa de prueba' }, { source: 'catalog' })
  await state.run('guardarAsignatura', { ...input, type: 'Optativa', name: 'Espacio optativo', isElectiveSlot: true })
  assert.equal(state.snapshot.subjects.length, 2)
  assert.equal(state.snapshot.subjects[0].programId, 'p')
  assert.equal(state.snapshot.electives.length, 1)
  assert.equal(state.snapshot.electives[0].ownerProgramId, 'p')
  const slot = state.snapshot.subjects.find((item) => item.isElectiveSlot)
  assert.equal(slot.key, '')
  await state.run('quitarDelMapa', slot.id)
  assert.equal(state.snapshot.subjects.length, 1)
  assert.equal(state.snapshot.electives.length, 1)
})

test('duplicate assignment and cross-plan edits are rejected without state changes', async () => {
  const other = { ...input, id: 'other', key: 'OTH001', ownerProgramId: 'other', programId: 'other' }
  const state = setup([other])
  await state.run('guardarAsignatura', input)
  const own = state.snapshot.subjects.find((item) => item.ownerProgramId === 'p')
  const before = structuredClone(state.snapshot)
  await assert.rejects(state.service.asignarAsignatura('p', own.key, 7), /ya está asignada/)
  await assert.rejects(state.service.guardarAsignatura('p', other), /no pertenece/)
  await assert.rejects(state.service.moverAsignatura('p', own.id, 7, other.id), /no pertenece/)
  assert.deepEqual(state.snapshot, before)
})

test('protected plans reject every mutation while preserving read access', async () => {
  for (const status of ['En revisión', 'Histórico']) {
    const subject = { ...input, id: 's', key: 'PRU001', programId: 'p' }
    const state = setup([subject], [], status)
    for (const [method, args] of [
      ['guardarAsignatura', [input]], ['asignarAsignatura', ['PRU001', 7]],
      ['quitarDelMapa', ['s']], ['moverAsignatura', ['s', 8]],
      ['reordenarAsignatura', ['s', 1]], ['eliminarAsignatura', ['s']],
    ]) await assert.rejects(state.service[method]('p', ...args), /solo lectura/)
    assert.equal((await state.service.listarAsignaturas('p')).subjects.length, 1)
  }
})

test('vigente denies locked cycles and catalog edits that would change locked map copies', async () => {
  const base = { ...input, id: 'catalog', key: 'PRU001', ownerProgramId: 'p', programId: null }
  const assignment = { ...base, id: 'map', programId: 'p', cycle: 2, catalogAssignment: true }
  const state = setup([base, assignment], [], 'Vigente')
  await assert.rejects(state.service.guardarAsignatura('p', base, { source: 'catalog' }), /futuros/)
  await assert.rejects(state.service.moverAsignatura('p', 'map', 7), /futuros/)
  await assert.rejects(state.service.eliminarAsignatura('p', 'catalog'), /futuros/)
  await assert.rejects(state.service.guardarAsignatura('p', { ...input, cycle: 3 }), /futuros/)
  await state.run('guardarAsignatura', input)
  assert.equal(state.snapshot.subjects.at(-1).cycle, 7)
})

test('editing existing catalog/map copies synchronizes fields and preserves placement IDs', async () => {
  const base = { ...input, id: 'catalog', key: 'PRU001', ownerProgramId: 'p', programId: null }
  const assignment = { ...base, id: 'map', programId: 'p', cycle: 8, catalogAssignment: true }
  const state = setup([base, assignment])
  await state.run('guardarAsignatura', { ...assignment, name: 'Nuevo nombre', teacherHours: 64 }, { source: 'map' })
  assert.deepEqual(state.snapshot.subjects.map((item) => item.name), ['Nuevo nombre', 'Nuevo nombre'])
  assert.deepEqual(state.snapshot.subjects.map((item) => item.id), ['catalog', 'map'])
  assert.equal(state.snapshot.subjects[0].programId, null)
  assert.equal(state.snapshot.subjects[1].cycle, 8)
  assert.equal(state.snapshot.subjects[1].credits, 8)
})

test('reordering and dropping preserve other plans, keys and assignment metadata', async () => {
  const entries = ['a', 'b', 'c'].map((id, index) => ({ ...input, id, key: `PRU00${index + 1}`, programId: 'p' }))
  const other = { ...input, id: 'other', programId: 'other' }
  const state = setup([...entries, other])
  await state.run('reordenarAsignatura', 'a', 1)
  assert.deepEqual(state.snapshot.subjects.filter((item) => item.programId === 'p').map((item) => item.id), ['b', 'a', 'c'])
  await state.run('moverAsignatura', 'c', 7, 'b', false)
  assert.deepEqual(state.snapshot.subjects.filter((item) => item.programId === 'p').map((item) => item.id), ['c', 'b', 'a'])
  await state.run('moverAsignatura', 'c', 8)
  assert.equal(state.snapshot.subjects.find((item) => item.id === 'c').key, 'PRU003')
  assert.deepEqual(state.snapshot.subjects.find((item) => item.id === 'other'), other)
})

test('deletion protects prerequisite references; invalid input never commits', async () => {
  const source = { ...input, id: 's', key: 'PRU001', programId: 'p' }
  const dependent = { ...input, id: 'd', key: 'PRU002', prerequisite: 'PRU001', programId: 'p' }
  const state = setup([source, dependent])
  await assert.rejects(state.service.eliminarAsignatura('p', 's'), /prerrequisito/)
  await assert.rejects(state.service.guardarAsignatura('p', { ...input, teacherHours: -1 }), /horas/i)
  await assert.rejects(state.service.guardarAsignatura('p', { ...input, type: 'Optativa' }), /espacio optativo/)
  await assert.rejects(state.service.guardarAsignatura('p', { ...input, isElectiveSlot: true }, { source: 'catalog' }), /espacios optativos/)
  assert.equal(state.snapshot.subjects.length, 2)
})

test('snapshot merge rejects foreign data and cloning clears remote identities', () => {
  assert.throws(() => mergeSubjectSnapshot({ subjects: [], electives: [] }, { programId: 'p', subjects: [{ programId: 'other' }], electives: [] }), /otro plan/)
  const snapshot = { subjects: [{ ...input, id: 's', key: 'PRU001', programId: 'p', materiaId: 10, elementId: 20, semesterId: 30 }], electives: [] }
  const cloned = cloneCurriculumContent(snapshot, plan, { id: 'new', mnemonic: 'NEW' }).clonedSubjects[0]
  assert.notEqual(cloned.id, 's')
  assert.equal(cloned.key, 'NEW001')
  assert.equal(cloned.ownerProgramId, 'new')
  assert.equal(cloned.materiaId, undefined)
  assert.equal(snapshot.subjects[0].materiaId, 10)
})

test('DTO translates academic fields and prerequisite IDs without writing server credits', () => {
  const dto = toMateriaDto({ ...input, prerequisite: 'PRU001' }, { plan, subjects: [{ key: 'PRU001', materiaId: 10, ownerProgramId: 'p' }], electives: [] })
  assert.equal(dto.seriacion_materia_id, 10)
  assert.equal(dto.es_capstone, true)
  assert.equal(dto.aporte_sustancial, true)
  assert.equal(dto.tipo_aula, 'L')
  assert.equal(dto.area_formacion, 'PROFESIONAL')
  assert.equal(dto.modalidad, 'ESCOLARIZADA')
  assert.equal(dto.clave, 'PRU002')
  assert.equal('creditos' in dto, false)
  assert.equal('programId' in dto, false)
  const read = fromMateriaDto({ ...dto, id: 11, tipo: 'OBLIGATORIA', creditos: 6 }, 'p', [{ id: 10, clave: 'PRU001' }])
  assert.equal(read.prerequisite, 'PRU001')
  assert.equal(read.materiaId, 11)
  assert.equal(read.programId, null)
})


test('default adapter lists demo state without making an HTTP request', async () => {
  let calls = 0
  const service = createSubjectService({ getSnapshot: () => ({ programs: [plan], subjects: [], electives: [] }), fetchImpl: async () => { calls++; throw new Error('Unexpected network') } })
  assert.equal(service.isMock, true)
  assert.deepEqual((await service.listarAsignaturas('p')).subjects, [])
  assert.equal(calls, 0)
})
