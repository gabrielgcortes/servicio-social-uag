import { useState } from 'react'
import Icon from './Icon'

const areaColor = {
  Universitaria: 'bg-violet-100 text-violet-700',
  Básica: 'bg-sky-100 text-sky-700',
  Disciplinar: 'bg-blue-100 text-blue-700',
  Profesional: 'bg-emerald-100 text-emerald-700',
  Fundamental: 'bg-violet-100 text-violet-700',
}

export default function SubjectCard({
  subject,
  totalCycles,
  isDragging,
  draggedSubjectId,
  onDragStart,
  onDragEnd,
  onDropSubject,
  onEdit,
  onMove,
  onReorder,
}) {
  const [menu, setMenu] = useState(false)
  const [dropPosition, setDropPosition] = useState(null)
  const elective = subject.isElectiveSlot

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', subject.id)
    e.dataTransfer.effectAllowed = 'move'
    if (onDragStart) onDragStart(subject.id)
  }

  const handleDragEnd = () => {
    setDropPosition(null)
    if (onDragEnd) onDragEnd()
  }

  const handleDragOver = (e) => {
    if (!draggedSubjectId || draggedSubjectId === subject.id) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const pos = e.clientY < midY ? 'top' : 'bottom'
    if (dropPosition !== pos) setDropPosition(pos)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropPosition(null)
    }
  }

  const handleDrop = (e) => {
    if (!draggedSubjectId || draggedSubjectId === subject.id) return
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('text/plain') || draggedSubjectId
    const placeAfter = dropPosition === 'bottom'
    setDropPosition(null)
    if (id && id !== subject.id && onDropSubject) {
      onDropSubject(id, subject.cycle, subject.id, placeAfter)
    }
  }

  return (
    <article
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-xl border p-3 shadow-sm transition select-none ${
        isDragging
          ? 'opacity-35 scale-[0.98] border-dashed border-[#A6192E] ring-2 ring-red-200 cursor-grabbing bg-red-50/50'
          : elective
          ? 'border-dashed border-amber-300 bg-amber-50/80 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md'
          : 'border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* Drop position indicators */}
      {dropPosition === 'top' && (
        <div className="absolute -top-1.5 left-1 right-1 h-1 rounded-full bg-[#A6192E] ring-2 ring-red-200 z-30 pointer-events-none animate-pulse" />
      )}
      {dropPosition === 'bottom' && (
        <div className="absolute -bottom-1.5 left-1 right-1 h-1 rounded-full bg-[#A6192E] ring-2 ring-red-200 z-30 pointer-events-none animate-pulse" />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(subject)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEdit(subject) }}
        className="block w-full text-left focus:outline-none cursor-pointer"
        aria-label={`Editar ${subject.name}`}
      >
        <div className="flex items-start gap-2">
          <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${elective ? 'bg-amber-200/60 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{subject.key || 'SIN CLAVE'}</span>
          {subject.prerequisite && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-blue-700">← {subject.prerequisite}</span>}
          <span className="ml-auto text-[9px] font-semibold text-slate-400">{subject.type}</span>
          <span className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing transition" title="Arrastra para mover de ciclo o reordenar">
            <Icon name="grip" size={13} />
          </span>
        </div>
        <h4 className="mt-2.5 min-h-[34px] text-[11px] font-bold leading-[1.45] text-slate-800">{subject.name}</h4>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${areaColor[subject.area] || 'bg-slate-100 text-slate-600'}`}>{subject.area}</span>
          {subject.capstone && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-bold text-indigo-700">CAPSTONE</span>}
          {subject.practice && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[8px] font-bold text-orange-700">PRÁCTICA</span>}
          {subject.substantial && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[8px] font-bold text-rose-700">APORTE</span>}
          {subject.core && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[8px] font-bold text-teal-700">NÚCLEO</span>}
        </div>
        <div className="mt-3 grid grid-cols-4 divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center">
          <Metric label="HD" value={subject.teacherHours} />
          <Metric label="HI" value={subject.independentHours} />
          <Metric label="CR" value={subject.credits} />
          <Metric label="AULA" value={subject.room} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex gap-0.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onReorder(subject.id, -1); }} aria-label="Mover arriba" className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="arrowUp" size={12} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onReorder(subject.id, 1); }} aria-label="Mover abajo" className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="arrowDown" size={12} /></button>
        </div>
        <div className="relative">
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu((value) => !value); }} className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-100"><Icon name="move" size={11} /> Mover</button>
          {menu && <div className="absolute bottom-7 right-0 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"><p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Mover a ciclo</p>{Array.from({ length: totalCycles }, (_, index) => index + 1).map((cycle) => <button key={cycle} type="button" disabled={cycle === subject.cycle} onClick={(e) => { e.stopPropagation(); onMove(subject.id, cycle); setMenu(false); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] text-slate-600 hover:bg-blue-50 disabled:opacity-30">Ciclo {cycle}</button>)}</div>}
        </div>
      </div>
    </article>
  )
}

function Metric({ label, value }) { return <div className="py-1.5"><p className="text-[7px] font-bold text-slate-400">{label}</p><p className="mt-0.5 text-[9px] font-bold text-slate-700">{value}</p></div> }
