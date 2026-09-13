import client from './client.js';

export async function listCarreras() {
  const { data } = await client.get('/carreras');
  return data;
}

export async function getCarrera(id) {
  const { data } = await client.get(`/carreras/${id}`);
  return data;
}

export async function createCarrera(payload) {
  const { data } = await client.post('/carreras', payload);
  return data;
}

export async function updateCarrera(id, payload) {
  const { data } = await client.patch(`/carreras/${id}`, payload);
  return data;
}

export async function deactivateCarrera(id) {
  const { data } = await client.delete(`/carreras/${id}`);
  return data;
}

export async function getMapa(carreraId) {
  const { data } = await client.get(`/carreras/${carreraId}/mapa`);
  return data;
}

export async function validarCarrera(carreraId) {
  const { data } = await client.post(`/carreras/${carreraId}/validar`);
  return data;
}

export async function listOptativas(carreraId) {
  const { data } = await client.get(`/carreras/${carreraId}/optativas`);
  return data;
}

export async function createOptativa(carreraId, payload) {
  const { data } = await client.post(`/carreras/${carreraId}/optativas`, payload);
  return data;
}
