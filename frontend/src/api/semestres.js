import client from './client.js';

export async function listSemestres(carreraId) {
  const { data } = await client.get(`/carreras/${carreraId}/semestres`);
  return data;
}

export async function createSemestre(carreraId, payload = {}) {
  const { data } = await client.post(`/carreras/${carreraId}/semestres`, payload);
  return data;
}

export async function deleteSemestre(semestreId, { force = false } = {}) {
  await client.delete(`/semestres/${semestreId}`, { params: { force } });
}
