import { useMemo, useState } from 'react'
import ReviewDecisionModal from '../components/ReviewDecisionModal'
import { isPlanReadOnly, statusStyles } from '../utils/planStatus'
import Icon from '../components/Icon'
import CurriculumMap from '../components/CurriculumMap'
import ValidationPanel from '../components/ValidationPanel'
import UnassignedSubjectsPanel from '../components/UnassignedSubjectsPanel'
import { curriculumSummary } from '../utils/validation'

export default function MapPage({ program, subjects, availableSubjects, validations, onAdd, onEdit, onMove, onReorder, onRemove, onAssign, onDropSubject, onDuplicate, onExport, onNotify, onUpdateStatus, statusPending }) {
  const [rejecting, setRejecting] = useState(false)
  const isReadOnly = isPlanReadOnly(program)
  const actionClass = 'flex min-h-9 items-center rounded-xl bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50'
  const [view, setView] = useState('cycles')
  const [activePanel, setActivePanel] = useState('available')
  const summary = useMemo(() => curriculumSummary(subjects), [subjects])
  const errors = validations.filter((item) => item.severity === 'error').length
  const warnings = validations.filter((item) => item.severity === 'warning').length
  const goToSubject = (id) => {
    const found = subjects.find((item) => item.id === id)
    if (found) { setView('cycles'); setActivePanel(null); onEdit(found) }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 font-mono text-[10px] font-bold text-blue-700">{program.mnemonic}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusStyles[program.status]}`}>{program.status}</span><span className="text-xs text-slate-400">{program.plan} · {program.version}</span></div>
            <h2 className="mt-2 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{program.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{program.modality} · {program.deanery} · {program.jurisdiction}</p>
            <p className="mt-2 text-xs text-slate-500">Estado simulado: {program.currentCycle ? `${program.cycleLabel} ${program.currentCycle} en curso` : 'el programa aún no inicia'}. {program.status === 'Borrador' ? 'Borrador: todos los ciclos admiten edición.' : isReadOnly ? 'Mapa protegido en modo de solo lectura.' : 'Solo se pueden modificar ciclos futuros.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {program.status === 'Borrador' && <div>
              <button type="button" disabled={errors > 0 || statusPending} aria-describedby={errors ? 'review-errors' : undefined} title={errors ? `Corrige los ${errors} errores bloqueantes para solicitar revisión` : 'Solicitar dictamen del Decanato'} onClick={() => onUpdateStatus(program.id, 'En revisión')} className={actionClass}>Enviar a revisión</button>
              {errors > 0 && <p id="review-errors" className="mt-1 max-w-64 text-xs text-amber-800">Corrige los {errors} errores bloqueantes para solicitar revisión</p>}
            </div>}
            {program.status === 'En revisión' && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2">
              <p className="mb-2 text-[10px] font-bold uppercase text-indigo-700">Simulación de autoridad académica · Decanato</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={statusPending} onClick={() => onUpdateStatus(program.id, 'Vigente')} className={actionClass}>Aprobar y publicar (Hacer vigente)</button>
                <button type="button" disabled={statusPending} onClick={() => setRejecting(true)} className={actionClass}>Devolver a borrador</button>
              </div>
            </div>}
            {program.status === 'Vigente' && <button type="button" disabled={statusPending} onClick={() => onUpdateStatus(program.id, 'Histórico')} className={actionClass}>Archivar a histórico</button>}
            <button type="button" onClick={() => onDuplicate ? onDuplicate(program) : onNotify('Versión duplicada como borrador v2.4.')} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="copy" size={14} /> {program.status === 'Histórico' ? 'Duplicar a nuevo borrador' : 'Duplicar versión'}</button>
            <button type="button" onClick={() => { setView('validations'); setActivePanel(null) }} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="circleCheck" size={14} /> Validar <span className="rounded-full bg-red-100 px-1.5 text-[9px] text-red-700">{errors}</span></button>
            <button type="button" onClick={onExport} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="export" size={14} /> Exportar</button>
            {!isReadOnly && <button type="button" onClick={() => onNotify('Los cambios del prototipo quedaron guardados en esta sesión.')} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#A6192E] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#841424]"><Icon name="save" size={14} /> Guardar cambios</button>}
          </div>
        </div>
      </section>

      {program.status === 'En revisión' && <div role="status" className="border-b border-indigo-200 bg-indigo-50 px-6 py-4 text-sm font-semibold text-indigo-800">Este plan se encuentra en revisión por el Decanato. El mapa está protegido en modo de solo lectura.</div>}
      {program.status === 'Histórico' && <div role="status" className="border-b border-slate-300 bg-slate-100 px-6 py-4 text-sm font-semibold text-slate-700">Archivo histórico inmutable. Disponible para consulta y exportación. Duplica el plan para crear un nuevo borrador.</div>}
      {program.status === 'Vigente' && <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800">Plan oficial en curso{program.effectiveFrom ? ` · Vigente desde ${new Date(program.effectiveFrom).toLocaleDateString('es-MX')}` : ''}</div>}
      {program.reviewNotes && program.status === 'Borrador' && <div role="note" className="whitespace-pre-wrap border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900"><strong>Observaciones del Decanato:</strong> {program.reviewNotes}</div>}
      {rejecting && <ReviewDecisionModal pending={statusPending} onClose={() => setRejecting(false)} onSubmit={async (metadata) => { const updated = await onUpdateStatus(program.id, 'Borrador', metadata); if (updated) setRejecting(false) }} />}
      <section className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1700px] grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <SummaryItem label="Créditos totales" value={summary.credits.toFixed(1)} note={`${program.minCredits}–${program.maxCredits}`} tone={summary.credits < program.minCredits ? 'amber' : 'green'} />
          <SummaryItem label="Horas docente" value={summary.teacherHours.toLocaleString()} note="acumuladas" />
          <SummaryItem label="Horas independientes" value={summary.independentHours.toLocaleString()} note="acumuladas" />
          <SummaryItem label="Obligatorias" value={summary.required} note="asignaturas" />
          <SummaryItem label="Espacios optativos" value={summary.electiveSlots} note="en el mapa" />
          <SummaryItem label="Avance" value={`${program.progress}%`} note="de validación" tone="green" />
          <SummaryItem label="Advertencias" value={warnings} note="por revisar" tone="amber" />
          <SummaryItem label="Errores" value={errors} note="bloqueantes" tone="red" />
        </div>
      </section>

      <div className="mx-auto max-w-[1760px] px-3 py-4 sm:px-5">
        <div className="sticky top-[72px] z-10 flex flex-col gap-3 border-b border-slate-200 bg-slate-50 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[['cycles', 'Vista por ciclos', 'layers'], ['areas', 'Por área', 'grid'], ['validations', 'Validaciones', 'circleCheck']].map(([id, label, icon]) => <button key={id} type="button" onClick={() => setView(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${view === id ? 'bg-[#A6192E] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Icon name={icon} size={13} /> {label}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-[10px] text-slate-400 2xl:block">{isReadOnly ? 'Selecciona una asignatura para consultarla.' : 'Arrastra asignaturas entre ciclos editables para reorganizarlas.'}</p>
            <button type="button" onClick={() => setActivePanel((current) => current === 'available' ? null : 'available')} aria-pressed={activePanel === 'available'} aria-label={activePanel === 'available' ? 'Ocultar materias disponibles' : 'Mostrar materias disponibles'} title={activePanel === 'available' ? 'Ocultar materias disponibles' : 'Mostrar materias disponibles'} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${activePanel === 'available' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><Icon name={activePanel === 'available' ? 'x' : 'book'} size={13} /> Materias</button>
            <button type="button" onClick={() => setActivePanel((current) => current === 'validation' ? null : 'validation')} aria-pressed={activePanel === 'validation'} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${activePanel === 'validation' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><Icon name="alert" size={13} /> Panel de validación</button>
          </div>
        </div>

        <div className={`mt-3 grid items-start gap-3 ${activePanel && view !== 'validations' ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {view === 'validations' ? (
              <ValidationPanel validations={validations} onGoToSubject={goToSubject} />
            ) : (
              <CurriculumMap
                view={view}
                subjects={subjects}
                program={program}
                onAdd={onAdd}
                onEdit={onEdit}
                onMove={onMove}
                onReorder={onReorder}
                onRemove={onRemove}
                onAssign={onAssign}
                onDropSubject={onDropSubject}
              />
            )}
          </main>
          {activePanel && view !== 'validations' && <aside className="xl:sticky xl:top-[150px] xl:h-[calc(100vh-162px)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">{activePanel === 'available' ? <UnassignedSubjectsPanel isReadOnly={isReadOnly} assignedSubjects={subjects} availableSubjects={availableSubjects} onClose={() => setActivePanel(null)} onUnassign={onRemove} fullHeight /> : <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Validación en vivo</h3><p className="mt-0.5 text-[10px] text-slate-400">Se actualiza al mover o editar</p></div><button type="button" onClick={() => setActivePanel(null)} aria-label="Cerrar panel" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon name="x" size={13} /></button></div><div className="mt-4"><ValidationPanel compact validations={validations} onGoToSubject={goToSubject} /></div></section>}</aside>}
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value, note, tone = 'slate' }) {
  const valueColor = { slate: 'text-slate-900', green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700' }[tone]
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 flex items-end gap-1.5"><span className={`text-lg font-extrabold leading-none ${valueColor}`}>{value}</span><span className="truncate text-[9px] text-slate-400">{note}</span></div></div>
}
