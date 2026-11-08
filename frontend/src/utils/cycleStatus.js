export function cycleStatus(program, cycle) {
  const current = Number(program.currentCycle || 0)
  if (current === 0 || Number(cycle) > current) return 'future'
  return Number(cycle) === current ? 'current' : 'completed'
}

export function isCycleEditable(program, cycle) {
  return Boolean(program) && Number.isInteger(Number(cycle)) && Number(cycle) >= 1 && Number(cycle) <= program.cycles && cycleStatus(program, cycle) === 'future'
}

export function suggestNextPlanName(plan = 'Plan 2025', existingPlans = []) {
  const normalizedExisting = new Set(existingPlans.map((item) => String(item || '').trim().toLowerCase()))
  const match = String(plan).match(/^(.*?)(\d{4})(.*)$/)
  if (match) {
    let year = Number(match[2]) + 1
    let candidate = `${match[1]}${year}${match[3]}`
    while (normalizedExisting.has(candidate.trim().toLowerCase())) {
      year += 1
      candidate = `${match[1]}${year}${match[3]}`
    }
    return candidate
  }
  let suffix = 2
  let candidate = `${plan} (Copia)`
  while (normalizedExisting.has(candidate.trim().toLowerCase())) {
    candidate = `${plan} (Copia ${suffix})`
    suffix += 1
  }
  return candidate
}
