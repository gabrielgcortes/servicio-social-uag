import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon'
import { areasByLevel } from '../data/mockData'

const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'

const empty = {
  name: '', type: 'Obligatoria', area: 'Disciplinar', teacherHours: 32, independentHours: 64,
  room: 'A', modality: 'Escolarizada', prerequisite: '', suggestedTeacher: '', programRef: '',
  substantial: false, capstone: false, practice: false, core: false, isElectiveSlot: false,
}

export default function SubjectModal({ open, subject, cycle, program, subjects, onClose, onSave }) {
  const [form, setForm] = useState(() => subject
    ? { ...empty, ...subject, prerequisite: subject.prerequisite || '' }
    : { ...empty, cycle, modality: program.modality, area: areasByLevel[program.level]?.[0] || 'Disciplinar' })
  const [authorized, setAuthorized] = useState(false)
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const credits = useMemo(() => ((Number(form.teacherHours) + Number(form.independentHours)) / 16).toFixed(2).replace('.00', ''), [form.teacherHours, form.independentHours])
  const previewPosition = subjects.filter((item) => !item.isElectiveSlot).length + 1
  const previewKey = form.isElectiveSlot ? 'Sin clave' : subject?.key || `${program.mnemonic}${String(previewPosition).padStart(3, '0')}`
  const minTeacher = program.modality === 'No escolarizada' ? 64 : 32
  const minIndependent = program.modality === 'No escolarizada' ? 80 : 64
  const optativeInvalid = form.type === 'Optativa' && !form.isElectiveSlot && (form.teacherHours < minTeacher || form.independentHours < minIndependent)
  const errors = []
  if (!form.name.trim()) errors.push('Escribe el nombre de la asignatura.')
  if (form.teacherHours % program.weeks !== 0) errors.push(`Las horas con docente deben ser múltiplo de ${program.weeks}.`)
  if (form.prerequisite && form.prerequisite === previewKey) errors.push('Una asignatura no puede ser prerrequisito de sí misma.')

  if (!open) return null
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (errors.length || (optativeInvalid && !authorized)) return
    onSave({ ...form, id: subject?.id || Date.now(), cycle: form.cycle || cycle, key: form.isElectiveSlot ? '' : previewKey, credits: Number(credits), prerequisite: form.prerequisite || null })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="subject-modal-title">
      <form onSubmit={submit} className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">{program.cycleLabel} {form.cycle || cycle}</p><h2 id="subject-modal-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">{subject ? 'Editar asignatura' : 'Nueva asignatura'}</h2><p className="mt-1 text-xs text-slate-500">La clave y los créditos se calculan automáticamente.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><Icon name="x" size={17} /></button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {!subject && <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => { set('isElectiveSlot', false); set('type', 'Obligatoria') }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${!form.isElectiveSlot ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Asignatura del catálogo</button><button type="button" onClick={() => { set('isElectiveSlot', true); set('type', 'Optativa'); set('name', 'Optativa de formación profesional') }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${form.isElectiveSlot ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500'}`}>Espacio optativo</button></div>}

          <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Clave generada" hint="Solo lectura"><div className="mt-1.5 flex h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 font-mono text-sm font-bold text-blue-800">{previewKey}</div></Field>
                  <Field label="Ciclo"><select value={form.cycle || cycle} onChange={(e) => set('cycle', Number(e.target.value))} className={inputClass}>{Array.from({ length: program.cycles }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{program.cycleLabel} {item}</option>)}</select></Field>
                  <div className="sm:col-span-2"><Field label={form.isElectiveSlot ? 'Nombre del espacio' : 'Nombre de la asignatura'}><input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="Formato oración, ej. Proyecto de innovación tecnológica" /></Field></div>
                  <Field label="Tipo"><select disabled={form.isElectiveSlot} value={form.type} onChange={(e) => set('type', e.target.value)} className={inputClass}><option>Obligatoria</option><option>Optativa</option></select></Field>
                  <Field label="Área de formación"><select value={form.area} onChange={(e) => set('area', e.target.value)} className={inputClass}>{(areasByLevel[program.level] || areasByLevel.Licenciatura).map((area) => <option key={area}>{area}</option>)}</select></Field>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-800">Carga académica e instalación</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Horas docente"><input type="number" min="0" value={form.teacherHours} onChange={(e) => set('teacherHours', Number(e.target.value))} className={inputClass} /></Field>
                  <Field label="Horas independientes"><input type="number" min="0" value={form.independentHours} onChange={(e) => set('independentHours', Number(e.target.value))} className={inputClass} /></Field>
                  <Field label="Créditos"><div className="mt-1.5 flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-extrabold text-emerald-800">{credits}</div></Field>
                  <Field label="Instalación"><select value={form.room} onChange={(e) => set('room', e.target.value)} className={inputClass}><option value="A">A · Aula</option><option value="L">L · Laboratorio</option><option value="O">O · Otro</option></select></Field>
                  <Field label="Modalidad"><select value={form.modality} onChange={(e) => set('modality', e.target.value)} className={inputClass}><option>Escolarizada</option><option>No escolarizada</option><option>Mixta</option></select></Field>
                  {!form.isElectiveSlot && <><Field label="Seriación / prerrequisito"><select value={form.prerequisite} onChange={(e) => set('prerequisite', e.target.value)} className={inputClass}><option value="">Sin seriación</option>{subjects.filter((item) => item.key && item.id !== subject?.id && item.cycle < (form.cycle || cycle)).map((item) => <option key={item.id} value={item.key}>{item.key} · {item.name}</option>)}</select></Field><Field label="Docente sugerido"><input value={form.suggestedTeacher} onChange={(e) => set('suggestedTeacher', e.target.value)} className={inputClass} placeholder="Perfil o nombre" /></Field><Field label="Programa de asignatura"><input value={form.programRef} onChange={(e) => set('programRef', e.target.value)} className={inputClass} placeholder="URL o referencia" /></Field></>}
                </div>
              </section>

              {!form.isElectiveSlot && <section className="rounded-2xl border border-slate-200 p-4"><h3 className="text-xs font-bold text-slate-800">Identificadores académicos</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{[['substantial', 'Aporte sustancial', 'Contribuye directamente al perfil de egreso'], ['capstone', 'Asignatura capstone', 'Debe ubicarse desde la segunda mitad'], ['practice', 'Práctica profesional', 'Suma al mínimo de periodos, horas y créditos'], ['core', 'Asignatura de núcleo', 'Requerida por el decanato']].map(([key, label, hint]) => <Toggle key={key} checked={form[key]} onChange={(value) => set(key, value)} label={label} hint={hint} />)}</div></section>}

              {(errors.length > 0 || optativeInvalid) && <section className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-xs font-bold text-red-800"><Icon name="alert" size={15} /> Revisa estas reglas</div><ul className="mt-2 space-y-1 pl-5 text-[11px] leading-relaxed text-red-700">{errors.map((error) => <li key={error} className="list-disc">{error}</li>)}{optativeInvalid && <li className="list-disc">Las optativas requieren mínimo {minTeacher} h docente y {minIndependent} h independientes.</li>}</ul>{optativeInvalid && !authorized && <button type="button" onClick={() => setAuthorized(true)} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100">Iniciar autorización de excepción</button>}{authorized && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input className="h-9 rounded-lg border border-red-200 px-3 text-xs" placeholder="Motivo autorizado" /><input className="h-9 rounded-lg border border-red-200 px-3 text-xs" placeholder="Responsable" /></div>}</section>}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-0 lg:self-start">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Vista previa</p>
              <div className={`mt-3 rounded-xl border p-3 shadow-sm ${form.isElectiveSlot ? 'border-dashed border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex justify-between"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600">{previewKey}</span><span className="text-[9px] font-semibold text-slate-400">{form.type}</span></div>
                <p className="mt-5 min-h-12 text-center text-xs font-bold leading-relaxed text-slate-800">{form.name || 'Nombre de la asignatura'}</p>
                <div className="mt-4 grid grid-cols-4 divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center">{[['HD', form.teacherHours], ['HI', form.independentHours], ['CR', credits], ['AULA', form.room]].map(([label, value]) => <div key={label} className="py-2"><p className="text-[7px] font-bold text-slate-400">{label}</p><p className="text-[9px] font-bold text-slate-700">{value}</p></div>)}</div>
              </div>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-700"><strong>Fórmula:</strong><br />({form.teacherHours} + {form.independentHours}) / 16 = {credits} créditos</div>
            </aside>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <p className="hidden text-[10px] text-slate-400 sm:block">Los cambios actualizarán las validaciones del mapa.</p>
          <div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button><button type="submit" className="flex h-10 items-center gap-2 rounded-xl bg-[#173b69] px-4 text-sm font-semibold text-white hover:bg-[#214f87]"><Icon name="save" size={15} /> Guardar</button></div>
        </footer>
      </form>
    </div>
  )
}

function Field({ label, hint, children }) { return <label className="block"><span className="text-[11px] font-semibold text-slate-700">{label}</span>{hint && <span className="ml-1 text-[9px] text-slate-400">{hint}</span>}{children}</label> }
function Toggle({ checked, onChange, label, hint }) { return <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" /><span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-[18px]' : 'left-0.5'}`} /></span><span><span className="block text-[11px] font-bold text-slate-800">{label}</span><span className="mt-0.5 block text-[9px] leading-relaxed text-slate-500">{hint}</span></span></label> }
