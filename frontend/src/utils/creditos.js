// Espejo en JS de la fórmula de créditos usada por el backend (services/creditos.py).
export function calcularCreditos(horasDocente, horasIndependientes) {
  const hd = Number(horasDocente) || 0;
  const hi = Number(horasIndependientes) || 0;
  return Math.round(((hd + hi) / 16) * 100) / 100;
}

export function creditosSonEnteros(horasDocente, horasIndependientes) {
  const hd = Number(horasDocente) || 0;
  const hi = Number(horasIndependientes) || 0;
  return (hd + hi) % 16 === 0;
}

export function creditosDeElemento(elemento) {
  if (elemento.tipo === 'MATERIA') {
    return Number(elemento.materia?.creditos ?? 0);
  }
  return Number(elemento.creditos ?? 0);
}
