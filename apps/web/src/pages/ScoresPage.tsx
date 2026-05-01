import { useCallback, useEffect, useState } from 'react'
import {
  getAnalysisClassCompare,
  getAnalysisSubjectBreakdown,
  getAnalysisSummary,
  getStudentExamScore,
  listExamScores,
  listExams,
  publishExamScores,
  recalculateExamScores,
  unpublishExamScores,
} from '../lib/api'
import type { Exam, ExamSummary, ScoreRow, ScoreStudentDetail } from '../types'

export function ScoresPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [examId, setExamId] = useState('')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [summary, setSummary] = useState<ExamSummary | null>(null)
  const [classCompare, setClassCompare] = useState<
    Array<{ classId: number; className: string; avgScore: number; passRate: number }>
  >([])
  const [subjectBreakdown, setSubjectBreakdown] = useState<
    Array<{
      examSubjectId: number
      subjectName: string
      avgScore: number
      maxScore: number
      minScore: number
      passRate: number
    }>
  >([])
  const [studentDetail, setStudentDetail] = useState<ScoreStudentDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishNote, setPublishNote] = useState('期中成绩正式发布')
  const [unpublishReason, setUnpublishReason] = useState('复核后重发')

  const loadExamOptions = useCallback(async () => {
    const examData = await listExams({ page: 1, pageSize: 100 })
    setExams(examData.list)
    if (!examId && examData.list.length > 0) {
      setExamId(String(examData.list[0]!.id))
    }
  }, [examId])

  const loadScores = useCallback(async (targetExamId?: number) => {
    const id = targetExamId ?? Number(examId)
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [scoreData, sum, compare, breakdown] = await Promise.all([
        listExamScores(id, { page: 1, pageSize: 200 }),
        getAnalysisSummary(id),
        getAnalysisClassCompare(id),
        getAnalysisSubjectBreakdown(id),
      ])
      setRows(scoreData.list)
      setSummary(sum)
      setClassCompare(compare)
      setSubjectBreakdown(breakdown)
      setStudentDetail(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        await loadExamOptions()
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载考试失败')
      }
    })
  }, [loadExamOptions])

  useEffect(() => {
    if (!examId) return
    queueMicrotask(() => {
      void loadScores(Number(examId))
    })
  }, [examId, loadScores])

  const onRecalculate = async () => {
    if (!examId) return
    await recalculateExamScores(Number(examId))
    await loadScores(Number(examId))
  }

  const onPublish = async () => {
    if (!examId) return
    await publishExamScores(Number(examId), publishNote)
    await loadExamOptions()
  }

  const onUnpublish = async () => {
    if (!examId) return
    await unpublishExamScores(Number(examId), unpublishReason)
    await loadExamOptions()
  }

  const onViewStudent = async (studentId: number) => {
    if (!examId) return
    const detail = await getStudentExamScore(Number(examId), studentId)
    setStudentDetail(detail)
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>成绩与分析</h2>
        <span>成绩条数 {rows.length}</span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>成绩操作</h3>
        <div className="inline-form exam-bind-form">
          <select value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">选择考试</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} ({exam.status})
              </option>
            ))}
          </select>
          <button type="button" onClick={onRecalculate}>
            重算成绩
          </button>
          <input value={publishNote} onChange={(e) => setPublishNote(e.target.value)} />
          <button type="button" onClick={onPublish}>
            发布成绩
          </button>
          <input value={unpublishReason} onChange={(e) => setUnpublishReason(e.target.value)} />
          <button type="button" onClick={onUnpublish}>
            撤回发布
          </button>
        </div>
      </div>

      <div className="card-grid">
        <div className="data-card">
          <h3>总览</h3>
          <p>人数：{summary?.studentCount ?? '-'}</p>
          <p>均分：{summary?.avgScore ?? '-'}</p>
          <p>最高：{summary?.maxScore ?? '-'}</p>
          <p>最低：{summary?.minScore ?? '-'}</p>
          <p>及格率：{summary ? `${(summary.passRate * 100).toFixed(1)}%` : '-'}</p>
        </div>
        <div className="data-card">
          <h3>班级对比</h3>
          {classCompare.length === 0 ? (
            <p>暂无</p>
          ) : (
            classCompare.slice(0, 5).map((item) => (
              <p key={item.classId}>
                {item.className}: 均分 {item.avgScore} / 及格率 {(item.passRate * 100).toFixed(1)}%
              </p>
            ))
          )}
        </div>
        <div className="data-card">
          <h3>分科统计</h3>
          {subjectBreakdown.length === 0 ? (
            <p>暂无</p>
          ) : (
            subjectBreakdown.slice(0, 5).map((item) => (
              <p key={item.examSubjectId}>
                {item.subjectName}: 均分 {item.avgScore} / 及格率 {(item.passRate * 100).toFixed(1)}%
              </p>
            ))
          )}
        </div>
      </div>

      <div className="block-card">
        <h3>成绩列表</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>学生ID</th>
                <th>姓名</th>
                <th>总分</th>
                <th>班排</th>
                <th>年排</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>加载中...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>暂无成绩</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.studentId}</td>
                    <td>{row.student.name}</td>
                    <td>{row.totalScore}</td>
                    <td>{row.rankInClass ?? '-'}</td>
                    <td>{row.rankInGrade ?? '-'}</td>
                    <td>
                      <button type="button" onClick={() => onViewStudent(row.studentId)}>
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block-card">
        <h3>学生分科详情</h3>
        {!studentDetail ? (
          <p>点击成绩列表中的“查看详情”加载</p>
        ) : (
          <>
            <p>
              学生：{studentDetail.total.student.name}（总分 {studentDetail.total.totalScore}）
            </p>
            <div className="subject-chip-list">
              {studentDetail.subjects.map((item) => (
                <span key={item.id} className="subject-chip">
                  {item.examSubject.subject.name}: {item.score}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
