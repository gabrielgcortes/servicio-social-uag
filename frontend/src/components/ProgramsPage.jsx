import { useMemo, useState } from 'react'
import Icon from './Icon'
import ProgramCard from './ProgramCard'

export default function ProgramsPage({ programs, onOpen, onEdit, onCreate }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ level: '', modality: '', deanery: '', status: '' })
  const filtered = useMemo(() => programs.filter((program) => {
    const text = `${program.name} ${program.mnemonic} ${program.plan}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (!filters.level || program.level === filters.level) && (!filters.modality || program.modality === filters.modality) && (!filters.deanery || program.deanery === filters.deanery) && (!filters.status || program.status === filters.status)
  }), [programs, search, filters])

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Portafolio académico</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Mis programas</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Administra versiones, revisa el avance normativo y continúa trabajando en tus mapas curriculares.</p>
        </div>
        <button type="button" onClick={onCreate} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173b69] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#214f87] focus:outline-none focus:ring-4 focus:ring-blue-200">
          <Icon name="plus" size={17} /> Crear programa
        </button>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar programas</span>
            <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="Buscar por nombre, mnemónico o plan..." />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FilterSelect label="Nivel" value={filters.level} options={['Licenciatura', 'Especialidad', 'Maestría', 'Doctorado']} onChange={(value) => updateFilter('level', value)} />
            <FilterSelect label="Modalidad" value={filters.modality} options={['Escolarizada', 'No escolarizada', 'Mixta']} onChange={(value) => updateFilter('modality', value)} />
            <FilterSelect label="Decanato" value={filters.deanery} options={[...new Set(programs.map((item) => item.deanery))]} onChange={(value) => updateFilter('deanery', value)} />
            <FilterSelect label="Estado" value={filters.status} options={['Vigente', 'Borrador', 'En revisión']} onChange={(value) => updateFilter('status', value)} />
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{filtered.length} de {programs.length} programas</p>
        <button type="button" onClick={() => { setSearch(''); setFilters({ level: '', modality: '', deanery: '', status: '' }) }} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Limpiar filtros</button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {filtered.map((program) => <ProgramCard key={program.id} program={program} onOpen={onOpen} onEdit={onEdit} />)}
      </div>
      {filtered.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center"><Icon name="search" size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No encontramos programas</p><p className="mt-1 text-xs text-slate-400">Prueba con otros filtros o términos de búsqueda.</p></div>}
    </div>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
        <option value="">{label}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <Icon name="chevronDown" size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  )
}
