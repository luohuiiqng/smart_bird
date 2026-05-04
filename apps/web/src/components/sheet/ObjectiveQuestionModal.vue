<template>
  <div class="xfkj-modal-mask xfkj-sheet-qmodal-mask" role="dialog" aria-modal="true" @click.self="$emit('cancel')">
    <div class="xfkj-sheet-qmodal" @click.stop>
      <header class="xfkj-sheet-qmodal__head">
        <h3 class="xfkj-sheet-qmodal__title">客观题设置</h3>
        <div class="xfkj-sheet-qmodal__head-actions">
          <button type="button" class="layui-btn layui-btn-normal xfkj-sheet-qmodal__ok" @click="onConfirm">确认</button>
          <button type="button" class="layui-btn layui-btn-primary" @click="$emit('cancel')">取消</button>
        </div>
      </header>

      <div class="xfkj-sheet-qmodal__row xfkj-sheet-qmodal__row--top">
        <label class="xfkj-sheet-qmodal__field">
          <span>大题题号</span>
          <select v-model="bigQuestionCode" class="xfkj-filter__input">
            <option v-for="o in bigQuestionOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
        <label class="xfkj-sheet-qmodal__field xfkj-sheet-qmodal__field--grow">
          <span>题目</span>
          <input v-model="questionTitle" type="text" class="xfkj-sheet-qmodal__input" placeholder="选择题" />
        </label>
        <label class="xfkj-sheet-qmodal__field">
          <span>选项间距</span>
          <input v-model.number="optionSpacing" type="number" min="1" max="30" class="xfkj-sheet-qmodal__input-num" />
        </label>
      </div>

      <div v-for="(seg, idx) in segments" :key="seg.localId" class="xfkj-sheet-qmodal__segment">
        <span class="xfkj-sheet-qmodal__tag" :class="tagClass(seg.tag)">{{ tagText(seg.tag) }}</span>
        <span class="xfkj-sheet-qmodal__seg-text">
          从
          <input v-model.number="seg.from" type="number" min="1" max="999" class="xfkj-sheet-qmodal__inline-num" />
          题到
          <input v-model.number="seg.to" type="number" min="1" max="999" class="xfkj-sheet-qmodal__inline-num" />
          题，每题
          <input v-model.number="seg.scorePerItem" type="number" min="0" max="100" class="xfkj-sheet-qmodal__inline-num" />
          分，每题
          <input v-model.number="seg.options" type="number" min="2" max="10" class="xfkj-sheet-qmodal__inline-num" />
          个选项
        </span>
        <button type="button" class="xfkj-sheet-qmodal__seg-remove" title="删除分段" @click="removeSegment(idx)">×</button>
      </div>

      <div class="xfkj-sheet-qmodal__seg-btns">
        <button type="button" class="layui-btn layui-btn-xs xfkj-seg--single" @click="addSegment('single')">+ 单选题分段</button>
        <button type="button" class="layui-btn layui-btn-xs xfkj-seg--multi" @click="addSegment('multi')">+ 多选题分段</button>
        <button type="button" class="layui-btn layui-btn-xs xfkj-seg--judge" @click="addSegment('judge')">+ 判断题分段</button>
        <button type="button" class="layui-btn layui-btn-xs layui-btn-danger xfkj-seg--clear" @click="clearSegments">清空</button>
      </div>

      <div class="xfkj-sheet-qmodal__preview-wrap">
        <div class="xfkj-sheet-qmodal__preview-title">题目预览（共 {{ previewRows.length }} 小题）</div>
        <ul class="xfkj-sheet-qmodal__preview-list">
          <li v-for="row in previewRows" :key="row.key" class="xfkj-sheet-qmodal__preview-item">
            <span class="xfkj-sheet-qmodal__tag xfkj-sheet-qmodal__tag--sm" :class="tagClass(row.tag)">{{
              tagText(row.tag)
            }}</span>
            <span
              >{{ row.n }}、 <strong>{{ row.score }}</strong> 分 <strong>{{ row.options }}</strong> 个选项</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { newBlockId } from '../../types/sheetLayout'
import type { ObjectiveSegmentTag, SheetBlock } from '../../types/sheetLayout'

const props = defineProps<{
  /** 编辑已有客观题块时传入 */
  initial?: Extract<SheetBlock, { kind: 'objective' }> | null
}>()

const emit = defineEmits<{
  confirm: [block: Extract<SheetBlock, { kind: 'objective' }>]
  cancel: []
}>()

const bigQuestionOptions = ['-', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const bigQuestionCode = ref('-')
const questionTitle = ref('选择题')
const optionSpacing = ref(5)

type SegRow = {
  localId: string
  tag: ObjectiveSegmentTag
  from: number
  to: number
  scorePerItem: number
  options: number
}

function segId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const segments = ref<SegRow[]>([])

function resetFromInitial() {
  const ini = props.initial
  if (ini?.segments && ini.segments.length > 0) {
    bigQuestionCode.value = ini.bigQuestionCode === null || ini.bigQuestionCode === undefined ? '-' : String(ini.bigQuestionCode)
    questionTitle.value = ini.questionTitle?.trim() || '选择题'
    optionSpacing.value = typeof ini.optionSpacing === 'number' ? ini.optionSpacing : 5
    segments.value = ini.segments.map((s) => ({
      localId: segId(),
      tag: s.tag,
      from: s.from,
      to: s.to,
      scorePerItem: s.scorePerItem,
      options: s.options,
    }))
    return
  }
  bigQuestionCode.value = '-'
  questionTitle.value = '选择题'
  optionSpacing.value = 5
  segments.value = [
    {
      localId: segId(),
      tag: 'single',
      from: 1,
      to: 10,
      scorePerItem: 2,
      options: 3,
    },
  ]
}

watch(
  () => props.initial,
  () => resetFromInitial(),
  { immediate: true },
)

function tagText(tag: ObjectiveSegmentTag): string {
  if (tag === 'single') return '单'
  if (tag === 'multi') return '多'
  return '判'
}

function tagClass(tag: ObjectiveSegmentTag): string {
  return `is-${tag}`
}

function addSegment(tag: ObjectiveSegmentTag) {
  const lastTo = segments.value.length
    ? Math.max(...segments.value.map((s) => Math.max(s.from, s.to)))
    : 0
  const from = lastTo + 1
  segments.value.push({
    localId: segId(),
    tag,
    from,
    to: from + 9,
    scorePerItem: 2,
    options: tag === 'judge' ? 2 : 3,
  })
}

function removeSegment(idx: number) {
  segments.value.splice(idx, 1)
}

function clearSegments() {
  segments.value = []
}

const previewRows = computed(() => {
  const rows: { key: string; tag: ObjectiveSegmentTag; n: number; score: number; options: number }[] = []
  for (const seg of segments.value) {
    const a = Math.min(seg.from, seg.to)
    const b = Math.max(seg.from, seg.to)
    for (let n = a; n <= b; n++) {
      rows.push({
        key: `${seg.localId}-${n}`,
        tag: seg.tag,
        n,
        score: seg.scorePerItem,
        options: seg.options,
      })
    }
  }
  return rows
})

function onConfirm() {
  const segs = segments.value.map((s) => ({
    tag: s.tag,
    from: Math.min(s.from, s.to),
    to: Math.max(s.from, s.to),
    scorePerItem: s.scorePerItem,
    options: s.options,
  }))
  if (segs.length === 0) {
    return
  }
  const flat = previewRows.value
  const totalQuestions = flat.length
  const avgScore =
    totalQuestions > 0 ? flat.reduce((s, r) => s + r.score, 0) / totalQuestions : 0
  const avgOpt =
    totalQuestions > 0 ? flat.reduce((s, r) => s + r.options, 0) / totalQuestions : 4

  const block: Extract<SheetBlock, { kind: 'objective' }> = {
    id: props.initial?.id ?? newBlockId(),
    kind: 'objective',
    optionSpacing: optionSpacing.value,
    questionsPerRow: typeof props.initial?.questionsPerRow === 'number' ? props.initial.questionsPerRow : 5,
    bigQuestionCode: bigQuestionCode.value === '-' ? null : bigQuestionCode.value,
    questionTitle: questionTitle.value.trim() || '选择题',
    segments: segs,
    count: totalQuestions,
    scorePerItem: Math.round(avgScore * 100) / 100,
    options: Math.round(avgOpt),
  }
  emit('confirm', block)
}
</script>

<style scoped>
.xfkj-sheet-qmodal-mask {
  z-index: 1200;
}
.xfkj-sheet-qmodal {
  width: min(720px, 96vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  padding: 16px 18px 14px;
}
.xfkj-sheet-qmodal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.xfkj-sheet-qmodal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.xfkj-sheet-qmodal__head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.xfkj-sheet-qmodal__ok {
  background: #5fb878 !important;
  border-color: #5fb878 !important;
}
.xfkj-sheet-qmodal__row--top {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 12px;
}
.xfkj-sheet-qmodal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #555;
}
.xfkj-sheet-qmodal__field--grow {
  flex: 1;
  min-width: 160px;
}
.xfkj-sheet-qmodal__input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.xfkj-sheet-qmodal__input-num {
  width: 64px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.xfkj-sheet-qmodal__segment {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.xfkj-sheet-qmodal__tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.xfkj-sheet-qmodal__tag.is-single {
  background: #1e9fff;
}
.xfkj-sheet-qmodal__tag.is-multi {
  background: #393d49;
}
.xfkj-sheet-qmodal__tag.is-judge {
  background: #ffb800;
  color: #333;
}
.xfkj-sheet-qmodal__tag--sm {
  padding: 1px 6px;
  font-size: 11px;
  margin-right: 6px;
}
.xfkj-sheet-qmodal__seg-text {
  flex: 1;
  min-width: 200px;
  color: #444;
}
.xfkj-sheet-qmodal__inline-num {
  width: 52px;
  margin: 0 4px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  text-align: center;
}
.xfkj-sheet-qmodal__seg-remove {
  border: none;
  background: transparent;
  color: #c00;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.xfkj-sheet-qmodal__seg-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.xfkj-seg--single {
  background: #e8f7ef !important;
  border-color: #5fb878 !important;
  color: #238041 !important;
}
.xfkj-seg--multi {
  background: #e8f4ff !important;
  border-color: #1e9fff !important;
  color: #1e6bb8 !important;
}
.xfkj-seg--judge {
  background: #fff8e6 !important;
  border-color: #ffb800 !important;
  color: #ad6800 !important;
}
.xfkj-seg--clear {
  margin-left: auto;
}
.xfkj-sheet-qmodal__preview-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  max-height: 220px;
  overflow: auto;
  background: #fff;
}
.xfkj-sheet-qmodal__preview-title {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}
.xfkj-sheet-qmodal__preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}
@media (max-width: 600px) {
  .xfkj-sheet-qmodal__preview-list {
    grid-template-columns: 1fr;
  }
}
.xfkj-sheet-qmodal__preview-item {
  font-size: 12px;
  color: #333;
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}
.xfkj-sheet-qmodal__foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
}
.xfkj-sheet-qmodal__foot-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.xfkj-sheet-qmodal__foot-select {
  max-width: 140px;
}
</style>
