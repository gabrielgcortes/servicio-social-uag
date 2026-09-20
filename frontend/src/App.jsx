import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProgramsPage from './components/ProgramsPage'
import ProgramForm from './components/ProgramForm'
import MapPage from './components/MapPage'
import SubjectModal from './components/SubjectModal'
import CatalogTable from './components/CatalogTable'
import ConfigPage from './components/ConfigPage'
import ExportModal from './components/ExportModal'
import ExportsPage from './components/ExportsPage'
import Toast from './components/Toast'
import { initialMockValidations, initialSubjects, institutionalElectives, ownElectives, programs as demoPrograms } from './data/mockData'
import { validateCurriculum } from './utils/validation'

const pageMeta = {
  programs: ['Programas', 'Portafolio y versiones curriculares'],
  programForm: ['Configuración del programa', 'Información general y reglas aplicables'],
  map: ['Mapa curricular', 'Diseño, seriación y validación del plan'],
  catalog: ['Catálogo de asignaturas', 'Asignaturas obligatorias, propias e institucionales'],
  config: ['Configuración', 'Plantillas, reglas y excepciones autorizadas'],
  exports: ['Exportaciones', 'Preparación de entregables institucionales'],
}

function App() {
  const [page, setPage] = useState('programs')
  const [programs, setPrograms] = useState(demoPrograms)
  const [activeProgram, setActiveProgram] = useState(demoPrograms[0])
  const [subjects, setSubjects] = useState(initialSubjects)
  const [electives, setElectives] = useState(ownElectives)
  const [menuOpen, setMenuOpen] = useState(false)
  const [programDraft, setProgramDraft] = useState(null)
  const [subjectModal, setSubjectModal] = useState(null)
  const [exportProgram, setExportProgram] = useState(null)
  const [toast, setToast] = useState('')

  const validations = useMemo(() => validateCurriculum(subjects, activeProgram, initialMockValidations), [subjects, activeProgram])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigate = (nextPage) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openMap = (program) => { setActiveProgram(program); navigate('map') }
  const editProgram = (program) => { setProgramDraft(program); navigate('programForm') }
  const createProgram = () => { setProgramDraft(null); navigate('programForm') }
  const saveProgram = (form) => {
    if (programDraft) {
      const updated = { ...programDraft, name: form.name, mnemonic: form.mnemonic, deanery: form.deanery, level: form.level, modality: form.modality, jurisdiction: form.jurisdiction, cycles: form.cycles, weeks: form.weeks, minCredits: form.minCredits, maxCredits: form.maxCredits, minHours: form.minHours, maxSubjects: form.maxSubjects, maxCycleCredits: form.maxCycleCredits, updated: 'Ahora' }
      setPrograms((items) => items.map((item) => item.id === updated.id ? updated : item))
      if (activeProgram.id === updated.id) setActiveProgram(updated)
      setToast('El programa y su nueva configuración quedaron guardados en el prototipo.')
    } else {
      const created = { id: `demo-${Date.now()}`, shortName: form.name.replace(/^(Licenciatura|Maestría|Especialidad|Doctorado) en /, ''), plan: form.code, version: 'v0.1', status: 'Borrador', progress: 12, updated: 'Ahora', cycleLabel: form.level === 'Licenciatura' ? 'Semestre' : 'Cuatrimestre', accent: 'from-blue-600 to-amber-500', ...form }
      setPrograms((items) => [created, ...items])
      setToast('Se creó el programa de demostración.')
    }
    navigate('programs')
  }

  const saveSubject = (saved) => {
    if (subjectModal.source === 'catalog') {
      const exists = electives.some((item) => item.id === saved.id)
      if (exists || saved.type === 'Optativa') setElectives((items) => exists ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
      else setSubjects((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
    } else {
      setSubjects((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
    }
    setSubjectModal(null)
    setToast('La asignatura se actualizó y las validaciones fueron recalculadas.')
  }

  const moveSubject = (id, cycle) => {
    const moved = subjects.find((item) => item.id === id)
    setSubjects((items) => items.map((item) => item.id === id ? { ...item, cycle } : item))
    setToast(`${moved?.name || 'La asignatura'} se movió al ciclo ${cycle}.`)
  }
  const reorderSubject = (id, direction) => {
    setSubjects((items) => {
      const current = items.find((item) => item.id === id)
      const sameCycle = items.filter((item) => item.cycle === current.cycle)
      const position = sameCycle.findIndex((item) => item.id === id)
      const target = sameCycle[position + direction]
      if (!target) return items
      const a = items.findIndex((item) => item.id === current.id)
      const b = items.findIndex((item) => item.id === target.id)
      const copy = [...items]
      ;[copy[a], copy[b]] = [copy[b], copy[a]]
      return copy
    })
  }

  const [title, subtitle] = pageMeta[page] || pageMeta.programs
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar currentPage={page} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="min-h-screen lg:pl-[268px]">
        <Header title={title} subtitle={subtitle} onMenu={() => setMenuOpen(true)} />
        {page === 'programs' && <ProgramsPage programs={programs} onOpen={openMap} onEdit={editProgram} onCreate={createProgram} />}
        {page === 'programForm' && <ProgramForm initial={programDraft} onCancel={() => navigate('programs')} onSave={saveProgram} />}
        {page === 'map' && <MapPage program={activeProgram} subjects={subjects} validations={validations} onAdd={(cycle) => setSubjectModal({ subject: null, cycle, source: 'map' })} onEdit={(subject) => setSubjectModal({ subject, cycle: subject.cycle, source: 'map' })} onMove={moveSubject} onReorder={reorderSubject} onExport={() => setExportProgram(activeProgram)} onNotify={setToast} />}
        {page === 'catalog' && <CatalogTable subjects={subjects} electives={electives} institutional={institutionalElectives} onEdit={(subject) => setSubjectModal({ subject, cycle: subject?.cycle || 7, source: 'catalog' })} />}
        {page === 'config' && <ConfigPage onNotify={setToast} />}
        {page === 'exports' && <ExportsPage programs={programs} onOpen={setExportProgram} />}
      </div>

      {subjectModal && <SubjectModal open subject={subjectModal.subject} cycle={subjectModal.cycle || 1} program={activeProgram} subjects={[...subjects, ...electives]} onClose={() => setSubjectModal(null)} onSave={saveSubject} />}
      {exportProgram && <ExportModal open program={exportProgram} subjects={subjects} onClose={() => setExportProgram(null)} onExport={() => { setExportProgram(null); setToast('Exportación simulada: el libro Excel está listo para revisión.') }} />}
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}

export default App
