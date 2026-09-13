import client from './client.js';

export async function listUsuarios(params = {}) {
  const { data } = await client.get('/usuarios', { params });
  return data;
}

export async function createUsuario(payload) {
  const { data } = await client.post('/usuarios', payload);
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await client.patch(`/usuarios/${id}`, payload);
  return data;
}

export async function deactivateUsuario(id) {
  const { data } = await client.delete(`/usuarios/${id}`);
  return data;
}
