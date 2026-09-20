import { useMemo, useState } from 'react'
import Icon from './Icon'

export default function ExportModal({ open, program, subjects, onClose, onExport }) {
  const sheets = useMemo(() => {
    const flexible = program.jurisdiction === 'Federal' && ['Mixta', 'No escolarizada'].includes(program.modality)
    return flexible ? ['Mapa curricular', 'Flexible'] : ['Mapa curricular', 'Optativas']
  }, [program])
  const [preview, setPreview] = useState(sheets[0])
  if (!open) return null
  const grouped = [...new Set(subjects.map((item) => item.area))].map((area) => ({ area, subjects: subjects.filter((item) => item.area === area).slice(0, 3) }))
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Exportación simulada</p><h2 id="export-title" className="mt-1 text-xl font-bold text-slate-950">Preparar archivo Excel</h2><p className="mt-1 text-xs text-slate-500">{program.name} · {program.plan}</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon name="x" size={17} /></button></header>
        <div className="grid max-h-[calc(92vh-160px)] overflow-y-auto lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Formato</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 font-bold text-emerald-700">XLS</span><div><p className="text-xs font-bold text-slate-800">Libro de Excel</p><p className="text-[9px] text-slate-400">.xlsx · Plantilla institucional</p></div><Icon name="check" size={15} className="ml-auto text-emerald-600" /></div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-wide text-slate-400">Hojas incluidas</p><div className="mt-2 space-y-1">{sheets.map((sheet, index) => <button key={sheet} type="button" onClick={() => setPreview(sheet)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${preview === sheet ? 'bg-[#A6192E] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}><span className={`grid h-6 w-6 place-items-center rounded-md text-[9px] font-bold ${preview === sheet ? 'bg-white/15' : 'bg-slate-200'}`}>{index + 1}</span><span className="text-xs font-semibold">{sheet}</span><Icon name="chevronRight" size={13} className="ml-auto opacity-60" /></button>)}</div>
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-700"><strong>Regla aplicada:</strong><br />{sheets.includes('Flexible') ? 'Programa federal mixto/no escolarizado: se genera hoja Flexible.' : 'Programa federal escolarizado o estatal: se genera hoja Optativas.'}</div>
          </aside>
          <main className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vista previa</p><h3 className="mt-1 text-sm font-bold text-slate-900">Hoja “{preview}”</h3></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">Solo demostración</span></div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
              {preview === 'Flexible' ? <FlexiblePreview grouped={grouped} /> : preview === 'Optativas' ? <OptativesPreview /> : <MapPreview subjects={subjects} />}
            </div>
          </main>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancelar</button><button type="button" onClick={onExport} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"><Icon name="export" size={15} /> Simular exportación</button></footer>
      </div>
    </div>
  )
}

function TableHeader({ labels }) { return <div className={`grid bg-slate-100 text-[8px] font-bold uppercase tracking-wide text-slate-500`} style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>{labels.map((label) => <div key={label} className="border-r border-slate-200 px-2 py-2 last:border-0">{label}</div>)}</div> }
function MapPreview({ subjects }) { return <div><TableHeader labels={['Ciclo', 'Clave', 'Asignatura', 'HD', 'HI', 'Créditos']} />{subjects.slice(0, 8).map((item) => <div key={item.id} className="grid grid-cols-6 border-t border-slate-100 text-[8px] text-slate-600"><span className="p-2">{item.cycle}</span><span className="p-2 font-mono">{item.key || '—'}</span><span className="col-span-1 truncate p-2 font-semibold">{item.name}</span><span className="p-2">{item.teacherHours}</span><span className="p-2">{item.independentHours}</span><span className="p-2">{item.credits}</span></div>)}</div> }
function OptativesPreview() { const names = ['Diseño de experiencias inmersivas', 'Introducción a la robótica', 'Inteligencia emocional', 'Estrategias de aprendizaje']; return <div><TableHeader labels={['Nombre', 'Área', 'Ciclos', 'Tipo']} />{names.map((name, index) => <div key={name} className="grid grid-cols-4 border-t border-slate-100 text-[8px] text-slate-600"><span className="p-2 font-semibold">{name}</span><span className="p-2">Profesional</span><span className="p-2">7, 8</span><span className="p-2">{index < 2 ? 'Propia' : 'Institucional'}</span></div>)}</div> }
function FlexiblePreview({ grouped }) { return <div className="p-3"><div className="rounded-lg bg-[#A6192E] px-3 py-2 text-[9px] font-bold text-white">Trayectoria flexible por área de formación</div>{grouped.slice(0, 3).map((group) => <div key={group.area} className="mt-3"><p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-blue-700">{group.area}</p>{group.subjects.map((item) => <div key={item.id} className="grid grid-cols-[65px_1fr_35px] border-t border-slate-100 py-1.5 text-[8px] text-slate-600"><span className="font-mono">{item.key}</span><span className="font-semibold">{item.name}</span><span>{item.credits} cr.</span></div>)}</div>)}<div className="mt-4 rounded-lg bg-slate-50 p-3 text-[8px] leading-relaxed text-slate-500"><strong>Administración del plan de estudios</strong><br />El plan se integra por asignaturas obligatorias organizadas en una trayectoria flexible, con sus totales reales de horas y créditos.</div></div> }
