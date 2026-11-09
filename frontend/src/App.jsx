import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import DuplicateProgramModal from './components/DuplicateProgramModal'
import ExportsPage from './pages/ExportsPage'
import Toast from './components/Toast'
import { initialMockValidations, initialProgramId, programs as demoPrograms } from './data/mockData'
import { demoCurriculum } from './data/demoCurriculum'
import { useCurriculumSubjects } from './hooks/useCurriculumSubjects'
import { validateCurriculum } from './utils/validation'
import { createPlanService } from './services/planService'
import { applyPlanUpdate, isPlanReadOnly } from './utils/planStatus'
import { belongsToProgram } from './utils/subjectCatalog'
import { isCycleEditable } from './utils/cycleStatus'

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

function createProgramId() {
  if (globalThis.crypto?.randomUUID) return `program-${globalThis.crypto.randomUUID()}`
  return `program-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
  onDuplicate,
  onExport,
  onNotify,
  onUpdateStatus,
  statusPending,
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const program = programs.find((item) => item.id === id)
  const programSubjects = useMemo(() => subjects.filter((subject) => subject.programId === program?.id), [subjects, program?.id])
  const availableSubjects = [
    ...subjects.filter((subject) => !subject.isElectiveSlot && subject.type !== 'Optativa' && belongsToProgram(subject, program?.id)),
  ]

  useEffect(() => {
    if (program) {
      onSetActiveProgram(program)
    }
  }, [program, onSetActiveProgram])

  const validations = useMemo(
    () => (program ? validateCurriculum(programSubjects, program, initialMockValidations, electives.filter((item) => item.programId === program.id)) : []),
    [programSubjects, program, electives]
  )

  if (id && !program) {
    return <Navigate to="/mapas" replace />
  }

  return (
    <>
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Mapas curriculares</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Selecciona una carrera</h2>
          <p className="mt-2 text-sm text-slate-500">Elige la carrera y el plan que quieres consultar para ver su mapa curricular.</p>
          <label className="mt-6 block max-w-xl">
            <span className="text-xs font-bold text-slate-700">Carrera</span>
            <select
              value={program?.id || ''}
              onChange={(event) => navigate(event.target.value ? `/mapas/${event.target.value}` : '/mapas')}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">Selecciona una carrera...</option>
              {programs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.plan}</option>)}
            </select>
          </label>
        </div>
      </section>
      {program ? <MapPage
      key={program.id}
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
      onDuplicate={() => onDuplicate(program)}
      onExport={() => onExport(program)}
      onNotify={onNotify}
      onUpdateStatus={onUpdateStatus}
      statusPending={statusPending}
      /> : <p className="px-4 py-12 text-center text-sm text-slate-400">{programs.length ? 'Selecciona una carrera para ver su mapa curricular.' : 'Aún no hay carreras registradas.'}</p>}
    </>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [programs, setPrograms] = useState(demoPrograms)
  const [activeProgramId, setActiveProgramId] = useState(demoPrograms[0]?.id)
  const activeProgram = programs.find((program) => program.id === activeProgramId)
  const setActiveProgram = useCallback((program) => setActiveProgramId(program?.id), [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [subjectModal, setSubjectModal] = useState(null)
  const [exportProgram, setExportProgram] = useState(null)
  const [duplicateModalProgram, setDuplicateModalProgram] = useState(null)
  const [toast, setToast] = useState('')
  const [statusPending, setStatusPending] = useState(false)
  const mutationLock = useRef(false)
  const curriculum = useCurriculumSubjects({
    programs, initialData: demoCurriculum, onNotify: setToast,
    acquireMutation: () => {
      if (mutationLock.current) return false
      mutationLock.current = true
      return true
    },
    releaseMutation: () => { mutationLock.current = false },
  })
  const { subjects, electives } = curriculum
  const planService = useMemo(() => createPlanService({ getSnapshot: () => ({
    programs,
    validations: (plan) => validateCurriculum(subjects.filter((subject) => subject.programId === plan.id), plan, initialMockValidations, electives.filter((item) => item.programId === plan.id)),
  }) }), [programs, subjects, electives])

  const updateProgramStatus = async (programId, nextStatus, metadata = {}) => {
    if (mutationLock.current) return null
    const plan = programs.find((item) => item.id === programId)
    if (!plan) return null
    mutationLock.current = true
    setStatusPending(true)
    try {
      let updated
      if (metadata.manual) updated = await planService.cambiarEstadoPlan(programId, nextStatus)
      else if (plan.status === 'Borrador' && nextStatus === 'En revisión') updated = await planService.solicitarRevisionPlan(programId)
      else if (plan.status === 'En revisión' && nextStatus === 'Vigente') updated = await planService.aprobarPlan(programId)
      else if (plan.status === 'En revisión' && nextStatus === 'Borrador') updated = await planService.rechazarPlan(programId, metadata)
      else if (plan.status === 'Vigente' && nextStatus === 'Histórico') updated = await planService.cambiarEstadoPlan(programId, nextStatus)
      else throw new Error('La transición solicitada no está permitida.')
      setPrograms((items) => applyPlanUpdate(items, updated))
      setToast(nextStatus === 'Vigente' ? 'Plan aprobado y publicado. El plan vigente anterior de la carrera se archivó, si existía.' : nextStatus === 'Borrador' ? 'Plan devuelto a borrador con observaciones.' : `El plan pasó a ${nextStatus}.`)
      return updated
    } catch (error) {
      setToast(error.message || 'No se pudo actualizar el estado del plan.')
      return null
    } finally {
      mutationLock.current = false
      setStatusPending(false)
    }
  }


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

  const duplicateProgram = async (sourceProgram, overrides = {}, openMapAfter = true) => {
    if (!sourceProgram) return
    if (mutationLock.current) return
    mutationLock.current = true
    let duplicate
    try {
      duplicate = await planService.duplicarPlan(sourceProgram.id, { ...overrides, version: overrides.version || 'v1.0' })
    } catch (error) {
      setToast(error.message || 'No se pudo duplicar el plan.')
      return
    } finally {
      mutationLock.current = false
    }
    const newId = duplicate.id
    const newName = overrides.name || sourceProgram.name
    const newProgram = {
      ...duplicate,
      id: newId,
      name: newName,
      shortName: newName.replace(/^(Licenciatura|Maestría|Especialidad|Doctorado) en /, ''),
      plan: overrides.plan || sourceProgram.plan,
      version: overrides.version || 'v1.0',
      status: 'Borrador',
      currentCycle: 0,
      updated: 'Ahora',
    }

    const { clonedSubjects } = curriculum.copyPlanContent(sourceProgram, newProgram)
    setPrograms((items) => [newProgram, ...items])
    setActiveProgram(newProgram)
    setDuplicateModalProgram(null)

    const mapAssignedCount = clonedSubjects.filter((item) => item.programId === newProgram.id).length
    setToast(`Se duplicó "${sourceProgram.plan}" como "${newProgram.plan}" con ${mapAssignedCount} materias en el mapa curricular.`)
    navigate(openMapAfter ? `/mapas/${newProgram.id}` : '/programas')
  }

  const saveProgram = async (form, editingProgram = null, sourceProgramId = null) => {
    let savedProgram
    if (editingProgram) {
      if (form.status !== editingProgram.status) {
        const updated = await updateProgramStatus(editingProgram.id, form.status, { manual: true })
        if (!updated) return
        editingProgram = updated
      }
      savedProgram = {
        ...editingProgram,
        name: form.name,
        plan: form.code || editingProgram.plan,
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
      setPrograms((items) => applyPlanUpdate(items, savedProgram))
      if (activeProgram?.id === savedProgram.id) setActiveProgram(savedProgram)
    } else {
      const sourceProgram = sourceProgramId ? programs.find((item) => item.id === sourceProgramId) : null
      savedProgram = {
        id: createProgramId(),
        shortName: form.name.replace(/^(Licenciatura|Maestría|Especialidad|Doctorado) en /, ''),
        plan: form.code,
        version: sourceProgram ? 'v1.0' : 'v0.1',
        status: 'Borrador',
        progress: sourceProgram ? sourceProgram.progress : 12,
        updated: 'Ahora',
        cycleLabel: form.level === 'Licenciatura' ? 'Semestre' : 'Cuatrimestre',
        currentCycle: 0,
        careerId: sourceProgram?.careerId || sourceProgram?.mnemonic || form.mnemonic,
        accent: sourceProgram ? sourceProgram.accent : 'from-blue-600 to-amber-500',
        ...form,
      }
      setPrograms((items) => [savedProgram, ...items])
      setActiveProgram(savedProgram)

      if (sourceProgram) {
        const { clonedSubjects } = curriculum.copyPlanContent(sourceProgram, savedProgram, true)
        const assignedClones = clonedSubjects.filter((item) => item.programId === savedProgram.id)
        setToast(`Se creó "${savedProgram.plan}" duplicando ${assignedClones.length} materias del plan base.`)
        navigate(`/mapas/${savedProgram.id}`)
        return
      }
    }

    const addedSubjects = curriculum.ensureDeanerySubjects(savedProgram)
    const action = editingProgram ? 'El programa y su nueva configuración quedaron guardados.' : 'Se creó el programa de demostración.'
    setToast(addedSubjects.length ? `${action} Se asignaron ${addedSubjects.length} materias preestablecidas.` : action)
    navigate('/programas')
  }

  const openSubjectModal = (modal) => {
    curriculum.clearError()
    setSubjectModal(modal)
  }

  const saveSubject = async (saved) => {
    const modal = subjectModal
    if (!activeProgram || modal?.readOnly) return
    const result = await curriculum.saveSubject(activeProgram.id, saved, { source: modal.source })
    if (result) setSubjectModal((current) => current === modal ? null : current)
  }

  const [title, subtitle] = getHeaderMeta(location.pathname)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
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
                onDuplicate={(program) => setDuplicateModalProgram(program)}
              />
            }
          />
          <Route
            path="/programas/nuevo"
            element={
              <ProgramForm
                initial={null}
                programs={programs}
                onCancel={() => navigate('/programas')}
                onSave={(form, sourceProgramId) => saveProgram(form, null, sourceProgramId)}
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
            path="/mapas/:id?"
            element={
              <MapPageWrapper
                programs={programs}
                subjects={subjects}
                electives={electives}
                onSetActiveProgram={setActiveProgram}
                onAddSubject={(cycle) => isCycleEditable(activeProgram, cycle) && openSubjectModal({ subject: null, cycle, source: 'map' })}
                onEditSubject={(subject) => openSubjectModal({ subject, cycle: subject.cycle, source: 'map', readOnly: !isCycleEditable(activeProgram, subject.cycle) })}
                onMoveSubject={(id, cycle) => curriculum.moveSubject(activeProgram.id, id, cycle)}
                onReorderSubject={(id, direction) => curriculum.reorderSubject(activeProgram.id, id, direction)}
                onRemoveSubject={(id) => curriculum.removeSubject(activeProgram.id, id)}
                onAssignSubject={(key, cycle) => curriculum.assignSubject(activeProgram.id, key, cycle)}
                onDropSubject={(id, cycle, targetId, placeAfter) => curriculum.moveSubject(activeProgram.id, id, cycle, targetId, placeAfter)}
                onDuplicate={(program) => setDuplicateModalProgram(program)}
                onExport={(program) => setExportProgram(program)}
                onNotify={setToast}
                onUpdateStatus={updateProgramStatus}
                statusPending={statusPending}
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
                onEdit={(subject) => {
                  if (!subject && isPlanReadOnly(activeProgram)) return
                  openSubjectModal({ subject, cycle: subject?.cycle || 7, source: 'catalog', readOnly: isPlanReadOnly(activeProgram) || Boolean(subject?.programId === activeProgram?.id && !isCycleEditable(activeProgram, subject.cycle)) })
                }}
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
          source={subjectModal.source}
          pending={Boolean(curriculum.pending)}
          saveError={curriculum.error}
          readOnly={subjectModal.readOnly || isPlanReadOnly(activeProgram)}
          subjects={[
            ...subjects.filter((subject) => belongsToProgram(subject, activeProgram?.id)),
            ...electives.filter((subject) => (subject.programId || initialProgramId) === activeProgram?.id),
          ]}
          onClose={() => setSubjectModal(null)}
          onSave={saveSubject}
        />
      )}
      {duplicateModalProgram && (
        <DuplicateProgramModal
          key={duplicateModalProgram.id}
          open
          program={duplicateModalProgram}
          existingPrograms={programs}
          subjectCount={subjects.filter((item) => item.programId === duplicateModalProgram.id).length}
          electiveCount={electives.filter((item) => (item.programId || initialProgramId) === duplicateModalProgram.id).length}
          onClose={() => setDuplicateModalProgram(null)}
          onDuplicate={duplicateProgram}
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
