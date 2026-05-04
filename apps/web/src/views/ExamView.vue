<template>
  <div class="org-page xfkj-subpage">
    <div v-if="errorMsg" class="error-tip">{{ errorMsg }}</div>

    <div class="xfkj-page-toolbar main_right_btn">
      <button type="button" class="btn1 xfkj-btn xfkj-btn--create" @click="scrollToCreate">新建考试</button>
    </div>

    <div class="main_box" style="padding: 0; background: transparent; box-shadow: none; margin-top: 0">
      <div class="title xfkj-page-title">本校考试管理</div>

      <div class="xn_so layui-form xfkj-filter">
        <span class="input">
          <label>年级</label>
          <select v-model="filterGradeId" class="xfkj-filter__input">
            <option value="">全部</option>
            <option v-for="g in grades" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
          </select>
        </span>
        <span class="input">
          <label>月份</label>
          <input v-model="filterMonth" class="val xfkj-filter__input" type="month" />
        </span>
        <span class="input">
          <label>阶段</label>
          <select v-model="filterStep" class="xfkj-filter__input">
            <option value="">全部</option>
            <option value="CREATED">创建阶段</option>
            <option value="MARKING">阅卷阶段</option>
            <option value="PENDING_PUBLISH">待发布阶段</option>
            <option value="PUBLISHED">已发布阶段</option>
          </select>
        </span>
        <span class="input">
          <input
            v-model="filterKeyword"
            class="val"
            type="text"
            placeholder="要搜索的标题"
            @keyup.enter="applyFilterHint"
          />
        </span>
        <span class="input">
          <input type="button" class="btn xfkj-btn xfkj-btn--search" value="搜索" @click="applyFilterHint" />
        </span>
      </div>

      <div class="xn_cont xfkj-exam-list">
        <div v-if="loading" class="login-hint">加载中...</div>
        <template v-else>
          <div
            v-for="row in filteredRows"
            :key="row.id"
            class="xn_li"
            :class="{ 'is-selected': selectedExamId === row.id }"
            @click="selectedExamId = row.id"
          >
            <label class="kemu">{{ shortType(row.examType) }}</label>
            <div class="xn_tit">
              <div class="name">
                <span>{{ row.name }}</span>
                <label>{{ examStatusLabel(row.status) }}</label>
              </div>
              <div class="biaoqian">
                <span>编号: {{ row.id }}</span>
                <span>制作: {{ row.createdBy }}</span>
                <span
                  >时间:【{{ row.startDate.slice(0, 10) }} ~ {{ row.endDate.slice(0, 10) }}】</span
                >
              </div>
            </div>
            <div class="xfkj-exam-card__body">
              <div v-if="(row.examSubjects?.length ?? 0) > 0" class="xfkj-exam-card__subjects">
                <div v-if="examSubjectsDone(row).length" class="xfkj-exam-card__subject-row">
                  <span class="xfkj-exam-card__phase-label">阅卷已完成</span>
                  <span
                    v-for="es in examSubjectsDone(row)"
                    :key="es.id"
                    class="xfkj-exam-chip xfkj-exam-chip--done"
                    >{{ es.subject.name }}</span
                  >
                </div>
                <div v-if="examSubjectsPending(row).length" class="xfkj-exam-card__subject-row">
                  <span class="xfkj-exam-card__phase-label">阅卷未完成</span>
                  <span
                    v-for="es in examSubjectsPending(row)"
                    :key="es.id"
                    class="xfkj-exam-chip xfkj-exam-chip--pending"
                    >{{ es.subject.name }}</span
                  >
                </div>
              </div>
              <p v-else class="xfkj-exam-card__empty-sub">暂无考试科目</p>
              <div class="xfkj-exam-card__actions">
                <button
                  type="button"
                  class="layui-btn layui-btn-xs layui-btn-normal"
                  @click.stop="selectAndManage(row.id)"
                >
                  考试管理
                </button>
              </div>
            </div>
          </div>
          <p v-if="filteredRows.length === 0" class="login-hint">暂无符合条件的考试</p>
        </template>
      </div>
    </div>

    <div id="xfkj-exam-create" class="block-card" style="margin-top: 28px">
      <h3>创建考试</h3>
      <form class="inline-form exam-form" @submit.prevent="onCreateExam">
        <input v-model="name" placeholder="考试名称" />
        <input v-model="examType" placeholder="考试类型（MIDTERM）" />
        <input v-model="startDate" type="date" />
        <input v-model="endDate" type="date" />
        <select v-model="classIds" multiple>
          <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
        </select>
        <button type="submit">创建考试</button>
      </form>
    </div>

    <div id="xfkj-exam-config" class="block-card">
      <h3>
        配置考试（当前：{{
          selectedExam ? `${selectedExam.name} #${selectedExam.id}` : '未选择'
        }}）
      </h3>
      <div class="inline-form exam-bind-form">
        <select v-model="bindClassIds" multiple>
          <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
        </select>
        <button type="button" @click="onBindClasses">覆盖设置班级</button>

        <select v-model="subjectId">
          <option value="">选择科目</option>
          <option v-for="subject in subjects" :key="subject.id" :value="String(subject.id)">
            {{ subject.name }}
          </option>
        </select>
        <input v-model="fullScore" type="number" min="1" placeholder="分值" />
        <button type="button" @click="addSubjectEntry">添加科目分值</button>
        <button type="button" @click="onBindSubjects">覆盖设置科目</button>
      </div>
      <div class="subject-chip-list">
        <span v-for="entry in subjectEntries" :key="entry.subjectId" class="subject-chip">
          {{ subjectName(entry.subjectId) }} / {{ entry.fullScore }}
        </span>
      </div>
    </div>

    <div v-if="selectedExam" class="block-card xfkj-exam-preview">
      <h3>参考班级与科目（发布条件）</h3>
      <p v-if="detailLoading" class="login-hint">加载考试详情…</p>
      <template v-else-if="examDetail">
        <div class="xfkj-exam-preview__section">
          <h4 class="xfkj-exam-preview__h4">参考班级</h4>
          <ul v-if="examDetail.examClasses.length" class="xfkj-exam-preview__list">
            <li v-for="ec in examDetail.examClasses" :key="ec.classId">
              {{ ec.class.name }}（班级 ID {{ ec.class.id }} · 年级 ID {{ ec.class.gradeId }}）
            </li>
          </ul>
          <p v-else class="login-hint">尚未绑定班级；请先在上方「覆盖设置班级」。</p>
        </div>
        <div class="xfkj-exam-preview__section">
          <h4 class="xfkj-exam-preview__h4">考试科目与阅卷完成</h4>
          <div class="table-wrap xfkj-layui-table-wrap">
            <table class="layui-table layui-table2">
              <thead>
                <tr>
                  <th>科目</th>
                  <th>满分</th>
                  <th>阅卷完成</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="examDetail.examSubjects.length === 0">
                  <tr>
                    <td colspan="3">尚未绑定科目</td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="es in examDetail.examSubjects" :key="es.id">
                    <td>{{ es.subject.name }}</td>
                    <td>{{ es.fullScore }}</td>
                    <td>
                      <template v-if="es.markingCompletedAt">
                        已完成 · {{ formatDetailDate(es.markingCompletedAt) }}
                      </template>
                      <template v-else>未完成</template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
        <p class="login-hint xfkj-exam-preview__hint">
          「发布考试」要求至少有一科出现<strong>阅卷完成</strong>时间（该科全部阅卷任务均「完成任务」后由系统自动写入）。无法发布时请到
          <router-link to="/marking">阅卷任务</router-link>
          检查分配、打分与完成任务。
        </p>
      </template>
    </div>

    <div v-if="selectedExam" class="block-card xfkj-exam-ops">
      <h3>状态与操作</h3>
      <p class="login-hint">
        当前考试状态：<strong>{{ examStatusLabel(selectedExam.status) }}</strong>（与「成绩发布」相互独立，详见用户指南）
      </p>
      <div class="inline-form exam-bind-form xfkj-exam-ops-btns">
        <button
          v-if="selectedExam.status === 'CREATED'"
          type="button"
          class="layui-btn"
          @click="onToMarking"
        >
          进入阅卷阶段
        </button>
        <button
          v-if="selectedExam.status === 'MARKING'"
          type="button"
          class="layui-btn"
          @click="onToPendingPublish"
        >
          结束阅卷 → 待发布
        </button>
        <button
          v-if="selectedExam.status === 'PENDING_PUBLISH'"
          type="button"
          class="layui-btn layui-btn-normal"
          @click="onPublishExamFlow"
        >
          发布考试
        </button>
        <p
          v-if="selectedExam.status === 'PENDING_PUBLISH'"
          class="login-hint xfkj-exam-ops__publish-tip"
        >
          若提示失败，多为尚未有任何科目「阅卷完成」，请先完成阅卷闭环。
        </p>
        <button
          v-if="selectedExam.status === 'PENDING_PUBLISH'"
          type="button"
          class="layui-btn layui-btn-warm"
          @click="onBackToMarking"
        >
          退回阅卷
        </button>
        <template v-if="selectedExam.status === 'PUBLISHED'">
          <input v-model="unpublishReason" class="val" type="text" placeholder="撤回原因" />
          <button type="button" class="layui-btn layui-btn-danger" @click="onUnpublishExamFlow">
            撤回考试发布
          </button>
        </template>
        <template v-if="canDeleteExam">
          <input v-model="deleteExamReason" class="val" type="text" placeholder="删除说明（可选）" />
          <button type="button" class="layui-btn layui-btn-danger" @click="onRemoveExam">删除考试</button>
        </template>
      </div>
      <p class="login-hint">
        <router-link to="/marking">阅卷任务</router-link>
        &nbsp;|&nbsp;
        <router-link to="/scores">成绩查询</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  changeExamStatus,
  createExam,
  getExamDetail,
  listClasses,
  listExams,
  listGrades,
  listSubjects,
  publishExamWorkflow,
  removeExam,
  setExamClasses,
  setExamSubjects,
  unpublishExamWorkflow,
} from '../lib/api'
import type { ClassItem, Exam, ExamDetail, ExamListExamSubject, ExamStatus, Grade, Subject } from '../types'

const route = useRoute()

const rows = ref<Exam[]>([])
const classes = ref<ClassItem[]>([])
const subjects = ref<Subject[]>([])
const loading = ref(false)
const errorMsg = ref('')
const selectedExamId = ref<number | null>(null)

const filterGradeId = ref('')
const filterMonth = ref('')
const filterStep = ref<ExamStatus | ''>('')
const filterKeyword = ref('')
const grades = ref<Grade[]>([])

const name = ref('')
const examType = ref('MIDTERM')
const startDate = ref('')
const endDate = ref('')
const classIds = ref<number[]>([])

const bindClassIds = ref<number[]>([])
const subjectId = ref('')
const fullScore = ref('100')
const subjectEntries = ref<Array<{ subjectId: number; fullScore: number }>>([])

const selectedExam = computed(() => rows.value.find((item) => item.id === selectedExamId.value) ?? null)

const canDeleteExam = computed(() => {
  const s = selectedExam.value?.status
  return s === 'CREATED' || s === 'PENDING_PUBLISH'
})

const unpublishReason = ref('考务调整')
const deleteExamReason = ref('')

const examDetail = ref<ExamDetail | null>(null)
const detailLoading = ref(false)

function formatDetailDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function loadExamDetail() {
  if (!selectedExamId.value) {
    examDetail.value = null
    return
  }
  detailLoading.value = true
  try {
    examDetail.value = await getExamDetail(selectedExamId.value)
  } catch {
    examDetail.value = null
  } finally {
    detailLoading.value = false
  }
}

watch(selectedExamId, () => {
  void loadExamDetail()
})

function syncSelectFromRoute() {
  const q = route.query.select
  if (typeof q !== 'string' || q === '') return
  const id = Number(q)
  if (!Number.isFinite(id)) return
  if (rows.value.some((r) => r.id === id)) {
    selectedExamId.value = id
    void loadExamDetail()
  }
}

const filteredRows = computed(() => {
  let list = [...rows.value]
  if (filterGradeId.value) {
    const gid = Number(filterGradeId.value)
    list = list.filter((e) =>
      (e.examClasses ?? []).some((ec) => ec.class.gradeId === gid),
    )
  }
  if (filterStep.value) {
    list = list.filter((e) => e.status === filterStep.value)
  }
  if (filterMonth.value) {
    const m = filterMonth.value
    list = list.filter(
      (e) =>
        e.startDate.slice(0, 7) === m ||
        e.endDate.slice(0, 7) === m ||
        (e.startDate <= `${m}-31` && e.endDate >= `${m}-01`),
    )
  }
  const kw = filterKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (e) => e.name.toLowerCase().includes(kw) || String(e.id).includes(kw) || e.examType.toLowerCase().includes(kw),
    )
  }
  return list
})

function shortType(t: string) {
  return t.length > 4 ? t.slice(0, 4) : t
}

function examStatusLabel(s: ExamStatus) {
  const map: Record<ExamStatus, string> = {
    CREATED: '创建阶段',
    MARKING: '阅卷阶段',
    PENDING_PUBLISH: '待发布阶段',
    PUBLISHED: '已发布阶段',
  }
  return map[s] ?? s
}

function applyFilterHint() {
  /* 筛选由 computed 完成，按钮用于习惯对齐小帆「搜索」 */
}

function scrollToCreate() {
  document.getElementById('xfkj-exam-create')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToExamConfig() {
  document.getElementById('xfkj-exam-config')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function selectAndManage(examId: number) {
  selectedExamId.value = examId
  scrollToExamConfig()
}

function examSubjectsDone(row: Exam): ExamListExamSubject[] {
  return (row.examSubjects ?? []).filter((es) => Boolean(es.markingCompletedAt))
}

function examSubjectsPending(row: Exam): ExamListExamSubject[] {
  return (row.examSubjects ?? []).filter((es) => !es.markingCompletedAt)
}

function subjectName(sid: number) {
  return subjects.value.find((item) => item.id === sid)?.name ?? sid
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [examData, classData, subjectData, gradeData] = await Promise.all([
      listExams({ page: 1, pageSize: 50 }),
      listClasses({ page: 1, pageSize: 100 }),
      listSubjects({ page: 1, pageSize: 100 }),
      listGrades({ page: 1, pageSize: 100 }),
    ])
    rows.value = examData.list
    classes.value = classData.list
    subjects.value = subjectData.list
    grades.value = gradeData.list
    if (!selectedExamId.value && examData.list.length > 0) {
      selectedExamId.value = examData.list[0]!.id
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '查询失败'
  } finally {
    loading.value = false
  }
  await loadExamDetail()
}

watch(
  () => route.query.select,
  () => {
    syncSelectFromRoute()
  },
)

onMounted(async () => {
  await loadData()
  syncSelectFromRoute()
})

async function onCreateExam() {
  errorMsg.value = ''
  if (!name.value.trim() || classIds.value.length === 0 || !startDate.value || !endDate.value) {
    errorMsg.value = '请完整填写考试信息并至少选择一个班级'
    return
  }
  try {
    const exam = await createExam({
      name: name.value.trim(),
      examType: examType.value,
      startDate: startDate.value,
      endDate: endDate.value,
      classIds: classIds.value,
    })
    selectedExamId.value = exam.id
    name.value = ''
    examType.value = 'MIDTERM'
    startDate.value = ''
    endDate.value = ''
    classIds.value = []
    await loadData()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '创建考试失败'
  }
}

async function onBindClasses() {
  if (!selectedExamId.value) {
    errorMsg.value = '请先选择考试'
    return
  }
  if (bindClassIds.value.length === 0) {
    errorMsg.value = '请至少选择一个班级'
    return
  }
  try {
    await setExamClasses(selectedExamId.value, bindClassIds.value)
    bindClassIds.value = []
    errorMsg.value = ''
    await loadData()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '绑定班级失败'
  }
}

function addSubjectEntry() {
  if (!subjectId.value || Number(fullScore.value) <= 0) {
    errorMsg.value = '请选择科目并填写正确分值'
    return
  }
  const sid = Number(subjectId.value)
  if (subjectEntries.value.some((item) => item.subjectId === sid)) {
    errorMsg.value = '同一科目不能重复添加'
    return
  }
  subjectEntries.value = [...subjectEntries.value, { subjectId: sid, fullScore: Number(fullScore.value) }]
  subjectId.value = ''
  fullScore.value = '100'
  errorMsg.value = ''
}

async function onBindSubjects() {
  if (!selectedExamId.value) {
    errorMsg.value = '请先选择考试'
    return
  }
  if (subjectEntries.value.length === 0) {
    errorMsg.value = '请至少添加一个科目'
    return
  }
  try {
    await setExamSubjects(selectedExamId.value, subjectEntries.value)
    subjectEntries.value = []
    errorMsg.value = ''
    await loadData()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '绑定科目失败'
  }
}

async function onToMarking() {
  if (!selectedExamId.value) return
  errorMsg.value = ''
  try {
    await changeExamStatus(selectedExamId.value, 'MARKING')
    await loadData()
    await loadExamDetail()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '操作失败'
  }
}

async function onToPendingPublish() {
  if (!selectedExamId.value) return
  errorMsg.value = ''
  try {
    await changeExamStatus(selectedExamId.value, 'PENDING_PUBLISH')
    await loadData()
    await loadExamDetail()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '操作失败'
  }
}

async function onPublishExamFlow() {
  if (!selectedExamId.value) return
  errorMsg.value = ''
  try {
    await publishExamWorkflow(selectedExamId.value)
    await loadData()
    await loadExamDetail()
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : '发布失败（需各科阅卷完成标记后再试）'
  }
}

async function onBackToMarking() {
  if (!selectedExamId.value) return
  errorMsg.value = ''
  try {
    await changeExamStatus(selectedExamId.value, 'MARKING')
    await loadData()
    await loadExamDetail()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '操作失败'
  }
}

async function onUnpublishExamFlow() {
  if (!selectedExamId.value) return
  errorMsg.value = ''
  try {
    await unpublishExamWorkflow(selectedExamId.value, unpublishReason.value.trim() || '撤回')
    await loadData()
    await loadExamDetail()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '撤回失败'
  }
}

async function onRemoveExam() {
  if (!selectedExamId.value) return
  if (!window.confirm('确定删除该考试？（软删除，已进入阅卷或已发布的不可删）')) return
  errorMsg.value = ''
  try {
    const id = selectedExamId.value
    await removeExam(id, deleteExamReason.value.trim() || undefined)
    selectedExamId.value = null
    deleteExamReason.value = ''
    await loadData()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '删除失败'
  }
}
</script>
