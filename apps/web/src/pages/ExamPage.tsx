import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createExam,
  listClasses,
  listExams,
  listSubjects,
  setExamClasses,
  setExamSubjects,
} from '../lib/api'
import type { ClassItem, Exam, Subject } from '../types'

export function ExamPage() {
  const [rows, setRows] = useState<Exam[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [examType, setExamType] = useState('MIDTERM')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [classIds, setClassIds] = useState<number[]>([])

  const [bindClassIds, setBindClassIds] = useState<number[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [fullScore, setFullScore] = useState('100')
  const [subjectEntries, setSubjectEntries] = useState<Array<{ subjectId: number; fullScore: number }>>([])

  const selectedExam = useMemo(
    () => rows.find((item) => item.id === selectedExamId) ?? null,
    [rows, selectedExamId],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [examData, classData, subjectData] = await Promise.all([
        listExams({ page: 1, pageSize: 50 }),
        listClasses({ page: 1, pageSize: 100 }),
        listSubjects({ page: 1, pageSize: 100 }),
      ])
      setRows(examData.list)
      setClasses(classData.list)
      setSubjects(subjectData.list)
      if (!selectedExamId && examData.list.length > 0) {
        setSelectedExamId(examData.list[0]!.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败')
    } finally {
      setLoading(false)
    }
  }, [selectedExamId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [loadData])

  const onCreateExam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!name.trim() || classIds.length === 0 || !startDate || !endDate) {
      setError('请完整填写考试信息并至少选择一个班级')
      return
    }
    try {
      const exam = await createExam({
        name: name.trim(),
        examType,
        startDate,
        endDate,
        classIds,
      })
      setSelectedExamId(exam.id)
      setName('')
      setExamType('MIDTERM')
      setStartDate('')
      setEndDate('')
      setClassIds([])
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建考试失败')
    }
  }

  const onBindClasses = async () => {
    if (!selectedExamId) {
      setError('请先选择考试')
      return
    }
    if (bindClassIds.length === 0) {
      setError('请至少选择一个班级')
      return
    }
    try {
      await setExamClasses(selectedExamId, bindClassIds)
      setBindClassIds([])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定班级失败')
    }
  }

  const addSubjectEntry = () => {
    if (!subjectId || Number(fullScore) <= 0) {
      setError('请选择科目并填写正确分值')
      return
    }
    const sid = Number(subjectId)
    if (subjectEntries.some((item) => item.subjectId === sid)) {
      setError('同一科目不能重复添加')
      return
    }
    setSubjectEntries((prev) => [...prev, { subjectId: sid, fullScore: Number(fullScore) }])
    setSubjectId('')
    setFullScore('100')
    setError('')
  }

  const onBindSubjects = async () => {
    if (!selectedExamId) {
      setError('请先选择考试')
      return
    }
    if (subjectEntries.length === 0) {
      setError('请至少添加一个科目')
      return
    }
    try {
      await setExamSubjects(selectedExamId, subjectEntries)
      setSubjectEntries([])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定科目失败')
    }
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>考试管理</h2>
        <span>考试总数 {rows.length}</span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>创建考试</h3>
        <form className="inline-form exam-form" onSubmit={onCreateExam}>
          <input placeholder="考试名称" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="考试类型（MIDTERM）" value={examType} onChange={(e) => setExamType(e.target.value)} />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <select
            multiple
            value={classIds.map(String)}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((item) => Number(item.value))
              setClassIds(values)
            }}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <button type="submit">创建考试</button>
        </form>
      </div>

      <div className="block-card">
        <h3>考试列表</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>类型</th>
                <th>状态</th>
                <th>时间范围</th>
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
                  <tr
                    key={row.id}
                    className={selectedExamId === row.id ? 'selected-row' : undefined}
                    onClick={() => setSelectedExamId(row.id)}
                  >
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.examType}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.startDate.slice(0, 10)} ~ {row.endDate.slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block-card">
        <h3>
          配置考试（当前：
          {selectedExam ? `${selectedExam.name} #${selectedExam.id}` : '未选择'}）
        </h3>
        <div className="inline-form exam-bind-form">
          <select
            multiple
            value={bindClassIds.map(String)}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((item) => Number(item.value))
              setBindClassIds(values)
            }}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={onBindClasses}>
            覆盖设置班级
          </button>

          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">选择科目</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={fullScore}
            onChange={(e) => setFullScore(e.target.value)}
            placeholder="分值"
          />
          <button type="button" onClick={addSubjectEntry}>
            添加科目分值
          </button>
          <button type="button" onClick={onBindSubjects}>
            覆盖设置科目
          </button>
        </div>
        <div className="subject-chip-list">
          {subjectEntries.map((entry) => {
            const subjectName = subjects.find((item) => item.id === entry.subjectId)?.name ?? entry.subjectId
            return (
              <span key={entry.subjectId} className="subject-chip">
                {subjectName} / {entry.fullScore}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
