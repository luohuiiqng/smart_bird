import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../types'

type MenuItem = {
  to: string
  label: string
  roles: UserRole[]
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/', label: '工作台', roles: ['SCHOOL_ADMIN', 'TEACHER'] },
  { to: '/org', label: '基础档案', roles: ['SCHOOL_ADMIN'] },
  { to: '/exam', label: '考试管理', roles: ['SCHOOL_ADMIN'] },
  { to: '/marking', label: '阅卷任务', roles: ['SCHOOL_ADMIN', 'TEACHER'] },
  { to: '/scores', label: '成绩查询', roles: ['SCHOOL_ADMIN', 'TEACHER'] },
  { to: '/analysis', label: '统计分析', roles: ['SCHOOL_ADMIN', 'TEACHER'] },
  { to: '/files', label: '文件中心', roles: ['SCHOOL_ADMIN', 'TEACHER'] },
  { to: '/audit', label: '操作审计', roles: ['SCHOOL_ADMIN'] },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const visibleMenus = MENU_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false))

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">鸿门智能阅卷</div>
        <div className="user-area">
          <span>{user?.realName}</span>
          <button onClick={logout} type="button">
            退出
          </button>
        </div>
      </header>
      <div className="app-main">
        <aside className="sidebar">
          {visibleMenus.map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) => (isActive ? 'menu-link active' : 'menu-link')}
              end={menu.to === '/'}
            >
              {menu.label}
            </NavLink>
          ))}
        </aside>
        <section className="content">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
