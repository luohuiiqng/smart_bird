<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">阅卷任务</div>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="layui-form searchform xfkj-yj-search">
      <div class="layui-inline">
        <label class="layui-form-label">考试</label>
        <div class="layui-input-inline" style="width: 220px">
          <select v-model="examId" class="xfkj-filter__input" style="width: 100%; height: 38px" @change="onExamChange">
            <option value="">全部考试</option>
            <option v-for="exam in exams" :key="exam.id" :value="String(exam.id)">{{ exam.name }}</option>
          </select>
        </div>
      </div>
      <div class="layui-inline">
        <label class="layui-form-label">关键字</label>
        <div class="layui-input-inline" style="width: 200px">
          <input
            v-model="taskKeyword"
            type="text"
            class="val xfkj-filter__input"
            style="width: 100%"
            placeholder="任务 ID / 考试名称"
          />
        </div>
      </div>
      <button type="button" class="layui-btn layui-btn-normal layui-btn-radius" @click="onQueryTasks">
        刷新列表
      </button>
    </div>

    <ul v-if="loading" class="login-hint" style="list-style: none">加载中...</ul>
    <ul v-else class="yjlist xfkj-yjlist">
      <li
        v-for="row in filteredTasks"
        :key="row.id"
        :class="{ 'is-selected': selectedTaskId === row.id }"
        @click="onSelectTask(row.id, row.examSubjectId)"
      >
        <div class="info">
          <p><i class="layui-icon layui-icon-read"></i>{{ examNameFor(row.examId) }}</p>
          <p>
            <i class="layui-icon layui-icon-form"></i>任务 {{ row.id }} · 阅卷科目 {{ row.examSubjectId }} · 教师 {{
              row.teacherId
            }}
            · {{ taskStatusCn(row.status) }} · 学生数 {{ row.entries.length }}
          </p>
        </div>
        <button
          type="button"
          class="layui-btn layui-btn-danger layui-btn-radius so_btn"
          @click.stop="onSelectTask(row.id, row.examSubjectId)"
        >
          查看
        </button>
      </li>
    </ul>
    <p v-if="!loading && filteredTasks.length === 0" class="login-hint">暂无阅卷任务</p>

    <div class="block-card" style="margin-top: 28px">
      <h3>任务分配</h3>
      <p v-if="teacherListHint" class="login-hint">{{ teacherListHint }}</p>
      <p v-if="examStudentHint" class="login-hint">{{ examStudentHint }}</p>
      <div class="inline-form exam-bind-form xfkj-marking-assign">
        <select v-model="examSubjectId" class="xfkj-filter__input" style="min-width: 220px; height: 38px">
          <option value="">考试科目</option>
          <option v-for="item in subjectOptions" :key="item.id" :value="String(item.id)">
            {{ item.label }}（ExamSubject #{{ item.id }}）
          </option>
        </select>
        <select
          v-if="teacherUsers.length"
          v-model="teacherIdInput"
          class="xfkj-filter__input"
          style="min-width: 280px; height: 38px"
        >
          <option value="">阅卷教师（用户账号 ID）</option>
          <option v-for="u in teacherUsers" :key="u.id" :value="String(u.id)">
            {{ u.realName }}（{{ u.username }}）— 用户ID {{ u.id }}
          </option>
        </select>
        <input
          v-else
          v-model="teacherIdInput"
          class="val"
          placeholder="teacherId：系统用户 ID（非教师档案 ID）"
        />
        <textarea
          v-model="studentIdsInput"
          class="val xfkj-marking-student-ids"
          rows="2"
          placeholder="学生 ID，逗号分隔；在上方选择考试后可参考下方「本考试学号」"
        />
        <div v-if="examStudentIdsText" class="xfkj-marking-ref-ids">
          <span class="login-hint">本考试参考学号（去重）：</span>
          <pre class="xfkj-marking-ref-ids__pre">{{ examStudentIdsText }}</pre>
          <button type="button" class="layui-btn layui-btn-primary layui-btn-xs" @click="copyExamStudentIds">
            复制全部
          </button>
          <button type="button" class="layui-btn layui-btn-xs" @click="fillStudentIdsFromExam">填入分配框</button>
        </div>
        <button type="button" class="layui-btn layui-btn-normal" @click="onAssign">分配任务</button>
      </div>
      <p class="login-hint">
        阅卷教师须为<strong>登录用户 ID</strong>（教师角色账号），与「教师档案」中的档案 ID 不同。
      </p>
      <p class="login-hint">当前登录：{{ user?.realName }}（{{ user?.role }}）</p>
    </div>

    <div class="block-card">
      <h3>任务操作与进度</h3>
      <div class="inline-form exam-bind-form">
        <button type="button" :disabled="!selectedTaskId" @click="onStart">开始任务</button>
        <button type="button" :disabled="!selectedTaskId" @click="onFinish">完成任务</button>
        <input v-model="reopenReason" placeholder="回退原因" />
        <button type="button" :disabled="!selectedTaskId" @click="onReopen">回退任务</button>
      </div>
      <div class="card-grid">
        <div class="data-card">
          <h3>任务详情</h3>
          <p>
            {{
              taskDetail
                ? `提交 ${taskDetail.progress.submittedStudents}/${taskDetail.progress.totalStudents}`
                : '请选择任务'
            }}
          </p>
        </div>
        <div class="data-card">
          <h3>科目进度</h3>
          <p>
            {{
              subjectProgress ? `${(subjectProgress.progressRate * 100).toFixed(1)}%` : '请选择任务'
            }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="taskDetail" class="block-card">
      <h3>录入分数</h3>
      <p class="login-hint">
        科目「{{ taskDetail.examSubject.subject.name }}」满分 {{ taskDetail.examSubject.fullScore }} ·
        客户端将总分映射为小题 1 号提交。须先「开始任务」使任务进入阅卷中。
      </p>
      <p v-if="taskDetail.status !== 'IN_PROGRESS'" class="error-tip">
        当前状态为「{{ taskStatusCn(taskDetail.status) }}」，请先点击「开始任务」。
      </p>
      <div v-else class="table-wrap xfkj-layui-table-wrap">
        <table class="layui-table layui-table2">
          <thead>
            <tr>
              <th>学生 ID</th>
              <th>已最终提交</th>
              <th>总分</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in taskDetail.entries" :key="e.id">
              <td>{{ e.studentId }}</td>
              <td>{{ e.finalSubmitted ? '是' : '否' }}</td>
              <td>
                <input
                  v-model="scoreDraft[e.studentId]"
                  type="number"
                  step="0.01"
                  min="0"
                  :max="taskDetail.examSubject.fullScore"
                  class="val xfkj-filter__input"
                  style="width: 120px"
                />
              </td>
              <td>
                <button type="button" class="layui-btn layui-btn-xs" @click="onSubmitScore(e.studentId, false)">
                  保存
                </button>
                <button
                  type="button"
                  class="layui-btn layui-btn-xs layui-btn-normal"
                  @click="onSubmitScore(e.studentId, true)"
                >
                  最终提交
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  assignMarkingTasks,
  getExamDetail,
  getMarkingExamSubjectProgress,
  getMarkingTaskDetail,
  listExams,
  listMarkingTasks,
  listStudents,
  listUsers,
  reopenMarkingTask,
  startMarkingTask,
  finishMarkingTask,
  submitMarkingScore,
} from '../lib/api'
import type { Exam, MarkingTask, MarkingTaskStatus, OrgUser } from '../types'
import { useAuth } from '../auth/store'

const { user } = useAuth()

const exams = ref<Exam[]>([])
const tasks = ref<MarkingTask[]>([])
const error = ref('')
const loading = ref(false)

const examId = ref('')
const examSubjectId = ref('')
const teacherIdInput = ref('')
const studentIdsInput = ref('')

const selectedTaskId = ref<number | null>(null)
const taskDetail = ref<Awaited<ReturnType<typeof getMarkingTaskDetail>> | null>(null)
const subjectProgress = ref<Awaited<ReturnType<typeof getMarkingExamSubjectProgress>> | null>(null)
const reopenReason = ref('复核调整')
const subjectOptions = ref<Array<{ id: number; label: string }>>([])
const taskKeyword = ref('')

const teacherUsers = ref<OrgUser[]>([])
const teacherListHint = ref('')
const examStudentIdsText = ref('')
const examStudentHint = ref('')
const scoreDraft = ref<Record<number, string>>({})

const selectedTask = computed(() => tasks.value.find((item) => item.id === selectedTaskId.value) ?? null)

const filteredTasks = computed(() => {
  const kw = taskKeyword.value.trim().toLowerCase()
  if (!kw) return tasks.value
  return tasks.value.filter((t) => {
    const name = examNameFor(t.examId).toLowerCase()
    return (
      name.includes(kw) ||
      String(t.id).includes(kw) ||
      String(t.examSubjectId).includes(kw) ||
      String(t.teacherId).includes(kw)
    )
  })
})

function examNameFor(examId: number) {
  return exams.value.find((e) => e.id === examId)?.name ?? `考试 #${examId}`
}

function taskStatusCn(s: MarkingTaskStatus) {
  const map: Record<MarkingTaskStatus, string> = {
    TODO: '待阅卷',
    IN_PROGRESS: '阅卷中',
    DONE: '已完成',
    LOCKED: '已锁定',
  }
  return map[s] ?? s
}

async function loadTasks(targetExamId?: number) {
  loading.value = true
  error.value = ''
  try {
    const [examData, taskData] = await Promise.all([
      listExams({ page: 1, pageSize: 100 }),
      listMarkingTasks({ examId: targetExamId, page: 1, pageSize: 100 }),
    ])
    exams.value = examData.list
    tasks.value = taskData.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onExamChange() {
  void loadTasks(examId.value ? Number(examId.value) : undefined)
}

async function loadTeacherUsers() {
  try {
    const { list } = await listUsers({ role: 'TEACHER', pageSize: 200 })
    teacherUsers.value = list
    teacherListHint.value = ''
  } catch {
    teacherUsers.value = []
    teacherListHint.value =
      '无法加载教师账号列表（可能无权限）。请手动填写「教师用户 ID」，勿填教师档案 ID。'
  }
}

onMounted(() => {
  void loadTasks()
  void loadTeacherUsers()
})

watch(examId, async (id) => {
  if (!id) {
    subjectOptions.value = []
    examStudentIdsText.value = ''
    examStudentHint.value = ''
    return
  }
  try {
    const detail = await getExamDetail(Number(id))
    subjectOptions.value = detail.examSubjects.map((item) => ({
      id: item.id,
      label: `${item.subject.name} (${item.fullScore})`,
    }))
    const classIds = detail.examClasses.map((c) => c.classId)
    if (classIds.length === 0) {
      examStudentIdsText.value = ''
      examStudentHint.value = '该考试尚未绑定班级，无法列出参考学号。'
      return
    }
    const idSet = new Map<number, true>()
    await Promise.all(
      classIds.map(async (classId) => {
        try {
          const { list } = await listStudents({ classId, pageSize: 500 })
          for (const s of list) idSet.set(s.id, true)
        } catch {
          /* 无权限等 */
        }
      }),
    )
    examStudentIdsText.value = Array.from(idSet.keys())
      .sort((a, b) => a - b)
      .join(', ')
    examStudentHint.value =
      idSet.size === 0
        ? '未能拉取学生列表（权限不足或班级无学生）。请手动填写学号，或由管理员分配。'
        : ''
  } catch {
    subjectOptions.value = []
    examStudentIdsText.value = ''
    examStudentHint.value = ''
  }
})

watch(
  () => taskDetail.value,
  (d) => {
    if (!d) {
      scoreDraft.value = {}
      return
    }
    const next: Record<number, string> = {}
    for (const e of d.entries) {
      const t = e.totalScore
      next[e.studentId] =
        t !== undefined && t !== null && String(t) !== '' ? String(t) : ''
    }
    scoreDraft.value = next
  },
  { immediate: true },
)

async function onQueryTasks() {
  await loadTasks(examId.value ? Number(examId.value) : undefined)
}

async function onAssign() {
  error.value = ''
  if (!examSubjectId.value || !teacherIdInput.value || !studentIdsInput.value.trim()) {
    error.value = '请填写 examSubjectId、teacherId 和 studentIds'
    return
  }
  const studentIds = studentIdsInput.value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
  if (studentIds.length === 0) {
    error.value = 'studentIds 格式应为逗号分隔数字'
    return
  }
  try {
    await assignMarkingTasks({
      examSubjectId: Number(examSubjectId.value),
      assignments: [
        {
          teacherId: Number(teacherIdInput.value),
          studentIds,
        },
      ],
    })
    await onQueryTasks()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分配失败'
  }
}

async function onSelectTask(taskId: number, esId: number) {
  selectedTaskId.value = taskId
  error.value = ''
  try {
    const [detail, progress] = await Promise.all([
      getMarkingTaskDetail(taskId),
      getMarkingExamSubjectProgress(esId),
    ])
    taskDetail.value = detail
    subjectProgress.value = progress
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载任务详情失败'
  }
}

async function onStart() {
  if (!selectedTaskId.value) return
  await startMarkingTask(selectedTaskId.value)
  await onQueryTasks()
  if (selectedTask.value) {
    await onSelectTask(selectedTask.value.id, selectedTask.value.examSubjectId)
  }
}

async function onFinish() {
  if (!selectedTaskId.value) return
  await finishMarkingTask(selectedTaskId.value)
  await onQueryTasks()
  if (selectedTask.value) {
    await onSelectTask(selectedTask.value.id, selectedTask.value.examSubjectId)
  }
}

async function onReopen() {
  if (!selectedTaskId.value) return
  await reopenMarkingTask(selectedTaskId.value, reopenReason.value)
  await onQueryTasks()
  if (selectedTask.value) {
    await onSelectTask(selectedTask.value.id, selectedTask.value.examSubjectId)
  }
}

function copyExamStudentIds() {
  if (!examStudentIdsText.value || !navigator.clipboard?.writeText) return
  void navigator.clipboard.writeText(examStudentIdsText.value)
}

function fillStudentIdsFromExam() {
  if (examStudentIdsText.value) studentIdsInput.value = examStudentIdsText.value
}

async function onSubmitScore(studentId: number, finalSubmit: boolean) {
  if (!selectedTaskId.value || !taskDetail.value) return
  if (taskDetail.value.status !== 'IN_PROGRESS') {
    error.value = '请先点击「开始任务」进入阅卷中'
    return
  }
  const raw = scoreDraft.value[studentId] ?? ''
  const num = Number(raw)
  if (!Number.isFinite(num) || num < 0) {
    error.value = '请输入有效分数'
    return
  }
  const max = Number(taskDetail.value.examSubject.fullScore)
  if (num > max) {
    error.value = `分数不能超过满分 ${max}`
    return
  }
  error.value = ''
  try {
    await submitMarkingScore(selectedTaskId.value, {
      studentId,
      scores: [{ questionNo: 1, score: num }],
      finalSubmit,
    })
    if (selectedTask.value) {
      await onSelectTask(selectedTask.value.id, selectedTask.value.examSubjectId)
    }
    await onQueryTasks()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '提交分数失败'
  }
}
</script>

<style scoped>
.xfkj-marking-assign {
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
.xfkj-marking-student-ids {
  min-width: 260px;
  max-width: 100%;
}
.xfkj-marking-ref-ids {
  width: 100%;
}
.xfkj-marking-ref-ids__pre {
  margin: 6px 0;
  padding: 8px;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 4px;
  max-height: 120px;
  overflow: auto;
}
</style>
