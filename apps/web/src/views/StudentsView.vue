<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">学生档案</div>
    <p class="login-hint" style="margin-bottom: 12px">
      共 {{ total }} 名学生（本页 {{ students.length }} 条）
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="layui-form xfkj-org-toolbar">
      <button type="button" class="layui-btn xfkj-toolbar-new" @click="toggleCreate">
        <i class="layui-icon layui-icon-add-1"></i> 新建
      </button>
      <router-link to="/org" class="layui-btn xfkj-toolbar-secondary">年级 / 班级档案</router-link>
      <button type="button" class="layui-btn xfkj-toolbar-import" @click="scrollToImport">CSV 导入</button>
      <span class="xfkj-org-toolbar__tip">请先维护年级与班级；新建学生需选择年级与班级。</span>
    </div>

    <div class="xn_so layui-form xfkj-filter" style="margin-top: 8px">
      <span class="input">
        <label>年级</label>
        <select v-model="filterGradeId" class="xfkj-filter__input">
          <option value="">全部</option>
          <option v-for="g in grades" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
        </select>
      </span>
      <span class="input">
        <label>班级</label>
        <select v-model="filterClassId" class="xfkj-filter__input">
          <option value="">全部</option>
          <option v-for="c in filteredClassesForFilter" :key="c.id" :value="String(c.id)">
            {{ c.name }}
          </option>
        </select>
      </span>
      <span class="input">
        <label>关键字</label>
        <input v-model="keyword" class="val" type="text" placeholder="姓名 / 学号" />
      </span>
      <span class="input">
        <label>状态</label>
        <select v-model="statusFilter" class="xfkj-filter__input">
          <option value="">全部</option>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
      </span>
      <span class="input">
        <input type="button" class="btn xfkj-btn xfkj-btn--search" value="搜索" @click="load" />
      </span>
    </div>

    <div id="student-csv-import" class="block-card" style="margin-top: 16px">
      <h3 class="xfkj-org-section__title">批量导入（CSV）</h3>
      <p class="login-hint">
        表头必填列：<code>studentNo,name,gradeName,className</code>；可选 <code>gender</code>。编码 UTF-8；年级、班级名称须与上方档案一致。
      </p>
      <div class="inline-form exam-bind-form">
        <button type="button" class="layui-btn layui-btn-primary layui-btn-sm" @click="downloadStudentTemplate">
          下载模板
        </button>
        <label class="xfkj-files-filebtn">
          <span class="layui-btn layui-btn-sm">选择 CSV 并导入</span>
          <input
            type="file"
            accept=".csv,text/csv"
            class="xfkj-files-filebtn__input"
            @change="onStudentCsvFile"
          />
        </label>
      </div>
      <p v-if="importMsg" class="login-hint" style="white-space: pre-wrap">{{ importMsg }}</p>
    </div>

    <div v-show="showCreate" class="block-card" style="margin-top: 16px">
      <h3 class="xfkj-org-section__title">新增学生</h3>
      <form class="inline-form exam-bind-form" @submit.prevent="onCreate">
        <input v-model="form.studentNo" placeholder="学号 *" required />
        <input v-model="form.name" placeholder="姓名 *" required />
        <input v-model="form.gender" placeholder="性别" />
        <select v-model="formGradeId" required>
          <option value="">年级 *</option>
          <option v-for="g in grades" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
        </select>
        <select v-model="form.classId" required>
          <option value="">班级 *</option>
          <option v-for="c in classesForForm" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </select>
        <select v-model="form.status">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">保存</button>
        <button type="button" class="layui-btn layui-btn-primary" @click="showCreate = false">取消</button>
      </form>
    </div>

    <div class="table-wrap xfkj-layui-table-wrap" style="margin-top: 20px">
      <table class="layui-table layui-table2">
        <thead>
          <tr>
            <th>ID</th>
            <th>学号</th>
            <th>姓名</th>
            <th>性别</th>
            <th>年级</th>
            <th>班级</th>
            <th>状态</th>
            <th>创建时间</th>
            <th width="220">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="xfkj-table-empty">加载中…</td>
          </tr>
          <tr v-else-if="students.length === 0">
            <td colspan="9" class="xfkj-table-empty">暂无数据</td>
          </tr>
          <tr v-for="row in students" v-else :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.studentNo }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.gender ?? '—' }}</td>
            <td>{{ row.grade.name }}</td>
            <td>{{ row.class.name }}</td>
            <td>{{ row.status === 'ENABLED' ? '启用' : '禁用' }}</td>
            <td>{{ new Date(row.createdAt).toLocaleString() }}</td>
            <td>
              <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="startEdit(row)">
                编辑
              </button>
              <button type="button" class="layui-btn layui-btn-xs layui-btn-danger" @click="onDelete(row)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="editing" class="block-card" style="margin-top: 20px">
      <h3 class="xfkj-org-section__title">编辑学生 #{{ editing.id }}</h3>
      <form class="inline-form exam-bind-form" @submit.prevent="onSaveEdit">
        <input v-model="editForm.studentNo" placeholder="学号 *" required />
        <input v-model="editForm.name" placeholder="姓名 *" required />
        <input v-model="editForm.gender" placeholder="性别" />
        <select v-model="editGradeId" required>
          <option value="">年级 *</option>
          <option v-for="g in grades" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
        </select>
        <select v-model="editForm.classId" required>
          <option value="">班级 *</option>
          <option v-for="c in classesForEdit" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </select>
        <select v-model="editForm.status">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit" class="layui-btn layui-btn-normal">保存</button>
        <button type="button" class="layui-btn layui-btn-primary" @click="cancelEdit">取消</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createStudent,
  deleteStudent,
  listClasses,
  listGrades,
  listStudents,
  updateStudent,
} from '../lib/api'
import type { ClassItem, EntityStatus, Grade, Student } from '../types'

const students = ref<Student[]>([])
const grades = ref<Grade[]>([])
const classes = ref<ClassItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

const keyword = ref('')
const statusFilter = ref<EntityStatus | ''>('')
const filterGradeId = ref('')
const filterClassId = ref('')
const showCreate = ref(false)
const importMsg = ref('')

const form = reactive({
  studentNo: '',
  name: '',
  gender: '',
  status: 'ENABLED' as EntityStatus,
})
const formGradeId = ref('')
const formClassId = ref('')

const editing = ref<Student | null>(null)
const editGradeId = ref('')
const editForm = reactive({
  studentNo: '',
  name: '',
  gender: '',
  classId: '',
  status: 'ENABLED' as EntityStatus,
})

const classesForForm = computed(() => {
  if (!formGradeId.value) return []
  const gid = Number(formGradeId.value)
  return classes.value.filter((c) => c.gradeId === gid)
})

const filteredClassesForFilter = computed(() => {
  if (!filterGradeId.value) return classes.value
  const gid = Number(filterGradeId.value)
  return classes.value.filter((c) => c.gradeId === gid)
})

const classesForEdit = computed(() => {
  if (!editGradeId.value) return []
  const gid = Number(editGradeId.value)
  return classes.value.filter((c) => c.gradeId === gid)
})

watch(formGradeId, () => {
  formClassId.value = ''
})

watch(editGradeId, () => {
  editForm.classId = ''
})

watch(filterGradeId, () => {
  filterClassId.value = ''
})

async function loadMeta() {
  const [g, c] = await Promise.all([
    listGrades({ page: 1, pageSize: 100 }),
    listClasses({ page: 1, pageSize: 200 }),
  ])
  grades.value = g.list
  classes.value = c.list
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listStudents({
      page: 1,
      pageSize: 100,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      gradeId: filterGradeId.value ? Number(filterGradeId.value) : undefined,
      classId: filterClassId.value ? Number(filterClassId.value) : undefined,
    })
    students.value = res.list
    total.value = res.total
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleCreate() {
  showCreate.value = !showCreate.value
}

function scrollToImport() {
  document.getElementById('student-csv-import')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function downloadStudentTemplate() {
  const header = 'studentNo,name,gender,gradeName,className\n'
  const blob = new Blob([header], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'students-import-template.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

async function onStudentCsvFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importMsg.value = ''
  error.value = ''
  try {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) {
      importMsg.value = '文件至少需要表头与一行数据'
      return
    }
    const header = rows[0]!.map((h) => h.toLowerCase())
    const idx = (name: string) => header.indexOf(name.toLowerCase())
    const iNo = idx('studentno')
    const iName = idx('name')
    const iGrade = idx('gradename')
    const iClass = idx('classname')
    const iGender = idx('gender')
    if (iNo < 0 || iName < 0 || iGrade < 0 || iClass < 0) {
      importMsg.value = '缺少必填列：studentNo, name, gradeName, className'
      return
    }
    let ok = 0
    const errors: string[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!
      const studentNo = row[iNo]?.trim()
      const name = row[iName]?.trim()
      const gradeName = row[iGrade]?.trim()
      const className = row[iClass]?.trim()
      const gender = iGender >= 0 ? row[iGender]?.trim() : ''
      if (!studentNo || !name || !gradeName || !className) {
        errors.push(`第 ${r + 1} 行：有空字段`)
        continue
      }
      const grade = grades.value.find((g) => g.name === gradeName)
      if (!grade) {
        errors.push(`第 ${r + 1} 行：找不到年级「${gradeName}」`)
        continue
      }
      const cls = classes.value.find(
        (c) => c.gradeId === grade.id && c.name === className,
      )
      if (!cls) {
        errors.push(`第 ${r + 1} 行：找不到班级「${gradeName}/${className}」`)
        continue
      }
      try {
        await createStudent({
          studentNo,
          name,
          gender: gender || undefined,
          gradeId: grade.id,
          classId: cls.id,
          status: 'ENABLED',
        })
        ok++
      } catch (e) {
        errors.push(`第 ${r + 1} 行：${e instanceof Error ? e.message : '失败'}`)
      }
    }
    importMsg.value = `导入完成：成功 ${ok} 条。\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\n…' : ''}`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '读取 CSV 失败'
  }
}

async function onCreate() {
  error.value = ''
  if (!form.studentNo.trim() || !form.name.trim() || !formGradeId.value || !formClassId.value) {
    error.value = '请填写学号、姓名并选择年级与班级'
    return
  }
  try {
    await createStudent({
      studentNo: form.studentNo.trim(),
      name: form.name.trim(),
      gender: form.gender.trim() || undefined,
      gradeId: Number(formGradeId.value),
      classId: Number(formClassId.value),
      status: form.status,
    })
    form.studentNo = ''
    form.name = ''
    form.gender = ''
    form.status = 'ENABLED'
    formGradeId.value = ''
    formClassId.value = ''
    showCreate.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '创建失败'
  }
}

async function onDelete(row: Student) {
  if (!window.confirm(`确定删除学生「${row.name}」？`)) return
  error.value = ''
  try {
    await deleteStudent(row.id)
    if (editing.value?.id === row.id) editing.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

function startEdit(row: Student) {
  editing.value = row
  editForm.studentNo = row.studentNo
  editForm.name = row.name
  editForm.gender = row.gender ?? ''
  editGradeId.value = String(row.grade.id)
  editForm.classId = String(row.class.id)
  editForm.status = row.status
}

async function onSaveEdit() {
  if (!editing.value) return
  error.value = ''
  if (!editForm.studentNo.trim() || !editForm.name.trim() || !editGradeId.value || !editForm.classId) {
    error.value = '请完整填写学号、姓名、年级与班级'
    return
  }
  try {
    await updateStudent(editing.value.id, {
      studentNo: editForm.studentNo.trim(),
      name: editForm.name.trim(),
      gender: editForm.gender.trim() || undefined,
      gradeId: Number(editGradeId.value),
      classId: Number(editForm.classId),
      status: editForm.status,
    })
    editing.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  }
}

function cancelEdit() {
  editing.value = null
}

onMounted(async () => {
  try {
    await loadMeta()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '初始化失败'
  }
})
</script>
