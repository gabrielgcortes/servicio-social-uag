export const USE_MOCK = import.meta.env?.VITE_USE_MOCK !== 'false'
const API_URL = import.meta.env?.VITE_API_URL || ''

/** Inject transport/auth later without changing components or domain methods. */
export function createApiClient({ fetchImpl = globalThis.fetch, baseUrl = API_URL, getHeaders = () => ({}) } = {}) {
  return async (path, { method = 'GET', body, signal } = {}) => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method, credentials: 'include', signal,
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (response.status === 204 && response.ok) return null
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = typeof data?.detail === 'string' ? data.detail
        : Array.isArray(data?.detail) ? data.detail.map((item) => item.msg).join('. ') : null
      throw new Error(detail || `No se pudo completar la operación (${response.status}).`)
    }
    if (data === null) throw new Error('El servidor devolvió una respuesta vacía o no válida.')
    return data
  }
}
