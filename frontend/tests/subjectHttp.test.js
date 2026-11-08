import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubjectService } from '../src/services/subjectService.js'
import { mergeSubjectSnapshot } from '../src/utils/curriculumState.js'

function fixture() {
  const plan = { id: '1', mnemonic: 'PRU', status: 'Borrador', cycles: 8, currentCycle: 3 }
  let snapshot = { programs: [plan], subjects: [], electives: [] }
  const calls = []
  const db = {
    materias: [101, 102, 103].map((id, index) => ({ id, clave: `PRU00${index + 1}`, nombre: `Materia ${index + 1}`, tipo: 'OBLIGATORIA', horas_docente: 32, horas_independientes: 64, creditos: 6, es_capstone: true, modalidad: 'ESCOLARIZADA', area_formacion: 'PROFESIONAL', ciclos_disponibles: [] })),
    semestres: [{ id: 70, numero: 7 }, { id: 80, numero: 8 }],
    elementos: [201, 202].map((id, index) => ({ id, materia_id: 101 + index, tipo: 'MATERIA', semestre_id: 70, orden: index })),
    failPlacement: false, offline: false,
  }
  // All HTTP traffic is intercepted here. No live backend or socket is used.
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ url, method: init.method, body })
    if (db.offline) throw new Error('Sin conexión simulada')
    const ok = (data, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(data) })
    if (init.method === 'GET') {
      if (url === '/api/planes/1/materias') return ok(db.materias)
      if (url === '/api/planes/1/semestres') return ok(db.semestres)
      const match = url.match(/^\/api\/semestres\/(\d+)\/elementos$/)
      if (match) return ok(db.elementos.filter((item) => item.semestre_id === Number(match[1])))
    }
    if (init.method === 'POST' && /^\/api\/planes\/1\/(materias|optativas)$/.test(url)) {
      const materia = { ...body, id: 104, creditos: (body.horas_docente + body.horas_independientes) / 16 }
      db.materias.push(materia)
      return ok({ materia, warnings: [{ code: 'AVISO_SIMULADO' }] }, 201)
    }
    if (init.method === 'PATCH' && url.startsWith('/api/materias/')) {
      const materia = db.materias.find((item) => item.id === Number(url.split('/').at(-1)))
      Object.assign(materia, body)
      return ok({ materia, warnings: [] })
    }
    if (init.method === 'POST' && /^\/api\/semestres\/\d+\/elementos$/.test(url)) {
      if (db.failPlacement) return ok({ detail: 'No se permite esa asignación' }, 409)
      const elemento = { ...body, id: 204, semestre_id: Number(url.split('/')[3]), orden: 2, creditos: 6 }
      db.elementos.push(elemento)
      return ok({ elemento, warnings: [] }, 201)
    }
    if (init.method === 'PATCH' && url.startsWith('/api/elementos/')) {
      const elemento = db.elementos.find((item) => item.id === Number(url.split('/').at(-1)))
      Object.assign(elemento, body)
      return ok({ elemento, warnings: [] })
    }
    if (init.method === 'POST' && url.endsWith('/mover')) {
      const elemento = db.elementos.find((item) => item.id === Number(url.split('/')[3]))
      Object.assign(elemento, { semestre_id: body.semestre_destino_id, orden: body.posicion })
      return ok({ elemento, warnings: [] })
    }
    if (init.method === 'PUT' && url.endsWith('/orden')) {
      body.elemento_ids.forEach((id, orden) => { db.elementos.find((item) => item.id === id).orden = orden })
      return ok(db.elementos)
    }
    if (init.method === 'DELETE') {
      const id = Number(url.split('/').at(-1))
      if (url.startsWith('/api/elementos/')) db.elementos = db.elementos.filter((item) => item.id !== id)
      else db.materias = db.materias.filter((item) => item.id !== id)
      return ok(null, 204)
    }
    throw new Error(`Unexpected fake request: ${init.method} ${url}`)
  }
  const service = createSubjectService({ useMock: false, getSnapshot: () => snapshot, fetchImpl })
  return { service, calls, db, get snapshot() { return snapshot }, async run(method, ...args) {
    const result = await service[method]('1', ...args)
    snapshot = { ...snapshot, ...mergeSubjectSnapshot(snapshot, result) }
    return result
  } }
}
const input = { name: 'Nueva capstone', cycle: 8, type: 'Obligatoria', area: 'Profesional', modality: 'Escolarizada', capstone: true, teacherHours: 32, independentHours: 64, room: 'A' }
const writes = (state) => state.calls.filter((call) => call.method !== 'GET')

test('HTTP load separates catalog materiaId and map elementId and resolves cycle IDs', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  assert.equal(state.snapshot.subjects.filter((item) => item.programId === '1').length, 2)
  const placement = state.snapshot.subjects.find((item) => item.id === 'elemento-201')
  assert.equal(placement.materiaId, 101)
  assert.equal(placement.elementId, 201)
  assert.equal(placement.semesterId, 70)
  assert.equal(placement.cycle, 7)
  assert.equal(state.snapshot.subjects.find((item) => item.id === 'materia-101').programId, null)
  assert.equal(writes(state).length, 0)
})

test('HTTP catalog creation sends MateriaCreate DTO and reads canonical response', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  const result = await state.run('guardarAsignatura', input, { source: 'catalog' })
  const [call] = writes(state)
  assert.equal(call.url, '/api/planes/1/materias')
  assert.equal(call.method, 'POST')
  assert.equal(call.body.es_capstone, true)
  assert.equal(call.body.clave, 'PRU004')
  assert.equal('credits' in call.body, false)
  assert.equal('id' in call.body, false)
  assert.equal(result.subjects.find((item) => item.materiaId === 104).programId, null)
  assert.deepEqual(result.warnings, [{ code: 'AVISO_SIMULADO' }])
})

test('HTTP map creation creates materia then its element; failures reconcile partial success', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  await state.run('guardarAsignatura', input)
  assert.deepEqual(writes(state).map((call) => [call.method, call.url]), [['POST', '/api/planes/1/materias'], ['POST', '/api/semestres/80/elementos']])
  assert.deepEqual(writes(state)[1].body, { tipo: 'MATERIA', materia_id: 104 })
  const failing = fixture()
  await failing.run('listarAsignaturas')
  failing.db.failPlacement = true
  const before = structuredClone(failing.snapshot)
  await assert.rejects(failing.service.guardarAsignatura('1', input), (error) => {
    assert.match(error.message, /No se permite/)
    assert.ok(error.reconciledSnapshot.subjects.some((item) => item.materiaId === 104 && item.programId === null))
    return true
  })
  assert.deepEqual(failing.snapshot, before)
})

test('HTTP assignment, unassignment and catalog deletion use distinct resource IDs', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  await state.run('asignarAsignatura', 'PRU003', 8)
  await state.run('quitarDelMapa', 'elemento-204')
  await state.run('eliminarAsignatura', 'materia-103')
  assert.deepEqual(writes(state).map((call) => [call.method, call.url]), [
    ['POST', '/api/semestres/80/elementos'], ['DELETE', '/api/elementos/204'], ['DELETE', '/api/materias/103'],
  ])
  assert.deepEqual(writes(state)[0].body, { tipo: 'MATERIA', materia_id: 103 })
})

test('HTTP reorder sends complete element order; move sends destination semester and position', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  await state.run('reordenarAsignatura', 'elemento-201', 1)
  assert.deepEqual(writes(state)[0], { method: 'PUT', url: '/api/semestres/70/elementos/orden', body: { elemento_ids: [202, 201] } })
  await state.run('moverAsignatura', 'elemento-201', 8)
  assert.deepEqual(writes(state)[1], { method: 'POST', url: '/api/elementos/201/mover', body: { semestre_destino_id: 80, posicion: 0 } })
})

test('HTTP elective offerings and slots use their respective POST and PATCH contracts', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  await state.run('guardarAsignatura', { ...input, type: 'Optativa' }, { source: 'catalog' })
  assert.equal(writes(state)[0].url, '/api/planes/1/optativas')
  assert.equal(state.snapshot.electives[0].type, 'Optativa')
  await state.run('guardarAsignatura', { ...input, type: 'Optativa', isElectiveSlot: true })
  assert.deepEqual(writes(state)[1].body, { tipo: 'ESPACIO_OPTATIVO', nombre: 'Nueva capstone', horas_docente: 32, horas_independientes: 64 })
  const slot = state.snapshot.subjects.find((item) => item.isElectiveSlot)
  await state.run('guardarAsignatura', { ...slot, name: 'Espacio corregido' })
  assert.equal(writes(state)[2].url, '/api/elementos/204')
  assert.equal(writes(state)[2].method, 'PATCH')
  assert.deepEqual(writes(state)[2].body, { nombre: 'Espacio corregido', horas_docente: 32, horas_independientes: 64 })
})

test('HTTP edits use materia ID and server errors do not mutate client snapshots', async () => {
  const state = fixture()
  await state.run('listarAsignaturas')
  const subject = state.snapshot.subjects.find((item) => item.id === 'elemento-201')
  await state.run('guardarAsignatura', { ...subject, name: 'Nombre corregido' })
  assert.equal(writes(state)[0].url, '/api/materias/101')
  assert.equal(writes(state)[0].method, 'PATCH')
  const before = structuredClone(state.snapshot)
  state.db.offline = true
  await assert.rejects(state.service.quitarDelMapa('1', 'elemento-201'), /Sin conexión simulada/)
  assert.deepEqual(state.snapshot, before)
})

test('HTTP refuses mock IDs before making any request', async () => {
  let calls = 0
  const service = createSubjectService({ useMock: false, getSnapshot: () => ({ programs: [{ id: 'mock-plan' }], subjects: [], electives: [] }), fetchImpl: async () => { calls++; throw new Error('Unexpected network') } })
  await assert.rejects(service.listarAsignaturas('mock-plan'), /ID real/)
  assert.equal(calls, 0)
})
