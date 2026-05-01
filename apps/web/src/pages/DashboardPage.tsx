import { useAuth } from '../auth/useAuth'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <h2>欢迎使用</h2>
      <div className="card-grid">
        <div className="data-card">
          <h3>当前角色</h3>
          <p>{user?.role}</p>
        </div>
        <div className="data-card">
          <h3>学校 ID</h3>
          <p>{user?.schoolId ?? '-'}</p>
        </div>
        <div className="data-card">
          <h3>下一步</h3>
          <p>继续接入各业务页面与接口</p>
        </div>
      </div>
    </div>
  )
}
