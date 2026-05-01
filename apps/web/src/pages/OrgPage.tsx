import { useEffect, useState, type FormEvent } from 'react'
import {
  createClass,
  createGrade,
  createSubject,
  listClasses,
  listGrades,
  listSubjects,
} from '../lib/api'
import type { ClassItem, EntityStatus, Grade, Subject } from '../types'

export function OrgPage() {
  const [gradeRows, setGradeRows] = useState<Grade[]>([])
  const [classRows, setClassRows] = useState<ClassItem[]>([])
  const [subjectRows, setSubjectRows] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [gradeName, setGradeName] = useState('')
  const [gradeStage, setGradeStage] = useState('')
  const [gradeStatus, setGradeStatus] = useState<EntityStatus>('ENABLED')

  const [className, setClassName] = useState('')
  const [classGradeId, setClassGradeId] = useState('')
  const [classStatus, setClassStatus] = useState<EntityStatus>('ENABLED')

  const [subjectName, setSubjectName] = useState('')
  const [subjectShortName, setSubjectShortName] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [subjectStatus, setSubjectStatus] = useState<EntityStatus>('ENABLED')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [grades, classes, subjects] = await Promise.all([
        listGrades({ page: 1, pageSize: 50 }),
        listClasses({ page: 1, pageSize: 50 }),
        listSubjects({ page: 1, pageSize: 50 }),
      ])
      setGradeRows(grades.list)
      setClassRows(classes.list)
      setSubjectRows(subjects.list)
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

  const onCreateGrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (gradeName.trim().length < 2) {
      setError('年级名称至少 2 个字符')
      return
    }
    try {
      await createGrade({
        name: gradeName.trim(),
        stage: gradeStage.trim() || undefined,
        status: gradeStatus,
      })
      setGradeName('')
      setGradeStage('')
      setGradeStatus('ENABLED')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失败')
    }
  }

  const onCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (className.trim().length < 2 || !classGradeId) {
      setError('班级名称至少 2 个字符且必须选择年级')
      return
    }
    try {
      await createClass({
        name: className.trim(),
        gradeId: Number(classGradeId),
        status: classStatus,
      })
      setClassName('')
      setClassGradeId('')
      setClassStatus('ENABLED')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失败')
    }
  }

  const onCreateSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (subjectName.trim().length < 1) {
      setError('科目名称不能为空')
      return
    }
    try {
      await createSubject({
        name: subjectName.trim(),
        shortName: subjectShortName.trim() || undefined,
        type: subjectType.trim() || undefined,
        status: subjectStatus,
      })
      setSubjectName('')
      setSubjectShortName('')
      setSubjectType('')
      setSubjectStatus('ENABLED')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失败')
    }
  }

  const gradeNameMap = new Map(gradeRows.map((row) => [row.id, row.name]))

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>基础档案管理</h2>
        <span>
          年级 {gradeRows.length} / 班级 {classRows.length} / 科目 {subjectRows.length}
        </span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>年级管理</h3>
        <form className="inline-form" onSubmit={onCreateGrade}>
          <input
            placeholder="年级名称（如：高一）"
            value={gradeName}
            onChange={(e) => setGradeName(e.target.value)}
          />
          <input
            placeholder="学段（可选，如：高中）"
            value={gradeStage}
            onChange={(e) => setGradeStage(e.target.value)}
          />
          <select
            value={gradeStatus}
            onChange={(e) => setGradeStatus(e.target.value as EntityStatus)}
          >
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit">新增年级</button>
        </form>
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
              ) : gradeRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>暂无数据</td>
                </tr>
              ) : (
                gradeRows.map((row) => (
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

      <div className="block-card">
        <h3>班级管理</h3>
        <form className="inline-form" onSubmit={onCreateClass}>
          <input
            placeholder="班级名称（如：1班）"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <select
            value={classGradeId}
            onChange={(e) => setClassGradeId(e.target.value)}
          >
            <option value="">选择所属年级</option>
            {gradeRows.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
          <select
            value={classStatus}
            onChange={(e) => setClassStatus(e.target.value as EntityStatus)}
          >
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit">新增班级</button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>班级名称</th>
                <th>所属年级</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>加载中...</td>
                </tr>
              ) : classRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>暂无数据</td>
                </tr>
              ) : (
                classRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{gradeNameMap.get(row.gradeId) ?? row.gradeId}</td>
                    <td>{row.status === 'ENABLED' ? '启用' : '禁用'}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block-card">
        <h3>科目管理</h3>
        <form className="inline-form" onSubmit={onCreateSubject}>
          <input
            placeholder="科目名称（如：数学）"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <input
            placeholder="简称（可选，如：数）"
            value={subjectShortName}
            onChange={(e) => setSubjectShortName(e.target.value)}
          />
          <input
            placeholder="类型（可选，如：主科）"
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value)}
          />
          <select
            value={subjectStatus}
            onChange={(e) => setSubjectStatus(e.target.value as EntityStatus)}
          >
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit">新增科目</button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>科目名称</th>
                <th>简称</th>
                <th>类型</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>加载中...</td>
                </tr>
              ) : subjectRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>暂无数据</td>
                </tr>
              ) : (
                subjectRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.shortName ?? '-'}</td>
                    <td>{row.type ?? '-'}</td>
                    <td>{row.status === 'ENABLED' ? '启用' : '禁用'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
