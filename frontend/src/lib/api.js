// Central API service. Every request to the Flask backend goes through here.
// In development Vite forwards /api to http://127.0.0.1:5000 (see vite.config.js).
const BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the EcoTrack API. Is the backend running on port 5000? (run backend\\run.ps1)', 0)
  }
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    if (!isJson && (res.status === 502 || res.status === 504 || res.status === 500)) {
      throw new ApiError('The EcoTrack API is not responding. Start the backend with backend\\run.ps1 and try again.', res.status)
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  dashboard: () => request('/dashboard'),
  calculate: (activity) => request('/calculate', { method: 'POST', body: activity }),
  saveActivity: (activity, replace = false) => request('/activities', { method: 'POST', body: { ...activity, replace } }),
  deleteActivity: (id) => request(`/activities/${id}`, { method: 'DELETE' }),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),
  history: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return request(`/history${q ? `?${q}` : ''}`)
  },
  predictions: () => request('/predictions'),
  predict: () => request('/predict', { method: 'POST' }),
  recommendations: () => request('/recommendations'),
  simulate: (levers) => request('/simulate', { method: 'POST', body: levers }),
  factors: () => request('/emission-factors'),
  exportUrl: () => `${BASE}/export`,
}
