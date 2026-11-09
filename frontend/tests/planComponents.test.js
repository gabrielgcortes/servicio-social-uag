import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let MapPage
let SubjectModal
let CurriculumMap
let App
let initialProgramId
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false, ws: false } })
  App = (await server.ssrLoadModule('/src/App.jsx')).default
  initialProgramId = (await server.ssrLoadModule('/src/data/mockData.js')).initialProgramId
  MapPage = (await server.ssrLoadModule('/src/pages/MapPage.jsx')).default
  SubjectModal = (await server.ssrLoadModule('/src/components/SubjectModal.jsx')).default
  CurriculumMap = (await server.ssrLoadModule('/src/components/CurriculumMap.jsx')).default
})
after(async () => { await server?.close() })

const program = { id: 'p', name: 'Prueba', mnemonic: 'PRU', level: 'Licenciatura', status: 'Borrador', cycles: 2, weeks: 16, currentCycle: 1, cycleLabel: 'Semestre', minCredits: 0, maxCredits: 400, maxCycleCredits: 50, maxSubjects: 7, modality: 'Escolarizada', progress: 90 }
const subject = { id: 's', name: 'Materia de prueba', key: 'PRU001', type: 'Obligatoria', area: 'Básica', cycle: 1, teacherHours: 32, independentHours: 64, credits: 6, prerequisite: '' }
const renderMap = (status, validations = []) => renderToStaticMarkup(createElement(MapPage, { program: { ...program, status }, subjects: [subject], availableSubjects: [], validations }))

test('review submission is disabled and explains blockers; enables at zero errors', () => {
  const blocked = renderMap('Borrador', [{ id: 'error', severity: 'error' }])
  assert.match(blocked, /disabled=""[^>]*aria-describedby="review-errors"/)
  assert.match(blocked, /Corrige los 1 errores bloqueantes/)
  const ready = renderMap('Borrador')
  assert.doesNotMatch(ready.match(/<button[^>]*>Enviar a revisión/)[0], / disabled=/)
})

test('review and history expose consultation, no editable map controls', () => {
  for (const status of ['En revisión', 'Histórico']) {
    const html = renderMap(status)
    assert.match(html, /draggable="false"/)
    assert.match(html, /Consultar Materia de prueba/)
    assert.doesNotMatch(html, /Añadir elemento|Mover arriba|Guardar cambios|Quitar Materia de prueba/)
  }
  const review = renderMap('En revisión')
  assert.match(review, /Este plan se encuentra en revisión por el Decanato/)
  assert.match(review, /Aprobar y publicar \(Hacer vigente\)/)
  assert.match(review, /Devolver a borrador/)
  const historical = renderMap('Histórico')
  assert.match(historical, /Archivo histórico inmutable/)
  assert.match(historical, /Duplicar a nuevo borrador/)
  assert.doesNotMatch(historical, /Enviar a revisión|Archivar a histórico|Aprobar y publicar/)
  assert.match(historical, /Exportar/)
})

test('vigente keeps future cycle editable and completed/current subject consultable', () => {
  const html = renderMap('Vigente')
  assert.match(html, /Plan oficial en curso/)
  assert.match(html, /Archivar a histórico/)
  assert.match(html, /Consultar Materia de prueba/)
  assert.doesNotMatch(html, /Mover arriba/)
  assert.match(html, /Añadir al ciclo 2/)
  assert.doesNotMatch(html, /Añadir al ciclo 1/)
})

test('area view follows the same permissions', () => {
  const html = renderToStaticMarkup(createElement(CurriculumMap, { view: 'areas', program: { ...program, status: 'Histórico' }, subjects: [subject] }))
  assert.match(html, /draggable="false"/)
  assert.match(html, /Consultar Materia de prueba/)
  assert.doesNotMatch(html, /Mover arriba|Quitar Materia de prueba/)
})

test('read only subject modal disables its fieldset and omits save', () => {
  const html = renderToStaticMarkup(createElement(SubjectModal, { open: true, subject, program, cycle: 1, subjects: [subject], readOnly: true }))
  assert.match(html, /Consultar asignatura · Solo lectura/)
  assert.match(html, /<fieldset disabled=""/)
  assert.doesNotMatch(html, /type="submit"/)
  assert.match(html, />Cerrar<\/button>/)
})


test('App bootstraps the extracted curriculum hook and renders catalog and map routes', () => {
  const render = (path) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(App)))
  assert.match(render('/catalogo'), /Asignaturas y optativas/)
  assert.match(render(`/mapas/${initialProgramId}`), /Plan oficial en curso/)
})

test('pending subject saves disable fields and submit; errors stay visible for retry', () => {
  const html = renderToStaticMarkup(createElement(SubjectModal, { open: true, subject, program, cycle: 1, subjects: [subject], pending: true, saveError: 'Error de guardado simulado' }))
  assert.match(html, /<fieldset disabled=""/)
  assert.match(html, /<button type="submit" disabled=""/)
  assert.match(html, /Guardando…/)
  assert.match(html, /role="alert"[^>]*>Error de guardado simulado/)
})

test('prerequisites include capstones regardless of placement and exclude self, duplicates and other careers', () => {
  const second = { ...subject, id: 'capstone-2', key: 'PRU002', name: 'Capstone II', cycle: 7, capstone: true, programId: program.id }
  for (const cycle of [6, 7, 8]) {
    const first = { ...second, id: 'capstone-1', key: 'PRU001', name: 'Capstone I', cycle }
    const html = renderToStaticMarkup(createElement(SubjectModal, {
      open: true, subject: second, cycle: 7, program: { ...program, cycles: 8 },
      subjects: [first, { ...first, id: 'placement', catalogAssignment: true }, second,
        { ...second, id: 'self-placement', catalogAssignment: true },
        { ...first, id: 'foreign', key: 'OTH001', programId: 'other' }],
    }))
    const options = html.match(/<select[^>]*aria-describedby="prerequisite-hint"[^>]*>(.*?)<\/select>/)[1]
    assert.equal((options.match(/value="PRU001"/g) || []).length, 1)
    assert.match(options, /Capstone I/)
    assert.doesNotMatch(options, /PRU002|OTH001/)
  }
})
