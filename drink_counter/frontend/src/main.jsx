import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Admin from './pages/admin.jsx'

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/admin", element: <Admin /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)