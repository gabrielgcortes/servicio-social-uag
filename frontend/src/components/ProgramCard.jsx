import Icon from './Icon'

const statusStyles = {
  Vigente: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Borrador: 'bg-amber-50 text-amber-700 ring-amber-200',
  'En revisión': 'bg-blue-50 text-blue-700 ring-blue-200',
}

export default function ProgramCard({ program, onOpen, onEdit }) {
  const progressColor = program.progress >= 90 ? 'bg-emerald-500' : program.progress >= 75 ? 'bg-blue-600' : 'bg-amber-500'
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70">
      <div className={`h-1.5 bg-gradient-to-r ${program.accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-extrabold text-[#173b69]">{program.mnemonic}</div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusStyles[program.status] || statusStyles.Borrador}`}>{program.status}</span>
        </div>
        <h3 className="mt-4 min-h-12 text-[15px] font-bold leading-snug text-slate-900">{program.name}</h3>
        <p className="mt-1 text-xs text-slate-500">{program.plan} · {program.version}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[program.level, program.modality].map((label) => <span key={label} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label}</span>)}
        </div>
        <p className="mt-3 line-clamp-1 text-[11px] text-slate-400">{program.deanery}</p>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-500">Validación del plan</span>
            <span className="font-bold text-slate-700">{program.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${progressColor}`} style={{ width: `${program.progress}%` }} /></div>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><Icon name="clock" size={13} />{program.updated}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => onEdit(program)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">Editar</button>
              <button type="button" onClick={() => onOpen(program)} className="flex items-center gap-1 rounded-lg bg-[#173b69] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#214f87]">Abrir mapa <Icon name="chevronRight" size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
