import { useMemo, useState } from 'react'
import Icon from './Icon'
import CurriculumMap from './CurriculumMap'
import ValidationPanel from './ValidationPanel'
import { curriculumSummary } from '../utils/validation'

export default function MapPage({ program, subjects, validations, onAdd, onEdit, onMove, onReorder, onExport, onNotify }) {
  const [view, setView] = useState('cycles')
  const [panel, setPanel] = useState(false)
  const summary = useMemo(() => curriculumSummary(subjects), [subjects])
  const errors = validations.filter((item) => item.severity === 'error').length
  const warnings = validations.filter((item) => item.severity === 'warning').length
  const goToSubject = (id) => {
    const found = subjects.find((item) => item.id === id)
    if (found) { setView('cycles'); setPanel(false); onEdit(found) }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 font-mono text-[10px] font-bold text-blue-700">{program.mnemonic}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">{program.status}</span><span className="text-xs text-slate-400">{program.plan} · {program.version}</span></div>
            <h2 className="mt-2 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{program.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{program.modality} · {program.deanery} · {program.jurisdiction}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNotify('Versión duplicada como borrador v2.4.')} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="copy" size={14} /> Duplicar versión</button>
            <button type="button" onClick={() => { setView('validations'); setPanel(false) }} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="circleCheck" size={14} /> Validar <span className="rounded-full bg-red-100 px-1.5 text-[9px] text-red-700">{errors}</span></button>
            <button type="button" onClick={onExport} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon name="export" size={14} /> Exportar</button>
            <button type="button" onClick={() => onNotify('Los cambios del prototipo quedaron guardados en esta sesión.')} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#A6192E] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#841424]"><Icon name="save" size={14} /> Guardar cambios</button>
          </div>
        </div>
      </section>

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[['cycles', 'Vista por ciclos', 'layers'], ['areas', 'Por área', 'grid'], ['validations', 'Validaciones', 'circleCheck']].map(([id, label, icon]) => <button key={id} type="button" onClick={() => setView(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${view === id ? 'bg-[#A6192E] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Icon name={icon} size={13} /> {label}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-[10px] text-slate-400 sm:block">Usa “Mover” o las flechas para reorganizar las asignaturas.</p>
            <button type="button" onClick={() => setPanel((value) => !value)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${panel ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><Icon name="alert" size={13} /> Panel de validación</button>
          </div>
        </div>

        <div className={`mt-3 grid gap-3 ${panel && view !== 'validations' ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {view === 'validations' ? <ValidationPanel validations={validations} onGoToSubject={goToSubject} /> : <CurriculumMap view={view} subjects={subjects} program={program} onAdd={onAdd} onEdit={onEdit} onMove={onMove} onReorder={onReorder} />}
          </main>
          {panel && view !== 'validations' && <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Validación en vivo</h3><p className="mt-0.5 text-[10px] text-slate-400">Se actualiza al mover o editar</p></div><button type="button" onClick={() => setPanel(false)} aria-label="Cerrar panel" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon name="x" size={13} /></button></div><div className="mt-4"><ValidationPanel compact validations={validations} onGoToSubject={goToSubject} /></div></aside>}
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value, note, tone = 'slate' }) {
  const valueColor = { slate: 'text-slate-900', green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700' }[tone]
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 flex items-end gap-1.5"><span className={`text-lg font-extrabold leading-none ${valueColor}`}>{value}</span><span className="truncate text-[9px] text-slate-400">{note}</span></div></div>
}
