<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">下载中心</div>
    <p class="login-hint">
      列出本校已归档的<strong>导出文件</strong>、<strong>导入模板</strong>与其他材料；点击「下载」生成临时链接。
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="xn_so layui-form xfkj-filter">
      <span class="input">
        <label>分类</label>
        <select v-model="category" class="xfkj-filter__input">
          <option value="">全部</option>
          <option value="EXPORT_FILE">导出文件</option>
          <option value="IMPORT_FILE">导入文件</option>
          <option value="SCAN_IMAGE">扫描图像</option>
          <option value="OTHER">其他</option>
          <option value="ANSWER_SHEET_TEMPLATE">答题卡模板</option>
        </select>
      </span>
      <span class="input">
        <label>文件名</label>
        <input v-model="keyword" class="val" type="text" placeholder="关键字" />
      </span>
      <span class="input">
        <input type="button" class="btn" value="查询" @click="reload" />
      </span>
    </div>

    <div class="table-wrap xfkj-layui-table-wrap">
      <table class="layui-table layui-table2">
        <thead>
          <tr>
            <th>ID</th>
            <th>文件名</th>
            <th>分类</th>
            <th>大小</th>
            <th>时间</th>
            <th width="140">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="6">暂无文件；可在文件中心上传或通过业务导出生成。</td>
          </tr>
          <tr v-for="f in items" v-else :key="f.id">
            <td>{{ f.id }}</td>
            <td>{{ f.fileName }}</td>
            <td>{{ catCn(f.category) }}</td>
            <td>{{ formatSize(f.size) }}</td>
            <td>{{ formatDate(f.createdAt) }}</td>
            <td>
              <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="onDownload(f.id)">
                下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getFilePresignedUrl, listFiles } from '../lib/api'
import type { FileAsset, FileCategory } from '../types'

const items = ref<FileAsset[]>([])
const loading = ref(false)
const error = ref('')
const category = ref<'' | FileCategory>('')
const keyword = ref('')

function catCn(c: FileCategory) {
  const m: Record<FileCategory, string> = {
    ANSWER_SHEET_TEMPLATE: '答题卡模板',
    IMPORT_FILE: '导入文件',
    EXPORT_FILE: '导出文件',
    SCAN_IMAGE: '扫描图像',
    OTHER: '其他',
  }
  return m[c] ?? c
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const data = await listFiles({
      page: 1,
      pageSize: 100,
      ...(category.value ? { category: category.value } : {}),
      ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}),
    })
    items.value = data.list
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function onDownload(id: number) {
  try {
    const { url } = await getFilePresignedUrl(id, 900)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '下载失败'
  }
}

onMounted(() => {
  void reload()
})

watch(category, () => {
  void reload()
})
</script>
