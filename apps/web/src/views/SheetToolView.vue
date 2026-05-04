<template>
  <div class="org-page xfkj-subpage xfkj-sheet-list-page">
    <div class="layui-card-header xfkj-yj-card-head">答题卡工具</div>
    <p class="login-hint">
      上传答题卡版式 / 模板文件（分类：<strong>答题卡模板</strong>），用于制卷与扫描对照；点<strong>新建答题卡</strong>将直接创建模板记录并进入设计器保存版式；通用文件请使用
      <router-link to="/files">文件中心</router-link>。
    </p>
    <div v-if="error" class="error-tip">{{ error }}</div>

    <div class="xfkj-sheet-toolbar-wrap">
      <div class="xfkj-sheet-toolbar-row">
        <div class="layui-form xfkj-org-toolbar xfkj-sheet-toolbar xfkj-sheet-toolbar--main">
          <button
            type="button"
            class="layui-btn xfkj-toolbar-new xfkj-sheet-btn-new"
            :disabled="creatingTemplate"
            @click="openNewSheetModal"
          >
            <i class="layui-icon layui-icon-add-1"></i>
            {{ creatingTemplate ? '创建中…' : '新建答题卡' }}
          </button>
          <button
            type="button"
            class="layui-btn xfkj-sheet-btn-copy"
            :disabled="selectedIds.size === 0 || copying"
            @click="copySelectedTemplates"
          >
            {{ copying ? '复制中…' : '勾选复制生成新答题卡' }}
          </button>
          <div class="xn_so layui-form xfkj-filter xfkj-sheet-filter--inline">
            <span class="input">
              <input v-model="keyword" class="val" type="text" placeholder="关键词" @keyup.enter="runSearch" />
            </span>
            <span class="input xfkj-filter__check">
              <label><input v-model="onlyMine" type="checkbox" /> 只查自己的</label>
            </span>
            <span class="input">
              <input type="button" class="btn xfkj-btn xfkj-btn--search" value="查询" @click="runSearch" />
            </span>
          </div>
        </div>
      </div>
      <p class="xfkj-sheet-browser-tip xfkj-sheet-browser-tip--banner">
        制作答题卡：请使用 <strong>360 安全浏览器</strong>（<a
          href="https://browser.360.cn/"
          target="_blank"
          rel="noopener noreferrer"
          >下载</a
        >）或 <strong>360 极速浏览器</strong>（<a
          href="https://browser.360.cn/ee/"
          target="_blank"
          rel="noopener noreferrer"
          >推荐下载</a
        >）。亦可用 Chrome / Edge；画布版式按小帆答题卡约定对齐。
      </p>
      <p v-if="!loading" class="xfkj-sheet-query-result">查询结果：共 {{ total }} 条！</p>
    </div>

    <div id="sheet-upload" class="block-card">
      <h3 class="xfkj-org-section__title">上传模板</h3>
      <form class="inline-form exam-bind-form xfkj-files-upload-form" @submit.prevent="onUpload">
        <input
          v-model="templateDisplayName"
          class="xfkj-sheet-displayname"
          type="text"
          placeholder="模板显示名（可选，不含扩展名）"
        />
        <label class="xfkj-files-filebtn">
          <span class="layui-btn layui-btn-primary layui-btn-sm">选择文件</span>
          <input type="file" class="xfkj-files-filebtn__input" @change="onFileChange" />
        </label>
        <button type="submit" class="layui-btn xfkj-toolbar-new" :disabled="!selectedFile || uploading">
          {{ uploading ? '上传中…' : '上传答题卡模板' }}
        </button>
      </form>
      <p class="login-hint">{{ selectedFile ? `已选择: ${selectedFile.name}` : '支持 pdf / doc / 图片等（≤20MB）' }}</p>
    </div>

    <div class="block-card">
      <h3 class="xfkj-org-section__title">本校答题卡模板列表</h3>
      <div class="table-wrap xfkj-layui-table-wrap xfkj-sheet-table-wrap">
        <table class="layui-table layui-table2 xfkj-sheet-table">
          <thead>
            <tr>
              <th width="44">
                <input type="checkbox" :checked="allSelected" title="全选" @change="toggleSelectAll" />
              </th>
              <th width="56">序号</th>
              <th>答题卡名称</th>
              <th width="100">创建者</th>
              <th width="160">学校</th>
              <th width="140">编辑时间</th>
              <th width="200">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7">加载中…</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="7">暂无模板，请点击「新建答题卡」或上传文件</td>
            </tr>
            <tr v-for="(f, idx) in items" v-else :key="f.id">
              <td>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(f.id)"
                  @change="toggleOne(f.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td>{{ (page - 1) * pageSize + idx + 1 }}</td>
              <td>
                <template v-if="editingId === f.id">
                  <input v-model="editName" class="xfkj-sheet-editname" type="text" />
                </template>
                <template v-else>
                  <router-link class="xfkj-sheet-name" :to="designLink(f.id)">{{ f.fileName }}</router-link>
                </template>
              </td>
              <td>{{ creatorLabel(f) }}</td>
              <td>{{ schoolLabel(f) }}</td>
              <td>{{ formatEditTime(f.updatedAt ?? f.createdAt) }}</td>
              <td>
                <template v-if="editingId === f.id">
                  <button
                    type="button"
                    class="layui-btn layui-btn-xs xfkj-toolbar-new"
                    :disabled="savingEdit"
                    @click="saveEdit(f.id)"
                  >
                    {{ savingEdit ? '保存中…' : '保存' }}
                  </button>
                  <button type="button" class="layui-btn layui-btn-xs layui-btn-primary" @click="cancelEdit">
                    取消
                  </button>
                </template>
                <template v-else>
                  <span class="xfkj-sheet-ops-primary">
                    <button type="button" class="layui-btn layui-btn-xs xfkj-toolbar-new" @click="startEdit(f)">
                      编辑
                    </button>
                    <button type="button" class="layui-btn layui-btn-xs layui-btn-warm" @click="onRemove(f.id)">
                      删除
                    </button>
                  </span>
                  <span class="xfkj-sheet-ops-extra">
                    <button
                      type="button"
                      class="xfkj-sheet-link-btn"
                      @click="onPresign(f.id)"
                    >
                      下载
                    </button>
                    <router-link class="xfkj-sheet-link-btn" to="/files">文件中心</router-link>
                  </span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="total > 0" class="xfkj-sheet-pager">
        <span class="xfkj-sheet-pager__total">共 {{ total }} 条</span>
        <span class="xfkj-sheet-pager__nav">
          <button
            type="button"
            class="layui-btn layui-btn-xs layui-btn-primary"
            :disabled="page <= 1 || loading"
            @click="goPage(page - 1)"
          >
            上一页
          </button>
          <span class="xfkj-sheet-pager__page">第 {{ page }} / {{ totalPages }} 页</span>
          <button
            type="button"
            class="layui-btn layui-btn-xs layui-btn-primary"
            :disabled="page >= totalPages || loading"
            @click="goPage(page + 1)"
          >
            下一页
          </button>
          <label class="xfkj-sheet-pager__size">
            每页
            <select :value="pageSize" class="xfkj-filter__input" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
            条
          </label>
        </span>
      </div>
    </div>

    <div v-if="presignUrl" class="block-card xfkj-files-presign">
      <p><strong>临时下载链接</strong>（请尽快保存）</p>
      <p class="xfkj-files-mono">{{ presignUrl }}</p>
    </div>

    <div
      v-if="newSheetModalOpen"
      class="xfkj-modal-mask"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-sheet-modal-title"
      @click.self="closeNewSheetModal"
    >
      <div class="xfkj-modal xfkj-sheet-new-modal">
        <h3 id="new-sheet-modal-title" class="xfkj-modal__title">新建答题卡</h3>
        <p class="xfkj-modal__hint">填写模板在列表中的显示名称；留空则按系统规则自动生成文件名。</p>
        <form class="xfkj-modal__form" @submit.prevent="confirmNewSheet">
          <label class="xfkj-modal__field">
            <span>模板名称</span>
            <input
              v-model="newSheetName"
              type="text"
              maxlength="200"
              placeholder="例如：高一期中语文答题卡"
              autocomplete="off"
            />
          </label>
          <div class="xfkj-modal__actions">
            <button type="button" class="layui-btn layui-btn-primary" @click="closeNewSheetModal">取消</button>
            <button type="submit" class="layui-btn layui-btn-normal" :disabled="creatingTemplate">
              {{ creatingTemplate ? '创建中…' : '创建并进入设计' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import {
  createAnswerSheetTemplate,
  deleteFile,
  getFileDetail,
  getFilePresignedUrl,
  listFiles,
  patchFile,
  uploadFileBinary,
} from '../lib/api'
import type { FileAsset } from '../types'

const router = useRouter()
const items = ref<FileAsset[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const onlyMine = ref(false)
const selectedFile = ref<File | null>(null)
const templateDisplayName = ref('')
const uploading = ref(false)
const copying = ref(false)
const creatingTemplate = ref(false)
const newSheetModalOpen = ref(false)
const newSheetName = ref('')
const presignUrl = ref('')
const selectedIds = ref<Set<number>>(new Set())
const editingId = ref<number | null>(null)
const editName = ref('')
const savingEdit = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((f) => selectedIds.value.has(f.id)),
)

function designLink(fileId: number): RouteLocationRaw {
  return { path: '/sheet/design', query: { fileId: String(fileId) } }
}

function goPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
  void reload()
}

function runSearch() {
  page.value = 1
  void reload()
}

function onPageSizeChange(ev: Event) {
  const v = Number((ev.target as HTMLSelectElement).value)
  pageSize.value = Number.isFinite(v) ? v : 20
  page.value = 1
  void reload()
}

function openNewSheetModal() {
  if (creatingTemplate.value) return
  newSheetName.value = ''
  newSheetModalOpen.value = true
}

function closeNewSheetModal() {
  if (creatingTemplate.value) return
  newSheetModalOpen.value = false
}

function normalizeNewTemplateFileName(raw: string): string | undefined {
  let t = raw.trim()
  if (!t) return undefined
  if (t.length > 200) t = t.slice(0, 200)
  if (!t.includes('.')) {
    const suf = '.json'
    if (t.length + suf.length > 200) t = t.slice(0, 200 - suf.length)
    return t + suf
  }
  return t
}

async function confirmNewSheet() {
  if (creatingTemplate.value) return
  creatingTemplate.value = true
  error.value = ''
  try {
    const fileName = normalizeNewTemplateFileName(newSheetName.value)
    const r = await createAnswerSheetTemplate(fileName ? { fileName } : undefined)
    newSheetModalOpen.value = false
    await router.push(designLink(r.fileId))
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '创建模板失败'
  } finally {
    creatingTemplate.value = false
  }
}

function toggleOne(id: number, checked: boolean) {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function toggleSelectAll(ev: Event) {
  const checked = (ev.target as HTMLInputElement).checked
  if (!checked) {
    selectedIds.value = new Set()
    return
  }
  selectedIds.value = new Set(items.value.map((f) => f.id))
}

function formatEditTime(s: string) {
  const d = new Date(s)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function creatorLabel(f: FileAsset) {
  if (f.uploader?.realName) return f.uploader.realName
  if (f.uploader?.username) return f.uploader.username
  return '—'
}

function schoolLabel(f: FileAsset) {
  return f.school?.name ?? '—'
}

function extensionFrom(name: string) {
  const i = name.lastIndexOf('.')
  if (i <= 0 || i >= name.length - 1) return ''
  return name.slice(i)
}

function buildUploadFile(source: File, displayBase: string): File {
  const trimmed = displayBase.trim()
  if (!trimmed) return source
  const ext = extensionFrom(source.name)
  const finalName = ext ? `${trimmed}${ext}` : trimmed
  return new File([source], finalName, { type: source.type })
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function startEdit(f: FileAsset) {
  editingId.value = f.id
  editName.value = f.fileName
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
}

async function saveEdit(id: number) {
  const name = editName.value.trim()
  if (!name) {
    error.value = '文件名不能为空'
    return
  }
  savingEdit.value = true
  error.value = ''
  try {
    await patchFile(id, { fileName: name })
    editingId.value = null
    editName.value = ''
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    savingEdit.value = false
  }
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      category: 'ANSWER_SHEET_TEMPLATE' as const,
      keyword: keyword.value.trim() || undefined,
      onlyMine: onlyMine.value ? true : undefined,
    }
    let data = await listFiles(params)
    total.value = data.total
    const maxPage = Math.max(1, Math.ceil(data.total / pageSize.value))
    if (page.value > maxPage) {
      page.value = maxPage
      data = await listFiles({ ...params, page: page.value })
    }
    items.value = data.list
    const valid = new Set(data.list.map((f) => f.id))
    selectedIds.value = new Set([...selectedIds.value].filter((id) => valid.has(id)))
    if (editingId.value !== null && !valid.has(editingId.value)) {
      cancelEdit()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function onUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  error.value = ''
  try {
    const file = buildUploadFile(selectedFile.value, templateDisplayName.value)
    await uploadFileBinary({
      file,
      category: 'ANSWER_SHEET_TEMPLATE',
      bizType: 'answer-sheet-template',
    })
    selectedFile.value = null
    templateDisplayName.value = ''
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

async function onPresign(id: number) {
  try {
    const { url } = await getFilePresignedUrl(id, 600)
    presignUrl.value = url
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取链接失败'
  }
}

async function onRemove(id: number) {
  if (!window.confirm('确定删除该模板文件？')) return
  error.value = ''
  try {
    await deleteFile(id)
    presignUrl.value = ''
    const nextSel = new Set(selectedIds.value)
    nextSel.delete(id)
    selectedIds.value = nextSel
    if (editingId.value === id) cancelEdit()
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

async function copySelectedTemplates() {
  if (selectedIds.value.size === 0) return
  copying.value = true
  error.value = ''
  try {
    const ids = [...selectedIds.value]
    for (const id of ids) {
      const detail = await getFileDetail(id)
      const { url } = await getFilePresignedUrl(id, 600)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`下载模板 ${id} 失败`)
      const blob = await res.blob()
      const mime = blob.type || detail.contentType || 'application/octet-stream'
      const copyName = detail.fileName.startsWith('副本_') ? detail.fileName : `副本_${detail.fileName}`
      const file = new File([blob], copyName, { type: mime })
      await uploadFileBinary({
        file,
        category: 'ANSWER_SHEET_TEMPLATE',
        bizType: 'answer-sheet-copy',
        bizId: id,
      })
    }
    selectedIds.value = new Set()
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '复制失败'
  } finally {
    copying.value = false
  }
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.xfkj-sheet-displayname {
  min-width: 200px;
  padding: 6px 10px;
  border: 1px solid #e6e6e6;
  border-radius: 2px;
}
.xfkj-sheet-editname {
  width: 100%;
  max-width: 280px;
  padding: 4px 8px;
  border: 1px solid #e6e6e6;
  border-radius: 2px;
  box-sizing: border-box;
}
.xfkj-filter__check label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.xfkj-sheet-toolbar-wrap {
  margin-bottom: 8px;
}
.xfkj-sheet-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}
.xfkj-sheet-toolbar--main {
  flex: 1 1 auto;
  min-width: 0;
}
.xfkj-sheet-btn-new {
  min-height: 36px;
  padding: 0 18px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(82, 196, 26, 0.35);
}
.xfkj-sheet-btn-copy {
  min-height: 36px;
  padding: 0 18px;
  border-radius: 4px;
  background: linear-gradient(180deg, #ffa940 0%, #fa8c16 100%) !important;
  border-color: #d87a16 !important;
  color: #fff !important;
  box-shadow: 0 1px 2px rgba(250, 140, 22, 0.35);
}
.xfkj-sheet-btn-copy:disabled {
  opacity: 0.55;
  box-shadow: none;
}
.xfkj-org-toolbar.xfkj-sheet-toolbar {
  flex-wrap: wrap;
  align-items: center;
}
.xfkj-sheet-filter--inline {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  margin-left: 12px;
}
.xfkj-sheet-browser-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: #c00;
  line-height: 1.5;
}
.xfkj-sheet-browser-tip--banner {
  margin: 10px 0 0;
  padding: 8px 12px;
  font-size: 13px;
  color: #d4380d;
  background: #fff7f0;
  border: 1px solid #ffd8bf;
  border-radius: 4px;
  line-height: 1.55;
}
.xfkj-sheet-browser-tip--banner a {
  color: #d4380d;
  text-decoration: underline;
}
.xfkj-sheet-browser-tip--banner strong {
  font-weight: 600;
}
.xfkj-sheet-table-wrap {
  border-radius: 4px;
}
.xfkj-sheet-table tbody tr:nth-child(even) {
  background: #fafafa;
}
.xfkj-sheet-table tbody tr:hover {
  background: #f0f7ff;
}
.xfkj-sheet-query-result {
  margin: 8px 0 0;
  font-size: 13px;
  color: #5fb878;
  font-weight: 500;
}
.xfkj-sheet-name {
  color: #009688;
  font-weight: 500;
  text-decoration: none;
}
.xfkj-sheet-name:hover {
  text-decoration: underline;
}
.xfkj-sheet-ops-primary {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-right: 8px;
  vertical-align: middle;
}
.xfkj-sheet-ops-extra {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  vertical-align: middle;
}
.xfkj-sheet-link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: #1e9fff;
  cursor: pointer;
  text-decoration: underline;
}
.xfkj-sheet-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
}
.xfkj-sheet-pager__total {
  color: #666;
}
.xfkj-sheet-pager__nav {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.xfkj-sheet-pager__page {
  color: #333;
}
.xfkj-sheet-pager__size {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}
</style>
