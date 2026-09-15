import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './App.css'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { DialogProvider } from './components/Dialogs.jsx'
import SiteAuth from './components/SiteAuth.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import BrewPage from './pages/brew/BrewPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import OrderPage from './pages/order/OrderPage.jsx'
import StatsPage from './pages/stats/StatsPage.jsx'
import TransactionsPage from './pages/transactions/TransactionsPage.jsx'
import UsersPage from './pages/users/UsersPage.jsx'

const router = createBrowserRouter([
  { path: '/', element: <OrderPage />, errorElement: <NotFoundPage /> },
  { path: '/brew', element: <BrewPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/transactions', element: <TransactionsPage /> },
  { path: '/users', element: <UsersPage /> },
  { path: '/stats', element: <StatsPage /> },
  { path: '*', element: <NotFoundPage /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <SiteAuth>
    <DialogProvider>
      <RouterProvider router={router} />
    </DialogProvider>
  </SiteAuth>
)

// The service worker caches the app shell so the kiosk still opens when the network drops.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
