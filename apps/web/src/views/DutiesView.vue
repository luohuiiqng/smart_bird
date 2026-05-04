<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">职务设置</div>
    <p class="login-hint">
      维护本校<strong>登录账号</strong>的系统角色（管理员 / 教师）。此处的「职务」与档案库中的教师名片相互独立；后者请在「教师管理」编辑。
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div v-if="forbidden" class="error-tip">仅学校管理员或系统管理员可访问用户列表。</div>

    <div v-else class="table-wrap xfkj-layui-table-wrap">
      <table class="layui-table layui-table2">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>姓名</th>
            <th>角色</th>
            <th>状态</th>
            <th width="200">调整角色</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="6">暂无用户</td>
          </tr>
          <tr v-for="u in rows" v-else :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.realName }}</td>
            <td>{{ roleCn(u.role) }}</td>
            <td>{{ u.status === 'ENABLED' ? '启用' : '停用' }}</td>
            <td>
              <template v-if="canEditRow(u)">
                <select
                  :value="u.role"
                  class="xfkj-filter__input"
                  style="max-width: 140px; display: inline-block"
                  @change="onRoleChange(u, ($event.target as HTMLSelectElement).value as UserRole)"
                >
                  <option value="SCHOOL_ADMIN">学校管理员</option>
                  <option value="TEACHER">教师</option>
                  <option v-if="isSystemScope" value="SYSTEM_ADMIN">系统管理员</option>
                </select>
              </template>
              <template v-else>—</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listUsers, updateUser } from '../lib/api'
import { useAuth } from '../auth/store'
import type { OrgUser, UserRole } from '../types'

const { user } = useAuth()
const rows = ref<OrgUser[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const isSystemScope = computed(() => user.value?.role === 'SYSTEM_ADMIN')

function roleCn(r: UserRole) {
  const m: Record<UserRole, string> = {
    SYSTEM_ADMIN: '系统管理员',
    SCHOOL_ADMIN: '学校管理员',
    TEACHER: '教师',
  }
  return m[r] ?? r
}

function canEditRow(target: OrgUser) {
  const me = user.value
  if (!me || me.role === 'TEACHER') return false
  if (target.id === me.id) return false
  if (target.role === 'SYSTEM_ADMIN' && me.role !== 'SYSTEM_ADMIN') return false
  return true
}

async function reload() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const data = await listUsers({ page: 1, pageSize: 200 })
    rows.value = data.list
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('403') || msg.includes('HTTP_403')) {
      forbidden.value = true
    } else {
      error.value = msg || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

async function onRoleChange(target: OrgUser, role: UserRole) {
  if (role === target.role) return
  if (!canEditRow(target)) return
  try {
    await updateUser(target.id, { role })
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  }
}

onMounted(() => {
  void reload()
})
</script>
