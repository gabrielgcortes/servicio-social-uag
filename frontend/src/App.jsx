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
import { initialMockValidations, initialProgramId, initialSubjects, ownElectives, programs as demoPrograms } from './data/mockData'
import { createMissingDeanerySubjects } from './data/deaneryRequirements'
import { validateCurriculum } from './utils/validation'
import { createPlanService } from './services/planService'
import { applyPlanUpdate, isPlanReadOnly } from './utils/planStatus'
import { belongsToProgram, upsertCatalogSubject } from './utils/subjectCatalog'
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
  onDuplicate,
  onExport,
  onNotify,
  onUpdateStatus,
  statusPending,
}) {
  const { id } = useParams()
  const program = programs.find((item) => item.id === id) || programs[0]
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

  if (!program) {
    return <Navigate to="/programas" replace />
  }

  return (
    <MapPage
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
    />
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [programs, setPrograms] = useState(demoPrograms)
  const [activeProgramId, setActiveProgramId] = useState(demoPrograms[0]?.id)
  const activeProgram = programs.find((program) => program.id === activeProgramId)
  const setActiveProgram = useCallback((program) => setActiveProgramId(program?.id), [])
  const [subjects, setSubjects] = useState(initialSubjects)
  const [electives, setElectives] = useState(() => assignLegacyElectiveOwnership(ownElectives))
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [subjectModal, setSubjectModal] = useState(null)
  const [exportProgram, setExportProgram] = useState(null)
  const [duplicateModalProgram, setDuplicateModalProgram] = useState(null)
  const [toast, setToast] = useState('')
  const [statusPending, setStatusPending] = useState(false)
  const mutationLock = useRef(false)
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

  const cloneProgramSubjectsAndElectives = (sourceProgram, newProgram) => {
    const remapKey = (key) => {
      if (!key) return key
      if (newProgram.mnemonic && sourceProgram.mnemonic && newProgram.mnemonic !== sourceProgram.mnemonic && key.startsWith(sourceProgram.mnemonic)) {
        return `${newProgram.mnemonic}${key.slice(sourceProgram.mnemonic.length)}`
      }
      return key
    }

    const clonedSubjects = subjects
      .filter((item) => belongsToProgram(item, sourceProgram.id))
      .map((item, index) => ({
        ...item,
        id: `${newProgram.id}-subj-${index + 1}-${Date.now()}`,
        programId: item.programId ? newProgram.id : null,
        ownerProgramId: newProgram.id,
        key: remapKey(item.key),
        prerequisite: remapKey(item.prerequisite),
      }))

    const clonedElectives = electives
      .filter((item) => (item.programId || initialProgramId) === sourceProgram.id)
      .map((item, index) => ({
        ...item,
        id: `${newProgram.id}-elec-${index + 1}-${Date.now()}`,
        programId: newProgram.id,
        key: remapKey(item.key),
        prerequisite: remapKey(item.prerequisite),
      }))

    return { clonedSubjects, clonedElectives }
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

    const { clonedSubjects, clonedElectives } = cloneProgramSubjectsAndElectives(sourceProgram, newProgram)
    setPrograms((items) => [newProgram, ...items])
    setSubjects((items) => [...items, ...clonedSubjects])
    setElectives((items) => [...items, ...clonedElectives])
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
        const { clonedSubjects, clonedElectives } = cloneProgramSubjectsAndElectives(sourceProgram, savedProgram)
        const assignedClones = clonedSubjects.filter((item) => item.programId === savedProgram.id)
        const extraDeanery = createMissingDeanerySubjects(savedProgram, assignedClones)
        setSubjects((items) => [...items, ...clonedSubjects, ...extraDeanery])
        setElectives((items) => [...items, ...clonedElectives])
        setToast(`Se creó "${savedProgram.plan}" duplicando ${assignedClones.length} materias del plan base.`)
        navigate(`/mapas/${savedProgram.id}`)
        return
      }
    }

    const assignedSubjects = subjects.filter((subject) => subject.programId === savedProgram.id)
    const addedSubjects = isPlanReadOnly(savedProgram) ? [] : createMissingDeanerySubjects(savedProgram, assignedSubjects)
    if (addedSubjects.length) setSubjects((items) => [...items, ...addedSubjects])
    const action = editingProgram ? 'El programa y su nueva configuración quedaron guardados.' : 'Se creó el programa de demostración.'
    setToast(addedSubjects.length ? `${action} Se asignaron ${addedSubjects.length} materias preestablecidas.` : action)
    navigate('/programas')
  }

  const saveSubject = (saved) => {
    if (!activeProgram || isPlanReadOnly(activeProgram) || subjectModal?.readOnly) {
      setToast('Este plan está protegido en modo de solo lectura.')
      return
    }
    const original = subjects.find((item) => item.id === saved.id && item.programId === activeProgram?.id)
    if ((original && !isCycleEditable(activeProgram, original.cycle)) ||
        ((subjectModal.source === 'map' || original) && !isCycleEditable(activeProgram, saved.cycle))) {
      setToast('Solo se pueden modificar ciclos futuros.')
      return
    }
    if (subjectModal.source === 'map' && saved.type === 'Optativa' && !saved.isElectiveSlot) {
      setToast('Las materias optativas se administran en el catálogo; en el mapa agrega un espacio optativo.')
      return
    }
    if (subjectModal.source === 'catalog' && saved.isElectiveSlot) {
      setToast('Los espacios optativos se administran exclusivamente desde el mapa curricular.')
      return
    }

    if (subjectModal.source === 'catalog') {
      const exists = electives.some((item) => item.id === saved.id)
      if (exists || saved.type === 'Optativa') {
        const savedForProgram = { ...saved, programId: activeProgram?.id }
        setElectives((items) =>
          exists ? items.map((item) => (item.id === saved.id ? savedForProgram : item)) : [...items, savedForProgram]
        )
      } else {
        setSubjects((items) => upsertCatalogSubject(items, saved, activeProgram.id))
      }
    } else {
      setSubjects((items) =>
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, { ...saved, programId: activeProgram?.id }]
      )
    }
    setSubjectModal(null)
    setToast(subjectModal.source === 'catalog' && !original && saved.type !== 'Optativa'
      ? 'Asignatura guardada en el catálogo de la carrera. Asígnala al mapa desde Materias disponibles para que cuente en la validación.'
      : 'La asignatura se actualizó y las validaciones fueron recalculadas.')
  }

  const moveSubject = (id, cycle) => {
    const moved = subjects.find((item) => item.id === id)
    if (!moved || !isCycleEditable(activeProgram, moved.cycle) || !isCycleEditable(activeProgram, cycle)) {
      setToast('Solo se pueden mover materias entre ciclos futuros.')
      return
    }
    setSubjects((items) => items.map((item) => (item.id === id ? { ...item, cycle } : item)))
    setToast(`${moved?.name || 'La asignatura'} se movió al ciclo ${cycle}.`)
  }

  const reorderSubject = (id, direction) => {
    const subject = subjects.find((item) => item.id === id)
    if (!subject || !isCycleEditable(activeProgram, subject.cycle)) return
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
    if (!isCycleEditable(activeProgram, removed.cycle)) {
      setToast('Solo se pueden modificar ciclos futuros.')
      return
    }
    setSubjects((items) => removed.catalogAssignment
      ? items.filter((item) => String(item.id) !== String(id))
      : items.map((item) => (String(item.id) === String(id) ? { ...item, programId: null, ownerProgramId: item.ownerProgramId || removed.programId } : item))
    )
    setToast(`${removed.name} se quitó del mapa y está disponible para asignarse.`)
  }

  const assignSubject = (key, cycle) => {
    if (!activeProgram) return
    if (!isCycleEditable(activeProgram, cycle)) {
      setToast('Solo se pueden asignar materias a ciclos futuros.')
      return
    }

    const source = subjects
      .filter((item) => !item.isElectiveSlot && item.type !== 'Optativa' && belongsToProgram(item, activeProgram.id))
      .find((item) => item.key === key)
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
    const sourceSubject = subjects.find((item) => String(item.id) === strSubjectId)
    if (!sourceSubject || !isCycleEditable(activeProgram, sourceSubject.cycle) || !isCycleEditable(activeProgram, numericTargetCycle)) {
      setToast('Solo se pueden mover materias entre ciclos futuros.')
      return
    }

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
                electives={electives}
                onSetActiveProgram={setActiveProgram}
                onAddSubject={(cycle) => isCycleEditable(activeProgram, cycle) && setSubjectModal({ subject: null, cycle, source: 'map' })}
                onEditSubject={(subject) => setSubjectModal({ subject, cycle: subject.cycle, source: 'map', readOnly: !isCycleEditable(activeProgram, subject.cycle) })}
                onMoveSubject={moveSubject}
                onReorderSubject={reorderSubject}
                onRemoveSubject={removeSubject}
                onAssignSubject={assignSubject}
                onDropSubject={handleDropSubject}
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
                  setSubjectModal({ subject, cycle: subject?.cycle || 7, source: 'catalog', readOnly: isPlanReadOnly(activeProgram) || Boolean(subject?.programId === activeProgram?.id && !isCycleEditable(activeProgram, subject.cycle)) })
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
