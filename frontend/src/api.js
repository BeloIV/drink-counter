const API_BASE = '/api'

function readCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

function buildOptions(method, data) {
  const isForm = data instanceof FormData
  const headers = isForm ? {} : { 'Content-Type': 'application/json' }
  if (method !== 'GET') {
    const token = readCsrfToken()
    if (token) headers['X-CSRFToken'] = token
  }
  const body = data ? (isForm ? data : JSON.stringify(data)) : undefined
  return { method, headers, body, credentials: 'include' }
}

/** Call the API; a failed response throws an Error carrying the body and `status`. */
async function request(path, { method = 'GET', data } = {}) {
  const response = await fetch(`${API_BASE}${path}`, buildOptions(method, data))
  if (!response.ok) {
    const error = new Error(await response.text())
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

const post = (path, data) => request(path, { method: 'POST', data })
const patch = (path, data) => request(path, { method: 'PATCH', data })
const remove = (path) => request(path, { method: 'DELETE' })

function transactionListPath(limit, offset, personIds) {
  const query = new URLSearchParams({ limit, offset })
  if (personIds.length) query.set('person_id', personIds.join(','))
  return `/transactions/list?${query}`
}

export const api = {
  // Sets the csrftoken cookie that every write request echoes back.
  csrf: () => fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' }),
  login: (pin) => post('/auth/admin-login', { pin }),
  logout: () => post('/auth/admin-logout'),
  adminCheck: () => request('/auth/admin-check'),

  categories: () => request('/categories/'),

  items: ({ activeOnly = false } = {}) => request(activeOnly ? '/items/?active=true' : '/items/'),
  addItem: (payload) => post('/items/', payload),
  updateItem: (id, payload) => patch(`/items/${id}/`, payload),
  deleteItem: (id) => remove(`/items/${id}/`),
  settleItem: (id) => post(`/items/${id}/settle`),

  persons: () => request('/persons/'),
  addPerson: (payload) => post('/persons/', payload),
  updatePerson: (id, formData) => patch(`/persons/${id}/`, formData),
  deletePerson: (id) => remove(`/persons/${id}/`),
  resetDebt: (personId) => post(`/persons/${personId}/reset-debt`),

  sessionActive: () => request('/session/active'),

  addTransaction: (payload) => post('/transactions', payload),
  getTransactions: (limit, offset, personIds = []) => request(transactionListPath(limit, offset, personIds)),
  updateTransaction: (id, payload) => patch(`/transactions/${id}`, payload),
  deleteTransaction: (id) => remove(`/transactions/${id}`),
  undoTransaction: (personId) => post('/transactions/undo', { person_id: personId }),

  getCoffeeFilters: () => request('/coffee-filters/'),
  addCoffeeFilter: (payload) => post('/coffee-filters/', payload),
  updateCoffeeFilter: (id, payload) => patch(`/coffee-filters/${id}/`, payload),
  deleteCoffeeFilter: (id) => remove(`/coffee-filters/${id}/`),

  getBrewBatches: () => request('/brew-batches'),
  createBrewBatch: (payload) => post('/brew-batches', payload),

  stats: () => request('/stats'),
}
