import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProgramsPage from './pages/ProgramsPage'
import ProgramForm from './pages/ProgramForm'
import MapPage from './pages/MapPage'
import SubjectModal from './components/SubjectModal'
import CatalogTable from './pages/CatalogTable'
import ConfigPage from './pages/ConfigPage'
import ExportModal from './components/ExportModal'
import ExportsPage from './pages/ExportsPage'
import Toast from './components/Toast'
import { initialMockValidations, initialProgramId, initialSubjects, ownElectives, programs as demoPrograms } from './data/mockData'
import { createMissingDeanerySubjects } from './data/deaneryRequirements'
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

function belongsToProgram(subject, programId) {
  return (subject.ownerProgramId ?? subject.programId) === programId
}

function createProgramId() {
  if (globalThis.crypto?.randomUUID) return `program-${globalThis.crypto.randomUUID()}`
  return `program-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function assignLegacyElectiveOwnership(electives) {
  return electives.map((elective) => elective.programId ? elective : { ...elective, programId: initialProgramId })
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
  electives,
  onSetActiveProgram,
  onAddSubject,
  onEditSubject,
  onMoveSubject,
  onReorderSubject,
  onRemoveSubject,
  onAssignSubject,
  onDropSubject,
  onExport,
  onNotify,
}) {
  const { id } = useParams()
  const program = programs.find((item) => item.id === id) || programs[0]
  const programSubjects = subjects.filter((subject) => subject.programId === program?.id)
  const availableSubjects = [
    ...subjects.filter((subject) => !subject.isElectiveSlot && belongsToProgram(subject, program?.id)),
    ...electives.filter((subject) => (subject.programId || initialProgramId) === program?.id),
  ]

  useEffect(() => {
    if (program) {
      onSetActiveProgram(program)
    }
  }, [program, onSetActiveProgram])

  const validations = useMemo(
    () => (program ? validateCurriculum(programSubjects, program, initialMockValidations) : []),
    [programSubjects, program]
  )

  if (!program) {
    return <Navigate to="/programas" replace />
  }

  return (
    <MapPage
      program={program}
      subjects={programSubjects}
      availableSubjects={availableSubjects}
      validations={validations}
      onAdd={onAddSubject}
      onEdit={onEditSubject}
      onMove={onMoveSubject}
      onReorder={onReorderSubject}
      onRemove={onRemoveSubject}
      onAssign={onAssignSubject}
      onDropSubject={onDropSubject}
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
  const [electives, setElectives] = useState(() => assignLegacyElectiveOwnership(ownElectives))
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
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
    let savedProgram
    if (editingProgram) {
      savedProgram = {
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
      setPrograms((items) => items.map((item) => (item.id === savedProgram.id ? savedProgram : item)))
      if (activeProgram?.id === savedProgram.id) setActiveProgram(savedProgram)
    } else {
      savedProgram = {
        id: createProgramId(),
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
      setPrograms((items) => [savedProgram, ...items])
      setActiveProgram(savedProgram)
    }

    const assignedSubjects = subjects.filter((subject) => subject.programId === savedProgram.id)
    const addedSubjects = createMissingDeanerySubjects(savedProgram, assignedSubjects)
    if (addedSubjects.length) setSubjects((items) => [...items, ...addedSubjects])
    const action = editingProgram ? 'El programa y su nueva configuración quedaron guardados.' : 'Se creó el programa de demostración.'
    setToast(addedSubjects.length ? `${action} Se asignaron ${addedSubjects.length} materias preestablecidas.` : action)
    navigate('/programas')
  }

  const saveSubject = (saved) => {
    if (subjectModal.source === 'catalog') {
      const exists = electives.some((item) => item.id === saved.id)
      if (exists || saved.type === 'Optativa') {
        const savedForProgram = { ...saved, programId: activeProgram?.id }
        setElectives((items) =>
          exists ? items.map((item) => (item.id === saved.id ? savedForProgram : item)) : [...items, savedForProgram]
        )
      } else {
        setSubjects((items) =>
          items.some((item) => item.id === saved.id)
            ? items.map((item) => (item.id === saved.id ? saved : item))
            : [...items, { ...saved, programId: null }]
        )
      }
    } else {
      setSubjects((items) =>
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, { ...saved, programId: activeProgram?.id }]
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
      const sameCycle = items.filter((item) => item.programId === current.programId && item.cycle === current.cycle)
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

  const removeSubject = (id) => {
    const removed = subjects.find((item) => String(item.id) === String(id))
    if (!removed) return
    setSubjects((items) => removed.catalogAssignment
      ? items.filter((item) => String(item.id) !== String(id))
      : items.map((item) => (String(item.id) === String(id) ? { ...item, programId: null, ownerProgramId: item.ownerProgramId || removed.programId } : item))
    )
    setToast(`${removed.name} se quitó del mapa y está disponible para asignarse.`)
  }

  const assignSubject = (key, cycle) => {
    if (!activeProgram) return

    const source = [
      ...subjects.filter((item) => belongsToProgram(item, activeProgram.id)),
      ...electives.filter((item) => (item.programId || initialProgramId) === activeProgram.id),
    ].find((item) => item.key === key)
    if (!source) return

    setSubjects((items) => {
      const alreadyAssigned = items.some((item) => item.programId === activeProgram.id && item.key === key)
      if (alreadyAssigned) return items
      return [...items, {
        ...source,
        id: `assignment-${activeProgram.id}-${key}-${Date.now()}`,
        cycle,
        programId: activeProgram.id,
        ownerProgramId: activeProgram.id,
        catalogAssignment: true,
        isElectiveSlot: false,
      }]
    })
    setToast(`${source.name} se agregó al ciclo ${cycle}.`)
  }

  const handleDropSubject = (subjectId, targetCycle, targetSubjectId = null, placeAfter = false) => {
    if (!subjectId) return
    const numericTargetCycle = Number(targetCycle)
    const strSubjectId = String(subjectId)
    const strTargetSubjectId = targetSubjectId ? String(targetSubjectId) : null

    setSubjects((items) => {
      const subjectToMove = items.find((s) => String(s.id) === strSubjectId)
      if (!subjectToMove) return items

      // Remove dragged subject from the list
      const remaining = items.filter((s) => String(s.id) !== strSubjectId)
      const updatedSubject = { ...subjectToMove, cycle: numericTargetCycle }

      // Case 1: Dropped onto a specific target subject
      if (strTargetSubjectId && strTargetSubjectId !== strSubjectId) {
        const targetIndex = remaining.findIndex((s) => String(s.id) === strTargetSubjectId)
        if (targetIndex !== -1) {
          const insertIndex = placeAfter ? targetIndex + 1 : targetIndex
          const result = [...remaining]
          result.splice(insertIndex, 0, updatedSubject)
          return result
        }
      }

      // Case 2: Dropped into a cycle column (append at the end of that cycle)
      const cycleItems = remaining.filter((s) => s.programId === subjectToMove.programId && Number(s.cycle) === numericTargetCycle)
      if (cycleItems.length > 0) {
        const lastItem = cycleItems[cycleItems.length - 1]
        const lastIndex = remaining.findIndex((s) => String(s.id) === String(lastItem.id))
        const result = [...remaining]
        result.splice(lastIndex + 1, 0, updatedSubject)
        return result
      } else {
        // No items in this cycle yet, find position among surrounding cycles
        const nextCycleItem = remaining.find((s) => s.programId === subjectToMove.programId && Number(s.cycle) > numericTargetCycle)
        if (nextCycleItem) {
          const nextIndex = remaining.findIndex((s) => String(s.id) === String(nextCycleItem.id))
          const result = [...remaining]
          result.splice(nextIndex, 0, updatedSubject)
          return result
        }
        return [...remaining, updatedSubject]
      }
    })

    const moved = subjects.find((s) => String(s.id) === strSubjectId)
    setToast(`${moved?.name || 'La asignatura'} se colocó en el ciclo ${numericTargetCycle}.`)
  }

  const [title, subtitle] = getHeaderMeta(location.pathname)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
        activeProgramId={activeProgram?.id || programs[0]?.id}
        open={menuOpen}
        desktopOpen={sidebarVisible}
        onClose={() => setMenuOpen(false)}
      />
      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarVisible ? 'lg:pl-[268px]' : 'lg:pl-0'}`}>
        <Header
          title={title}
          subtitle={subtitle}
          onMenu={() => setMenuOpen(true)}
          sidebarOpen={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((visible) => !visible)}
        />

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
                electives={assignLegacyElectiveOwnership(electives)}
                onSetActiveProgram={setActiveProgram}
                onAddSubject={(cycle) => setSubjectModal({ subject: null, cycle, source: 'map' })}
                onEditSubject={(subject) =>
                  setSubjectModal({ subject, cycle: subject.cycle, source: 'map' })
                }
                onMoveSubject={moveSubject}
                onReorderSubject={reorderSubject}
                onRemoveSubject={removeSubject}
                onAssignSubject={assignSubject}
                onDropSubject={handleDropSubject}
                onExport={(program) => setExportProgram(program)}
                onNotify={setToast}
              />
            }
          />
          <Route
            path="/catalogo"
            element={
              <CatalogTable
                programs={programs}
                subjects={subjects}
                electives={electives}
                onSelectProgram={setActiveProgram}
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
          subjects={[
            ...subjects.filter((subject) => subject.programId === activeProgram?.id),
            ...electives.filter((subject) => (subject.programId || initialProgramId) === activeProgram?.id),
          ]}
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
