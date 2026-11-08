import { isPlanReadOnly } from '../utils/planStatus.js'
import { isCycleEditable } from '../utils/cycleStatus.js'
import { belongsToProgram } from '../utils/subjectCatalog.js'

export function requirePlan(snapshot, planId) {
  const plan = snapshot.programs.find((item) => item.id === planId)
  if (!plan) throw new Error('No se encontró el plan curricular.')
  return plan
}

export function requireWritablePlan(snapshot, planId) {
  const plan = requirePlan(snapshot, planId)
  if (isPlanReadOnly(plan)) throw new Error('Este plan está protegido en modo de solo lectura.')
  return plan
}

export function requireEditableCycle(plan, cycle) {
  if (!isCycleEditable(plan, cycle)) throw new Error('Solo se pueden modificar ciclos editables del plan; en un plan vigente deben ser futuros.')
}

export function requireOwnedSubject(snapshot, planId, subjectId) {
  const subject = [...snapshot.subjects, ...snapshot.electives].find((item) => String(item.id) === String(subjectId) && belongsToProgram(item, planId))
  if (!subject) throw new Error('La asignatura no pertenece a este plan o ya no existe.')
  return subject
}

export function validateSubjectInput(input, source) {
  if (!['catalog', 'map'].includes(source)) throw new Error('Origen de asignatura no válido.')
  if (!input.name?.trim()) throw new Error('Escribe el nombre de la asignatura.')
  if (![input.teacherHours, input.independentHours].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0)) {
    throw new Error('Las horas deben ser números enteros mayores o iguales a cero.')
  }
  if (!['Obligatoria', 'Optativa'].includes(input.type)) throw new Error('Tipo de asignatura no válido.')
  if (source === 'catalog' && input.isElectiveSlot) throw new Error('Los espacios optativos se administran desde el mapa curricular.')
  if (source === 'map' && input.type === 'Optativa' && !input.isElectiveSlot) throw new Error('Agrega un espacio optativo en el mapa; las materias optativas se administran en el catálogo.')
}

export function requireEditableSubject(snapshot, plan, subject) {
  // A catalog entry and its map placements share academic data.
  const placements = snapshot.subjects.filter((item) => item.programId === plan.id && (item.id === subject.id || (subject.key && item.key === subject.key)))
  for (const placement of placements) requireEditableCycle(plan, placement.cycle)
}
