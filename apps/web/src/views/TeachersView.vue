<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">教师管理</div>
    <p class="login-hint" style="margin-bottom: 12px">共 {{ total }} 位教师（本页 {{ teachers.length }} 条）</p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="layui-form xfkj-org-toolbar">
      <button type="button" class="layui-btn xfkj-toolbar-new" @click="toggleCreate">
        <i class="layui-icon layui-icon-add-1"></i> 新建
      </button>
      <button type="button" class="layui-btn xfkj-toolbar-import" @click="scrollToTeacherImport">CSV 导入</button>
      <span class="xfkj-org-toolbar__tip">支持检索、单条删除与 CSV 批量新增。</span>
    </div>

    <div class="xn_so layui-form xfkj-filter" style="margin-top: 8px">
      <span class="input">
        <label>关键字</label>
        <input v-model="keyword" class="val" type="text" placeholder="姓名 / 手机 / 邮箱" />
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

    <div v-show="showCreate" class="block-card" style="margin-top: 16px">
      <h3 class="xfkj-org-section__title">新增教师</h3>
      <form class="inline-form exam-bind-form" @submit.prevent="onCreate">
        <input v-model="form.name" placeholder="姓名 *" required />
        <input v-model="form.gender" placeholder="性别" />
        <input v-model="form.phone" placeholder="手机" />
        <input v-model="form.email" placeholder="邮箱" type="email" />
        <select v-model="form.status">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">保存</button>
        <button type="button" class="layui-btn layui-btn-primary" @click="showCreate = false">取消</button>
      </form>
    </div>

    <div id="teacher-csv-import" class="block-card" style="margin-top: 16px">
      <h3 class="xfkj-org-section__title">批量导入（CSV）</h3>
      <p class="login-hint">
        表头：<code>name,gender,phone,email</code>（仅 name 必填；UTF-8）。
      </p>
      <div class="inline-form exam-bind-form">
        <button type="button" class="layui-btn layui-btn-primary layui-btn-sm" @click="downloadTeacherTemplate">
          下载模板
        </button>
        <label class="xfkj-files-filebtn">
          <span class="layui-btn layui-btn-sm">选择 CSV 并导入</span>
          <input
            type="file"
            accept=".csv,text/csv"
            class="xfkj-files-filebtn__input"
            @change="onTeacherCsvFile"
          />
        </label>
      </div>
      <p v-if="importMsg" class="login-hint" style="white-space: pre-wrap">{{ importMsg }}</p>
    </div>

    <div class="table-wrap xfkj-layui-table-wrap" style="margin-top: 20px">
      <table class="layui-table layui-table2">
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>性别</th>
            <th>手机</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>创建时间</th>
            <th width="160">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="xfkj-table-empty">加载中…</td>
          </tr>
          <tr v-else-if="teachers.length === 0">
            <td colspan="8" class="xfkj-table-empty">暂无数据</td>
          </tr>
          <tr v-for="row in teachers" v-else :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.gender ?? '—' }}</td>
            <td>{{ row.phone ?? '—' }}</td>
            <td>{{ row.email ?? '—' }}</td>
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
      <h3 class="xfkj-org-section__title">编辑教师 #{{ editing.id }}</h3>
      <form class="inline-form exam-bind-form" @submit.prevent="onSaveEdit">
        <input v-model="editForm.name" placeholder="姓名" required />
        <input v-model="editForm.gender" placeholder="性别" />
        <input v-model="editForm.phone" placeholder="手机" />
        <input v-model="editForm.email" placeholder="邮箱" type="email" />
        <select v-model="editForm.status">
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="submit">保存</button>
        <button type="button" class="layui-btn layui-btn-primary" @click="editing = null">关闭</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createTeacher,
  deleteTeacher,
  listTeachers,
  updateTeacher,
} from '../lib/api'
import type { EntityStatus, Teacher } from '../types'

const teachers = ref<Teacher[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const statusFilter = ref<EntityStatus | ''>('')
const showCreate = ref(false)
const importMsg = ref('')

const form = reactive({
  name: '',
  gender: '',
  phone: '',
  email: '',
  status: 'ENABLED' as EntityStatus,
})

const editing = ref<Teacher | null>(null)
const editForm = reactive({
  name: '',
  gender: '',
  phone: '',
  email: '',
  status: 'ENABLED' as EntityStatus,
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listTeachers({
      page: 1,
      pageSize: 50,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
    })
    teachers.value = res.list
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

function scrollToTeacherImport() {
  document.getElementById('teacher-csv-import')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function downloadTeacherTemplate() {
  const header = 'name,gender,phone,email\n'
  const blob = new Blob([header], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'teachers-import-template.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function parseCsvRows(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

async function onTeacherCsvFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importMsg.value = ''
  error.value = ''
  try {
    const text = await file.text()
    const rows = parseCsvRows(text)
    if (rows.length < 2) {
      importMsg.value = '文件至少需要表头与一行数据'
      return
    }
    const header = rows[0]!.map((h) => h.toLowerCase())
    const idx = (name: string) => header.indexOf(name.toLowerCase())
    const iName = idx('name')
    if (iName < 0) {
      importMsg.value = '缺少列：name'
      return
    }
    const iGender = idx('gender')
    const iPhone = idx('phone')
    const iEmail = idx('email')
    let ok = 0
    const errors: string[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!
      const name = row[iName]?.trim()
      if (!name) {
        errors.push(`第 ${r + 1} 行：姓名为空`)
        continue
      }
      const gender = iGender >= 0 ? row[iGender]?.trim() : ''
      const phone = iPhone >= 0 ? row[iPhone]?.trim() : ''
      const email = iEmail >= 0 ? row[iEmail]?.trim() : ''
      try {
        await createTeacher({
          name,
          gender: gender || undefined,
          phone: phone || undefined,
          email: email || undefined,
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
  if (!form.name.trim()) {
    error.value = '请输入姓名'
    return
  }
  try {
    await createTeacher({
      name: form.name.trim(),
      gender: form.gender.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      status: form.status,
    })
    form.name = ''
    form.gender = ''
    form.phone = ''
    form.email = ''
    form.status = 'ENABLED'
    showCreate.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '创建失败'
  }
}

function startEdit(row: Teacher) {
  editing.value = row
  editForm.name = row.name
  editForm.gender = row.gender ?? ''
  editForm.phone = row.phone ?? ''
  editForm.email = row.email ?? ''
  editForm.status = row.status
}

async function onSaveEdit() {
  if (!editing.value) return
  error.value = ''
  try {
    await updateTeacher(editing.value.id, {
      name: editForm.name.trim(),
      gender: editForm.gender.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      email: editForm.email.trim() || undefined,
      status: editForm.status,
    })
    editing.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  }
}

async function onDelete(row: Teacher) {
  if (!window.confirm(`确定删除教师「${row.name}」？`)) return
  error.value = ''
  try {
    await deleteTeacher(row.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

onMounted(() => {
  void load()
})
</script>
