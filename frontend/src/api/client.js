import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// El access token vive solo en memoria (nunca en localStorage/sessionStorage).
let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.access_token;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config ?? {};
    const status = error.response?.status;
    const esRutaDeAuth = originalRequest.url?.includes('/auth/');

    if (status === 401 && !originalRequest._retry && !esRutaDeAuth) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
        return client(originalRequest);
      } catch (refreshError) {
        accessToken = null;
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default client;
