import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  assignMarkingTasks,
  getExamDetail,
  getMarkingExamSubjectProgress,
  getMarkingTaskDetail,
  listExams,
  listMarkingTasks,
  reopenMarkingTask,
  startMarkingTask,
  finishMarkingTask,
} from '../lib/api'
import type { Exam, MarkingTask } from '../types'
import { useAuth } from '../auth/useAuth'

export function MarkingPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [tasks, setTasks] = useState<MarkingTask[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [examId, setExamId] = useState('')
  const [examSubjectId, setExamSubjectId] = useState('')
  const [teacherIdInput, setTeacherIdInput] = useState('')
  const [studentIdsInput, setStudentIdsInput] = useState('')

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [taskDetail, setTaskDetail] = useState<Awaited<ReturnType<typeof getMarkingTaskDetail>> | null>(null)
  const [subjectProgress, setSubjectProgress] = useState<Awaited<ReturnType<typeof getMarkingExamSubjectProgress>> | null>(null)
  const [reopenReason, setReopenReason] = useState('复核调整')
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: number; label: string }>>([])

  const selectedTask = useMemo(
    () => tasks.find((item) => item.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  )

  const loadTasks = useCallback(async (targetExamId?: number) => {
    setLoading(true)
    setError('')
    try {
      const [examData, taskData] = await Promise.all([
        listExams({ page: 1, pageSize: 100 }),
        listMarkingTasks({ examId: targetExamId, page: 1, pageSize: 100 }),
      ])
      setExams(examData.list)
      setTasks(taskData.list)
      if (!examId && examData.list.length > 0) {
        setExamId(String(examData.list[0]!.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadTasks()
    })
  }, [loadTasks])

  useEffect(() => {
    queueMicrotask(async () => {
      if (!examId) {
        setSubjectOptions([])
        return
      }
      try {
        const detail = await getExamDetail(Number(examId))
        const options = detail.examSubjects.map((item) => ({
          id: item.id,
          label: `${item.subject.name} (${item.fullScore})`,
        }))
        setSubjectOptions(options)
      } catch {
        setSubjectOptions([])
      }
    })
  }, [examId])

  const onQueryTasks = async () => {
    await loadTasks(examId ? Number(examId) : undefined)
  }

  const onAssign = async () => {
    setError('')
    if (!examSubjectId || !teacherIdInput || !studentIdsInput.trim()) {
      setError('请填写 examSubjectId、teacherId 和 studentIds')
      return
    }
    const studentIds = studentIdsInput
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0)
    if (studentIds.length === 0) {
      setError('studentIds 格式应为逗号分隔数字')
      return
    }
    try {
      await assignMarkingTasks({
        examSubjectId: Number(examSubjectId),
        assignments: [
          {
            teacherId: Number(teacherIdInput),
            studentIds,
          },
        ],
      })
      await onQueryTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : '分配失败')
    }
  }

  const onSelectTask = async (taskId: number, esId: number) => {
    setSelectedTaskId(taskId)
    setError('')
    try {
      const [detail, progress] = await Promise.all([
        getMarkingTaskDetail(taskId),
        getMarkingExamSubjectProgress(esId),
      ])
      setTaskDetail(detail)
      setSubjectProgress(progress)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载任务详情失败')
    }
  }

  const onStart = async () => {
    if (!selectedTaskId) return
    await startMarkingTask(selectedTaskId)
    await onQueryTasks()
    if (selectedTask) {
      await onSelectTask(selectedTask.id, selectedTask.examSubjectId)
    }
  }

  const onFinish = async () => {
    if (!selectedTaskId) return
    await finishMarkingTask(selectedTaskId)
    await onQueryTasks()
    if (selectedTask) {
      await onSelectTask(selectedTask.id, selectedTask.examSubjectId)
    }
  }

  const onReopen = async () => {
    if (!selectedTaskId) return
    await reopenMarkingTask(selectedTaskId, reopenReason)
    await onQueryTasks()
    if (selectedTask) {
      await onSelectTask(selectedTask.id, selectedTask.examSubjectId)
    }
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>阅卷任务</h2>
        <span>任务总数 {tasks.length}</span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>任务分配（首版）</h3>
        <div className="inline-form exam-bind-form">
          <select value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">选择考试</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
          <select value={examSubjectId} onChange={(e) => setExamSubjectId(e.target.value)}>
            <option value="">选择考试科目ID</option>
            {subjectOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} - {item.label}
              </option>
            ))}
          </select>
          <input
            placeholder="teacherId（用户ID）"
            value={teacherIdInput}
            onChange={(e) => setTeacherIdInput(e.target.value)}
          />
          <input
            placeholder="studentIds 逗号分隔"
            value={studentIdsInput}
            onChange={(e) => setStudentIdsInput(e.target.value)}
          />
          <button type="button" onClick={onAssign}>
            分配任务
          </button>
          <button type="button" onClick={onQueryTasks}>
            刷新列表
          </button>
        </div>
        <p className="login-hint">
          当前登录：{user?.realName}（{user?.role}）
        </p>
      </div>

      <div className="block-card">
        <h3>任务列表</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>考试ID</th>
                <th>科目ID</th>
                <th>教师ID</th>
                <th>状态</th>
                <th>学生数</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>加载中...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6}>暂无任务</td>
                </tr>
              ) : (
                tasks.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedTaskId === row.id ? 'selected-row' : undefined}
                    onClick={() => onSelectTask(row.id, row.examSubjectId)}
                  >
                    <td>{row.id}</td>
                    <td>{row.examId}</td>
                    <td>{row.examSubjectId}</td>
                    <td>{row.teacherId}</td>
                    <td>{row.status}</td>
                    <td>{row.entries.length}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block-card">
        <h3>任务操作与进度</h3>
        <div className="inline-form exam-bind-form">
          <button type="button" onClick={onStart} disabled={!selectedTaskId}>
            开始任务
          </button>
          <button type="button" onClick={onFinish} disabled={!selectedTaskId}>
            完成任务
          </button>
          <input
            placeholder="回退原因"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
          />
          <button type="button" onClick={onReopen} disabled={!selectedTaskId}>
            回退任务
          </button>
        </div>
        <div className="card-grid">
          <div className="data-card">
            <h3>任务详情</h3>
            <p>
              {taskDetail
                ? `提交 ${taskDetail.progress.submittedStudents}/${taskDetail.progress.totalStudents}`
                : '请选择任务'}
            </p>
          </div>
          <div className="data-card">
            <h3>科目进度</h3>
            <p>
              {subjectProgress
                ? `${(subjectProgress.progressRate * 100).toFixed(1)}%`
                : '请选择任务'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
