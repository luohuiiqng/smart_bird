<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">成绩查询</div>
    <p class="login-hint" style="margin-bottom: 8px">
      当前考试下成绩条数 {{ displayRows.length }} / {{ rows.length }}
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="xn_so layui-form xfkj-filter xfkj-scores-filter">
      <span class="input">
        <label>考试</label>
        <select v-model="examId" class="xfkj-filter__input">
          <option value="">选择考试</option>
          <option v-for="exam in exams" :key="exam.id" :value="String(exam.id)">
            {{ exam.name }}（{{ examStatusCn(exam.status) }}）
          </option>
        </select>
      </span>
      <span class="input">
        <label>学生</label>
        <input v-model="scoreKeyword" class="val" type="text" placeholder="姓名 / 学号关键字" />
      </span>
      <span class="input">
        <input type="button" class="btn" value="筛选" @click="onFilterHint" />
      </span>
    </div>

    <div class="block-card">
      <h3>成绩发布</h3>
      <div class="inline-form exam-bind-form">
        <button type="button" @click="onRecalculate">重算成绩</button>
        <input v-model="publishNote" />
        <button type="button" @click="onPublish">发布成绩</button>
        <input v-model="unpublishReason" />
        <button type="button" @click="onUnpublish">撤回发布</button>
      </div>
    </div>

    <div class="block-card">
      <h3>成绩列表</h3>
      <div class="table-wrap xfkj-layui-table-wrap">
        <table class="layui-table layui-table2">
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
            <tr v-if="loading">
              <td colspan="6">加载中...</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="6">暂无成绩</td>
            </tr>
            <tr v-for="row in displayRows" v-else :key="row.id">
              <td>{{ row.studentId }}</td>
              <td>{{ row.student.name }}</td>
              <td>{{ row.totalScore }}</td>
              <td>{{ row.rankInClass ?? '-' }}</td>
              <td>{{ row.rankInGrade ?? '-' }}</td>
              <td>
                <button type="button" @click="onViewStudent(row.studentId)">查看详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="block-card">
      <h3>学生分科详情</h3>
      <template v-if="!studentDetail">
        <p>点击成绩列表中的“查看详情”加载</p>
      </template>
      <template v-else>
        <p>学生：{{ studentDetail.total.student.name }}（总分 {{ studentDetail.total.totalScore }}）</p>
        <div class="subject-chip-list">
          <span v-for="item in studentDetail.subjects" :key="item.id" class="subject-chip">
            {{ item.examSubject.subject.name }}: {{ item.score }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getStudentExamScore,
  listExamScores,
  listExams,
  publishExamScores,
  recalculateExamScores,
  unpublishExamScores,
} from '../lib/api'
import type { Exam, ExamStatus, ScoreRow, ScoreStudentDetail } from '../types'

const route = useRoute()

const exams = ref<Exam[]>([])
const examId = ref('')
const rows = ref<ScoreRow[]>([])
const scoreKeyword = ref('')

const displayRows = computed(() => {
  const kw = scoreKeyword.value.trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter(
    (r) =>
      r.student.name.toLowerCase().includes(kw) ||
      String(r.studentId).includes(kw) ||
      String(r.id).includes(kw),
  )
})
const studentDetail = ref<ScoreStudentDetail | null>(null)
const error = ref('')
const loading = ref(false)
const publishNote = ref('期中成绩正式发布')
const unpublishReason = ref('复核后重发')

function examStatusCn(s: ExamStatus) {
  const map: Record<ExamStatus, string> = {
    CREATED: '创建',
    MARKING: '阅卷',
    PENDING_PUBLISH: '待发布',
    PUBLISHED: '已发布',
  }
  return map[s] ?? s
}

function onFilterHint() {
  /* 筛选由 displayRows 实时计算，按钮对齐小帆交互习惯 */
}

async function loadExamOptions() {
  const examData = await listExams({ page: 1, pageSize: 100 })
  exams.value = examData.list
  if (!examId.value && examData.list.length > 0) {
    examId.value = String(examData.list[0]!.id)
  }
}

async function loadScores(targetExamId?: number) {
  const id = targetExamId ?? Number(examId.value)
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    const scoreData = await listExamScores(id, { page: 1, pageSize: 200 })
    rows.value = scoreData.list
    studentDetail.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadExamOptions()
    const q = route.query.exam
    if (typeof q === 'string' && q) {
      examId.value = q
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载考试失败'
  }
})

watch(examId, (id) => {
  if (!id) return
  void loadScores(Number(id))
})

watch(
  () => route.query.exam,
  (q) => {
    if (typeof q === 'string' && q && q !== examId.value) {
      examId.value = q
    }
  },
)

async function onRecalculate() {
  if (!examId.value) return
  await recalculateExamScores(Number(examId.value))
  await loadScores(Number(examId.value))
}

async function onPublish() {
  if (!examId.value) return
  await publishExamScores(Number(examId.value), publishNote.value)
  await loadExamOptions()
}

async function onUnpublish() {
  if (!examId.value) return
  await unpublishExamScores(Number(examId.value), unpublishReason.value)
  await loadExamOptions()
}

async function onViewStudent(studentId: number) {
  if (!examId.value) return
  const detail = await getStudentExamScore(Number(examId.value), studentId)
  studentDetail.value = detail
}
</script>
