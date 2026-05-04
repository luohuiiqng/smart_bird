<template>
  <div
    class="wysiwyg-block"
    :class="{
      'wysiwyg-block--xfkj': isXfkj,
      'xfkj-visual--lower-primary': isXfkj && visualMode === 'lowerPrimary',
    }"
    :data-kind="block.kind"
  >
    <!-- 小帆 sheetview 式版式 -->
    <template v-if="isXfkj">
      <template v-if="block.kind === 'objective'">
        <div class="xfkj-question W xfkj-question--block xfkj-question--objective-print">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、{{ block.questionTitle?.trim() || '选择题' }}
              <span v-if="!hideScore" class="xfkj-q-score">（{{ blockTotalScore }}分）</span>
            </div>
            <div class="xfkj-q-tools">
              <template v-if="!objectiveVertical">
                <span class="xfkj-per-label">每行题数</span>
                <button type="button" class="xfkj-step" aria-label="减少" @click="nudgeQuestionsPerRow(-1)">
                  −
                </button>
                <span class="xfkj-per-val">{{ objectiveQuestionsPerRow }}</span>
                <button type="button" class="xfkj-step" aria-label="增加" @click="nudgeQuestionsPerRow(1)">
                  +
                </button>
              </template>
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p v-if="showEnglishListeningBanner" class="xfkj-listening-banner">
            听力部分（请边听边填涂，听力结束后不得再修改本区填涂）
          </p>
          <p v-if="objectiveHasMulti" class="xfkj-objective-banner">多选、少选、错选均不得分</p>
          <p class="xfkj-objective-omr-hint">请用2B铅笔填涂</p>
          <div
            class="xfkj-objective-grid"
            :class="{ 'xfkj-objective-grid--vertical': objectiveVertical }"
            :style="objectiveGridStyle"
          >
            <div
              v-for="row in objectiveRows"
              :key="'o-' + block.id + '-' + row.n"
              class="xfkj-obj-cell"
            >
              <span class="small_code">{{ row.n }}</span>
              <span v-if="!hideScore" class="xfkj-obj-score">{{ row.score }}分</span>
              <div
                v-if="row.tag === 'judge'"
                class="xfkj-bubbles xfkj-bubbles--judge"
                :class="{ 'xfkj-bubbles--vert': objectiveVertical }"
              >
                <span class="xfkj-opt-pair">
                  <span class="xfkj-opt-letter">正确</span>
                  <span class="sheet-omr-bubble sheet-omr-bubble--8mm" role="presentation" title="正确" />
                </span>
                <span class="xfkj-opt-pair xfkj-opt-pair--judge-gap">
                  <span class="xfkj-opt-letter">错误</span>
                  <span class="sheet-omr-bubble sheet-omr-bubble--8mm" role="presentation" title="错误" />
                </span>
              </div>
              <div v-else class="xfkj-bubbles" :class="{ 'xfkj-bubbles--vert': objectiveVertical }">
                <span v-for="L in optionLetters(row.options)" :key="L" class="xfkj-opt-pair">
                  <span class="xfkj-opt-letter">{{ L }}</span>
                  <span class="sheet-omr-bubble sheet-omr-bubble--8mm" role="presentation" :title="'选项 ' + L" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'fill'">
        <div class="xfkj-question W xfkj-question--block">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、{{ block.title?.trim() || '填空题' }}
              <span v-if="!hideScore" class="xfkj-q-score">（{{ blockTotalScore }}分）</span>
            </div>
            <div class="xfkj-q-tools">
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p v-if="showFillHumanitiesHint" class="xfkj-fill-subhint W">
            结合材料与所学知识作答，条理清晰；史实、地名与术语准确。
          </p>
          <div class="subs W editor xfkj-editor xfkj-fill-editor">
            <div class="xfkj-fill-grid">
              <div v-for="it in fillItems" :key="'ff-' + block.id + '-' + it.n" class="xfkj-fill-cell">
                <span class="small_code">{{ it.n }}</span
                >.<template v-if="!hideScore"><span class="xfkj-fill-mini">（{{ it.score }}分）</span></template>
                <template
                  v-for="lineIdx in Math.ceil(it.totalBlanks / it.blanksPerRow)"
                  :key="'ln-' + it.n + '-' + lineIdx"
                >
                  <br v-if="lineIdx > 1" />
                  <template v-for="j in blanksInLine(it, lineIdx - 1)" :key="'b' + it.n + '-' + lineIdx + '-' + j">
                    <u class="xfkj-u">{{ fillUnderline }}</u
                    >&nbsp;
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'answer'">
        <div class="xfkj-question W xfkj-question--block">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、解答题
              <span v-if="!hideScore" class="xfkj-q-score">（{{ blockTotalScore }}分）</span>
            </div>
            <div class="xfkj-q-tools">
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p v-if="answerStemHint" class="xfkj-q-subhint W">{{ answerStemHint }}</p>
          <div class="xfkj-answer-wrap" :class="{ 'xfkj-answer-wrap--scratch': showAnswerScratch }">
            <template v-for="qi in answerQuestionRange" :key="'ax-' + block.id + '-' + qi">
              <div v-if="showAnswerScratch" class="xfkj-answer-row">
                <div class="xfkj-answer-scratch" aria-hidden="true">
                  <span class="xfkj-answer-scratch__inner">演算区<br />（不计分）</span>
                </div>
                <div
                  class="xfkj-answer-box"
                  :class="{ 'xfkj-answer-box--math-grid': showAnswerMathGrid }"
                >
                  <div class="xfkj-answer-head">
                    <span class="small_code">{{ qi }}</span
                    >.<template v-if="!hideScore">（{{ answerScorePerItem }}分）</template>
                  </div>
                  <p class="xfkj-answer-zone-lbl">答题区</p>
                  <div class="xfkj-answer-lines">
                    <template v-for="ln in lineArray(answerLinesCount)" :key="'ln' + qi + '-' + ln">
                      <u class="xfkj-u xfkj-u--wide">{{ answerUnderline }}</u><br />
                    </template>
                  </div>
                </div>
              </div>
              <div
                v-else
                class="xfkj-answer-box"
                :class="{ 'xfkj-answer-box--math-grid': showAnswerMathGrid }"
              >
                <div class="xfkj-answer-head">
                  <span class="small_code">{{ qi }}</span
                  >.<template v-if="!hideScore">（{{ answerScorePerItem }}分）</template>
                </div>
                <p class="xfkj-answer-zone-lbl">答题区</p>
                <div class="xfkj-answer-lines">
                  <template v-for="ln in lineArray(answerLinesCount)" :key="'ln' + qi + '-' + ln">
                    <u class="xfkj-u xfkj-u--wide">{{ answerUnderline }}</u><br />
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'essayEn'">
        <div class="xfkj-question W xfkj-question--block">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、英语作文
              <span v-if="!hideScore" class="xfkj-q-score">（{{ block.totalScore }}分）</span>
            </div>
            <div class="xfkj-q-tools">
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p class="xfkj-essay-require W xfkj-essay-require--en">
            书写规范，语法正确，语句通顺；禁止使用修正带、胶带修改。
          </p>
          <div class="wysiwyg-essay wysiwyg-essay--ruled xfkj-essay-ruled" :style="essayEnStyle(block.lineChars)" />
          <div class="xfkj-essay-footer xfkj-essay-footer--en W">
            <span>Word Count：<span class="xfkj-essay-footer__blank">　　　　　</span></span>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'essayZh'">
        <div class="xfkj-question W xfkj-question--block">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、语文作文
              <span v-if="!hideScore" class="xfkj-q-score">（{{ block.totalScore }}分）</span>
            </div>
            <div class="xfkj-q-tools">
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p class="xfkj-essay-require W">要求：字迹工整、卷面整洁；请勿使用铅笔书写正文。</p>
          <table class="W essay_table xfkj-essay-table" cellspacing="0" cellpadding="0">
            <tbody>
              <template v-for="pair in essayZhPairs" :key="'p-' + pair">
                <tr class="tr0">
                  <td
                    v-for="c in essayColsList"
                    :key="'a-' + pair + '-' + c"
                    :class="{ 'is-word-mark': essayWordMarkAt(pair, c) }"
                  >
                    <span v-if="essayWordMarkAt(pair, c)" class="xfkj-word-mark">{{ essayWordMarkAt(pair, c) }}</span>
                  </td>
                </tr>
                <tr class="tr1">
                  <td v-for="c in essayColsList" :key="'b-' + pair + '-' + c" />
                </tr>
              </template>
            </tbody>
          </table>
          <div class="xfkj-essay-footer W">
            <span>字数统计：<span class="xfkj-essay-footer__blank">　　　　　</span>字</span>
            <span class="xfkj-essay-footer__gap">卷面分：<span class="xfkj-essay-footer__blank">　　　</span>分</span>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'experimentDiagram'">
        <div class="xfkj-question W xfkj-question--block xfkj-question--experiment">
          <div class="xfkj-q-toolbar">
            <div class="xfkj-q-text xfkj-q-text--grow">
              <span class="big_code">{{ sectionBigCode }}</span>、{{ block.title?.trim() || '实验装置图' }}
              <span class="xfkj-q-score xfkj-q-score--muted">（作图区 {{ diagramW }}×{{ diagramH }} mm）</span>
            </div>
            <div class="xfkj-q-tools">
              <slot name="xfkj-actions" />
            </div>
          </div>
          <p v-if="subjectPreset === 'science'" class="xfkj-exp-science-hint W">
            用黑色签字笔作图，线条清晰；若题为实验设计，可在此标注装置与连接方式。
          </p>
          <p v-if="block.note?.trim()" class="xfkj-exp-note W">{{ block.note.trim() }}</p>
          <div
            class="xfkj-exp-frame"
            :style="experimentFrameStyle"
            role="img"
            :aria-label="(block.title?.trim() || '实验作图区') + '，约' + diagramW + '乘' + diagramH + '毫米'"
          />
          <p class="xfkj-exp-foot W">作图区外及定位点、条形码区不得书写与污损。</p>
        </div>
      </template>

      <template v-else-if="block.kind === 'reserve'">
        <div class="xfkj-question W xfkj-question--reserve">
          <div class="reserve xfkj-reserve">{{ block.note?.trim() || '请勿在此区域做答' }}</div>
        </div>
      </template>
    </template>

    <!-- 默认设计器样式 -->
    <template v-else>
      <template v-if="block.kind === 'objective'">
        <header class="wysiwyg-block__section-head">
          <span v-if="block.bigQuestionCode" class="wysiwyg-bigq">{{ block.bigQuestionCode }}</span>
          <strong>{{ block.questionTitle?.trim() || '选择题' }}</strong>
        </header>
        <div class="wysiwyg-objective" :class="{ 'wysiwyg-objective--vertical': objectiveVertical }">
          <div v-for="row in objectiveRows" :key="'o-' + block.id + '-' + row.n" class="wysiwyg-objective__row">
            <span class="wysiwyg-tag" :class="'is-' + row.tag">{{ objectiveTagLabelZh(row.tag) }}</span>
            <span class="wysiwyg-qno">{{ row.n }}、</span>
            <span v-if="!hideScore" class="wysiwyg-score">{{ row.score }} 分</span>
            <div class="wysiwyg-bubbles" :class="{ 'wysiwyg-bubbles--vert': objectiveVertical }">
              <span
                v-for="L in optionLetters(row.options)"
                :key="L"
                class="sheet-omr-bubble sheet-omr-bubble--lg"
                role="presentation"
                :title="'选项 ' + L"
              >
                <span class="sheet-omr-bubble__lbl">{{ L }}</span>
              </span>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'fill'">
        <header class="wysiwyg-block__section-head">
          <span v-if="block.bigQuestionCode" class="wysiwyg-bigq">{{ block.bigQuestionCode }}</span>
          <strong>{{ block.title?.trim() || '填空题' }}</strong>
        </header>
        <div class="wysiwyg-fill">
          <div v-for="it in fillItems" :key="'f-' + block.id + '-' + it.n" class="wysiwyg-fill__row">
            <span class="wysiwyg-tag" :class="it.blankKind === 'short' ? 'is-short' : 'is-long'">{{
              it.blankKind === 'short' ? '短' : '长'
            }}</span>
            <span class="wysiwyg-qno">{{ it.n }}、</span>
            <span v-if="!hideScore" class="wysiwyg-score">{{ it.score }} 分</span>
            <div class="wysiwyg-fill__blanks">
              <div
                v-for="lineIdx in Math.ceil(it.totalBlanks / it.blanksPerRow)"
                :key="'l' + lineIdx"
                class="wysiwyg-fill__line"
              >
                <span v-for="j in blanksInLine(it, lineIdx - 1)" :key="j" class="wysiwyg-fill__slot">________</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'answer'">
        <header class="wysiwyg-block__section-head">
          <strong>解答题</strong>
          <span v-if="!hideScore" class="wysiwyg-section-score">（共 {{ answerTotalScore }} 分）</span>
        </header>
        <div class="wysiwyg-answer">
          <div v-for="qi in block.count" :key="'a-' + block.id + '-' + qi" class="wysiwyg-answer__q">
            <div class="wysiwyg-answer__title">
              {{ qi }}、<template v-if="!hideScore">（{{ block.scorePerItem }} 分）</template>
            </div>
            <div class="wysiwyg-answer__lines">
              <div v-for="ln in lineArray(block.lines)" :key="ln" class="wysiwyg-answer__line" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.kind === 'essayEn'">
        <header class="wysiwyg-block__section-head">
          <strong>英语作文</strong>
          <span v-if="!hideScore" class="wysiwyg-section-score">（{{ block.totalScore }} 分）</span>
        </header>
        <div class="wysiwyg-essay wysiwyg-essay--ruled" :style="essayEnStyle(block.lineChars)" />
      </template>

      <template v-else-if="block.kind === 'essayZh'">
        <header class="wysiwyg-block__section-head">
          <strong>语文作文</strong>
          <span v-if="!hideScore" class="wysiwyg-section-score">（{{ block.totalScore }} 分）</span>
        </header>
        <div class="wysiwyg-essay wysiwyg-essay--grid" />
      </template>

      <template v-else-if="block.kind === 'experimentDiagram'">
        <header class="wysiwyg-block__section-head">
          <span class="wysiwyg-bigq">{{ sectionBigCode }}</span>
          <strong>{{ block.title?.trim() || '实验装置图' }}</strong>
          <span class="wysiwyg-section-score">（{{ diagramW }}×{{ diagramH }} mm）</span>
        </header>
        <p v-if="block.note?.trim()" class="wysiwyg-block__note">{{ block.note.trim() }}</p>
        <div class="wysiwyg-diagram" :style="experimentFrameStyle" />
      </template>

      <template v-else-if="block.kind === 'reserve'">
        <div class="wysiwyg-reserve">
          <p class="wysiwyg-reserve__text">{{ block.note?.trim() || '非作答区域' }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  chineseSectionOrdinal,
  fillBlockPreviewItems,
  objectiveBlockPreviewRows,
  objectiveTagLabelZh,
  optionLetters,
  sheetBlockScore,
} from '../../types/sheetLayout'
import type { SheetBlock, SheetSubjectPreset, SheetVisualMode } from '../../types/sheetLayout'

const props = withDefaults(
  defineProps<{
    block: SheetBlock
    hideScore: boolean
    objectiveVertical: boolean
    theme?: 'default' | 'xfkj'
    blockIndex?: number
    /** 低年级大号版式（与 SheetXfkjCanvas 一致） */
    visualMode?: SheetVisualMode
    /** 学科预设：听力提示、演算区、网格、文科填空提示等 */
    subjectPreset?: SheetSubjectPreset
    /** 是否为第一块客观题（用于英语听力分区提示） */
    isFirstObjectiveBlock?: boolean
  }>(),
  {
    theme: 'default',
    blockIndex: 0,
    visualMode: 'standard',
    subjectPreset: 'generic',
    isFirstObjectiveBlock: false,
  },
)

const emit = defineEmits<{
  'patch-objective': [{ id: string; questionsPerRow: number }]
}>()

const isXfkj = computed(() => props.theme === 'xfkj')

const objectiveRows = computed(() =>
  props.block.kind === 'objective' ? objectiveBlockPreviewRows(props.block) : [],
)

const objectiveHasMulti = computed(() =>
  objectiveRows.value.some((r) => r.tag === 'multi'),
)

const showEnglishListeningBanner = computed(
  () =>
    props.subjectPreset === 'english' &&
    props.block.kind === 'objective' &&
    props.isFirstObjectiveBlock,
)

const showFillHumanitiesHint = computed(
  () => props.subjectPreset === 'humanities' && props.block.kind === 'fill',
)

const showAnswerScratch = computed(
  () =>
    props.block.kind === 'answer' &&
    (props.subjectPreset === 'math' || props.subjectPreset === 'science'),
)

const showAnswerMathGrid = computed(
  () => props.block.kind === 'answer' && props.subjectPreset === 'math',
)

const answerStemHint = computed(() => {
  if (props.block.kind !== 'answer') return ''
  if (props.subjectPreset === 'math') {
    return '请写出详细解题步骤，只写答案不得分；几何作图请用黑色签字笔、线条清晰。'
  }
  if (props.subjectPreset === 'science') {
    return '请写出公式、演算过程和最终答案；注明单位、反应条件与有效数字。'
  }
  return ''
})

const fillItems = computed(() =>
  props.block.kind === 'fill' ? fillBlockPreviewItems(props.block) : [],
)

const answerTotalScore = computed(() =>
  props.block.kind === 'answer' ? props.block.count * props.block.scorePerItem : 0,
)

const sectionBigCode = computed(() => {
  const b = props.block
  const manual =
    (b.kind === 'objective' || b.kind === 'fill') && b.bigQuestionCode?.trim()
      ? b.bigQuestionCode.trim()
      : null
  if (manual) return manual
  return chineseSectionOrdinal(props.blockIndex)
})

const blockTotalScore = computed(() => sheetBlockScore(props.block))

function clampDiagramMm(n: unknown, fallback: number): number {
  const v = Math.floor(Number(n)) || fallback
  return Math.min(200, Math.max(40, v))
}

const diagramW = computed(() =>
  props.block.kind === 'experimentDiagram' ? clampDiagramMm(props.block.widthMm, 80) : 80,
)
const diagramH = computed(() =>
  props.block.kind === 'experimentDiagram' ? clampDiagramMm(props.block.heightMm, 60) : 60,
)

const experimentFrameStyle = computed((): Record<string, string> => ({
  width: `${diagramW.value}mm`,
  height: `${diagramH.value}mm`,
}))

const objectiveQuestionsPerRow = computed(() => {
  if (props.block.kind !== 'objective') return 5
  return Math.min(12, Math.max(1, props.block.questionsPerRow ?? 5))
})

const objectiveGridStyle = computed((): Record<string, string> | undefined => {
  if (props.block.kind !== 'objective' || props.objectiveVertical) return undefined
  const n = objectiveQuestionsPerRow.value
  const gap = Math.min(24, Math.max(8, (props.block.optionSpacing ?? 5) * 3))
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
    columnGap: `${gap}px`,
    rowGap: '10px',
  }
})

function nudgeQuestionsPerRow(delta: number) {
  if (props.block.kind !== 'objective') return
  const cur = props.block.questionsPerRow ?? 5
  const next = Math.min(12, Math.max(1, cur + delta))
  emit('patch-objective', { id: props.block.id, questionsPerRow: next })
}

const answerQuestionRange = computed(() => {
  if (props.block.kind !== 'answer') return [] as number[]
  return Array.from({ length: props.block.count }, (_, i) => i + 1)
})
const answerScorePerItem = computed(() =>
  props.block.kind === 'answer' ? props.block.scorePerItem : 0,
)
const answerLinesCount = computed(() =>
  props.block.kind === 'answer' ? props.block.lines : 0,
)

/** 小帆式下划线占位（全角空格 + NBSP，视觉接近 sheetview） */
const fillUnderline = '                '
const answerUnderline =
  '                                                              '

const essayColsList = computed(() => {
  if (props.block.kind !== 'essayZh') return Array.from({ length: 22 }, (_, i) => i + 1)
  const n = Math.min(24, Math.max(18, Math.round(props.block.lineChars || 22)))
  return Array.from({ length: n }, (_, i) => i + 1)
})

const essayZhPairs = computed(() =>
  props.block.kind === 'essayZh' ? Array.from({ length: 18 }, (_, i) => i) : [],
)

/** 字数标记示意（与参考图角落数字接近） */
function essayWordMarkAt(pairIdx: number, colIdx: number): string | null {
  if (props.block.kind !== 'essayZh') return null
  const n = essayColsList.value.length
  const mid = Math.max(1, Math.ceil(n / 2))
  if (pairIdx === 3 && colIdx === n) return '200'
  if (pairIdx === 7 && colIdx === n) return '400'
  if (pairIdx === 11 && colIdx === mid) return '600'
  return null
}

function blanksInLine(it: { totalBlanks: number; blanksPerRow: number }, lineIndex: number): number[] {
  const start = lineIndex * it.blanksPerRow
  const n = Math.min(it.blanksPerRow, it.totalBlanks - start)
  return Array.from({ length: Math.max(0, n) }, (_, i) => start + i)
}

function essayEnStyle(lineChars: number) {
  const rows = Math.min(28, Math.max(10, Math.round(520 / Math.max(lineChars, 6))))
  return {
    minHeight: `${rows * 8 + 16}px`,
    '--ruled-rows': rows,
  }
}

function lineArray(n: number) {
  const len = Math.max(0, Math.floor(Number(n)) || 0)
  return Array.from({ length: len }, (_, i) => i + 1)
}
</script>

<style scoped>
.wysiwyg-block {
  font-size: 12px;
  line-height: 1.5;
  color: #222;
}

/* ——— 小帆主题（SheetView 风格：蓝系描边 + 工具条灰蓝底） ——— */
.wysiwyg-block--xfkj {
  color: #334155;
  font-size: 14px;
}
.wysiwyg-block--xfkj .big_code {
  font-family: 'Songti SC', 'SimSun', serif;
  color: #0d47a1;
}
.xfkj-question--block {
  margin-top: 4px;
}
.xfkj-question--objective-print {
  margin-top: 12px;
  padding: 0 0 12px;
  border: 1px solid #7ec8f5;
  border-radius: 6px;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 2px 10px rgba(30, 159, 255, 0.07);
  overflow: hidden;
}
.xfkj-question--objective-print > .xfkj-q-toolbar {
  margin-bottom: 0;
}
.xfkj-objective-banner {
  margin: 8px 10px 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #92400e;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
}
.xfkj-objective-omr-hint {
  margin: 0 10px 8px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #1565c0;
}
.xfkj-q-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  min-height: 36px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #f0f8ff 0%, #e8f4fc 100%);
  border-bottom: 1px solid #b3d7ff;
}
.xfkj-q-text {
  font-size: 14px;
  font-weight: bold;
  text-align: left;
  line-height: 1.35;
  color: #1e293b;
}
.xfkj-q-text--grow {
  flex: 1;
  min-width: 0;
}
.xfkj-q-score {
  font-weight: normal;
  margin-left: 4px;
}
.xfkj-q-tools {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  flex-shrink: 0;
}
.xfkj-per-label {
  font-size: 12px;
  color: #555;
  font-weight: normal;
}
.xfkj-step {
  width: 24px;
  height: 24px;
  padding: 0;
  line-height: 22px;
  text-align: center;
  border: 1px solid #93c5fd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #1e40af;
}
.xfkj-step:hover {
  border-color: #1e9fff;
  color: #0284c7;
  background: #f0f9ff;
}
.xfkj-per-val {
  min-width: 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}
.xfkj-objective-grid {
  margin: 8px 10px 0;
  padding-bottom: 4px;
}
.xfkj-objective-grid--vertical {
  display: flex;
  flex-direction: column;
  gap: 5mm;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-objective-grid--vertical {
  gap: 4mm;
}
.xfkj-obj-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-height: 28px;
}
.xfkj-objective-grid--vertical .xfkj-obj-cell {
  flex-direction: row;
  align-items: flex-start;
}
.small_code {
  font-size: 13px;
  font-weight: 600;
  margin-right: 2px;
}
.xfkj-obj-score {
  font-size: 12px;
  margin-right: 4px;
  color: #555;
}
.xfkj-bubbles {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3mm 10px;
  align-items: center;
}
.xfkj-bubbles--judge {
  gap: 10mm;
}
.xfkj-bubbles--vert {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.xfkj-opt-pair {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.xfkj-opt-pair--judge-gap {
  margin-left: 0;
}
.xfkj-opt-letter {
  font-size: 12px;
  font-weight: 700;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #000;
  min-width: 1em;
  text-align: right;
}
/* 学校规范（小帆主题）：填涂格 8mm×8mm，字母在格左侧；默认主题仍用下方小型格 */
.wysiwyg-block--xfkj .sheet-omr-bubble {
  display: inline-block;
  width: 8mm;
  height: 8mm;
  padding: 0;
  border: 2px solid #000;
  border-radius: 1px;
  background: #fff;
  box-sizing: border-box;
  flex-shrink: 0;
}
.wysiwyg-block--xfkj .sheet-omr-bubble--8mm {
  border-width: 2px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .sheet-omr-bubble {
  width: 10mm;
  height: 10mm;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-q-text {
  font-size: 18px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .big_code {
  font-size: 18px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .small_code,
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-obj-score {
  font-size: 14px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-opt-letter {
  font-size: 14px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-objective-banner,
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-objective-omr-hint {
  font-size: 14px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-editor {
  font-size: 14px;
  line-height: 38px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-answer-head {
  font-size: 15px;
}
.wysiwyg-block--xfkj.xfkj-visual--lower-primary .xfkj-u {
  font-size: 15px;
}
.sheet-omr-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 11px;
  padding: 0 2px;
  border: 1.5px solid #000;
  border-radius: 2px;
  background: #fff;
  box-sizing: border-box;
  flex-shrink: 0;
}
.sheet-omr-bubble__lbl {
  font-size: 8px;
  font-weight: 700;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  line-height: 1;
}
.sheet-omr-bubble--lg {
  width: 20px;
  height: 13px;
}
.sheet-omr-bubble--lg .sheet-omr-bubble__lbl {
  font-size: 9px;
}
.xfkj-editor {
  line-height: 35px;
  padding: 10px 5px;
  font-family: 'SimSun', 'Songti SC', serif;
  word-break: break-all;
  box-sizing: border-box;
  margin-top: 0;
  border: 1px solid #5b9bd5;
  border-radius: 4px;
  box-shadow: inset 0 1px 2px rgba(30, 159, 255, 0.04);
}
.xfkj-fill-editor {
  margin-top: 0;
}
.xfkj-fill-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  align-items: start;
}
@media (max-width: 640px) {
  .xfkj-fill-grid {
    grid-template-columns: 1fr;
  }
}
.xfkj-fill-cell {
  text-align: left;
}
.xfkj-listening-banner {
  margin: 8px 10px 0;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'SimSun', 'Songti SC', serif;
  border: 1px dashed #42a5f5;
  border-radius: 4px;
  background: #eff6ff;
  line-height: 1.4;
  text-align: center;
  color: #1e40af;
}
.xfkj-fill-subhint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.45;
  color: #333;
  font-family: 'SimSun', 'Songti SC', serif;
}
.xfkj-q-subhint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #000;
  font-family: 'SimSun', 'Songti SC', serif;
}
.xfkj-answer-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.xfkj-answer-wrap--scratch {
  gap: 8mm;
}
.xfkj-answer-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 3mm;
  min-width: 0;
}
.xfkj-answer-scratch {
  flex: 0 0 30mm;
  min-height: 100px;
  border: 1px solid #000;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6px 4px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 40%);
}
.xfkj-answer-scratch__inner {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  color: #222;
  font-family: 'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif;
}
.xfkj-answer-box {
  flex: 1;
  min-width: 0;
  border: 1px solid #5b9bd5;
  border-radius: 4px;
  padding: 8px 10px 12px;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 1px 4px rgba(30, 159, 255, 0.06);
}
.xfkj-answer-box--math-grid {
  background-color: #fff;
  background-image: linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
  background-size: 5mm 5mm;
  background-position: 0 0;
}
.xfkj-answer-zone-lbl {
  margin: 0 0 4px;
  font-size: 11px;
  color: #555;
  font-family: 'SimSun', 'Songti SC', serif;
}
.xfkj-answer-head {
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 13px;
}
.xfkj-answer-lines {
  line-height: 1.8;
}
.xfkj-u {
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.xfkj-u--wide {
  display: inline-block;
  min-width: 96%;
}
.xfkj-fill-mini {
  font-size: 12px;
  margin: 0 4px;
}
.border {
  border: 1px solid #000;
}
.xfkj-essay-ruled {
  margin-top: 6px;
}
.xfkj-essay-require {
  margin: 6px 0 8px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #000;
  text-align: center;
}
.xfkj-essay-require--en {
  text-align: left;
  font-family: 'Times New Roman', 'SimSun', 'Songti SC', serif;
}
.xfkj-essay-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: 10px;
  padding: 8px 4px 4px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  border-top: 1px solid #000;
}
.xfkj-essay-footer__gap {
  margin-left: auto;
}
.xfkj-essay-footer__blank {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.xfkj-essay-footer--en {
  justify-content: flex-end;
  font-family: 'Times New Roman', 'SimSun', 'Songti SC', serif;
}

.xfkj-q-score--muted {
  font-weight: normal;
  color: #555;
  font-size: 12px;
  margin-left: 4px;
}
.xfkj-question--experiment {
  margin-top: 4px;
}

/* 填空 / 解答 / 作文 / 装置图：与小帆一致的「卡片 + 顶栏」（客观题块单独样式见上） */
.wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) {
  border: 1px solid #7ec8f5;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(30, 159, 255, 0.07);
  overflow: hidden;
}
.wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) .xfkj-q-toolbar {
  padding: 8px 12px;
  margin-bottom: 0;
  background: linear-gradient(180deg, #f0f8ff 0%, #e8f4fc 100%);
  border-bottom: 1px solid #b3d7ff;
}
.wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) .xfkj-editor,
.wysiwyg-block--xfkj .xfkj-answer-wrap,
.wysiwyg-block--xfkj .xfkj-essay-require,
.wysiwyg-block--xfkj .xfkj-essay-table,
.wysiwyg-block--xfkj .xfkj-essay-ruled {
  margin-left: 10px;
  margin-right: 10px;
}
.wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) .xfkj-editor {
  margin-bottom: 12px;
}
.wysiwyg-block--xfkj .xfkj-question--block:not(.xfkj-question--reserve):not(.xfkj-question--objective-print) .xfkj-answer-wrap {
  margin-bottom: 12px;
  padding: 0 2px;
}
.wysiwyg-block--xfkj .xfkj-fill-subhint {
  margin: 8px 12px;
}
.xfkj-exp-science-hint,
.xfkj-exp-note {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.45;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #222;
}
.xfkj-exp-note {
  padding: 6px 8px;
  border: 1px dashed #999;
  background: #fafafa;
}
.xfkj-exp-frame {
  display: block;
  margin: 4px auto 0;
  border: 2px solid #000;
  box-sizing: border-box;
  background-color: #fff;
  background-image: linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
  background-size: 5mm 5mm;
  flex-shrink: 0;
}
.xfkj-exp-foot {
  margin: 8px 0 0;
  font-size: 11px;
  color: #666;
  line-height: 1.35;
}

.wysiwyg-diagram {
  margin-top: 10px;
  border: 2px solid #333;
  box-sizing: border-box;
  background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent calc(5mm - 1px),
      rgba(0, 0, 0, 0.06) calc(5mm - 1px),
      rgba(0, 0, 0, 0.06) 5mm
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent calc(5mm - 1px),
      rgba(0, 0, 0, 0.06) calc(5mm - 1px),
      rgba(0, 0, 0, 0.06) 5mm
    );
}
.wysiwyg-block__note {
  margin: 8px 0;
  font-size: 12px;
  color: #444;
}
.xfkj-essay-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #5b9bd5;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 16px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  margin-top: 6px;
  line-height: 35px;
  min-height: 200px;
  overflow: hidden;
}
.xfkj-essay-table .tr0 td {
  width: 32px;
  border: 1px solid #000;
  height: 32px;
  position: relative;
  vertical-align: bottom;
}
.xfkj-essay-table .tr0 td.is-word-mark {
  vertical-align: bottom;
}
.xfkj-word-mark {
  position: absolute;
  right: 2px;
  bottom: 1px;
  font-size: 8px;
  line-height: 1;
  color: #333;
  pointer-events: none;
}
.xfkj-essay-table .tr1 td {
  width: 32px;
  border: none;
  height: 10px;
  font-size: 2px;
}
.xfkj-reserve {
  width: 100%;
  text-align: center;
  font-size: 22px;
  font-family: '黑体', 'Microsoft YaHei', sans-serif;
  min-height: 60px;
  line-height: 60px;
  border: 1px solid rgb(236, 236, 236);
  margin-top: 5px;
  box-sizing: border-box;
}
.xfkj-question--reserve {
  margin-top: 8px;
}

.wysiwyg-block__section-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #333;
  font-size: 13px;
}

.wysiwyg-bigq {
  font-family: 'Songti SC', 'SimSun', serif;
  color: #333;
}

.wysiwyg-section-score {
  font-weight: normal;
  font-size: 12px;
  color: #666;
}

.wysiwyg-tag {
  display: inline-block;
  min-width: 22px;
  padding: 0 6px;
  margin-right: 6px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: #fff;
}
.wysiwyg-tag.is-single {
  background: #1e9fff;
}
.wysiwyg-tag.is-multi {
  background: #393d49;
}
.wysiwyg-tag.is-judge {
  background: #ffb800;
  color: #333;
}
.wysiwyg-tag.is-short {
  background: #16baaa;
}
.wysiwyg-tag.is-long {
  background: #2f4056;
}

.wysiwyg-qno {
  font-weight: 600;
  margin-right: 4px;
}

.wysiwyg-score {
  margin-right: 8px;
  color: #555;
  font-size: 11px;
}

/* 客观题 */
.wysiwyg-objective__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-bottom: 8px;
  padding: 6px 4px;
  border-bottom: 1px dashed #e0e0e0;
}

.wysiwyg-objective--vertical .wysiwyg-objective__row {
  align-items: flex-start;
}

.wysiwyg-bubbles {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
}

.wysiwyg-bubbles--vert {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

/* 填空 */
.wysiwyg-fill__row {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ddd;
}

.wysiwyg-fill__blanks {
  margin-top: 6px;
  margin-left: 4px;
}

.wysiwyg-fill__line {
  margin-bottom: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
}

.wysiwyg-fill__slot {
  display: inline-block;
  min-width: 4.5em;
  border-bottom: 1px solid #333;
  height: 1.2em;
  vertical-align: bottom;
}

/* 解答题 */
.wysiwyg-answer__q {
  margin-bottom: 14px;
}

.wysiwyg-answer__title {
  margin-bottom: 6px;
  font-weight: 600;
}

.wysiwyg-answer__lines {
  border: 1px solid #bbb;
  padding: 8px 10px;
  background: #fafafa;
}

.wysiwyg-answer__line {
  height: 22px;
  border-bottom: 1px solid #ccc;
  margin-bottom: 0;
}

.wysiwyg-answer__line:last-child {
  border-bottom: none;
}

/* 作文 */
.wysiwyg-essay--ruled {
  border: 1px solid #bbb;
  background: repeating-linear-gradient(transparent, transparent 15px, #ccc 15px, #ccc 16px);
  background-origin: content-box;
  padding: 8px 12px;
  min-height: 200px;
}

.wysiwyg-essay--grid {
  border: 1px solid #bbb;
  background-image: linear-gradient(#e0e0e0 1px, transparent 1px),
    linear-gradient(90deg, #e0e0e0 1px, transparent 1px);
  background-size: 8mm 8mm;
  min-height: 240px;
}

/* 非作答 */
.wysiwyg-reserve {
  border: 2px dashed #999;
  padding: 16px;
  background: repeating-linear-gradient(-45deg, #fafafa, #fafafa 8px, #f3f3f3 8px, #f3f3f3 16px);
  min-height: 48px;
}

.wysiwyg-reserve__text {
  margin: 0;
  color: #666;
  font-size: 12px;
}
</style>
