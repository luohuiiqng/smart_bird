import { useCallback, useState, type FormEvent } from 'react'
import { getAuditLogDetail, listAuditLogs } from '../lib/api'
import type { AuditLog } from '../types'

export function AuditPage() {
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [targetIdFilter, setTargetIdFilter] = useState('')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    setError('')
    try {
      const res = await listAuditLogs({
        module: moduleFilter.trim() || undefined,
        action: actionFilter.trim() || undefined,
        targetType: targetTypeFilter.trim() || undefined,
        targetId: targetIdFilter.trim() ? Number(targetIdFilter) : undefined,
        page: 1,
        pageSize: 20,
      })
      setLogs(res.list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询审计失败')
    }
  }, [actionFilter, moduleFilter, targetIdFilter, targetTypeFilter])

  const onSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadLogs()
  }

  const onViewDetail = async (id: number) => {
    setError('')
    try {
      const detail = await getAuditLogDetail(id)
      setSelected(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询详情失败')
    }
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>操作审计</h2>
        <span>支持按模块/动作/目标筛选</span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>筛选条件</h3>
        <form className="inline-form exam-bind-form" onSubmit={onSearch}>
          <input
            placeholder="module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          />
          <input
            placeholder="action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <input
            placeholder="targetType"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          />
          <input
            placeholder="targetId"
            value={targetIdFilter}
            onChange={(e) => setTargetIdFilter(e.target.value)}
          />
          <button type="submit">查询日志</button>
        </form>
      </div>

      <div className="block-card">
        <h3>日志列表</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>模块</th>
              <th>动作</th>
              <th>目标</th>
              <th>操作人</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.module}</td>
                <td>{item.action}</td>
                <td>
                  {item.targetType}#{item.targetId}
                </td>
                <td>{item.operator.realName}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  <button type="button" onClick={() => onViewDetail(item.id)}>
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="block-card">
        <h3>日志详情</h3>
        {selected ? (
          <div className="data-card">
            <p>ID: {selected.id}</p>
            <p>
              模块/动作: {selected.module} / {selected.action}
            </p>
            <p>
              目标: {selected.targetType}#{selected.targetId}
            </p>
            <p>内容: {selected.content}</p>
            <p>元数据: {JSON.stringify(selected.metadata)}</p>
          </div>
        ) : (
          <p>请先在上方列表选择一条日志查看详情</p>
        )}
      </div>
    </div>
  )
}
