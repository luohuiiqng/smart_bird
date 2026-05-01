import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

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
      { path: 'org', element: <PlaceholderPage title="基础档案" /> },
      { path: 'exam', element: <PlaceholderPage title="考试管理" /> },
      { path: 'marking', element: <PlaceholderPage title="阅卷任务" /> },
      { path: 'scores', element: <PlaceholderPage title="成绩查询" /> },
      { path: 'analysis', element: <PlaceholderPage title="统计分析" /> },
      { path: 'files', element: <PlaceholderPage title="文件中心" /> },
      { path: 'audit', element: <PlaceholderPage title="操作审计" /> },
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
