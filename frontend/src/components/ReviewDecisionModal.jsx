import { useEffect, useRef, useState } from 'react'

export default function ReviewDecisionModal({ pending, onClose, onSubmit }) {
  const dialogRef = useRef(null)
  const [motivo, setMotivo] = useState('')
  useEffect(() => { dialogRef.current.showModal() }, [])

  return (
    <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }} aria-labelledby="review-decision-title" className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl p-6 shadow-xl backdrop:bg-slate-950/40">
      <form onSubmit={(event) => { event.preventDefault(); if (motivo.trim() && !pending) onSubmit({ motivo: motivo.trim() }) }}>
        <h2 id="review-decision-title" className="text-lg font-bold text-slate-900">Devolver a borrador</h2>
        <p className="mt-2 text-sm text-slate-600">Las observaciones quedarán visibles para la coordinadora.</p>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Motivo y observaciones
          <textarea autoFocus required disabled={pending} value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-3 focus:outline-indigo-600" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={pending || !motivo.trim()} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Guardando…' : 'Confirmar devolución'}</button>
        </div>
      </form>
    </dialog>
  )
}
