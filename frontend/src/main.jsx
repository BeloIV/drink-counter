import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Admin from './pages/admin.jsx'
import Transactions from './pages/transactions.jsx'
import Users from './pages/users.jsx'
import Stats from './pages/stats.jsx'
import Brew from './pages/brew.jsx'
import NotFound from './pages/notfound.jsx'
import SiteAuth from './SiteAuth.jsx'
import { DialogProvider } from './components/Dialogs.jsx'

const router = createBrowserRouter([
  { path: "/", element: <App />, errorElement: <NotFound /> },
  { path: "/brew", element: <Brew /> },
  { path: "/admin", element: <Admin /> },
  { path: "/transactions", element: <Transactions /> },
  { path: "/users", element: <Users /> },
  { path: "/stats", element: <Stats /> },
  { path: "*", element: <NotFound /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <SiteAuth>
    <DialogProvider>
      <RouterProvider router={router} />
    </DialogProvider>
  </SiteAuth>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
