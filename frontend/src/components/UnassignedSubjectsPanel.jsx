import { useMemo, useState } from 'react'
import Icon from './Icon'

const normalizeSearch = (value) => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-MX')

export default function UnassignedSubjectsPanel({ assignedSubjects, availableSubjects, onClose, onUnassign, fullHeight = false }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [isDropTarget, setIsDropTarget] = useState(false)

  const subjects = useMemo(() => {
    const assignedKeys = new Set(assignedSubjects.map((subject) => subject.key).filter(Boolean))
    const catalog = availableSubjects.reduce((items, subject) => {
      const current = items.get(subject.key)
      if (!current || (current.catalogAssignment && !subject.catalogAssignment)) items.set(subject.key, subject)
      return items
    }, new Map())

    return [...catalog.values()]
      .filter((subject) => !assignedKeys.has(subject.key))
      .filter((subject) => !type || subject.type === type)
      .filter((subject) => normalizeSearch(subject.name).includes(normalizeSearch(search.trim())))
      .sort((a, b) => Number(Boolean(b.core)) - Number(Boolean(a.core)) || a.name.localeCompare(b.name, 'es'))
  }, [assignedSubjects, availableSubjects, search, type])

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDropTarget(true)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDropTarget(false)
    const [source, id] = event.dataTransfer.getData('text/plain').split(':')
    if (source === 'map' && id) onUnassign(id)
  }

  return (
    <section onDragOver={handleDragOver} onDragLeave={() => setIsDropTarget(false)} onDrop={handleDrop} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isDropTarget ? 'border-[#A6192E] ring-2 ring-red-200' : 'border-slate-200'} ${fullHeight ? 'flex h-full flex-col' : ''}`}>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon name="book" size={14} /></span><h3 className="text-sm font-bold text-slate-900">Materias disponibles</h3></div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Aún no asignadas a este programa.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Ocultar materias disponibles" title="Ocultar materias disponibles" className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200"><Icon name="x" size={13} /></button>
        </div>

        <label className="relative mt-3 block"><Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[11px] outline-none transition focus:border-blue-400 focus:bg-white" placeholder="Buscar materia..." /></label>
        <label className="relative mt-2 block"><select value={type} onChange={(event) => setType(event.target.value)} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[11px] font-medium text-slate-600 outline-none focus:border-blue-400"><option value="">Todos los tipos</option><option value="Obligatoria">Obligatorias</option><option value="Optativa">Optativas</option></select><Icon name="chevronDown" size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></label>
      </div>

      <div className={`min-h-32 overflow-y-auto overscroll-contain p-2 ${fullHeight ? 'min-h-0 flex-1' : 'max-h-[calc(100vh-330px)]'}`}>
        <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-400">{subjects.length} {subjects.length === 1 ? 'materia encontrada' : 'materias encontradas'}</p>
        {isDropTarget && <p className="mx-2 mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-[10px] font-semibold text-red-700">Suelta aquí para quitarla del mapa</p>}
        {subjects.length ? subjects.map((subject) => (
          <article key={subject.key || subject.id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', `available:${subject.key}`); event.dataTransfer.effectAllowed = 'all' }} className="cursor-grab rounded-xl p-3 transition hover:bg-slate-50 active:cursor-grabbing">
            <div className="flex items-start gap-2"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${subject.type === 'Optativa' ? 'bg-violet-500' : 'bg-blue-500'}`} /><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold leading-snug text-slate-800">{subject.name}</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${subject.type === 'Optativa' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{subject.type}</span>{subject.core && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">Núcleo</span>}<span className="text-[9px] text-slate-400">{subject.credits} créditos</span><Icon name="grip" size={12} className="ml-auto text-slate-300" /></div></div></div>
          </article>
        )) : <div className="grid min-h-24 place-items-center px-5 text-center"><p className="text-[11px] leading-relaxed text-slate-400">No hay materias que coincidan con los filtros.</p></div>}
      </div>
    </section>
  )
}
