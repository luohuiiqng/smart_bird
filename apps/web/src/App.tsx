import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { ExamPage } from './pages/ExamPage'
import { FilesPage } from './pages/FilesPage'
import { LoginPage } from './pages/LoginPage'
import { MarkingPage } from './pages/MarkingPage'
import { OrgPage } from './pages/OrgPage'
import { ScoresPage } from './pages/ScoresPage'
import { AuditPage } from './pages/AuditPage'

function ProtectedRoute() {
  const { user, initializing } = useAuth()
  if (initializing) {
    return <div className="loading">加载中...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <AppShell />
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'org', element: <OrgPage /> },
      { path: 'exam', element: <ExamPage /> },
      { path: 'marking', element: <MarkingPage /> },
      { path: 'scores', element: <ScoresPage /> },
      { path: 'analysis', element: <ScoresPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'audit', element: <AuditPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
