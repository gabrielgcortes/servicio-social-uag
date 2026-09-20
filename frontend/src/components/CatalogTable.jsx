import { useMemo, useState } from 'react'
import Icon from './Icon'

export default function CatalogTable({ subjects, electives, institutional, onEdit }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ type: '', area: '', cycle: '', modality: '', flag: '' })
  const [sort, setSort] = useState('key')
  const rows = useMemo(() => [...subjects.filter((item) => !item.isElectiveSlot), ...electives].filter((item) => {
    const matchesSearch = `${item.key} ${item.name}`.toLowerCase().includes(search.toLowerCase())
    const matchesFlag = !filters.flag || (filters.flag === 'capstone' && item.capstone) || (filters.flag === 'practice' && item.practice) || (filters.flag === 'core' && item.core)
    return matchesSearch && (!filters.type || item.type === filters.type) && (!filters.area || item.area === filters.area) && (!filters.cycle || String(item.cycle) === filters.cycle) && (!filters.modality || item.modality === filters.modality) && matchesFlag
  }).sort((a, b) => String(a[sort]).localeCompare(String(b[sort]), 'es', { numeric: true })), [subjects, electives, search, filters, sort])
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="mx-auto max-w-[1550px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Catálogo académico</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Asignaturas y optativas</h2><p className="mt-2 text-sm text-slate-500">Consulta atributos académicos, ciclos disponibles e identificadores especiales.</p></div><button type="button" onClick={() => onEdit(null)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173b69] px-4 text-xs font-semibold text-white"><Icon name="plus" size={15} /> Nueva asignatura</button></div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-3">
          <div className="flex flex-col gap-2 xl:flex-row">
            <label className="relative flex-1"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white" placeholder="Buscar clave o asignatura..." /></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex">
              <Select value={filters.type} onChange={(value) => setFilter('type', value)} label="Tipo" options={['Obligatoria', 'Optativa']} />
              <Select value={filters.area} onChange={(value) => setFilter('area', value)} label="Área" options={['Universitaria', 'Básica', 'Disciplinar', 'Profesional']} />
              <Select value={filters.cycle} onChange={(value) => setFilter('cycle', value)} label="Ciclo" options={['1', '2', '3', '4', '5', '6', '7', '8']} />
              <Select value={filters.modality} onChange={(value) => setFilter('modality', value)} label="Modalidad" options={['Escolarizada', 'No escolarizada', 'Mixta']} />
              <Select value={filters.flag} onChange={(value) => setFilter('flag', value)} label="Identificador" options={['capstone', 'practice', 'core']} labels={{ capstone: 'Capstone', practice: 'Prácticas', core: 'Núcleo' }} />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead><tr className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{[['key', 'Clave'], ['name', 'Asignatura'], ['type', 'Tipo'], ['area', 'Área'], ['cycle', 'Ciclo'], ['hours', 'HD / HI'], ['credits', 'Créditos'], ['room', 'Inst.'], ['flags', 'Indicadores'], ['actions', '']].map(([key, label]) => <th key={key} className="border-b border-slate-200 px-4 py-3">{!['hours', 'flags', 'actions'].includes(key) ? <button type="button" onClick={() => setSort(key)} className="flex items-center gap-1 hover:text-slate-700">{label}{sort === key && <Icon name="arrowDown" size={10} />}</button> : label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.id} className="group text-[11px] text-slate-600 hover:bg-blue-50/40"><td className="px-4 py-3 font-mono font-bold text-blue-700">{item.key}</td><td className="max-w-[280px] px-4 py-3"><p className="font-semibold text-slate-800">{item.name}</p>{item.prerequisite && <p className="mt-0.5 text-[9px] text-slate-400">Requiere {item.prerequisite}</p>}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${item.type === 'Optativa' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.type}</span></td><td className="px-4 py-3">{item.area}</td><td className="px-4 py-3 font-semibold">{item.cycle}</td><td className="px-4 py-3">{item.teacherHours} / {item.independentHours}</td><td className="px-4 py-3 font-bold text-slate-800">{item.credits}</td><td className="px-4 py-3"><span className="grid h-6 w-6 place-items-center rounded bg-slate-100 font-bold">{item.room}</span></td><td className="px-4 py-3"><div className="flex gap-1">{item.capstone && <Tag label="CAP" tone="indigo" />}{item.practice && <Tag label="PRÁC" tone="orange" />}{item.core && <Tag label="NÚC" tone="teal" />}{item.substantial && <Tag label="AS" tone="rose" />}</div></td><td className="px-4 py-3"><button type="button" onClick={() => onEdit(item)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-blue-700 opacity-60 hover:bg-white group-hover:opacity-100">Editar</button></td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] text-slate-500">Mostrando {rows.length} asignaturas</p><button type="button" onClick={() => { setSearch(''); setFilters({ type: '', area: '', cycle: '', modality: '', flag: '' }) }} className="text-[10px] font-bold text-blue-700">Limpiar filtros</button></div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-[#eef5ff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#173b69] text-white"><Icon name="school" size={16} /></span><div><h3 className="text-sm font-bold text-slate-900">Optativas institucionales</h3><p className="text-[10px] text-slate-500">Obligatorias en el catálogo de programas de licenciatura</p></div></div></div><span className="self-start rounded-full bg-white px-3 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-200">{institutional.length} asignaturas</span></div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
          {institutional.map((name, index) => <div key={name} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 text-[11px] text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] font-bold text-blue-700">{String(index + 1).padStart(2, '0')}</span><span className="leading-relaxed">{name}</span></div>)}
        </div>
      </section>
    </div>
  )
}

function Select({ value, onChange, label, options, labels = {} }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 outline-none"><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}</select> }
function Tag({ label, tone }) { const style = { indigo: 'bg-indigo-100 text-indigo-700', orange: 'bg-orange-100 text-orange-700', teal: 'bg-teal-100 text-teal-700', rose: 'bg-rose-100 text-rose-700' }[tone]; return <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${style}`}>{label}</span> }
