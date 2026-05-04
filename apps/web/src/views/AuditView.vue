<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">系统日志</div>
    <p class="login-hint" style="margin-bottom: 12px">审计记录 · 支持按模块 / 动作 / 目标筛选</p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="xn_so layui-form xfkj-filter xfkj-audit-filter">
      <span class="input">
        <label>模块</label>
        <input v-model="moduleFilter" class="val" type="text" placeholder="module" />
      </span>
      <span class="input">
        <label>动作</label>
        <input v-model="actionFilter" class="val" type="text" placeholder="action" />
      </span>
      <span class="input">
        <label>目标类型</label>
        <input v-model="targetTypeFilter" class="val" type="text" placeholder="targetType" />
      </span>
      <span class="input">
        <label>目标 ID</label>
        <input v-model="targetIdFilter" class="val" type="text" placeholder="targetId" />
      </span>
      <span class="input">
        <input type="button" class="btn" value="查询" @click="loadLogs" />
      </span>
    </div>

    <div class="table-wrap xfkj-layui-table-wrap xfkj-audit-table-wrap">
      <table class="layui-table layui-table2">
        <colgroup>
          <col width="72" />
          <col width="120" />
          <col width="120" />
          <col width="160" />
          <col width="100" />
          <col width="180" />
          <col width="120" />
        </colgroup>
        <thead>
          <tr>
            <th>ID</th>
            <th>模块</th>
            <th>动作</th>
            <th>目标</th>
            <th>操作人</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="xfkj-table-empty">加载中…</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="7" class="xfkj-table-empty">暂无日志</td>
          </tr>
          <tr
            v-for="item in logs"
            v-else
            :key="item.id"
            :class="{ 'xfkj-audit-row--active': selected?.id === item.id }"
          >
            <td>{{ item.id }}</td>
            <td>{{ item.module }}</td>
            <td>{{ item.action }}</td>
            <td>{{ item.targetType }}#{{ item.targetId }}</td>
            <td>{{ item.operator.realName }}</td>
            <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
            <td>
              <button
                type="button"
                class="layui-btn layui-btn-xs layui-btn-normal"
                @click="onViewDetail(item.id)"
              >
                详情
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="block-card xfkj-audit-detail">
      <h3 class="xfkj-org-section__title">日志详情</h3>
      <div v-if="selected" class="xfkj-audit-detail__body">
        <p><strong>ID</strong> {{ selected.id }}</p>
        <p><strong>模块 / 动作</strong> {{ selected.module }} / {{ selected.action }}</p>
        <p><strong>目标</strong> {{ selected.targetType }}#{{ selected.targetId }}</p>
        <p><strong>内容</strong> {{ selected.content }}</p>
        <p class="xfkj-audit-meta"><strong>元数据</strong> {{ JSON.stringify(selected.metadata) }}</p>
      </div>
      <p v-else class="login-hint">点击表中「详情」查看完整内容与元数据。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAuditLogDetail, listAuditLogs } from '../lib/api'
import type { AuditLog } from '../types'

const moduleFilter = ref('')
const actionFilter = ref('')
const targetTypeFilter = ref('')
const targetIdFilter = ref('')
const logs = ref<AuditLog[]>([])
const selected = ref<AuditLog | null>(null)
const error = ref('')
const loading = ref(false)

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const res = await listAuditLogs({
      module: moduleFilter.value.trim() || undefined,
      action: actionFilter.value.trim() || undefined,
      targetType: targetTypeFilter.value.trim() || undefined,
      targetId: targetIdFilter.value.trim() ? Number(targetIdFilter.value) : undefined,
      page: 1,
      pageSize: 50,
    })
    logs.value = res.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询审计失败'
  } finally {
    loading.value = false
  }
}

async function onViewDetail(id: number) {
  error.value = ''
  try {
    const detail = await getAuditLogDetail(id)
    selected.value = detail
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询详情失败'
  }
}

onMounted(() => {
  void loadLogs()
})
</script>
