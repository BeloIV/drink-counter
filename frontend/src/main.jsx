import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Admin from './pages/admin.jsx'
import Transactions from './pages/transactions.jsx'
import Users from './pages/users.jsx'
import Stats from './pages/stats.jsx'
import Brew from './pages/brew.jsx'
import SiteAuth from './SiteAuth.jsx'

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/brew", element: <Brew /> },
  { path: "/admin", element: <Admin /> },
  { path: "/transactions", element: <Transactions /> },
  { path: "/users", element: <Users /> },
  { path: "/stats", element: <Stats /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <SiteAuth>
    <RouterProvider router={router} />
  </SiteAuth>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}