import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
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

function getHeaderMeta(pathname) {
  if (pathname.startsWith('/programas/nuevo')) {
    return ['Crear programa', 'Información general y reglas aplicables']
  }
  if (pathname.includes('/editar')) {
    return ['Configuración del programa', 'Información general y reglas aplicables']
  }
  if (pathname.startsWith('/mapas')) {
    return ['Mapa curricular', 'Diseño, seriación y validación del plan']
  }
  if (pathname.startsWith('/catalogo')) {
    return ['Catálogo de asignaturas', 'Asignaturas obligatorias, propias e institucionales']
  }
  if (pathname.startsWith('/configuracion')) {
    return ['Configuración', 'Plantillas, reglas y excepciones autorizadas']
  }
  if (pathname.startsWith('/exportaciones')) {
    return ['Exportaciones', 'Preparación de entregables institucionales']
  }
  return ['Programas', 'Portafolio y versiones curriculares']
}

function EditProgramWrapper({ programs, onSave, onCancel }) {
  const { id } = useParams()
  const program = programs.find((item) => item.id === id)
  if (!program) {
    return <Navigate to="/programas" replace />
  }
  return (
    <ProgramForm
      key={program.id}
      initial={program}
      onCancel={onCancel}
      onSave={(form) => onSave(form, program)}
    />
  )
}

function MapPageWrapper({
  programs,
  subjects,
  onSetActiveProgram,
  onAddSubject,
  onEditSubject,
  onMoveSubject,
  onReorderSubject,
  onExport,
  onNotify,
}) {
  const { id } = useParams()
  const program = programs.find((item) => item.id === id) || programs[0]

  useEffect(() => {
    if (program) {
      onSetActiveProgram(program)
    }
  }, [program, onSetActiveProgram])

  const validations = useMemo(
    () => (program ? validateCurriculum(subjects, program, initialMockValidations) : []),
    [subjects, program]
  )

  if (!program) {
    return <Navigate to="/programas" replace />
  }

  return (
    <MapPage
      program={program}
      subjects={subjects}
      validations={validations}
      onAdd={onAddSubject}
      onEdit={onEditSubject}
      onMove={onMoveSubject}
      onReorder={onReorderSubject}
      onExport={() => onExport(program)}
      onNotify={onNotify}
    />
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [programs, setPrograms] = useState(demoPrograms)
  const [activeProgram, setActiveProgram] = useState(demoPrograms[0])
  const [subjects, setSubjects] = useState(initialSubjects)
  const [electives, setElectives] = useState(ownElectives)
  const [menuOpen, setMenuOpen] = useState(false)
  const [subjectModal, setSubjectModal] = useState(null)
  const [exportProgram, setExportProgram] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const openMap = (program) => {
    setActiveProgram(program)
    navigate(`/mapas/${program.id}`)
  }

  const editProgram = (program) => {
    navigate(`/programas/${program.id}/editar`)
  }

  const createProgram = () => {
    navigate('/programas/nuevo')
  }

  const saveProgram = (form, editingProgram = null) => {
    if (editingProgram) {
      const updated = {
        ...editingProgram,
        name: form.name,
        mnemonic: form.mnemonic,
        deanery: form.deanery,
        level: form.level,
        modality: form.modality,
        jurisdiction: form.jurisdiction,
        cycles: form.cycles,
        weeks: form.weeks,
        minCredits: form.minCredits,
        maxCredits: form.maxCredits,
        minHours: form.minHours,
        maxSubjects: form.maxSubjects,
        maxCycleCredits: form.maxCycleCredits,
        updated: 'Ahora',
      }
      setPrograms((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      if (activeProgram?.id === updated.id) setActiveProgram(updated)
      setToast('El programa y su nueva configuración quedaron guardados en el prototipo.')
    } else {
      const created = {
        id: `demo-${Date.now()}`,
        shortName: form.name.replace(/^(Licenciatura|Maestría|Especialidad|Doctorado) en /, ''),
        plan: form.code,
        version: 'v0.1',
        status: 'Borrador',
        progress: 12,
        updated: 'Ahora',
        cycleLabel: form.level === 'Licenciatura' ? 'Semestre' : 'Cuatrimestre',
        accent: 'from-blue-600 to-amber-500',
        ...form,
      }
      setPrograms((items) => [created, ...items])
      setActiveProgram(created)
      setToast('Se creó el programa de demostración.')
    }
    navigate('/programas')
  }

  const saveSubject = (saved) => {
    if (subjectModal.source === 'catalog') {
      const exists = electives.some((item) => item.id === saved.id)
      if (exists || saved.type === 'Optativa') {
        setElectives((items) =>
          exists ? items.map((item) => (item.id === saved.id ? saved : item)) : [...items, saved]
        )
      } else {
        setSubjects((items) =>
          items.some((item) => item.id === saved.id)
            ? items.map((item) => (item.id === saved.id ? saved : item))
            : [...items, saved]
        )
      }
    } else {
      setSubjects((items) =>
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved]
      )
    }
    setSubjectModal(null)
    setToast('La asignatura se actualizó y las validaciones fueron recalculadas.')
  }

  const moveSubject = (id, cycle) => {
    const moved = subjects.find((item) => item.id === id)
    setSubjects((items) => items.map((item) => (item.id === id ? { ...item, cycle } : item)))
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

  const [title, subtitle] = getHeaderMeta(location.pathname)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
        activeProgramId={activeProgram?.id || programs[0]?.id}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="min-h-screen lg:pl-[268px]">
        <Header title={title} subtitle={subtitle} onMenu={() => setMenuOpen(true)} />

        <Routes>
          <Route path="/" element={<Navigate to="/programas" replace />} />
          <Route
            path="/programas"
            element={
              <ProgramsPage
                programs={programs}
                onOpen={openMap}
                onEdit={editProgram}
                onCreate={createProgram}
              />
            }
          />
          <Route
            path="/programas/nuevo"
            element={
              <ProgramForm
                initial={null}
                onCancel={() => navigate('/programas')}
                onSave={(form) => saveProgram(form, null)}
              />
            }
          />
          <Route
            path="/programas/:id/editar"
            element={
              <EditProgramWrapper
                programs={programs}
                onCancel={() => navigate('/programas')}
                onSave={saveProgram}
              />
            }
          />
          <Route
            path="/mapas"
            element={
              <Navigate
                to={`/mapas/${activeProgram?.id || programs[0]?.id || 'demo-1'}`}
                replace
              />
            }
          />
          <Route
            path="/mapas/:id"
            element={
              <MapPageWrapper
                programs={programs}
                subjects={subjects}
                onSetActiveProgram={setActiveProgram}
                onAddSubject={(cycle) => setSubjectModal({ subject: null, cycle, source: 'map' })}
                onEditSubject={(subject) =>
                  setSubjectModal({ subject, cycle: subject.cycle, source: 'map' })
                }
                onMoveSubject={moveSubject}
                onReorderSubject={reorderSubject}
                onExport={(program) => setExportProgram(program)}
                onNotify={setToast}
              />
            }
          />
          <Route
            path="/catalogo"
            element={
              <CatalogTable
                subjects={subjects}
                electives={electives}
                institutional={institutionalElectives}
                onEdit={(subject) =>
                  setSubjectModal({ subject, cycle: subject?.cycle || 7, source: 'catalog' })
                }
              />
            }
          />
          <Route path="/configuracion" element={<ConfigPage onNotify={setToast} />} />
          <Route
            path="/exportaciones"
            element={<ExportsPage programs={programs} onOpen={setExportProgram} />}
          />
          <Route path="*" element={<Navigate to="/programas" replace />} />
        </Routes>
      </div>

      {subjectModal && (
        <SubjectModal
          open
          subject={subjectModal.subject}
          cycle={subjectModal.cycle || 1}
          program={activeProgram}
          subjects={[...subjects, ...electives]}
          onClose={() => setSubjectModal(null)}
          onSave={saveSubject}
        />
      )}
      {exportProgram && (
        <ExportModal
          open
          program={exportProgram}
          subjects={subjects}
          onClose={() => setExportProgram(null)}
          onExport={() => {
            setExportProgram(null)
            setToast('Exportación simulada: el libro Excel está listo para revisión.')
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}

export default App

