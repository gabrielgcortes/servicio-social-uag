import { useMemo, useState } from 'react'
import Icon from './Icon'

const styles = {
  error: { icon: 'alert', label: 'Error bloqueante', wrap: 'border-red-200 bg-red-50/70', iconWrap: 'bg-red-100 text-red-700', text: 'text-red-800' },
  warning: { icon: 'alert', label: 'Advertencia', wrap: 'border-amber-200 bg-amber-50/70', iconWrap: 'bg-amber-100 text-amber-700', text: 'text-amber-800' },
  recommendation: { icon: 'info', label: 'Recomendación', wrap: 'border-blue-200 bg-blue-50/70', iconWrap: 'bg-blue-100 text-blue-700', text: 'text-blue-800' },
}

export default function ValidationPanel({ validations, compact = false, onGoToSubject }) {
  const [severity, setSeverity] = useState('all')
  const [cycle, setCycle] = useState('all')
  const filtered = useMemo(() => validations.filter((item) => (severity === 'all' || item.severity === severity) && (cycle === 'all' || String(item.cycle) === cycle)), [validations, severity, cycle])
  const counts = validations.reduce((acc, item) => ({ ...acc, [item.severity]: (acc[item.severity] || 0) + 1 }), {})
  return (
    <div className={compact ? '' : 'p-4 sm:p-6'}>
      {!compact && <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h3 className="text-xl font-bold text-slate-950">Validaciones del plan</h3><p className="mt-1 text-sm text-slate-500">Prioriza los errores bloqueantes antes de solicitar aprobación.</p></div><div className="flex gap-2"><SummaryBadge tone="red" value={counts.error || 0} label="Errores" /><SummaryBadge tone="amber" value={counts.warning || 0} label="Advertencias" /><SummaryBadge tone="blue" value={counts.recommendation || 0} label="Sugerencias" /></div></div>}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-6 border-y border-slate-200 py-3'}`}>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none"><option value="all">Todos los tipos</option><option value="error">Errores</option><option value="warning">Advertencias</option><option value="recommendation">Recomendaciones</option></select>
        <select value={cycle} onChange={(event) => setCycle(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none"><option value="all">Todos los ciclos</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((number) => <option key={number} value={number}>Ciclo {number}</option>)}</select>
      </div>
      <div className={`${compact ? 'mt-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1' : 'mt-4 grid gap-3 lg:grid-cols-2'} space-y-3 lg:space-y-0`}>
        {filtered.map((item) => {
          const style = styles[item.severity]
          return <article key={item.id} className={`rounded-xl border p-3.5 ${style.wrap}`}><div className="flex gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${style.iconWrap}`}><Icon name={style.icon} size={15} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-1.5"><p className={`text-[9px] font-bold uppercase tracking-wide ${style.text}`}>{style.label}</p>{item.demo && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">Escenario demo</span>}</div><h4 className="mt-0.5 text-xs font-bold text-slate-900">{item.title}</h4></div>{item.cycle && <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-slate-500">Ciclo {item.cycle}</span>}</div><p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{item.detail}</p><div className="mt-2 flex items-center justify-between"><code className="text-[8px] font-semibold text-slate-400">{item.code}</code>{item.subjectId && <button type="button" onClick={() => onGoToSubject?.(item.subjectId)} className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900">Ir a la asignatura <Icon name="chevronRight" size={11} /></button>}</div></div></div></article>
        })}
        {filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center"><Icon name="circleCheck" size={25} className="mx-auto text-emerald-500" /><p className="mt-2 text-xs font-semibold text-slate-700">Sin incidencias para este filtro</p></div>}
      </div>
    </div>
  )
}

function SummaryBadge({ tone, value, label }) { const color = { red: 'bg-red-50 text-red-700 ring-red-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200', blue: 'bg-blue-50 text-blue-700 ring-blue-200' }[tone]; return <div className={`rounded-xl px-3 py-2 text-center ring-1 ${color}`}><p className="text-base font-extrabold leading-none">{value}</p><p className="mt-1 text-[9px] font-semibold">{label}</p></div> }
