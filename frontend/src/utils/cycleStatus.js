export function cycleStatus(program, cycle) {
  const current = Number(program.currentCycle || 0)
  if (current === 0 || Number(cycle) > current) return 'future'
  return Number(cycle) === current ? 'current' : 'completed'
}

export function isCycleEditable(program, cycle) {
  return Boolean(program) && Number.isInteger(Number(cycle)) && Number(cycle) >= 1 && Number(cycle) <= program.cycles && cycleStatus(program, cycle) === 'future'
}
