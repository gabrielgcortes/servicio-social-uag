import { useMemo, useState } from 'react'
import Icon from './Icon'
import { suggestedRules } from '../data/mockData'

const fieldClass = 'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50'

export default function ProgramForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => initial ? {
    name: initial.name, code: initial.plan, mnemonic: initial.mnemonic, deanery: initial.deanery,
    level: initial.level, modality: initial.modality, jurisdiction: initial.jurisdiction,
    cycles: initial.cycles, weeks: initial.weeks, minCredits: initial.minCredits, maxCredits: initial.maxCredits,
    minHours: initial.minHours, maxSubjects: initial.maxSubjects, maxCycleCredits: initial.maxCycleCredits,
  } : {
    name: '', code: 'Plan 2027', mnemonic: '', deanery: 'Diseño, Ciencia y Tecnología', level: 'Licenciatura', modality: 'Escolarizada', jurisdiction: 'Federal', ...suggestedRules.Licenciatura,
  })
  const [exception, setException] = useState(false)
  const rules = useMemo(() => suggestedRules[form.level], [form.level])
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const applyLevel = (level) => setForm((current) => ({ ...current, level, ...suggestedRules[level] }))

  const submit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1450px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button type="button" onClick={onCancel} className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"><span className="rotate-180"><Icon name="chevronRight" size={14} /></span> Volver a programas</button>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">{initial ? 'Editar programa' : 'Crear programa'}</h2>
          <p className="mt-1 text-sm text-slate-500">Define la identidad y las reglas cuantitativas de la nueva versión curricular.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex h-10 items-center gap-2 rounded-xl bg-[#173b69] px-4 text-sm font-semibold text-white hover:bg-[#214f87]"><Icon name="save" size={16} /> Guardar programa</button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <FormSection title="Información general" description="Datos de identificación institucional del programa.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del programa"><input required value={form.name} onChange={(e) => set('name', e.target.value)} className={fieldClass} placeholder="Ej. Licenciatura en Innovación Tecnológica" /></Field>
              <Field label="Clave / plan"><input required value={form.code} onChange={(e) => set('code', e.target.value)} className={fieldClass} /></Field>
              <Field label="Mnemónico" hint="2–12 caracteres; será el prefijo de las claves"><input required maxLength={12} value={form.mnemonic} onChange={(e) => set('mnemonic', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className={fieldClass} placeholder="LIT" /></Field>
              <Field label="Decanato"><select value={form.deanery} onChange={(e) => set('deanery', e.target.value)} className={fieldClass}><option>Diseño, Ciencia y Tecnología</option><option>Ciencias Sociales, Económicas y Administrativas</option><option>Otro / configurable</option></select></Field>
              <Field label="Tipo de reconocimiento"><select value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)} className={fieldClass}><option>Federal</option><option>Estatal</option></select></Field>
            </div>
          </FormSection>

          <FormSection title="Nivel y modalidad" description="La selección propone valores iniciales; podrás versionarlos después.">
            <p className="mb-2 text-xs font-semibold text-slate-600">Nivel académico</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.keys(suggestedRules).map((level) => <ChoiceCard key={level} active={form.level === level} label={level} onClick={() => applyLevel(level)} />)}</div>
            <p className="mb-2 mt-5 text-xs font-semibold text-slate-600">Modalidad</p>
            <div className="grid gap-2 sm:grid-cols-3">{['Escolarizada', 'No escolarizada', 'Mixta'].map((modality) => <ChoiceCard key={modality} active={form.modality === modality} label={modality} onClick={() => set('modality', modality)} />)}</div>
          </FormSection>

          <FormSection title="Configuración curricular" description="Límites usados por el panel de validación del mapa.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Número de ciclos" value={form.cycles} onChange={(value) => set('cycles', value)} />
              <NumberField label="Semanas por ciclo" value={form.weeks} onChange={(value) => set('weeks', value)} />
              <NumberField label="Créditos mínimos" value={form.minCredits} onChange={(value) => set('minCredits', value)} />
              <NumberField label="Créditos máximos" value={form.maxCredits} onChange={(value) => set('maxCredits', value)} />
              <NumberField label="Horas mínimas" value={form.minHours} onChange={(value) => set('minHours', value)} />
              <NumberField label="Materias máx. / ciclo" value={form.maxSubjects} onChange={(value) => set('maxSubjects', value)} />
              <NumberField label="Créditos máx. / ciclo" value={form.maxCycleCredits} onChange={(value) => set('maxCycleCredits', value)} />
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600" />
              <span><span className="block text-xs font-bold text-amber-900">Solicitar excepción autorizada</span><span className="mt-1 block text-[11px] leading-relaxed text-amber-700">Actívala si los valores difieren del lineamiento sugerido. Se solicitará motivo y responsable antes de publicar.</span></span>
            </label>
            {exception && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Motivo de excepción"><input className={fieldClass} placeholder="Describe la justificación académica" /></Field><Field label="Responsable"><input className={fieldClass} placeholder="Nombre del responsable" /></Field></div>}
          </FormSection>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-lg shadow-blue-900/5">
            <div className="bg-[#173b69] p-5 text-white"><div className="flex items-center gap-2 text-xs font-semibold text-blue-100"><Icon name="sparkles" size={16} /> Reglas sugeridas</div><p className="mt-2 text-lg font-bold">{form.level}</p><p className="mt-1 text-xs text-blue-100">{form.modality}</p></div>
            <div className="space-y-4 p-5">
              <RuleRow label="Duración" value={`${rules.cycles} ciclos × ${rules.weeks} semanas`} matches={form.cycles === rules.cycles && form.weeks === rules.weeks} />
              <RuleRow label="Créditos totales" value={`${rules.minCredits}–${rules.maxCredits}`} matches={form.minCredits === rules.minCredits && form.maxCredits === rules.maxCredits} />
              <RuleRow label="Horas mínimas" value={rules.minHours.toLocaleString('es-MX')} matches={form.minHours === rules.minHours} />
              <RuleRow label="Máx. por ciclo" value={`${rules.maxSubjects} materias · ${rules.maxCycleCredits} créditos`} matches={form.maxSubjects === rules.maxSubjects && form.maxCycleCredits === rules.maxCycleCredits} />
              {form.level === 'Maestría' && <div className="rounded-xl bg-violet-50 p-3 text-[11px] leading-relaxed text-violet-700"><strong>Estándar:</strong> 2 materias por cuatrimestre; 14 h docente + 130 independientes = 9 créditos.</div>}
              {form.level === 'Licenciatura' && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-700"><strong>Además:</strong> 2 capstone desde la segunda mitad y prácticas en mínimo 2 semestres.</div>}
            </div>
          </div>
        </aside>
      </div>
    </form>
  )
}

function FormSection({ title, description, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="text-base font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p><div className="mt-5">{children}</div></section>
}
function Field({ label, hint, children }) { return <label className="block"><span className="text-xs font-semibold text-slate-700">{label}</span>{hint && <span className="ml-2 text-[10px] text-slate-400">{hint}</span>}{children}</label> }
function NumberField({ label, value, onChange }) { return <Field label={label}><input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className={fieldClass} /></Field> }
function ChoiceCard({ active, label, onClick }) { return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold transition ${active ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><span className={`mr-2 inline-block h-2 w-2 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-300'}`} />{label}</button> }
function RuleRow({ label, value, matches }) { return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xs font-bold text-slate-800">{value}</p></div><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${matches ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Icon name={matches ? 'check' : 'alert'} size={13} /></span></div> }
