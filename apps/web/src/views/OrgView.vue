<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">基础档案管理</div>
    <p class="login-hint" style="margin-bottom: 12px">
      年级 {{ gradeRows.length }} · 班级 {{ classRows.length }} · 科目 {{ subjectRows.length }}
    </p>

    <div class="layui-form xfkj-org-toolbar">
      <router-link class="layui-btn layui-btn-normal" to="/teachers">教师列表</router-link>
      <router-link class="layui-btn layui-btn-normal" to="/students">学生列表</router-link>
      <button type="button" class="layui-btn" @click="scrollToAnchor('org-grade')">
        <i class="layui-icon layui-icon-location"></i> 年级档案
      </button>
      <button type="button" class="layui-btn layui-btn-normal" @click="scrollToAnchor('org-class')">
        <i class="layui-icon layui-icon-location"></i> 班级档案
      </button>
      <button type="button" class="layui-btn layui-btn-warm" @click="scrollToAnchor('org-subject')">
        <i class="layui-icon layui-icon-location"></i> 科目档案
      </button>
      <span class="xfkj-org-toolbar__tip">年级 / 班级 / 科目分区；教师与学生可在各自列表页 CSV 批量导入。</span>
    </div>

    <div v-if="error" class="error-tip">{{ error }}</div>

    <div id="org-grade" class="block-card xfkj-org-section">
      <h3 class="xfkj-org-section__title">年级管理</h3>
      <form class="inline-form" @submit.prevent="onCreateGrade">
        <input v-model="gradeName" placeholder="年级名称（如：高一）" />
        <input v-model="gradeStage" placeholder="学段（可选，如：高中）" />
        <select v-model="gradeStatus">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">新增年级</button>
      </form>
      <p class="login-hint xfkj-org-csv-hint">
        CSV 批量：表头 <code>name</code>（必填）、<code>stage</code>、<code>status</code>（ENABLED/DISABLED）。与手工数据冲突时以后端唯一约束为准，建议小批量试导。
      </p>
      <label class="layui-btn layui-btn-primary layui-btn-sm xfkj-org-csv-btn">
        导入年级 CSV
        <input type="file" accept=".csv,text/csv" class="xfkj-org-csv-input" @change="onGradeCsv" />
      </label>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>年级名称</th>
              <th>学段</th>
              <th>状态</th>
              <th>创建时间</th>
              <th width="100">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6">加载中...</td>
            </tr>
            <tr v-else-if="gradeRows.length === 0">
              <td colspan="6">暂无数据</td>
            </tr>
            <tr v-for="row in gradeRows" v-else :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.stage ?? '-' }}</td>
              <td>{{ row.status === 'ENABLED' ? '启用' : '禁用' }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td>
                <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="startEditGrade(row)">
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="editingGrade" class="xfkj-org-inline-edit">
        <h4 class="xfkj-org-inline-edit__title">编辑年级 #{{ editingGrade.id }}</h4>
        <form class="inline-form" @submit.prevent="saveGradeEdit">
          <input v-model="gradeEdit.name" placeholder="年级名称" required minlength="2" />
          <input v-model="gradeEdit.stage" placeholder="学段（可选）" />
          <select v-model="gradeEdit.status">
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit" class="layui-btn layui-btn-xs layui-btn-normal">保存</button>
          <button type="button" class="layui-btn layui-btn-xs layui-btn-primary" @click="cancelGradeEdit">取消</button>
        </form>
      </div>
    </div>

    <div id="org-class" class="block-card xfkj-org-section">
      <h3 class="xfkj-org-section__title">班级管理</h3>
      <form class="inline-form" @submit.prevent="onCreateClass">
        <input v-model="className" placeholder="班级名称（如：1班）" />
        <select v-model="classGradeId">
          <option value="">选择所属年级</option>
          <option v-for="g in gradeRows" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
        </select>
        <select v-model="classStatus">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">新增班级</button>
      </form>
      <p class="login-hint xfkj-org-csv-hint">
        CSV 批量：表头 <code>name</code>、<code>gradeName</code>（年级名称，须已存在）、<code>status</code>。须先导入/建好年级。
      </p>
      <label class="layui-btn layui-btn-primary layui-btn-sm xfkj-org-csv-btn">
        导入班级 CSV
        <input type="file" accept=".csv,text/csv" class="xfkj-org-csv-input" @change="onClassCsv" />
      </label>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>班级名称</th>
              <th>所属年级</th>
              <th>状态</th>
              <th>创建时间</th>
              <th width="100">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6">加载中...</td>
            </tr>
            <tr v-else-if="classRows.length === 0">
              <td colspan="6">暂无数据</td>
            </tr>
            <tr v-for="row in classRows" v-else :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row.name }}</td>
              <td>{{ gradeNameMap.get(row.gradeId) ?? row.gradeId }}</td>
              <td>{{ row.status === 'ENABLED' ? '启用' : '禁用' }}</td>
              <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td>
                <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="startEditClass(row)">
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="editingClass" class="xfkj-org-inline-edit">
        <h4 class="xfkj-org-inline-edit__title">编辑班级 #{{ editingClass.id }}</h4>
        <form class="inline-form" @submit.prevent="saveClassEdit">
          <select v-model="classEdit.gradeId" required>
            <option v-for="g in gradeRows" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
          </select>
          <input v-model="classEdit.name" placeholder="班级名称" required minlength="2" />
          <select v-model="classEdit.status">
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit" class="layui-btn layui-btn-xs layui-btn-normal">保存</button>
          <button type="button" class="layui-btn layui-btn-xs layui-btn-primary" @click="cancelClassEdit">取消</button>
        </form>
      </div>
    </div>

    <div id="org-subject" class="block-card xfkj-org-section">
      <h3 class="xfkj-org-section__title">科目管理</h3>
      <form class="inline-form" @submit.prevent="onCreateSubject">
        <input v-model="subjectName" placeholder="科目名称（如：数学）" />
        <input v-model="subjectShortName" placeholder="简称（可选，如：数）" />
        <input v-model="subjectType" placeholder="类型（可选，如：主科）" />
        <select v-model="subjectStatus">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">新增科目</button>
      </form>
      <p class="login-hint xfkj-org-csv-hint">
        CSV 批量：表头 <code>name</code>、<code>shortName</code>、<code>type</code>、<code>status</code>。
      </p>
      <label class="layui-btn layui-btn-primary layui-btn-sm xfkj-org-csv-btn">
        导入科目 CSV
        <input type="file" accept=".csv,text/csv" class="xfkj-org-csv-input" @change="onSubjectCsv" />
      </label>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>科目名称</th>
              <th>简称</th>
              <th>类型</th>
              <th>状态</th>
              <th width="100">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6">加载中...</td>
            </tr>
            <tr v-else-if="subjectRows.length === 0">
              <td colspan="6">暂无数据</td>
            </tr>
            <tr v-for="row in subjectRows" v-else :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.shortName ?? '-' }}</td>
              <td>{{ row.type ?? '-' }}</td>
              <td>{{ row.status === 'ENABLED' ? '启用' : '禁用' }}</td>
              <td>
                <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="startEditSubject(row)">
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="editingSubject" class="xfkj-org-inline-edit">
        <h4 class="xfkj-org-inline-edit__title">编辑科目 #{{ editingSubject.id }}</h4>
        <form class="inline-form" @submit.prevent="saveSubjectEdit">
          <input v-model="subjectEdit.name" placeholder="科目名称" required />
          <input v-model="subjectEdit.shortName" placeholder="简称（可选）" />
          <input v-model="subjectEdit.type" placeholder="类型（可选）" />
          <select v-model="subjectEdit.status">
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
          <button type="submit" class="layui-btn layui-btn-xs layui-btn-normal">保存</button>
          <button type="button" class="layui-btn layui-btn-xs layui-btn-primary" @click="cancelSubjectEdit">取消</button>
        </form>
      </div>
    </div>

    <p v-if="csvImportMsg" class="login-hint xfkj-org-csv-msg">{{ csvImportMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createClass,
  createGrade,
  createSubject,
  listClasses,
  listGrades,
  listSubjects,
  updateClass,
  updateGrade,
  updateSubject,
} from '../lib/api'
import type { ClassItem, EntityStatus, Grade, Subject } from '../types'

const gradeRows = ref<Grade[]>([])
const classRows = ref<ClassItem[]>([])
const subjectRows = ref<Subject[]>([])
const loading = ref(false)
const error = ref('')

const gradeName = ref('')
const gradeStage = ref('')
const gradeStatus = ref<EntityStatus>('ENABLED')

const className = ref('')
const classGradeId = ref('')
const classStatus = ref<EntityStatus>('ENABLED')

const subjectName = ref('')
const subjectShortName = ref('')
const subjectType = ref('')
const subjectStatus = ref<EntityStatus>('ENABLED')

const csvImportMsg = ref('')

const editingGrade = ref<Grade | null>(null)
const gradeEdit = reactive({ name: '', stage: '', status: 'ENABLED' as EntityStatus })

const editingClass = ref<ClassItem | null>(null)
const classEdit = reactive({ gradeId: '', name: '', status: 'ENABLED' as EntityStatus })

const editingSubject = ref<Subject | null>(null)
const subjectEdit = reactive({
  name: '',
  shortName: '',
  type: '',
  status: 'ENABLED' as EntityStatus,
})

const gradeNameMap = computed(() => new Map(gradeRows.value.map((row) => [row.id, row.name])))

function clearOrgEditors() {
  editingGrade.value = null
  editingClass.value = null
  editingSubject.value = null
}

function startEditGrade(row: Grade) {
  clearOrgEditors()
  editingGrade.value = row
  gradeEdit.name = row.name
  gradeEdit.stage = row.stage ?? ''
  gradeEdit.status = row.status
}

async function saveGradeEdit() {
  if (!editingGrade.value) return
  error.value = ''
  try {
    await updateGrade(editingGrade.value.id, {
      name: gradeEdit.name.trim(),
      stage: gradeEdit.stage.trim() || undefined,
      status: gradeEdit.status,
    })
    editingGrade.value = null
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  }
}

function startEditClass(row: ClassItem) {
  clearOrgEditors()
  editingClass.value = row
  classEdit.gradeId = String(row.gradeId)
  classEdit.name = row.name
  classEdit.status = row.status
}

async function saveClassEdit() {
  if (!editingClass.value) return
  error.value = ''
  try {
    await updateClass(editingClass.value.id, {
      gradeId: Number(classEdit.gradeId),
      name: classEdit.name.trim(),
      status: classEdit.status,
    })
    editingClass.value = null
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  }
}

function startEditSubject(row: Subject) {
  clearOrgEditors()
  editingSubject.value = row
  subjectEdit.name = row.name
  subjectEdit.shortName = row.shortName ?? ''
  subjectEdit.type = row.type ?? ''
  subjectEdit.status = row.status
}

async function saveSubjectEdit() {
  if (!editingSubject.value) return
  error.value = ''
  try {
    await updateSubject(editingSubject.value.id, {
      name: subjectEdit.name.trim(),
      shortName: subjectEdit.shortName.trim() || undefined,
      type: subjectEdit.type.trim() || undefined,
      status: subjectEdit.status,
    })
    editingSubject.value = null
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  }
}

function cancelGradeEdit() {
  editingGrade.value = null
}

function cancelClassEdit() {
  editingClass.value = null
}

function cancelSubjectEdit() {
  editingSubject.value = null
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [grades, classes, subjects] = await Promise.all([
      listGrades({ page: 1, pageSize: 50 }),
      listClasses({ page: 1, pageSize: 50 }),
      listSubjects({ page: 1, pageSize: 50 }),
    ])
    gradeRows.value = grades.list
    classRows.value = classes.list
    subjectRows.value = subjects.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询失败'
  } finally {
    loading.value = false
  }
}

function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

function parseStatus(s: string | undefined): EntityStatus | undefined {
  const u = s?.toUpperCase()
  if (u === 'ENABLED' || u === 'DISABLED') return u
  return undefined
}

async function onGradeCsv(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  csvImportMsg.value = ''
  error.value = ''
  try {
    const rows = parseCsv(await file.text())
    if (rows.length < 2) {
      csvImportMsg.value = '文件至少需要表头与一行数据'
      return
    }
    const header = rows[0]!.map((h) => h.toLowerCase())
    const col = (name: string) => header.indexOf(name.toLowerCase())
    const iName = col('name')
    if (iName < 0) {
      csvImportMsg.value = '缺少必填列 name'
      return
    }
    const iStage = col('stage')
    const iStatus = col('status')
    let ok = 0
    const errors: string[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!
      const name = row[iName]?.trim()
      if (!name) {
        errors.push(`第 ${r + 1} 行：name 为空`)
        continue
      }
      try {
        await createGrade({
          name,
          stage: iStage >= 0 ? row[iStage]?.trim() || undefined : undefined,
          status: iStatus >= 0 ? parseStatus(row[iStatus]) : undefined,
        })
        ok++
      } catch (e) {
        errors.push(`第 ${r + 1} 行：${e instanceof Error ? e.message : '失败'}`)
      }
    }
    await loadData()
    csvImportMsg.value = `年级导入：成功 ${ok} 条。${errors.slice(0, 10).join('；')}${errors.length > 10 ? ' …' : ''}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取 CSV 失败'
  }
}

async function onClassCsv(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  csvImportMsg.value = ''
  error.value = ''
  await loadData()
  try {
    const rows = parseCsv(await file.text())
    if (rows.length < 2) {
      csvImportMsg.value = '文件至少需要表头与一行数据'
      return
    }
    const header = rows[0]!.map((h) => h.toLowerCase())
    const col = (name: string) => header.indexOf(name.toLowerCase())
    const iName = col('name')
    const iGrade = col('gradename')
    if (iName < 0 || iGrade < 0) {
      csvImportMsg.value = '缺少必填列 name, gradeName'
      return
    }
    const iStatus = col('status')
    let ok = 0
    const errors: string[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!
      const name = row[iName]?.trim()
      const gname = row[iGrade]?.trim()
      if (!name || !gname) {
        errors.push(`第 ${r + 1} 行：name 或 gradeName 为空`)
        continue
      }
      const grade = gradeRows.value.find((g) => g.name === gname)
      if (!grade) {
        errors.push(`第 ${r + 1} 行：找不到年级「${gname}」`)
        continue
      }
      try {
        await createClass({
          name,
          gradeId: grade.id,
          status: iStatus >= 0 ? parseStatus(row[iStatus]) : undefined,
        })
        ok++
      } catch (e) {
        errors.push(`第 ${r + 1} 行：${e instanceof Error ? e.message : '失败'}`)
      }
    }
    await loadData()
    csvImportMsg.value = `班级导入：成功 ${ok} 条。${errors.slice(0, 10).join('；')}${errors.length > 10 ? ' …' : ''}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取 CSV 失败'
  }
}

async function onSubjectCsv(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  csvImportMsg.value = ''
  error.value = ''
  try {
    const rows = parseCsv(await file.text())
    if (rows.length < 2) {
      csvImportMsg.value = '文件至少需要表头与一行数据'
      return
    }
    const header = rows[0]!.map((h) => h.toLowerCase())
    const col = (name: string) => header.indexOf(name.toLowerCase())
    const iName = col('name')
    if (iName < 0) {
      csvImportMsg.value = '缺少必填列 name'
      return
    }
    const iShort = col('shortname')
    const iType = col('type')
    const iStatus = col('status')
    let ok = 0
    const errors: string[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!
      const name = row[iName]?.trim()
      if (!name) {
        errors.push(`第 ${r + 1} 行：name 为空`)
        continue
      }
      try {
        await createSubject({
          name,
          shortName: iShort >= 0 ? row[iShort]?.trim() || undefined : undefined,
          type: iType >= 0 ? row[iType]?.trim() || undefined : undefined,
          status: iStatus >= 0 ? parseStatus(row[iStatus]) : undefined,
        })
        ok++
      } catch (e) {
        errors.push(`第 ${r + 1} 行：${e instanceof Error ? e.message : '失败'}`)
      }
    }
    await loadData()
    csvImportMsg.value = `科目导入：成功 ${ok} 条。${errors.slice(0, 10).join('；')}${errors.length > 10 ? ' …' : ''}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取 CSV 失败'
  }
}

onMounted(() => {
  void loadData()
})

async function onCreateGrade() {
  error.value = ''
  if (gradeName.value.trim().length < 2) {
    error.value = '年级名称至少 2 个字符'
    return
  }
  try {
    await createGrade({
      name: gradeName.value.trim(),
      stage: gradeStage.value.trim() || undefined,
      status: gradeStatus.value,
    })
    gradeName.value = ''
    gradeStage.value = ''
    gradeStatus.value = 'ENABLED'
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增失败'
  }
}

async function onCreateClass() {
  error.value = ''
  if (className.value.trim().length < 2 || !classGradeId.value) {
    error.value = '班级名称至少 2 个字符且必须选择年级'
    return
  }
  try {
    await createClass({
      name: className.value.trim(),
      gradeId: Number(classGradeId.value),
      status: classStatus.value,
    })
    className.value = ''
    classGradeId.value = ''
    classStatus.value = 'ENABLED'
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增失败'
  }
}

async function onCreateSubject() {
  error.value = ''
  if (subjectName.value.trim().length < 1) {
    error.value = '科目名称不能为空'
    return
  }
  try {
    await createSubject({
      name: subjectName.value.trim(),
      shortName: subjectShortName.value.trim() || undefined,
      type: subjectType.value.trim() || undefined,
      status: subjectStatus.value,
    })
    subjectName.value = ''
    subjectShortName.value = ''
    subjectType.value = ''
    subjectStatus.value = 'ENABLED'
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增失败'
  }
}
</script>

<style scoped>
.xfkj-org-csv-hint {
  margin-top: 10px;
}
.xfkj-org-csv-btn {
  position: relative;
  display: inline-block;
  margin-top: 6px;
  overflow: hidden;
  cursor: pointer;
}
.xfkj-org-csv-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.xfkj-org-csv-msg {
  margin-top: 16px;
  white-space: pre-wrap;
}

.xfkj-org-inline-edit {
  margin-top: 16px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.xfkj-org-inline-edit__title {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1274f8;
}
</style>
