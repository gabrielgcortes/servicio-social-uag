import { useState } from 'react'
import Icon from './Icon'
import SubjectCard from './SubjectCard'

export default function CycleColumn({
  cycle,
  subjects,
  program,
  draggedSubjectId,
  onDragStart,
  onDragEnd,
  onDropSubject,
  onAdd,
  onEdit,
  onMove,
  onReorder,
}) {
  const [isColumnOver, setIsColumnOver] = useState(false)
  const credits = subjects.reduce((sum, item) => sum + Number(item.credits || 0), 0)
  const exceeded = credits > program.maxCycleCredits || subjects.length > program.maxSubjects

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isColumnOver) setIsColumnOver(true)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsColumnOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsColumnOver(false)
    const id = e.dataTransfer.getData('text/plain') || draggedSubjectId
    if (id && onDropSubject) {
      onDropSubject(id, cycle, null, false)
    }
  }

  const isDraggingSource = subjects.some((s) => s.id === draggedSubjectId)

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-[286px] shrink-0 snap-start overflow-hidden rounded-2xl border transition-all duration-200 ${
        isColumnOver
          ? 'border-[#A6192E] bg-[#FBF2F4] ring-2 ring-[#A6192E]/20 shadow-md'
          : 'border-slate-200 bg-slate-100/60'
      }`}
    >
      <header className={`border-b p-3.5 ${exceeded ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{program.cycleLabel}</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{cycleName(cycle)}</h3></div>
          <button type="button" onClick={() => onAdd(cycle)} aria-label={`Añadir al ciclo ${cycle}`} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-[#A6192E] shadow-sm transition hover:border-blue-300 hover:bg-blue-50"><Icon name="plus" size={15} /></button>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[10px] font-medium text-slate-500">
          <span className="flex items-center gap-1"><Icon name="book" size={12} /> {subjects.length}/{program.maxSubjects} materias</span>
          <span className={exceeded ? 'font-bold text-red-600' : ''}>{credits.toFixed(1)}/{program.maxCycleCredits} créditos</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full transition-all duration-300 ${exceeded ? 'bg-red-500' : credits > program.maxCycleCredits * 0.85 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, credits / program.maxCycleCredits * 100)}%` }} /></div>
      </header>
      <div className="space-y-2.5 p-2.5">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            totalCycles={program.cycles}
            isDragging={draggedSubjectId === subject.id}
            draggedSubjectId={draggedSubjectId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDropSubject={onDropSubject}
            onEdit={onEdit}
            onMove={onMove}
            onReorder={onReorder}
          />
        ))}

        {draggedSubjectId && !isDraggingSource && (
          <div
            className={`flex items-center justify-center rounded-xl border-2 border-dashed py-3 transition-colors ${
              isColumnOver
                ? 'border-[#A6192E] bg-white text-[#A6192E] font-bold text-xs shadow-sm'
                : 'border-slate-300 bg-white/40 text-[10px] text-slate-400'
            }`}
          >
            {isColumnOver ? 'Soltar aquí para añadir al ciclo' : `Mover a ciclo ${cycle}`}
          </div>
        )}

        <button type="button" onClick={() => onAdd(cycle)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white/50 py-2.5 text-[10px] font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Icon name="plus" size={13} /> Añadir elemento</button>
      </div>
    </section>
  )
}

function cycleName(number) {
  const names = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno', 'Décimo']
  return `${names[number - 1] || number} ciclo`
}
