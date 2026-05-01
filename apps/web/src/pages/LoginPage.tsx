import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, loginWithPassword } = useAuth()
  const [username, setUsername] = useState('school_admin')
  const [password, setPassword] = useState('SchoolAdmin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loginWithPassword(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>学校考试管理平台</h1>
        <p className="login-hint">请输入账号密码登录后台</p>
        <label>
          用户名
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <div className="error-tip">{error}</div> : null}
        <button type="submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
