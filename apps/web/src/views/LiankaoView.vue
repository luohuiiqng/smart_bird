<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">多校联考</div>

    <p class="xfkj-liankao-tip">
      联考业务与参考系统对齐中：下列为本校考试清单，可从考试管理继续配置；跨校编排与汇总范围按后续接口扩展。
    </p>

    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="table-wrap xfkj-layui-table-wrap">
      <table class="layui-table layui-table2">
        <thead>
          <tr>
            <th>考试名称</th>
            <th>类型</th>
            <th>开始日期</th>
            <th>结束日期</th>
            <th>状态</th>
            <th width="120">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="6">{{ forbidden ? '需要学校管理员权限查看考试列表' : '暂无考试数据' }}</td>
          </tr>
          <tr v-for="exam in rows" v-else :key="exam.id">
            <td>{{ exam.name }}</td>
            <td>{{ exam.examType }}</td>
            <td>{{ exam.startDate.slice(0, 10) }}</td>
            <td>{{ exam.endDate.slice(0, 10) }}</td>
            <td>{{ examStatusCn(exam.status) }}</td>
            <td>
              <router-link
                class="layui-btn layui-btn-xs layui-btn-normal"
                :to="{ path: '/exam', query: { select: String(exam.id) } }"
              >
                去考试管理
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listExams } from '../lib/api'
import type { Exam, ExamStatus } from '../types'

const rows = ref<Exam[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

function examStatusCn(s: ExamStatus) {
  const map: Record<ExamStatus, string> = {
    CREATED: '创建',
    MARKING: '阅卷',
    PENDING_PUBLISH: '待发布',
    PUBLISHED: '已发布',
  }
  return map[s] ?? s
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await listExams({ page: 1, pageSize: 100 })
    rows.value = data.list
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    forbidden.value = msg.includes('403') || msg.includes('HTTP_403')
    error.value = forbidden.value ? '' : msg || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.xfkj-liankao-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: #c00;
  line-height: 1.55;
}
</style>
