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

export function validateCurriculum(subjects, program, baseValidations = []) {
  const validations = [...baseValidations]
  const byCycle = new Map()
  subjects.forEach((item) => {
    const list = byCycle.get(item.cycle) || []
    list.push(item)
    byCycle.set(item.cycle, list)
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
    if (item.prerequisite && keyToCycle[item.prerequisite] >= item.cycle) {
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
      severity: 'warning',
      title: 'Créditos totales fuera de rango',
      detail: `El plan suma ${summary.credits.toFixed(1)} créditos; el rango esperado es ${program.minCredits}–${program.maxCredits}.`,
      cycle: null,
      code: 'RANGO_CREDITOS_PLAN',
    })
  }

  const practices = subjects.filter((item) => item.practice)
  const practiceHours = practices.reduce((sum, item) => sum + item.teacherHours + item.independentHours, 0)
  const practiceCredits = practices.reduce((sum, item) => sum + item.credits, 0)
  if (practices.length < 2 || practiceHours < 320 || practiceCredits < 20) {
    validations.push({
      id: 'practice-min',
      severity: 'error',
      title: 'Prácticas profesionales insuficientes',
      detail: `Se requieren 2 periodos, 320 horas y 20 créditos. Actual: ${practices.length} periodos, ${practiceHours} h y ${practiceCredits} créditos.`,
      cycle: null,
      code: 'PRACTICAS_MINIMOS',
    })
  }

  const capstones = subjects.filter((item) => item.capstone)
  if (capstones.length < 2) {
    validations.push({
      id: 'capstone-min',
      severity: 'error',
      title: 'Faltan asignaturas capstone',
      detail: `El plan tiene ${capstones.length}; debe incluir al menos 2 desde la segunda mitad.`,
      cycle: null,
      code: 'CAPSTONE_MINIMO',
    })
  }

  const requiredSubjects = program.deanery.startsWith('Diseño')
    ? [{ name: 'Lógica y filosofía de la ciencia', cycle: 2 }, { name: 'Bioética', cycle: 6 }, { name: 'Laboratorio de emprendimiento', cycle: 7 }]
    : [{ name: 'Lógica y filosofía de la ciencia', cycle: 3 }, { name: 'Ética profesional', cycle: 7 }]
  requiredSubjects.forEach((required) => {
    const found = subjects.find((item) => item.name === required.name)
    if (!found || found.cycle !== required.cycle) {
      validations.push({
        id: `required-${required.name}`,
        severity: 'warning',
        title: 'Materia preestablecida faltante o fuera de ciclo',
        detail: `${required.name} debe ubicarse en el ciclo ${required.cycle}.`,
        cycle: required.cycle,
        subjectId: found?.id,
        code: 'ORDEN_PREESTABLECIDO',
      })
    }
  })

  return validations
}
