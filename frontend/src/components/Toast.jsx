import Icon from './Icon'

export default function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-slate-900/15" role="status">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={17} /></span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">Acción completada</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{message}</p>
      </div>
      <button aria-label="Cerrar notificación" onClick={onClose} className="text-slate-400 hover:text-slate-700"><Icon name="x" size={16} /></button>
    </div>
  )
}
