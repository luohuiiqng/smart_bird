<template>
  <div class="org-page xfkj-subpage">
    <div class="layui-card-header xfkj-yj-card-head">文件中心</div>
    <p class="login-hint" style="margin-bottom: 12px">
      {{ createdFileId ? `最近一次上传文件 ID: ${createdFileId}` : '支持答题卡模板、导入导出与扫描图等分类上传（MinIO）' }}
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="layui-form xfkj-org-toolbar">
      <button type="button" class="layui-btn" @click="scrollTo('file-upload-anchor')">
        <i class="layui-icon layui-icon-upload"></i> 上传文件
      </button>
      <button type="button" class="layui-btn layui-btn-normal" @click="scrollTo('file-query-anchor')">
        <i class="layui-icon layui-icon-search"></i> 查询 / 签名
      </button>
      <router-link class="layui-btn layui-btn-primary" to="/exam">本校考试</router-link>
      <button type="button" class="layui-btn layui-btn-warm" @click="scrollTo('file-list-anchor')">
        <i class="layui-icon layui-icon-list"></i> 文件列表
      </button>
      <span class="xfkj-org-toolbar__tip">对齐小帆「下载中心 / 文件」能力：本地先打通上传与对象存储。</span>
    </div>

    <div id="file-list-anchor" class="block-card xfkj-files-card">
      <h3 class="xfkj-org-section__title">本校文件列表</h3>
      <p v-if="listError" class="error-tip">{{ listError }}</p>
      <p v-else-if="listLoading" class="login-hint">加载中…</p>
      <div v-else class="table-wrap xfkj-layui-table-wrap">
        <table class="layui-table layui-table2">
          <thead>
            <tr>
              <th>ID</th>
              <th>文件名</th>
              <th>分类</th>
              <th>大小</th>
              <th>上传时间</th>
              <th width="200">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="fileList.length === 0">
              <tr>
                <td colspan="6">暂无记录</td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="f in fileList" :key="f.id">
                <td>{{ f.id }}</td>
                <td>{{ f.fileName }}</td>
                <td>{{ categoryLabel(f.category) }}</td>
                <td>{{ f.size }}</td>
                <td>{{ new Date(f.createdAt).toLocaleString() }}</td>
                <td>
                  <button type="button" class="layui-btn layui-btn-xs layui-btn-normal" @click="openFromList(f.id)">
                    载入查询
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="login-hint">最近一页，由服务端分页；点击「载入查询」填入文件 ID 并展示详情。</p>
    </div>

    <div v-if="recentFiles.length > 0" class="xfkj-files-recent">
      <h3 class="xfkj-org-section__title">最近操作过的文件</h3>
      <div class="table-wrap xfkj-layui-table-wrap">
        <table class="layui-table layui-table2">
          <thead>
            <tr>
              <th>ID</th>
              <th>文件名</th>
              <th>分类</th>
              <th>记录时间</th>
              <th width="200">快捷操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in recentFiles" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.fileName }}</td>
              <td>{{ r.category }}</td>
              <td>{{ new Date(r.at).toLocaleString() }}</td>
              <td>
                <button
                  type="button"
                  class="layui-btn layui-btn-xs layui-btn-normal"
                  @click="quickLoad(r.id)"
                >
                  载入
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div id="file-upload-anchor" class="block-card xfkj-files-card">
      <h3 class="xfkj-org-section__title">上传文件</h3>
      <form class="inline-form exam-bind-form xfkj-files-upload-form" @submit.prevent="onUpload">
        <select v-model="category">
          <option v-for="item in CATEGORIES" :key="item" :value="item">{{ categoryLabel(item) }}</option>
        </select>
        <label class="xfkj-files-filebtn">
          <span class="layui-btn layui-btn-primary layui-btn-sm">选择文件</span>
          <input type="file" class="xfkj-files-filebtn__input" @change="onFileChange" />
        </label>
        <input v-model="bizType" placeholder="bizType（可选）" />
        <input v-model="bizId" placeholder="bizId（可选数字）" />
        <button type="submit" class="layui-btn">开始上传</button>
      </form>
      <p class="login-hint">{{ selectedFile ? `已选择: ${selectedFile.name}` : '尚未选择文件' }}</p>
    </div>

    <div id="file-query-anchor" class="block-card xfkj-files-card">
      <h3 class="xfkj-org-section__title">查询与下载</h3>
      <div class="xn_so layui-form xfkj-filter xfkj-files-query-filter">
        <span class="input">
          <label>文件 ID</label>
          <input v-model="fileIdInput" class="val" type="text" placeholder="输入文件 ID" />
        </span>
        <span class="input">
          <input type="button" class="btn" value="查询详情" @click="onQueryDetail" />
        </span>
        <span class="input">
          <input type="button" class="btn" value="获取签名链接" @click="onPresign" />
        </span>
        <span class="input">
          <button type="button" class="layui-btn layui-btn-danger" @click="onDelete">删除文件</button>
        </span>
      </div>

      <div v-if="detail" class="xfkj-files-detail layui-text">
        <table class="layui-table">
          <tbody>
            <tr>
              <td width="120"><strong>ID</strong></td>
              <td>{{ detail.id }}</td>
            </tr>
            <tr>
              <td><strong>文件名</strong></td>
              <td>{{ detail.fileName }}</td>
            </tr>
            <tr>
              <td><strong>分类</strong></td>
              <td>{{ categoryLabel(detail.category) }}</td>
            </tr>
            <tr>
              <td><strong>大小</strong></td>
              <td>{{ detail.size }} bytes</td>
            </tr>
            <tr>
              <td><strong>ObjectKey</strong></td>
              <td class="xfkj-files-mono">{{ detail.objectKey }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="login-hint">输入文件 ID 后查询，或先上传自动生成详情。</p>
      <p v-if="presignedUrl" class="xfkj-files-presign">
        <span class="login-hint">临时下载链接（短时效）：</span>
        <a class="layui-btn layui-btn-xs layui-btn-normal" :href="presignedUrl" target="_blank" rel="noreferrer"
          >打开</a
        >
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteFile,
  getFileDetail,
  getFilePresignedUrl,
  listFiles,
  uploadFileBinary,
} from '../lib/api'
import type { FileAsset, FileCategory } from '../types'

const RECENT_KEY = 'smart_bird_recent_file_records'

type RecentRec = {
  id: number
  fileName: string
  category: string
  at: string
}

const CATEGORIES: FileCategory[] = [
  'ANSWER_SHEET_TEMPLATE',
  'IMPORT_FILE',
  'EXPORT_FILE',
  'SCAN_IMAGE',
  'OTHER',
]

function categoryLabel(c: FileCategory) {
  const map: Record<FileCategory, string> = {
    ANSWER_SHEET_TEMPLATE: '答题卡模板',
    IMPORT_FILE: '导入文件',
    EXPORT_FILE: '导出文件',
    SCAN_IMAGE: '扫描图像',
    OTHER: '其它',
  }
  return map[c] ?? c
}

const fileIdInput = ref('')
const detail = ref<FileAsset | null>(null)
const presignedUrl = ref('')
const error = ref('')
const selectedFile = ref<File | null>(null)
const recentFiles = ref<RecentRec[]>([])

const category = ref<FileCategory>('IMPORT_FILE')
const bizType = ref('student-import')
const bizId = ref('1')
const createdFileId = ref<number | null>(null)

const fileList = ref<FileAsset[]>([])
const listLoading = ref(false)
const listError = ref('')

function loadRecent(): RecentRec[] {
  try {
    const s = sessionStorage.getItem(RECENT_KEY)
    return s ? (JSON.parse(s) as RecentRec[]) : []
  } catch {
    return []
  }
}

function saveRecent(list: RecentRec[]) {
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)))
}

function addRecent(rec: RecentRec) {
  const next = loadRecent().filter((x) => x.id !== rec.id)
  next.unshift(rec)
  saveRecent(next)
  recentFiles.value = loadRecent()
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function onUpload() {
  error.value = ''
  if (!selectedFile.value) {
    error.value = '请先选择文件'
    return
  }
  try {
    const data = await uploadFileBinary({
      file: selectedFile.value,
      category: category.value,
      bizType: bizType.value.trim() || undefined,
      bizId: bizId.value.trim() ? Number(bizId.value) : undefined,
    })
    createdFileId.value = data.fileId
    fileIdInput.value = String(data.fileId)
    presignedUrl.value = ''
    const loaded = await getFileDetail(data.fileId)
    detail.value = loaded
    addRecent({
      id: loaded.id,
      fileName: loaded.fileName,
      category: categoryLabel(loaded.category),
      at: new Date().toISOString(),
    })
    void loadFileList()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传登记失败'
  }
}

async function onQueryDetail() {
  if (!fileIdInput.value) return
  error.value = ''
  try {
    const data = await getFileDetail(Number(fileIdInput.value))
    detail.value = data
    addRecent({
      id: data.id,
      fileName: data.fileName,
      category: categoryLabel(data.category),
      at: new Date().toISOString(),
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询失败'
  }
}

async function quickLoad(id: number) {
  fileIdInput.value = String(id)
  await onQueryDetail()
  scrollTo('file-query-anchor')
}

async function loadFileList() {
  listLoading.value = true
  listError.value = ''
  try {
    const data = await listFiles({ page: 1, pageSize: 20 })
    fileList.value = data.list
  } catch (err) {
    listError.value = err instanceof Error ? err.message : '加载列表失败'
    fileList.value = []
  } finally {
    listLoading.value = false
  }
}

async function openFromList(id: number) {
  fileIdInput.value = String(id)
  await onQueryDetail()
  scrollTo('file-query-anchor')
}

async function onPresign() {
  if (!fileIdInput.value) return
  error.value = ''
  try {
    const data = await getFilePresignedUrl(Number(fileIdInput.value), 300)
    presignedUrl.value = data.url
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取签名失败'
  }
}

async function onDelete() {
  if (!fileIdInput.value) return
  error.value = ''
  try {
    await deleteFile(Number(fileIdInput.value))
    detail.value = null
    presignedUrl.value = ''
    recentFiles.value = loadRecent().filter((x) => x.id !== Number(fileIdInput.value))
    saveRecent(recentFiles.value)
    void loadFileList()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  }
}

onMounted(() => {
  recentFiles.value = loadRecent()
  void loadFileList()
})
</script>
