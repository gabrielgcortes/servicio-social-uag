import client from './client.js';

export async function listElementos(semestreId) {
  const { data } = await client.get(`/semestres/${semestreId}/elementos`);
  return data;
}

export async function createElementoMateria(semestreId, materiaId) {
  const { data } = await client.post(`/semestres/${semestreId}/elementos`, {
    tipo: 'MATERIA',
    materia_id: materiaId,
  });
  return data;
}

export async function createEspacioOptativo(semestreId, payload) {
  const { data } = await client.post(`/semestres/${semestreId}/elementos`, {
    tipo: 'ESPACIO_OPTATIVO',
    ...payload,
  });
  return data;
}

export async function updateEspacioOptativo(elementoId, payload) {
  const { data } = await client.patch(`/elementos/${elementoId}`, payload);
  return data;
}

export async function deleteElemento(elementoId) {
  await client.delete(`/elementos/${elementoId}`);
}

export async function reordenarElementos(semestreId, elementoIds) {
  const { data } = await client.put(`/semestres/${semestreId}/elementos/orden`, {
    elemento_ids: elementoIds,
  });
  return data;
}

export async function moverElemento(elementoId, semestreDestinoId, posicion) {
  const { data } = await client.post(`/elementos/${elementoId}/mover`, {
    semestre_destino_id: semestreDestinoId,
    posicion,
  });
  return data;
}
