<template>
  <div class="xfkj-modal-mask xfkj-sheet-qmodal-mask" role="dialog" aria-modal="true" @click.self="$emit('cancel')">
    <div class="xfkj-sheet-qmodal xfkj-sheet-qmodal--fill" @click.stop>
      <header class="xfkj-sheet-qmodal__head">
        <h3 class="xfkj-sheet-qmodal__title">填空题设置</h3>
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
          <input v-model="title" type="text" class="xfkj-sheet-qmodal__input" placeholder="填空题" />
        </label>
      </div>

      <div v-for="(seg, idx) in segments" :key="seg.localId" class="xfkj-sheet-qmodal__segment">
        <span class="xfkj-sheet-qmodal__tag" :class="seg.blankKind === 'short' ? 'is-short' : 'is-long'">{{
          seg.blankKind === 'short' ? '短' : '长'
        }}</span>
        <span class="xfkj-sheet-qmodal__seg-text">
          从
          <input v-model.number="seg.from" type="number" min="1" max="999" class="xfkj-sheet-qmodal__inline-num" />
          题到
          <input v-model.number="seg.to" type="number" min="1" max="999" class="xfkj-sheet-qmodal__inline-num" />
          题，每题
          <input v-model.number="seg.score" type="number" min="0" max="100" class="xfkj-sheet-qmodal__inline-num" />
          分，每题
          <input v-model.number="seg.totalBlanks" type="number" min="1" max="50" class="xfkj-sheet-qmodal__inline-num" />
          空，每行
          <input v-model.number="seg.blanksPerRow" type="number" min="1" max="20" class="xfkj-sheet-qmodal__inline-num" />
          空
        </span>
        <button type="button" class="xfkj-sheet-qmodal__seg-remove" title="删除分段" @click="removeSegment(idx)">×</button>
      </div>

      <div class="xfkj-sheet-qmodal__seg-btns">
        <button type="button" class="layui-btn layui-btn-xs xfkj-seg--short" @click="addSegment('short')">+ 短填空题</button>
        <button type="button" class="layui-btn layui-btn-xs xfkj-seg--long" @click="addSegment('long')">+ 长填空题</button>
        <button type="button" class="layui-btn layui-btn-xs layui-btn-danger xfkj-seg--clear" @click="clearSegments">清空</button>
      </div>

      <div class="xfkj-sheet-qmodal__preview-wrap">
        <div class="xfkj-sheet-qmodal__preview-title">小题列表（共 {{ previewItems.length }} 题）</div>
        <ul class="xfkj-sheet-qmodal__preview-list xfkj-sheet-qmodal__preview-list--fill">
          <li v-for="it in previewItems" :key="it.key" class="xfkj-sheet-qmodal__preview-item">
            <span class="xfkj-sheet-qmodal__tag xfkj-sheet-qmodal__tag--sm" :class="it.blankKind === 'short' ? 'is-short' : 'is-long'">{{
              it.blankKind === 'short' ? '短' : '长'
            }}</span>
            <span
              >{{ it.n }}、 <strong>{{ it.score }}</strong> 分 · {{ it.totalBlanks }} 空 · 每行 {{ it.blanksPerRow }} 空</span
            >
          </li>
        </ul>
      </div>

      <footer class="xfkj-sheet-qmodal__foot xfkj-sheet-qmodal__foot--muted">
        <label class="xfkj-sheet-qmodal__foot-item">
          <input type="radio" name="fill-regen" value="keep" checked disabled />
          保留自定义内容（与阅卷结构生成一致时启用）
        </label>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { newBlockId } from '../../types/sheetLayout'
import type { FillBlankKind, SheetBlock } from '../../types/sheetLayout'

const props = defineProps<{
  initial?: Extract<SheetBlock, { kind: 'fill' }> | null
}>()

const emit = defineEmits<{
  confirm: [block: Extract<SheetBlock, { kind: 'fill' }>]
  cancel: []
}>()

const bigQuestionOptions = ['-', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const bigQuestionCode = ref('-')
const title = ref('填空题')

type SegRow = {
  localId: string
  blankKind: FillBlankKind
  from: number
  to: number
  score: number
  totalBlanks: number
  blanksPerRow: number
}

function segId() {
  return `fs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const segments = ref<SegRow[]>([])

function resetFromInitial() {
  const ini = props.initial
  if (ini?.items && ini.items.length > 0) {
    bigQuestionCode.value = ini.bigQuestionCode === null || ini.bigQuestionCode === undefined ? '-' : String(ini.bigQuestionCode)
    title.value = ini.title?.trim() || '填空题'
    const byRange = groupFillItemsToSegments(ini.items)
    segments.value = byRange
    return
  }
  if (ini && ini.count != null) {
    bigQuestionCode.value = ini.bigQuestionCode === null || ini.bigQuestionCode === undefined ? '-' : String(ini.bigQuestionCode)
    title.value = ini.title?.trim() || '填空题'
    segments.value = [
      {
        localId: segId(),
        blankKind: 'short',
        from: 1,
        to: Math.max(1, ini.count),
        score: ini.scorePerItem,
        totalBlanks: 3,
        blanksPerRow: 4,
      },
    ]
    return
  }
  bigQuestionCode.value = '二'
  title.value = '填空题'
  segments.value = [
    {
      localId: segId(),
      blankKind: 'short',
      from: 11,
      to: 20,
      score: 5,
      totalBlanks: 3,
      blanksPerRow: 4,
    },
  ]
}

/** 将已有 items 合并为连续区间分段（同参合并为一段，简化编辑） */
function groupFillItemsToSegments(items: NonNullable<Extract<SheetBlock, { kind: 'fill' }>['items']>): SegRow[] {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => a.n - b.n)
  const out: SegRow[] = []
  let cur: SegRow | null = null
  for (const it of sorted) {
    const extend =
      cur &&
      it.blankKind === cur.blankKind &&
      it.score === cur.score &&
      it.totalBlanks === cur.totalBlanks &&
      it.blanksPerRow === cur.blanksPerRow &&
      it.n === cur.to + 1
    if (extend && cur) {
      cur.to = it.n
    } else {
      cur = {
        localId: segId(),
        blankKind: it.blankKind,
        from: it.n,
        to: it.n,
        score: it.score,
        totalBlanks: it.totalBlanks,
        blanksPerRow: it.blanksPerRow,
      }
      out.push(cur)
    }
  }
  return out
}

watch(
  () => props.initial,
  () => resetFromInitial(),
  { immediate: true },
)

function addSegment(kind: FillBlankKind) {
  const lastTo = segments.value.length ? Math.max(...segments.value.map((s) => Math.max(s.from, s.to))) : 0
  const from = lastTo + 1
  segments.value.push({
    localId: segId(),
    blankKind: kind,
    from,
    to: from + 4,
    score: 5,
    totalBlanks: 3,
    blanksPerRow: 4,
  })
}

function removeSegment(idx: number) {
  segments.value.splice(idx, 1)
}

function clearSegments() {
  segments.value = []
}

const previewItems = computed(() => {
  const list: {
    key: string
    n: number
    blankKind: FillBlankKind
    score: number
    totalBlanks: number
    blanksPerRow: number
  }[] = []
  for (const seg of segments.value) {
    const a = Math.min(seg.from, seg.to)
    const b = Math.max(seg.from, seg.to)
    for (let n = a; n <= b; n++) {
      list.push({
        key: `${seg.localId}-${n}`,
        n,
        blankKind: seg.blankKind,
        score: seg.score,
        totalBlanks: seg.totalBlanks,
        blanksPerRow: seg.blanksPerRow,
      })
    }
  }
  return list
})

function onConfirm() {
  if (segments.value.length === 0) return
  const items = previewItems.value.map((it) => ({
    n: it.n,
    blankKind: it.blankKind,
    score: it.score,
    totalBlanks: it.totalBlanks,
    blanksPerRow: it.blanksPerRow,
  }))
  const sumScore = items.reduce((s, x) => s + x.score, 0)
  const cnt = items.length
  const block: Extract<SheetBlock, { kind: 'fill' }> = {
    id: props.initial?.id ?? newBlockId(),
    kind: 'fill',
    bigQuestionCode: bigQuestionCode.value === '-' ? null : bigQuestionCode.value,
    title: title.value.trim() || '填空题',
    items,
    count: cnt,
    scorePerItem: cnt > 0 ? Math.round((sumScore / cnt) * 100) / 100 : 0,
    charPerBlank: items[0]?.totalBlanks ?? 4,
  }
  emit('confirm', block)
}
</script>

<style scoped>
.xfkj-sheet-qmodal--fill .is-short {
  background: #16baaa;
}
.xfkj-sheet-qmodal--fill .is-long {
  background: #2f4056;
}
.xfkj-seg--short {
  background: #e6fffa !important;
  border-color: #16baaa !important;
  color: #0d6b62 !important;
}
.xfkj-seg--long {
  background: #eef2f6 !important;
  border-color: #2f4056 !important;
  color: #2f4056 !important;
}
.xfkj-sheet-qmodal__preview-list--fill {
  grid-template-columns: 1fr;
}
.xfkj-sheet-qmodal__foot--muted {
  opacity: 0.85;
}
</style>
