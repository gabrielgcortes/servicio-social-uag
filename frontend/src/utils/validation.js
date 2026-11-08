import { getDeaneryPreestablishedSubjects, normalizeSubjectName } from '../data/deaneryRequirements.js'

export function curriculumSummary(subjects) {
  return subjects.reduce(
    (totals, item) => ({
      credits: totals.credits + Number(item.credits || 0),
      teacherHours: totals.teacherHours + Number(item.teacherHours || 0),
      independentHours: totals.independentHours + Number(item.independentHours || 0),
      required: totals.required + (!item.isElectiveSlot ? 1 : 0),
      electiveSlots: totals.electiveSlots + (item.isElectiveSlot ? 1 : 0),
    }),
    { credits: 0, teacherHours: 0, independentHours: 0, required: 0, electiveSlots: 0 },
  )
}

export function validateCurriculum(subjects, program, baseValidations = [], electives = []) {
  const validations = [...baseValidations]
  const byCycle = new Map()
  subjects.forEach((item) => {
    const list = byCycle.get(Number(item.cycle)) || []
    list.push(item)
    byCycle.set(Number(item.cycle), list)
  })

  byCycle.forEach((items, cycle) => {
    const credits = items.reduce((sum, item) => sum + Number(item.credits || 0), 0)
    if (credits > program.maxCycleCredits) {
      validations.push({
        id: `credits-${cycle}`,
        severity: 'error',
        title: `Más de ${program.maxCycleCredits} créditos en ${program.cycleLabel.toLowerCase()} ${cycle}`,
        detail: `El ciclo suma ${credits.toFixed(1)} créditos. Reduce ${(credits - program.maxCycleCredits).toFixed(1)} créditos para continuar.`,
        cycle,
        code: 'MAX_CREDITOS_CICLO',
      })
    }
    if (items.length > program.maxSubjects) {
      validations.push({
        id: `subjects-${cycle}`,
        severity: 'error',
        title: `Límite de materias excedido en ciclo ${cycle}`,
        detail: `Hay ${items.length} asignaturas y el máximo para modalidad ${program.modality.toLowerCase()} es ${program.maxSubjects}.`,
        cycle,
        code: 'MAX_MATERIAS_CICLO',
      })
    }
  })

  const keyToCycle = Object.fromEntries(subjects.filter((item) => item.key).map((item) => [item.key, item.cycle]))
  subjects.forEach((item) => {
    if (item.prerequisite && (keyToCycle[item.prerequisite] === undefined || Number(keyToCycle[item.prerequisite]) >= Number(item.cycle))) {
      validations.push({
        id: `serial-${item.id}`,
        severity: 'error',
        title: 'Seriación en ciclo incorrecto',
        detail: `${item.name} requiere ${item.prerequisite}, que debe ubicarse en un ciclo anterior.`,
        cycle: item.cycle,
        subjectId: item.id,
        code: 'SERIACION_ORDEN_CICLO',
      })
    }
  })

  const summary = curriculumSummary(subjects)
  if (summary.credits < program.minCredits || summary.credits > program.maxCredits) {
    validations.push({
      id: 'credit-range',
      severity: 'error',
      title: 'Créditos totales fuera de rango',
      detail: `El plan suma ${summary.credits.toFixed(1)} créditos; el rango esperado es ${program.minCredits}–${program.maxCredits}.`,
      cycle: null,
      code: 'RANGO_CREDITOS_PLAN',
    })
  }

  const practices = subjects.filter((item) => item.practice)
  const practiceHours = practices.reduce((sum, item) => sum + item.teacherHours + item.independentHours, 0)
  const practiceCredits = practices.reduce((sum, item) => sum + item.credits, 0)
  if (program.level === 'Licenciatura' && (new Set(practices.map((item) => Number(item.cycle))).size < 2 || practiceHours < 320 || practiceCredits < 20)) {
    validations.push({
      id: 'practice-min',
      severity: 'error',
      title: 'Prácticas profesionales insuficientes',
      detail: `Se requieren 2 periodos, 320 horas y 20 créditos. Actual: ${practices.length} periodos, ${practiceHours} h y ${practiceCredits} créditos.`,
      cycle: null,
      code: 'PRACTICAS_MINIMOS',
    })
  }

  const capstones = subjects.filter((item) => item.capstone && Number(item.cycle) > Math.floor(program.cycles / 2))
  if (program.level === 'Licenciatura' && capstones.length < 2) {
    validations.push({
      id: 'capstone-min',
      severity: 'error',
      title: 'Faltan asignaturas capstone',
      detail: `El plan tiene ${capstones.length}; debe incluir al menos 2 desde la segunda mitad.`,
      cycle: null,
      code: 'CAPSTONE_MINIMO',
    })
  }

  const requiredSubjects = program.level === 'Licenciatura' ? getDeaneryPreestablishedSubjects(program.deanery) : []
  requiredSubjects.forEach((required) => {
    const found = subjects.find((item) => normalizeSubjectName(item.name) === normalizeSubjectName(required.name))
    if (!found || Number(found.cycle) !== required.cycle) {
      validations.push({
        id: `required-${required.name}`,
        severity: 'error',
        title: 'Materia preestablecida faltante o fuera de ciclo',
        detail: `${required.name} debe ubicarse en el ciclo ${required.cycle}.`,
        cycle: required.cycle,
        subjectId: found?.id,
        code: 'ORDEN_PREESTABLECIDO',
      })
    }
  })

  if (summary.teacherHours + summary.independentHours < program.minHours) {
    validations.push({ id: 'minimum-hours', severity: 'error', title: 'Horas totales insuficientes', detail: `Se requieren ${program.minHours} horas totales; el plan suma ${summary.teacherHours + summary.independentHours}.`, code: 'HORAS_MINIMAS_PLAN' })
  }

  const minTeacher = program.modality === 'No escolarizada' ? 64 : 32
  const minIndependent = program.modality === 'No escolarizada' ? 80 : 64
  subjects.filter((item) => item.isElectiveSlot).forEach((slot) => {
    if (program.level === 'Licenciatura' && (slot.teacherHours < minTeacher || slot.independentHours < minIndependent)) {
      validations.push({ id: `slot-hours-${slot.id}`, severity: 'error', title: 'Espacio optativo con horas insuficientes', detail: `Se requieren ${minTeacher} horas docente y ${minIndependent} independientes.`, subjectId: slot.id, cycle: slot.cycle, code: 'OPTATIVA_HORAS_MINIMAS' })
    }
    if (!electives.some((item) => Number(item.cycle) === Number(slot.cycle))) {
      validations.push({ id: `slot-catalog-${slot.id}`, severity: 'error', title: 'Espacio optativo sin oferta en catálogo', detail: `Agrega la oferta optativa del ciclo ${slot.cycle} al catálogo de este plan.`, subjectId: slot.id, cycle: slot.cycle, code: 'OPTATIVA_SIN_OFERTA' })
    }
  })

  return validations
}
