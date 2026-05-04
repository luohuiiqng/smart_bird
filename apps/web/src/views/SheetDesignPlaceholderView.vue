<template>
  <div class="org-page xfkj-subpage xfkj-sheet-designer-page xfkj-sheet-print-root">
    <p v-if="templateTitle" class="xfkj-sheet-designer__file-tag">当前模板：<strong>{{ templateTitle }}</strong></p>
    <p v-if="loadError" class="error-tip">{{ loadError }}</p>
    <p v-if="saveHint" class="login-hint">{{ saveHint }}</p>

    <div class="xfkj-sheet-designer">
      <aside class="xfkj-sheet-designer__col xfkj-sheet-designer__col--left">
        <div class="xfkj-sheet-designer__brand" aria-hidden="true">小帆科技</div>
        <div class="xfkj-sheet-designer__score">
          <span class="xfkj-sheet-designer__score-label">当前分数</span>
          <span class="xfkj-sheet-designer__score-val xfkj-sheet-designer__score-val--accent">{{ totalScore }} <small>分</small></span>
        </div>
        <div class="xfkj-sheet-designer__paper-toggles">
          <button
            type="button"
            class="xfkj-sheet-designer__paper-btn"
            :class="{ 'is-active': paperSize === 'A3' }"
            title="A3"
            @click="paperSize = 'A3'"
          >
            A3
          </button>
          <button
            type="button"
            class="xfkj-sheet-designer__paper-btn"
            :class="{ 'is-active': paperSize === 'A4' }"
            title="A4"
            @click="paperSize = 'A4'"
          >
            A4
          </button>
          <button
            type="button"
            class="xfkj-sheet-designer__paper-btn xfkj-sheet-designer__paper-btn--blue"
            title="视图"
            @click="previewMode = !previewMode"
          >
            ▢
          </button>
        </div>
        <button type="button" class="layui-btn xfkj-sheet-designer__settings-btn" @click="settingsOpen = true">
          修改设置
        </button>
      </aside>

      <main class="xfkj-sheet-designer__col xfkj-sheet-designer__col--canvas">
        <div
          class="xfkj-sheet-designer__canvas-inner"
          :class="[`xfkj-sheet-designer__canvas-inner--${paperSize}`, { 'is-preview': previewMode }]"
          :style="{ maxWidth: changzhnCanvasWidth }"
        >
          <SheetXfkjCanvas
            :title="previewSheetTitle"
            :exam-id-mode="examIdMode"
            :absent-mark="absentMark"
            :visual-mode="visualMode"
            :show-binding-holes="showBindingHoles"
            :subject-label="previewSheetTitle"
            :objective-score-total="objectiveScoreTotal"
            :subjective-score-total="subjectiveScoreTotal"
            :subject-notes-line="subjectNotesLine"
          >
            <template v-if="blocks.length > 0">
              <!-- A3：左栏客观题、右栏主观题（与高考式语文/理综版式一致；仅当同时存在两类题时启用） -->
              <div v-if="useA3TwoColumn" class="xfkj-blocks-a3" role="group" aria-label="A3 分栏答题区">
                <div class="xfkj-blocks-a3__col xfkj-blocks-a3__col--objective" aria-label="客观题区">
                  <div
                    v-for="{ b, idx } in objectiveBlockEntries"
                    :key="b.id"
                    class="xfkj-sheet-block xfkj-sheet-block--xfkj"
                  >
                    <SheetBlockWysiwyg
                      class="xfkj-sheet-block__wysiwyg"
                      theme="xfkj"
                      :block-index="idx"
                      :block="b"
                      :hide-score="optHideScore"
                      :objective-vertical="optVertical"
                      :visual-mode="visualMode"
                      :subject-preset="subjectPreset"
                      :is-first-objective="idx === firstObjectiveIndex"
                      @patch-objective="onPatchObjective"
                    >
                      <template #xfkj-actions>
                        <button
                          v-if="b.kind === 'objective' || b.kind === 'fill'"
                          type="button"
                          class="xfkj-sheet-block__edit"
                          @click="openBlockEditor(b)"
                        >
                          编辑
                        </button>
                        <button type="button" class="xfkj-sheet-block__del" @click="removeBlock(b.id)">
                          删除
                        </button>
                      </template>
                    </SheetBlockWysiwyg>
                    <p class="xfkj-sheet-block__meta">小计 {{ sheetBlockScore(b) }} 分</p>
                  </div>
                </div>
                <div class="xfkj-blocks-a3__col xfkj-blocks-a3__col--subjective" aria-label="主观题区">
                  <div
                    v-for="{ b, idx } in subjectiveBlockEntries"
                    :key="b.id"
                    class="xfkj-sheet-block xfkj-sheet-block--xfkj"
                  >
                    <SheetBlockWysiwyg
                      class="xfkj-sheet-block__wysiwyg"
                      theme="xfkj"
                      :block-index="idx"
                      :block="b"
                      :hide-score="optHideScore"
                      :objective-vertical="optVertical"
                      :visual-mode="visualMode"
                      :subject-preset="subjectPreset"
                      :is-first-objective="false"
                      @patch-objective="onPatchObjective"
                    >
                      <template #xfkj-actions>
                        <button
                          v-if="b.kind === 'objective' || b.kind === 'fill'"
                          type="button"
                          class="xfkj-sheet-block__edit"
                          @click="openBlockEditor(b)"
                        >
                          编辑
                        </button>
                        <button type="button" class="xfkj-sheet-block__del" @click="removeBlock(b.id)">
                          删除
                        </button>
                      </template>
                    </SheetBlockWysiwyg>
                    <p class="xfkj-sheet-block__meta">小计 {{ sheetBlockScore(b) }} 分</p>
                  </div>
                </div>
              </div>
              <template v-else>
                <div
                  v-for="(b, idx) in blocks"
                  :key="b.id"
                  class="xfkj-sheet-block xfkj-sheet-block--xfkj"
                >
                  <SheetBlockWysiwyg
                    class="xfkj-sheet-block__wysiwyg"
                    theme="xfkj"
                    :block-index="idx"
                    :block="b"
                    :hide-score="optHideScore"
                    :objective-vertical="optVertical"
                    :visual-mode="visualMode"
                    :subject-preset="subjectPreset"
                    :is-first-objective="idx === firstObjectiveIndex"
                    @patch-objective="onPatchObjective"
                  >
                    <template #xfkj-actions>
                      <button
                        v-if="b.kind === 'objective' || b.kind === 'fill'"
                        type="button"
                        class="xfkj-sheet-block__edit"
                        @click="openBlockEditor(b)"
                      >
                        编辑
                      </button>
                      <button type="button" class="xfkj-sheet-block__del" @click="removeBlock(b.id)">
                        删除
                      </button>
                    </template>
                  </SheetBlockWysiwyg>
                  <p class="xfkj-sheet-block__meta">小计 {{ sheetBlockScore(b) }} 分</p>
                </div>
              </template>
            </template>
            <p v-else class="xfkj-sheet-canvas__blocks-empty">
              在右侧「添加题目」加入大题后，将在此列表展示；保存后写入版式 JSON。
            </p>
          </SheetXfkjCanvas>
        </div>
      </main>

      <aside class="xfkj-sheet-designer__col xfkj-sheet-designer__col--right">
        <section class="xfkj-sheet-designer__panel">
          <h4 class="xfkj-sheet-designer__panel-title">设置答题卡基础信息</h4>
          <label class="xfkj-sheet-designer__row"
            ><input v-model="optVertical" type="checkbox" /> 客观题竖排</label
          >
          <label class="xfkj-sheet-designer__row"
            ><input v-model="optHideScore" type="checkbox" /> 隐藏小题分数</label
          >
          <div class="xfkj-sheet-designer__row xfkj-sheet-designer__radios">
            <label><input v-model="examIdMode" type="radio" value="bubble" /> 考号填涂区</label>
            <label><input v-model="examIdMode" type="radio" value="barcode" /> 考号条码区</label>
          </div>
          <label class="xfkj-sheet-designer__row"
            ><input v-model="examIdLeft" type="checkbox" /> 考号左侧显示</label
          >
          <label class="xfkj-sheet-designer__row"
            ><input v-model="absentMark" type="checkbox" /> 缺考标记（预览）</label
          >
          <label class="xfkj-sheet-designer__row"
            ><input v-model="lowerPrimaryMode" type="checkbox" /> 低年级（1～2 年级）大号版式</label
          >
          <label class="xfkj-sheet-designer__row"
            ><input v-model="showBindingHoles" type="checkbox" /> 显示装订孔示意</label
          >
          <label class="xfkj-sheet-designer__row xfkj-sheet-designer__row--select">
            <span>学科与注意事项第6条</span>
            <select v-model="subjectPreset" class="xfkj-filter__input">
              <option value="generic">通用</option>
              <option value="chinese">语文</option>
              <option value="math">数学</option>
              <option value="english">英语</option>
              <option value="science">物理/化学/生物</option>
              <option value="humanities">道法/历史/地理</option>
            </select>
          </label>
          <p class="xfkj-sheet-designer__print-hint">
            打印：建议使用浏览器「打印」→ 纸张与设计一致（A4 竖版 210×297mm、A3 竖版 297×420mm）、黑白；分辨率选精细/高质量（约
            300dpi）；勿裁切边距内定位点与条码区。<strong>A3</strong>
            且同时添加客观题与主观题大题时，答题区自动<strong>左栏客观、右栏主观</strong>（高考式版式）。
          </p>
        </section>

        <section class="xfkj-sheet-designer__panel">
          <h4 class="xfkj-sheet-designer__panel-title">添加题目</h4>
          <div class="xfkj-sheet-designer__add-list">
            <button
              v-for="item in addButtons"
              :key="item.key"
              type="button"
              class="xfkj-sheet-designer__add-btn"
              @click="onAddKind(item.key)"
            >
              + {{ item.label }}
            </button>
          </div>
        </section>
      </aside>
    </div>

    <div class="xfkj-sheet-designer__footer">
      <button type="button" class="layui-btn layui-btn-warm" @click="previewMode = !previewMode">
        {{ previewMode ? '退出预览' : '预览' }}
      </button>
      <button type="button" class="layui-btn layui-btn-normal" :disabled="saving" @click="onSaveLayout">
        {{ saving ? '保存中…' : '保存' }}
      </button>
      <router-link class="layui-btn layui-btn-primary" :to="{ path: '/manage/sheet_list', hash: '#sheet-upload' }">
        上传登记
      </router-link>
      <button
        type="button"
        class="layui-btn layui-btn-warm xfkj-sheet-footer-download"
        :disabled="!canDownload || downloading"
        :title="canDownload ? '下载模板文件' : '请先通过列表进入已上传的模板'"
        @click="onDownload"
      >
        {{ downloading ? '打开中…' : '下载' }}
      </button>
      <router-link class="layui-btn xfkj-sheet-designer__back" to="/manage/sheet_list">返回答题卡模板管理</router-link>
    </div>

    <ObjectiveQuestionModal
      v-if="objectiveModalOpen"
      :initial="objectiveEditInitial"
      @confirm="onObjectiveConfirm"
      @cancel="closeObjectiveModal"
    />
    <FillQuestionModal
      v-if="fillModalOpen"
      :initial="fillEditInitial"
      @confirm="onFillConfirm"
      @cancel="closeFillModal"
    />

    <div v-if="settingsOpen" class="xfkj-modal-mask" role="dialog" aria-modal="true" @click.self="settingsOpen = false">
      <div class="xfkj-modal xfkj-sheet-settings-modal">
        <h3 class="xfkj-modal__title">修改设置</h3>
        <form class="xfkj-modal__form" @submit.prevent="confirmSettings">
          <label class="xfkj-modal__field">
            <span>纸张</span>
            <select v-model="paperSize" class="xfkj-filter__input">
              <option value="A3">A3</option>
              <option value="A4">A4</option>
            </select>
          </label>
          <label class="xfkj-modal__field">
            <span>边距（mm）</span>
            <input v-model.number="marginMm" type="number" min="5" max="40" step="1" required />
          </label>
          <div class="xfkj-modal__actions">
            <button type="button" class="layui-btn layui-btn-primary" @click="settingsOpen = false">取消</button>
            <button type="submit" class="layui-btn layui-btn-normal">确定</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FillQuestionModal from '../components/sheet/FillQuestionModal.vue'
import ObjectiveQuestionModal from '../components/sheet/ObjectiveQuestionModal.vue'
import SheetBlockWysiwyg from '../components/sheet/SheetBlockWysiwyg.vue'
import SheetXfkjCanvas from '../components/sheet/SheetXfkjCanvas.vue'
import { changzhnCanvasMaxWidth } from '../lib/answerCardChangzhn/paperSpecs'
import { getFileDetail, getFilePresignedUrl, patchFile } from '../lib/api'
import {
  createDefaultSheetBlock,
  normalizeSheetBlocks,
  sheetBlockScore,
  sumSheetBlocks,
  type SheetBlock,
  type SheetBlockKind,
  type SheetSubjectPreset,
  type SheetVisualMode,
} from '../types/sheetLayout'

const route = useRoute()

const fileId = computed(() => {
  const q = route.query.fileId
  if (typeof q === 'string' && /^\d+$/.test(q)) return Number(q)
  return null
})

const templateTitle = ref('')
const loadError = ref('')
const saveHint = ref('')
const blocks = ref<SheetBlock[]>([])
const totalScore = computed(() => sumSheetBlocks(blocks.value))
const previewMode = ref(false)
const paperSize = ref<'A3' | 'A4'>('A3')
const marginMm = ref(10)
const optVertical = ref(true)
const optHideScore = ref(false)
const examIdMode = ref<'bubble' | 'barcode'>('bubble')
const examIdLeft = ref(false)
const absentMark = ref(false)
/** 大号版式：与 visualMode 同步，便于 v-model 复选框 */
const lowerPrimaryMode = ref(false)
const showBindingHoles = ref(false)
const settingsOpen = ref(false)
const saving = ref(false)
const downloading = ref(false)

const objectiveModalOpen = ref(false)
const fillModalOpen = ref(false)
const objectiveEditInitial = ref<Extract<SheetBlock, { kind: 'objective' }> | null>(null)
const fillEditInitial = ref<Extract<SheetBlock, { kind: 'fill' }> | null>(null)

const canDownload = computed(() => fileId.value !== null)

/** 与 sheetview 一致：标题区展示模板名，支持换行 */
const previewSheetTitle = computed(() => {
  const t = templateTitle.value.trim()
  if (t) return t
  return '试卷标题'
})

/** 与 answer-card 一致的纸张内容区宽度（CSS mm），用于画布对齐设计标准 */
const changzhnCanvasWidth = computed(() => changzhnCanvasMaxWidth(paperSize.value))

const visualMode = computed<SheetVisualMode>(() =>
  lowerPrimaryMode.value ? 'lowerPrimary' : 'standard',
)

/** 与规范「注意事项」第 6 条学科专属提示对应 */
const SUBJECT_NOTES_LINE: Record<SheetSubjectPreset, string> = {
  generic:
    '打印后请核对答题卡编号、四角定位点与条形码区完整清晰；考试中勿折叠污损答卷。',
  chinese: '名句默写严禁涂改（涂改无效）；作文不得抄袭、套作。',
  math: '按步骤得分，写出必要演算；几何作图请用黑色签字笔、线条清晰。',
  english: '书面表达用黑色签字笔；听力结束后不得改听力填涂；勿用修正带、胶带。',
  science: '化学方程式注明条件与物质状态；实验步骤完整，计算保留题目要求的精度。',
  humanities: '材料分析须结合材料作答；史实、地名准确，表述规范。',
}

const subjectPreset = ref<SheetSubjectPreset>('generic')

const objectiveScoreTotal = computed(() =>
  blocks.value.filter((b) => b.kind === 'objective').reduce((s, b) => s + sheetBlockScore(b), 0),
)
const subjectiveScoreTotal = computed(() =>
  Math.max(0, totalScore.value - objectiveScoreTotal.value),
)

const subjectNotesLine = computed(() => SUBJECT_NOTES_LINE[subjectPreset.value])

/** A3 双栏：客观题块列表（保留全局 blockIndex 供大题号） */
const objectiveBlockEntries = computed(() =>
  blocks.value.map((b, idx) => ({ b, idx })).filter((x) => x.b.kind === 'objective'),
)
const subjectiveBlockEntries = computed(() =>
  blocks.value.map((b, idx) => ({ b, idx })).filter((x) => x.b.kind !== 'objective'),
)
const firstObjectiveIndex = computed(() => blocks.value.findIndex((b) => b.kind === 'objective'))

const useA3TwoColumn = computed(
  () =>
    paperSize.value === 'A3' &&
    objectiveBlockEntries.value.length > 0 &&
    subjectiveBlockEntries.value.length > 0,
)

const addButtons: { key: SheetBlockKind; label: string }[] = [
  { key: 'objective', label: '客观题' },
  { key: 'fill', label: '填空题' },
  { key: 'answer', label: '解答题' },
  { key: 'essayEn', label: '作文(英)' },
  { key: 'essayZh', label: '作文(语)' },
  { key: 'experimentDiagram', label: '装置图区' },
  { key: 'reserve', label: '非作答区' },
]

const draftKey = computed(() => `xfkj-sheet-design-${fileId.value ?? 'new'}`)

function layoutPayload() {
  const blocksSnapshot = JSON.parse(JSON.stringify(blocks.value)) as SheetBlock[]
  return {
    v: 1,
    paper: paperSize.value,
    marginMm: marginMm.value,
    optVertical: optVertical.value,
    optHideScore: optHideScore.value,
    examIdMode: examIdMode.value,
    examIdLeft: examIdLeft.value,
    absentMark: absentMark.value,
    visualMode: visualMode.value,
    showBindingHoles: showBindingHoles.value,
    subjectPreset: subjectPreset.value,
    totalScore: sumSheetBlocks(blocksSnapshot),
    blocks: blocksSnapshot,
  }
}

function applyLayout(raw: unknown) {
  if (!raw || typeof raw !== 'object') return
  const o = raw as Record<string, unknown>
  if (o.paper === 'A3' || o.paper === 'A4') paperSize.value = o.paper
  if (typeof o.marginMm === 'number') marginMm.value = Math.min(40, Math.max(5, o.marginMm))
  if (typeof o.optVertical === 'boolean') optVertical.value = o.optVertical
  if (typeof o.optHideScore === 'boolean') optHideScore.value = o.optHideScore
  if (o.examIdMode === 'bubble' || o.examIdMode === 'barcode') examIdMode.value = o.examIdMode
  if (typeof o.examIdLeft === 'boolean') examIdLeft.value = o.examIdLeft
  if (typeof o.absentMark === 'boolean') absentMark.value = o.absentMark
  if (o.visualMode === 'lowerPrimary' || o.visualMode === 'standard') {
    lowerPrimaryMode.value = o.visualMode === 'lowerPrimary'
  }
  if (typeof o.showBindingHoles === 'boolean') showBindingHoles.value = o.showBindingHoles
  const sp = o.subjectPreset
  if (
    sp === 'generic' ||
    sp === 'chinese' ||
    sp === 'math' ||
    sp === 'english' ||
    sp === 'science' ||
    sp === 'humanities'
  ) {
    subjectPreset.value = sp as SheetSubjectPreset
  }
  blocks.value = normalizeSheetBlocks(o.blocks)
}

function loadDraftFromSession() {
  try {
    const raw = sessionStorage.getItem(draftKey.value)
    if (!raw) return
    applyLayout(JSON.parse(raw))
  } catch {
    /* ignore */
  }
}

function persistDraftSession() {
  try {
    sessionStorage.setItem(draftKey.value, JSON.stringify(layoutPayload()))
  } catch {
    /* ignore */
  }
}

async function loadFile() {
  loadError.value = ''
  templateTitle.value = ''
  if (!fileId.value) {
    loadDraftFromSession()
    return
  }
  try {
    const d = await getFileDetail(fileId.value)
    templateTitle.value = d.fileName
    if (d.sheetLayout != null) applyLayout(d.sheetLayout)
    else loadDraftFromSession()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载模板失败'
  }
}

function addBlock(kind: SheetBlockKind) {
  blocks.value = [...blocks.value, createDefaultSheetBlock(kind)]
  persistDraftSession()
}

function onAddKind(kind: SheetBlockKind) {
  if (kind === 'objective') {
    objectiveEditInitial.value = null
    objectiveModalOpen.value = true
    return
  }
  if (kind === 'fill') {
    fillEditInitial.value = null
    fillModalOpen.value = true
    return
  }
  addBlock(kind)
}

function closeObjectiveModal() {
  objectiveModalOpen.value = false
  objectiveEditInitial.value = null
}

function closeFillModal() {
  fillModalOpen.value = false
  fillEditInitial.value = null
}

function onObjectiveConfirm(block: Extract<SheetBlock, { kind: 'objective' }>) {
  const idx = blocks.value.findIndex((x) => x.id === block.id)
  if (idx >= 0) {
    const next = [...blocks.value]
    next[idx] = block
    blocks.value = next
  } else {
    blocks.value = [...blocks.value, block]
  }
  closeObjectiveModal()
  persistDraftSession()
}

function onFillConfirm(block: Extract<SheetBlock, { kind: 'fill' }>) {
  const idx = blocks.value.findIndex((x) => x.id === block.id)
  if (idx >= 0) {
    const next = [...blocks.value]
    next[idx] = block
    blocks.value = next
  } else {
    blocks.value = [...blocks.value, block]
  }
  closeFillModal()
  persistDraftSession()
}

function openBlockEditor(b: SheetBlock) {
  if (b.kind === 'objective') {
    objectiveEditInitial.value = b
    objectiveModalOpen.value = true
  } else if (b.kind === 'fill') {
    fillEditInitial.value = b
    fillModalOpen.value = true
  }
}

function removeBlock(id: string) {
  blocks.value = blocks.value.filter((b) => b.id !== id)
  persistDraftSession()
}

function onPatchObjective(payload: { id: string; questionsPerRow: number }) {
  blocks.value = blocks.value.map((b) => {
    if (b.id !== payload.id || b.kind !== 'objective') return b
    return { ...b, questionsPerRow: payload.questionsPerRow }
  })
  persistDraftSession()
}

async function onSaveLayout() {
  saveHint.value = ''
  saving.value = true
  try {
    const payload = layoutPayload()
    persistDraftSession()
    if (fileId.value) {
      await patchFile(fileId.value, { sheetLayout: payload })
      saveHint.value = '版式已保存到当前模板记录。'
    } else {
      saveHint.value =
        '版式已写入本机草稿。请从「答题卡模板管理」使用「新建答题卡」创建记录后再保存，或在上传区登记文件后带 fileId 进入本页。'
    }
  } catch (e) {
    saveHint.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function onDownload() {
  if (!fileId.value) return
  downloading.value = true
  loadError.value = ''
  try {
    const { url } = await getFilePresignedUrl(fileId.value, 600)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '下载失败'
  } finally {
    downloading.value = false
  }
}

function confirmSettings() {
  settingsOpen.value = false
  persistDraftSession()
}

watch(fileId, () => {
  void loadFile()
})

watch(
  [
    paperSize,
    marginMm,
    optVertical,
    optHideScore,
    examIdMode,
    examIdLeft,
    absentMark,
    lowerPrimaryMode,
    showBindingHoles,
    subjectPreset,
  ],
  () => persistDraftSession(),
)
watch(blocks, () => persistDraftSession(), { deep: true })

onMounted(() => {
  void loadFile()
})
</script>

<style scoped>
.xfkj-sheet-designer-page {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f3f4f9;
  padding: 12px 14px 16px;
  box-sizing: border-box;
}
.xfkj-sheet-designer__file-tag {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.xfkj-sheet-designer {
  flex: 1;
  display: grid;
  grid-template-columns: 168px 1fr 276px;
  gap: 14px;
  min-height: 520px;
  align-items: stretch;
}

.xfkj-sheet-designer__col {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 14px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.xfkj-sheet-designer__col--left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.xfkj-sheet-designer__brand {
  font-size: 15px;
  font-weight: 700;
  color: #2d6fb8;
  letter-spacing: 0.06em;
  padding: 8px 0 4px;
}

.xfkj-sheet-designer__score {
  text-align: center;
}
.xfkj-sheet-designer__score-label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}
.xfkj-sheet-designer__score-val {
  font-size: 36px;
  font-weight: 600;
  color: #333;
  letter-spacing: -1px;
}
.xfkj-sheet-designer__score-val--accent {
  color: #e53935;
}
.xfkj-sheet-designer__score-val small {
  font-size: 16px;
  font-weight: normal;
}

.xfkj-sheet-designer__paper-toggles {
  display: flex;
  gap: 8px;
}
.xfkj-sheet-designer__paper-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}
.xfkj-sheet-designer__paper-btn.is-active {
  border-color: #5fb878;
  color: #5fb878;
}
.xfkj-sheet-designer__paper-btn--blue {
  border-color: #1e9fff;
  color: #1e9fff;
}

.xfkj-sheet-designer__settings-btn {
  width: 100%;
  background: #ff9800 !important;
  border-color: #ff9800 !important;
  color: #fff !important;
}

.xfkj-sheet-designer__col--canvas {
  background: linear-gradient(180deg, #dce4ef 0%, #e8edf5 40%, #eef2f8 100%);
  overflow: auto;
  padding: 16px;
}

.xfkj-sheet-designer__canvas-inner {
  width: 100%;
  margin: 0 auto;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  min-height: 480px;
  transition: transform 0.2s ease;
}
.xfkj-sheet-designer__canvas-inner.is-preview {
  transform: scale(0.92);
  transform-origin: top center;
}

.xfkj-sheet-canvas__blocks-empty {
  margin: 16px 0 0;
  padding: 12px;
  font-size: 12px;
  color: #888;
  background: #fafafa;
  border: 1px dashed #ddd;
  border-radius: 4px;
  line-height: 1.5;
}
.xfkj-sheet-block {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid #c9e6ff;
  border-radius: 4px;
  background: linear-gradient(180deg, #fafdff 0%, #f3f9ff 100%);
}
.xfkj-sheet-block--xfkj {
  margin-bottom: 12px;
  padding: 4px 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
}
.xfkj-sheet-block__edit {
  padding: 2px 10px;
  font-size: 12px;
  border: 1px solid #5fb878;
  background: #f0fff4;
  color: #238041;
  border-radius: 4px;
  cursor: pointer;
}
.xfkj-sheet-block__edit:hover {
  background: #e6ffef;
}
.xfkj-sheet-block__del {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid #ffb8b8;
  background: #fff5f5;
  color: #c00;
  border-radius: 4px;
  cursor: pointer;
}
.xfkj-sheet-block__del:hover {
  background: #ffecec;
}
.xfkj-sheet-block__wysiwyg {
  margin: 4px 0 0;
}
.xfkj-sheet-block__meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: #666;
}

.xfkj-blocks-a3 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 5mm;
  row-gap: 0;
  align-items: start;
  width: 100%;
  box-sizing: border-box;
}
.xfkj-blocks-a3__col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
@media (max-width: 720px) {
  .xfkj-blocks-a3 {
    grid-template-columns: 1fr;
  }
}

.xfkj-sheet-designer__panel {
  margin-bottom: 16px;
}
.xfkj-sheet-designer__panel-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.xfkj-sheet-designer__row {
  display: block;
  font-size: 13px;
  margin-bottom: 8px;
  color: #555;
}
.xfkj-sheet-designer__row--select span {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}
.xfkj-sheet-designer__row--select .xfkj-filter__input {
  width: 100%;
  max-width: 100%;
}
.xfkj-sheet-designer__radios {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.xfkj-sheet-designer__radios label {
  font-size: 13px;
}
.xfkj-sheet-designer__print-hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: #666;
}

.xfkj-sheet-designer__add-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.xfkj-sheet-designer__add-btn {
  text-align: left;
  padding: 10px 14px;
  border: 1px solid #b3d7ff;
  background: linear-gradient(180deg, #eaf4ff 0%, #dbeaff 100%);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #1a56a8;
  box-shadow: 0 1px 2px rgba(26, 86, 168, 0.08);
}
.xfkj-sheet-designer__add-btn:hover {
  border-color: #1e9fff;
  background: linear-gradient(180deg, #f0f8ff 0%, #e3f2ff 100%);
}

.xfkj-sheet-designer__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}
.xfkj-sheet-designer__back {
  margin-left: auto;
  border-color: #1e9fff !important;
  background-color: #fff !important;
  color: #1e9fff !important;
}

.xfkj-sheet-settings-modal {
  max-width: 400px;
}

@media (max-width: 1024px) {
  .xfkj-sheet-designer {
    grid-template-columns: 1fr;
  }
  .xfkj-sheet-designer__col--left {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  .xfkj-sheet-canvas__body {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- 打印时仅输出画布区，去背景与侧栏，边距与学校规范一致（打印对话框可再选 A4/A3） -->
<style>
@media print {
  @page {
    margin: 20mm 15mm;
  }
  .xfkj-sheet-print-root {
    background: #fff !important;
    padding: 0 !important;
    min-height: 0 !important;
  }
  .xfkj-sheet-designer {
    display: block !important;
  }
  .xfkj-sheet-designer__col--left,
  .xfkj-sheet-designer__col--right,
  .xfkj-sheet-designer__footer,
  .xfkj-sheet-designer__file-tag,
  .error-tip,
  .login-hint,
  .xfkj-sheet-block__meta,
  .xfkj-sheet-canvas__blocks-empty,
  .xfkj-sheet-designer__print-hint,
  .xfkj-sheet-block__edit,
  .xfkj-sheet-block__del {
    display: none !important;
  }
  .xfkj-sheet-designer__col--canvas {
    display: block !important;
    background: #fff !important;
    overflow: visible !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
  .xfkj-sheet-designer__canvas-inner {
    max-width: none !important;
    min-height: 0 !important;
  }
  .xfkj-sheet-designer__canvas-inner.is-preview {
    transform: none !important;
  }
  .xfkj-preview-root {
    background: #fff !important;
    padding: 0 !important;
  }
  .xfkj-juan {
    box-shadow: none !important;
    border: 1px solid #000 !important;
    background: #fff !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .xfkj-preview-root {
    background: #fff !important;
  }
  .xfkj-bind-strip {
    border-right: 2px solid #000 !important;
    background: #fff !important;
  }
  .xfkj-bind-strip__text,
  .xfkj-bind-strip__hint {
    color: #000 !important;
  }
  .xfkj-paper-title {
    border: 2px solid #000 !important;
    border-style: solid !important;
    background: #fff !important;
    color: #000 !important;
    box-shadow: none !important;
  }
  .xfkj-region--heavy {
    border: 2px solid #000 !important;
    background: #fff !important;
    box-shadow: none !important;
  }
  .xfkj-region--light {
    border: 1px solid #000 !important;
    background: #fff !important;
  }
  .xfkj-region__title {
    background: #fff !important;
    color: #000 !important;
    border-bottom: 1px solid #000 !important;
  }
  .xfkj-exam-barcode-tip {
    border-color: #000 !important;
    background: #fff !important;
    color: #000 !important;
  }
  .xfkj-barcode-zone {
    border: 1px solid #000 !important;
    background: #fff !important;
  }
  .xfkj-barcode-zone--primary {
    box-shadow: none !important;
  }
  .xfkj-barcode-zone__lbl {
    color: #000 !important;
  }
  .xfkz-page-mark {
    color: #000 !important;
  }
  .xfkj-sheet-block--xfkj {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .xfkj-blocks-a3 {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    column-gap: 5mm !important;
    align-items: start !important;
  }
  /* 题目块：打印用黑色线框（便于扫描与阅卷） */
  .wysiwyg-block--xfkj .xfkj-question--objective-print,
  .wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) {
    border-color: #000 !important;
    box-shadow: none !important;
  }
  .wysiwyg-block--xfkj .xfkj-q-toolbar {
    background: #fff !important;
    border-bottom-color: #000 !important;
  }
  .wysiwyg-block--xfkj .xfkj-editor,
  .wysiwyg-block--xfkj .xfkj-answer-box,
  .wysiwyg-block--xfkj .xfkj-essay-table {
    border-color: #000 !important;
    box-shadow: none !important;
  }
}
</style>
