import client, { setAccessToken } from './client.js';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  try {
    await client.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function fetchMe() {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function refresh() {
  const { data } = await client.post('/auth/refresh');
  setAccessToken(data.access_token);
  return data;
}

export async function changePassword(passwordActual, passwordNueva) {
  await client.post('/auth/change-password', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });
}
