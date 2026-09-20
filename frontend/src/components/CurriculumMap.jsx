import CycleColumn from './CycleColumn'
import SubjectCard from './SubjectCard'

export default function CurriculumMap({ view, subjects, program, onAdd, onEdit, onMove, onReorder }) {
  if (view === 'areas') {
    const areas = [...new Set(subjects.map((item) => item.area))]
    return (
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        {areas.map((area) => {
          const items = subjects.filter((item) => item.area === area)
          return <section key={area} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-900">{area}</p><p className="text-[10px] text-slate-400">{items.length} asignaturas</p></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-500 shadow-sm">{items.reduce((sum, item) => sum + item.credits, 0)} cr.</span></div><div className="space-y-2.5">{items.map((subject) => <SubjectCard key={subject.id} subject={subject} totalCycles={program.cycles} onEdit={onEdit} onMove={onMove} onReorder={onReorder} />)}</div></section>
        })}
      </div>
    )
  }
  return (
    <div className="flex snap-x gap-3 overflow-x-auto p-4 pb-6">
      {Array.from({ length: program.cycles }, (_, index) => index + 1).map((cycle) => <CycleColumn key={cycle} cycle={cycle} subjects={subjects.filter((item) => item.cycle === cycle)} program={program} onAdd={onAdd} onEdit={onEdit} onMove={onMove} onReorder={onReorder} />)}
    </div>
  )
}
