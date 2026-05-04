<template>
  <div class="org-page xfkj-subpage xfkj-analysis">
    <div class="layui-card-header xfkj-yj-card-head">成绩分析</div>
    <p class="login-hint" style="margin-bottom: 12px">
      基于考试得分聚合统计；均分、及格率按总分满分 ×60% 估算及格线。
      <router-link class="xfkj-analysis__link" to="/scores">成绩明细查询</router-link>
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
        <router-link v-if="examId" class="layui-btn layui-btn-xs layui-btn-normal" :to="scoresLink">查看该考试成绩单</router-link>
      </span>
    </div>

    <template v-if="examId">
      <div class="xfkj-analysis__metrics">
        <div class="data-card">
          <h3>参考人数</h3>
          <p class="xfkj-analysis__num">{{ summary?.studentCount ?? '—' }}</p>
        </div>
        <div class="data-card">
          <h3>平均分</h3>
          <p class="xfkj-analysis__num">{{ summary?.avgScore ?? '—' }}</p>
        </div>
        <div class="data-card">
          <h3>最高分 / 最低分</h3>
          <p class="xfkj-analysis__num">
            {{ summary ? `${summary.maxScore} / ${summary.minScore}` : '—' }}
          </p>
        </div>
        <div class="data-card">
          <h3>及格率</h3>
          <p class="xfkj-analysis__num">
            {{ summary ? `${(summary.passRate * 100).toFixed(1)}%` : '—' }}
          </p>
        </div>
      </div>

      <div class="block-card xfkj-analysis__block">
        <h3>班级对比（按均分排序）</h3>
        <div class="table-wrap xfkj-layui-table-wrap">
          <table class="layui-table layui-table2">
            <thead>
              <tr>
                <th>班级</th>
                <th>均分</th>
                <th>及格率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="3">加载中…</td>
              </tr>
              <tr v-else-if="classCompare.length === 0">
                <td colspan="3">暂无分班成绩数据</td>
              </tr>
              <tr v-for="row in classCompare" v-else :key="row.classId">
                <td>{{ row.className }}</td>
                <td>{{ row.avgScore }}</td>
                <td>{{ (row.passRate * 100).toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="block-card xfkj-analysis__block">
        <h3>科目维度</h3>
        <div class="table-wrap xfkj-layui-table-wrap">
          <table class="layui-table layui-table2">
            <thead>
              <tr>
                <th>科目</th>
                <th>均分</th>
                <th>最高</th>
                <th>最低</th>
                <th>及格率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5">加载中…</td>
              </tr>
              <tr v-else-if="subjectBreakdown.length === 0">
                <td colspan="5">暂无分科得分</td>
              </tr>
              <tr v-for="row in subjectBreakdown" v-else :key="row.examSubjectId">
                <td>{{ row.subjectName }}</td>
                <td>{{ row.avgScore }}</td>
                <td>{{ row.maxScore }}</td>
                <td>{{ row.minScore }}</td>
                <td>{{ (row.passRate * 100).toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  getAnalysisClassCompare,
  getAnalysisSubjectBreakdown,
  getAnalysisSummary,
  listExams,
} from '../lib/api'
import type { Exam, ExamStatus, ExamSummary } from '../types'

const exams = ref<Exam[]>([])
const examId = ref('')
const summary = ref<ExamSummary | null>(null)
const classCompare = ref<Array<{ classId: number; className: string; avgScore: number; passRate: number }>>([])
const subjectBreakdown = ref<
  Array<{
    examSubjectId: number
    subjectName: string
    avgScore: number
    maxScore: number
    minScore: number
    passRate: number
  }>
>([])
const error = ref('')
const loading = ref(false)

const scoresLink = computed(() =>
  examId.value ? { path: '/scores', query: { exam: examId.value } } : '/scores',
)

function examStatusCn(s: ExamStatus) {
  const map: Record<ExamStatus, string> = {
    CREATED: '创建',
    MARKING: '阅卷',
    PENDING_PUBLISH: '待发布',
    PUBLISHED: '已发布',
  }
  return map[s] ?? s
}

async function loadExamOptions() {
  const examData = await listExams({ page: 1, pageSize: 100 })
  exams.value = examData.list
  if (!examId.value && examData.list.length > 0) {
    examId.value = String(examData.list[0]!.id)
  }
}

async function loadAnalysis(id: number) {
  loading.value = true
  error.value = ''
  try {
    const [sum, cc, sb] = await Promise.all([
      getAnalysisSummary(id),
      getAnalysisClassCompare(id),
      getAnalysisSubjectBreakdown(id),
    ])
    summary.value = sum
    classCompare.value = cc
    subjectBreakdown.value = sb
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    summary.value = null
    classCompare.value = []
    subjectBreakdown.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadExamOptions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载考试失败'
  }
})

watch(examId, (id) => {
  if (!id) {
    summary.value = null
    classCompare.value = []
    subjectBreakdown.value = []
    return
  }
  void loadAnalysis(Number(id))
})
</script>

<style scoped>
.xfkj-analysis__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.xfkj-analysis__num {
  font-size: 22px;
  font-weight: 600;
  margin: 8px 0 0;
  color: #1274f8;
}

.xfkj-analysis__block {
  margin-bottom: 20px;
}

.xfkj-analysis__link {
  margin-left: 12px;
  color: #1274f8;
}
</style>
