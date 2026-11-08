import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlanService } from '../src/services/planService.js'
import { applyPlanUpdate } from '../src/utils/planStatus.js'
import { isCycleEditable } from '../src/utils/cycleStatus.js'
import { validateCurriculum } from '../src/utils/validation.js'

const draft = { id: 'new', name: 'Carrera', mnemonic: 'LIT', status: 'Borrador', cycles: 8, currentCycle: 3 }
const setup = (plans = [draft], errors = []) => {
  let programs = structuredClone(plans)
  const service = createPlanService({ useMock: true, getSnapshot: () => ({ programs, validations: () => errors }) })
  return { service, get programs() { return programs }, commit(plan) { programs = applyPlanUpdate(programs, plan) } }
}

test('drafts admit all cycles, vigente only future cycles, protected plans none', () => {
  for (const status of ['Borrador', 'Vigente', 'En revisión', 'Histórico']) {
    for (let cycle = 1; cycle <= 8; cycle++) {
      assert.equal(isCycleEditable({ ...draft, status }, cycle), status === 'Borrador' || (status === 'Vigente' && cycle > 3))
    }
    for (const cycle of [0, 9, -1, 1.5, NaN]) assert.equal(isCycleEditable({ ...draft, status }, cycle), false)
  }
  assert.equal(isCycleEditable(null, 1), false)
})

test('blocking errors reject review without mutating the snapshot', async () => {
  const state = setup([draft], [{ severity: 'error' }])
  await assert.rejects(state.service.solicitarRevisionPlan('new'), /1 errores bloqueantes/)
  assert.equal(state.programs[0].status, 'Borrador')
})

test('review freezes the plan; rejection requires and preserves observations', async () => {
  const state = setup()
  state.commit(await state.service.solicitarRevisionPlan('new'))
  assert.equal(state.programs[0].status, 'En revisión')
  await assert.rejects(state.service.rechazarPlan('new', { motivo: '  ' }), /motivo/)
  assert.equal(state.programs[0].status, 'En revisión')
  state.commit(await state.service.rechazarPlan('new', { motivo: '  Ajustar seriaciones  ' }))
  assert.equal(state.programs[0].status, 'Borrador')
  assert.equal(state.programs[0].reviewNotes, 'Ajustar seriaciones')
})

test('approval atomically archives only the previous vigente of the same career', async () => {
  const state = setup([
    { ...draft, status: 'En revisión', careerId: 11 },
    { ...draft, id: 'old', status: 'Vigente', mnemonic: 'ANTIGUO', careerId: '11' },
    { ...draft, id: 'other', status: 'Vigente', careerId: 12 },
  ])
  const previous = state.programs
  state.commit(await state.service.aprobarPlan('new'))
  assert.deepEqual(state.programs.map((plan) => plan.status), ['Vigente', 'Histórico', 'Vigente'])
  assert.equal(previous[1].status, 'Vigente')
  assert.ok(state.programs[0].effectiveFrom)
})

test('illegal review and approval transitions fail', async () => {
  const state = setup()
  await assert.rejects(state.service.aprobarPlan('new'), /En revisión/)
  state.commit(await state.service.solicitarRevisionPlan('new'))
  await assert.rejects(state.service.solicitarRevisionPlan('new'), /Borrador/)
  await assert.rejects(state.service.solicitarRevisionPlan('missing'), /encontró/)
})

test('manual override validates canonical states and maintains one vigente', async () => {
  const state = setup([draft, { ...draft, id: 'old', status: 'Vigente' }])
  await assert.rejects(state.service.cambiarEstadoPlan('new', 'Publicado'), /no válido/)
  state.commit(await state.service.cambiarEstadoPlan('new', 'Vigente'))
  assert.equal(state.programs[1].status, 'Histórico')
  state.commit(await state.service.cambiarEstadoPlan('new', 'Histórico'))
  assert.equal(state.programs[0].status, 'Histórico')
})

test('historical duplication resets lifecycle and preserves career identity', async () => {
  const source = { ...draft, status: 'Histórico', effectiveFrom: '2025-01-01', reviewNotes: 'Viejas' }
  const state = setup([source])
  const duplicate = await state.service.duplicarPlan('new', { plan: 'Plan 2027' })
  assert.notEqual(duplicate.id, source.id)
  assert.equal(duplicate.status, 'Borrador')
  assert.equal(duplicate.currentCycle, 0)
  assert.equal(duplicate.careerId, 'LIT')
  assert.equal(duplicate.reviewNotes, '')
  assert.equal(duplicate.effectiveFrom, null)
  assert.equal(state.programs[0].status, 'Histórico')
})

test('HTTP adapter uses the exact routes, verbs, enums and duplicate DTO', async () => {
  const calls = []
  const service = createPlanService({
    useMock: false, getSnapshot: () => ({ programs: [draft] }),
    fetchImpl: async (url, init) => {
      calls.push({ url, ...init })
      return { ok: true, json: async () => ({ id: 10, carrera_id: 1, clave: 'Plan 2027', mnemonico: 'LIT', estado: 'EN_REVISION' }) }
    },
  })
  const result = await service.solicitarRevisionPlan('new')
  assert.equal(result.status, 'En revisión')
  assert.equal(result.cycles, 8)
  assert.equal(result.id, '10')
  await service.aprobarPlan('new')
  await service.rechazarPlan('new', { motivo: 'Revisar' })
  await service.cambiarEstadoPlan('new', 'Histórico')
  await service.duplicarPlan('new', { plan: 'Plan 2027', name: 'Carrera' })
  assert.deepEqual(calls.map(({ url, method }) => [url, method]), [
    ['/api/planes/new/solicitar-revision', 'POST'], ['/api/planes/new/aprobar', 'POST'],
    ['/api/planes/new/rechazar', 'POST'], ['/api/planes/new', 'PATCH'], ['/api/planes/new/duplicar', 'POST'],
  ])
  assert.deepEqual(JSON.parse(calls[2].body), { motivo: 'Revisar' })
  assert.deepEqual(JSON.parse(calls[3].body), { estado: 'HISTORICO' })
  assert.deepEqual(JSON.parse(calls[4].body), { clave: 'Plan 2027', descripcion: 'Carrera', estado: 'BORRADOR' })
})

test('HTTP and network errors propagate without changing local plans', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 409, json: async () => ({ detail: 'Conflicto académico' }) }),
    async () => { throw new Error('Sin conexión') },
  ]) {
    const programs = [structuredClone(draft)]
    const service = createPlanService({ useMock: false, getSnapshot: () => ({ programs }), fetchImpl })
    await assert.rejects(service.aprobarPlan('new'), /Conflicto académico|Sin conexión/)
    assert.deepEqual(programs, [draft])
  }
})

const rules = { ...draft, level: 'Licenciatura', deanery: 'Otro', modality: 'Escolarizada', minCredits: 300, maxCredits: 400, minHours: 4800, maxCycleCredits: 50, maxSubjects: 7 }
const hasError = (validations, code) => validations.some((item) => item.severity === 'error' && item.code === code)

test('academic gates block missing hours, credits, practices, capstones and prerequisites', () => {
  const validations = validateCurriculum([{ id: 'a', key: 'LIT001', name: 'Materia', cycle: 1, credits: 6, teacherHours: 32, independentHours: 64, prerequisite: 'MISSING' }], rules)
  for (const code of ['HORAS_MINIMAS_PLAN', 'RANGO_CREDITOS_PLAN', 'PRACTICAS_MINIMOS', 'CAPSTONE_MINIMO', 'SERIACION_ORDEN_CICLO']) assert.ok(hasError(validations, code), code)
})

test('elective slots require the minimum hours and an offering in the same cycle', () => {
  const slot = { id: 'slot', isElectiveSlot: true, cycle: 5, teacherHours: 16, independentHours: 32, credits: 3 }
  const validations = validateCurriculum([slot], rules)
  assert.ok(hasError(validations, 'OPTATIVA_HORAS_MINIMAS'))
  assert.ok(hasError(validations, 'OPTATIVA_SIN_OFERTA'))
  const corrected = validateCurriculum([{ ...slot, teacherHours: 32, independentHours: 64 }], rules, [], [{ cycle: 5 }])
  assert.equal(hasError(corrected, 'OPTATIVA_HORAS_MINIMAS'), false)
  assert.equal(hasError(corrected, 'OPTATIVA_SIN_OFERTA'), false)
})

test('a valid complete curriculum has no blockers and can enter review', async () => {
  const subjects = Array.from({ length: 8 }, (_, index) => ({
    id: `s${index}`, key: `LIT00${index + 1}`, name: `Asignatura ${index + 1}`, cycle: index + 1,
    teacherHours: 300, independentHours: 300, credits: 37.5,
    practice: index >= 6, capstone: index >= 6,
  }))
  const validations = validateCurriculum(subjects, rules)
  assert.deepEqual(validations, [])
  const state = setup([rules], validations)
  state.commit(await state.service.solicitarRevisionPlan('new'))
  assert.equal(state.programs[0].status, 'En revisión')
})
