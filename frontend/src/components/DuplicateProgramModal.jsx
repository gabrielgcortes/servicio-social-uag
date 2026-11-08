import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon'
import { suggestNextPlanName } from '../utils/cycleStatus'

const fieldClass = 'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50'

export default function DuplicateProgramModal({
  open,
  program,
  existingPrograms = [],
  subjectCount = 0,
  electiveCount = 0,
  onClose,
  onDuplicate,
}) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const pressedOutsideRef = useRef(false)

  const existingPlansForSameCareer = existingPrograms
    .filter((item) => item.mnemonic === program?.mnemonic || item.name === program?.name)
    .map((item) => item.plan)

  const [form, setForm] = useState(() => ({
    name: program?.name || '',
    plan: suggestNextPlanName(program?.plan, existingPlansForSameCareer),
    version: 'v1.0',
  }))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  if (!open || !program) return null

  const isOutside = (event, dialog) => {
    const rect = dialog.getBoundingClientRect()
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
  }

  const handlePointerDown = (event) => {
    if ('closedBy' in HTMLDialogElement.prototype) return
    const dialog = dialogRef.current
    if (dialog) {
      pressedOutsideRef.current = isOutside(event, dialog)
    }
  }

  const handlePointerUp = (event) => {
    if ('closedBy' in HTMLDialogElement.prototype) return
    const dialog = dialogRef.current
    if (dialog && pressedOutsideRef.current && isOutside(event, dialog)) {
      dialog.close()
    }
    pressedOutsideRef.current = false
  }

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const isDuplicatePlanKey = existingPrograms.some(
    (item) =>
      (item.mnemonic === program.mnemonic || item.name.trim().toLowerCase() === form.name.trim().toLowerCase()) &&
      item.plan.trim().toLowerCase() === form.plan.trim().toLowerCase()
  )

  const handleSubmit = (event, openMapAfter = true) => {
    event.preventDefault()
    if (!form.name.trim() || !form.plan.trim()) return
    onDuplicate(
      program,
      {
        name: form.name.trim(),
        plan: form.plan.trim(),
        version: form.version.trim() || 'v1.0',
      },
      openMapAfter
    )
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...{ closedby: 'any' }}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = ''
        onClose()
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl"
    >
      <form onSubmit={(event) => handleSubmit(event, true)}>
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">Clonación de plan curricular</p>
            <h2 id={titleId} className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Duplicar programa y materias
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Crea el nuevo plan copiando íntegramente las materias, seriaciones y semestres del plan base.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <Icon name="x" size={17} />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Programa origen</span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#A6192E] shadow-xs">
                {program.mnemonic} · {program.plan}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900">{program.name}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
              <span className="rounded-lg bg-white px-2.5 py-1 shadow-xs">
                {subjectCount} asignaturas en el mapa
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 shadow-xs">
                {program.cycles} {program.cycleLabel.toLowerCase()}s
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 shadow-xs">
                {electiveCount} optativas en catálogo
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Clave del nuevo plan</span>
              <input
                required
                autoFocus
                value={form.plan}
                onChange={(event) => set('plan', event.target.value)}
                className={fieldClass}
                placeholder="Ej. Plan 2026"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Versión</span>
              <input
                required
                value={form.version}
                onChange={(event) => set('version', event.target.value)}
                className={fieldClass}
                placeholder="Ej. v1.0"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-slate-700">Nombre de la carrera / programa</span>
              <input
                required
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {isDuplicatePlanKey && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
              <Icon name="alert" size={15} className="shrink-0" />
              <span>Ya existe un programa con la clave “{form.plan}”. Te recomendamos usar un año o identificador distinto.</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-800">
            <strong>¿Qué se copiará?</strong> Todas las materias obligatorias, espacios optativos, seriaciones, créditos y reglas del programa quedarán en los mismos semestres en estado <strong>Borrador</strong> para que puedas modificar cualquier ciclo libremente.
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(event) => handleSubmit(event, false)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Icon name="copy" size={14} /> Duplicar y ver lista
          </button>
          <button
            type="submit"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#A6192E] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#841424]"
          >
            <Icon name="copy" size={14} /> Duplicar y abrir mapa
          </button>
        </footer>
      </form>
    </dialog>
  )
}
