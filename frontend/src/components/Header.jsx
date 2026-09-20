import Icon from './Icon'

export default function Header({ title, subtitle, onMenu, children }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button type="button" aria-label="Abrir menú" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden">
        <Icon name="menu" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h1>
        {subtitle && <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button type="button" aria-label="Notificaciones" className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50">
          <Icon name="bell" size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />
        </button>
      </div>
    </header>
  )
}
