import client from './client.js';

export async function listMaterias(carreraId, { tipo } = {}) {
  const { data } = await client.get(`/carreras/${carreraId}/materias`, { params: { tipo } });
  return data;
}

export async function getMateria(id) {
  const { data } = await client.get(`/materias/${id}`);
  return data;
}

export async function createMateria(carreraId, payload) {
  const { data } = await client.post(`/carreras/${carreraId}/materias`, payload);
  return data;
}

export async function updateMateria(id, payload) {
  const { data } = await client.patch(`/materias/${id}`, payload);
  return data;
}

export async function deleteMateria(id) {
  await client.delete(`/materias/${id}`);
}
