<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">科目拆分</div>

    <div class="block-card">
      <p class="login-hint">
        文科综合 / 理科综合等<strong>综合卷</strong>可按科目拆开阅卷与统计。当前版本提供<strong>考试科目配置预览</strong>：请选择一场考试查看已绑定的科目与满分；拆分策略（小题归属、分摊规则）仍在规划中。
      </p>
    </div>

    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="xn_so layui-form xfkj-filter">
      <span class="input">
        <label>考试</label>
        <select v-model="examId" class="xfkj-filter__input">
          <option value="">请选择</option>
          <option v-for="exam in exams" :key="exam.id" :value="String(exam.id)">
            {{ exam.name }}
          </option>
        </select>
      </span>
    </div>

    <div v-if="detail" class="block-card">
      <h3>{{ detail.name }}</h3>
      <p class="login-hint">
        以下为本考试已配置的阅卷科目（单科试卷）。可前往
        <router-link v-if="examId" :to="{ path: '/exam', query: { select: examId } }">本校考试管理</router-link>
        继续配置。综合卷「拆分」规则仍待产品定义。
      </p>
      <div class="table-wrap xfkj-layui-table-wrap">
        <table class="layui-table layui-table2">
          <thead>
            <tr>
              <th>考试科目 ID</th>
              <th>科目</th>
              <th>满分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="detail.examSubjects.length === 0">
              <td colspan="3">尚未绑定科目，请到「本校考试管理」配置。</td>
            </tr>
            <tr v-for="es in detail.examSubjects" v-else :key="es.id">
              <td>{{ es.id }}</td>
              <td>{{ es.subject.name }}</td>
              <td>{{ es.fullScore }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getExamDetail, listExams } from '../lib/api'
import type { Exam } from '../types'

const exams = ref<Exam[]>([])
const examId = ref('')
const detail = ref<Awaited<ReturnType<typeof getExamDetail>> | null>(null)
const error = ref('')

async function loadExams() {
  const data = await listExams({ page: 1, pageSize: 100 })
  exams.value = data.list
  if (!examId.value && data.list.length > 0) {
    examId.value = String(data.list[0]!.id)
  }
}

watch(examId, async (id) => {
  if (!id) {
    detail.value = null
    return
  }
  error.value = ''
  try {
    detail.value = await getExamDetail(Number(id))
  } catch (e) {
    detail.value = null
    error.value = e instanceof Error ? e.message : '加载失败'
  }
})

onMounted(async () => {
  try {
    await loadExams()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '无权限或加载考试失败'
  }
})
</script>
