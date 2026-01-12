// src/api.js
import { API_BASE } from "./config"

export async function initCsrf() {
  await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
  })
}


export function getCSRF() {
  const m = document.cookie.match(/csrftoken=([^;]+)/)
  return m ? m[1] : ""
}

async function request(path, { method = "GET", data } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  }
  if (data) opts.body = JSON.stringify(data)
  if (method !== "GET") {
    const token = getCSRF()
    if (token) opts.headers["X-CSRFToken"] = token
  }
  const res = await fetch(`${API_BASE}${path}`, opts)
  if (!res.ok) throw new Error(await res.text())
  return res.status === 204 ? null : res.json()
}
async function postJson(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRF(),
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  csrf: initCsrf,
   
  addTransaction: (payload) => postJson("/transactions", payload),// <— dôležité
  login: (pin) => request("/auth/admin-login", { method: "POST", data: { pin } }),
  logout: () => request("/auth/admin-logout", { method: "POST" }),

  categories: () => request("/categories/"),
  addCategory: (payload) => request("/categories/", { method: "POST", data: payload }),

  items: (q = "") => request(`/items/${q}`),    // žiadne default ?active=true
  addItem: (payload) => request("/items/", { method: "POST", data: payload }),
  updateItem: (id, payload) => request(`/items/${id}/`, { method: "PATCH", data: payload }),
  deleteItem: (id) => request(`/items/${id}/`, { method: "DELETE" }),
  resetDebt: (personId) => request(`/persons/${personId}/reset-debt`, { method:"POST" }),
  persons: () => request("/persons/"),
   sessionActive: () => fetch(`${API_BASE}/session/active`, { credentials: "include" }).then(r=>r.json()),
  // pridaj tieto funkcie do exportu api:
addPerson: (payload) => fetch(`${API_BASE}/persons/`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json",
             "X-CSRFToken": (document.cookie.match(/csrftoken=([^;]+)/)||[])[1] || "" },
  body: JSON.stringify(payload)
}).then(r=>r.json()),

  // transactions management
  getTransactions: (limit = 20, offset = 0) => request(`/transactions/list?limit=${limit}&offset=${offset}`),
  updateTransaction: (id, payload) => request(`/transactions/${id}`, { method: "PATCH", data: payload }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
}