import Icon from './Icon'

const navItems = [
  { id: 'programs', label: 'Programas', icon: 'grid' },
  { id: 'map', label: 'Mapas curriculares', icon: 'map' },
  { id: 'catalog', label: 'Catálogo de asignaturas', icon: 'book' },
  { id: 'config', label: 'Configuración', icon: 'settings' },
  { id: 'exports', label: 'Exportaciones', icon: 'export' },
]

export default function Sidebar({ currentPage, onNavigate, open, onClose }) {
  return (
    <>
      {open && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-slate-200 bg-[#f8fafc] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#173b69] text-white shadow-sm">
            <Icon name="school" size={22} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-slate-900">Mapa Académico</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Gestión curricular</p>
          </div>
        </div>

        <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Navegación</div>
        <nav className="mt-3 space-y-1" aria-label="Navegación principal">
          {navItems.map((item) => {
            const active = currentPage === item.id || (currentPage === 'programForm' && item.id === 'programs')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onNavigate(item.id); onClose() }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-[#e8f0fb] text-[#173b69]' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'}`}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-[#245a96]' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="flex-1">{item.label}</span>
                {item.id === 'map' && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">4</span>}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Datos de demostración
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Los cambios viven solo en esta sesión. No hay conexión con servicios externos.</p>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-200 px-2 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#173b69] text-xs font-bold text-white">AG</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">Ana González</p>
            <p className="truncate text-[11px] text-slate-400">Dirección académica</p>
          </div>
          <Icon name="more" size={17} className="text-slate-400" />
        </div>
      </aside>
    </>
  )
}
