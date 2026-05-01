import { useEffect, useState, type FormEvent } from 'react'
import { createGrade, listGrades } from '../lib/api'
import type { EntityStatus, Grade } from '../types'

export function OrgPage() {
  const [rows, setRows] = useState<Grade[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState<EntityStatus>('ENABLED')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listGrades({ page: 1, pageSize: 50 })
      setRows(data.list)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [])

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError('年级名称至少 2 个字符')
      return
    }
    try {
      await createGrade({
        name: name.trim(),
        stage: stage.trim() || undefined,
        status,
      })
      setName('')
      setStage('')
      setStatus('ENABLED')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失败')
    }
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>基础档案 / 年级管理</h2>
        <span>总计 {total} 条</span>
      </div>
      <form className="inline-form" onSubmit={onCreate}>
        <input
          placeholder="年级名称（如：高一）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="学段（可选，如：高中）"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as EntityStatus)}>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">新增年级</button>
      </form>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>年级名称</th>
              <th>学段</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>加载中...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>暂无数据</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.stage ?? '-'}</td>
                  <td>{row.status === 'ENABLED' ? '启用' : '禁用'}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
