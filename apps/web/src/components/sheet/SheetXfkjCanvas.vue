<!-- 学校可打印答题卡规范：考生信息→答题卡标识→注意事项→答题区；定位点 4mm；条码区 50×20mm -->
<template>
  <div class="xfkj-preview-root">
    <div class="xfkj-juan" :class="{ 'xfkj-visual--lower-primary': visualMode === 'lowerPrimary' }">
      <span class="xfkj-corner xfkj-corner--tl" aria-hidden="true" />
      <span class="xfkj-corner xfkj-corner--tr" aria-hidden="true" />
      <span class="xfkj-corner xfkj-corner--bl" aria-hidden="true" />
      <span class="xfkj-corner xfkj-corner--br" aria-hidden="true" />

      <div class="xfkj-bind-strip" aria-hidden="true">
        <span class="xfkj-bind-strip__line" />
        <span class="xfkj-bind-strip__text">装&nbsp;订&nbsp;线</span>
        <span class="xfkj-bind-strip__hint">请勿在此区域书写</span>
        <div v-if="showBindingHoles" class="xfkj-bind-holes">
          <span v-for="n in 3" :key="'hole-' + n" class="xfkj-bind-hole" />
        </div>
      </div>

      <div class="xfkj-juan-main">
        <!-- 试卷标题（学科/考试名称，黑体 16 号居中） -->
        <div class="paper_title W xfkj-paper-title">{{ title }}</div>

        <!-- 1 考生信息区 -->
        <section class="xfkj-region xfkj-region--heavy xfkj-region--student" aria-label="考生信息区">
          <h2 class="xfkj-region__title">考生信息</h2>
          <p class="xfkj-meta-row W">
            学校名称：<span class="xfkj-meta-u">　　　　　　　</span>　考试科目：<span class="xfkj-meta-u">　　　　　　　</span>　考试日期：<span class="xfkj-meta-u">　　　</span>年<span class="xfkj-meta-u">　　　</span>月<span class="xfkj-meta-u">　　　</span>日
          </p>
          <svg
            class="W xfkj-student"
            viewBox="0 0 560 44"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <text x="0" y="18" class="xfkj-student__lbl" fill="#000">姓名：</text>
            <path class="xfkj-student__line" d="M46 18 L115 18" />
            <text x="120" y="18" class="xfkj-student__lbl" fill="#000">班级：</text>
            <path class="xfkj-student__line" d="M166 18 L230 18" />
            <text x="235" y="18" class="xfkj-student__lbl" fill="#000">考场：</text>
            <path class="xfkj-student__line" d="M281 18 L330 18" />
            <text x="335" y="18" class="xfkj-student__lbl" fill="#000">座位：</text>
            <path class="xfkj-student__line" d="M381 18 L430 18" />
            <text x="0" y="38" class="xfkj-student__lbl" fill="#000">学号：</text>
            <path class="xfkj-student__line" d="M46 38 L200 38" />
            <text x="205" y="38" class="xfkj-student__lbl xfkj-student__lbl--sub" fill="#000">修改：</text>
            <path class="xfkj-student__line xfkj-student__line--light" d="M255 38 L520 38" />
          </svg>

          <div v-if="examIdMode === 'bubble'" class="xfkj-exam-omr W">
            <p class="xfkj-exam-omr__caption">
              准考证号（机读填涂）：每位对应一列，先填上方数字格（□），再在下列 0～9 中填涂其一。
            </p>
            <p class="xfkz-bubble-hint">{{ digitBubbleHint }}</p>
            <table class="xfkz-inner-table xfkz-inner-table--full" cellspacing="0" cellpadding="0">
              <tbody>
                <tr class="xfkz-codes-header">
                  <td v-for="c in examDigitCols" :key="'h' + c" class="xfkz-digit-col-head">□</td>
                </tr>
                <tr class="xfkz-codes-row">
                  <td v-for="col in examDigitCols" :key="'col' + col" class="xfkz-digit-col">
                    <img
                      v-for="d in 10"
                      :key="col + '-' + d"
                      :src="`/sheet-xfkj/digit-${d - 1}.svg`"
                      alt=""
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="xfkz-legend xfkz-legend--below">
              <span class="xfkz-legend-t">正确填涂</span>
              <span class="xfkz-legend-fill" />
              <span class="xfkz-legend-t">缺考标记</span>
              <span class="xfkz-legend-box" :class="{ 'is-checked': absentMark }" />
            </div>
          </div>
          <div v-else class="xfkj-exam-barcode-tip W">
            <p>
              考号以<strong>答题卡标识区</strong>「条形码粘贴区」为准；请勿在条码区书写或污损，以免影响机读。
            </p>
          </div>
        </section>

        <!-- 2 答题卡标识区（编号、科目、题型分布、条码区；四角定位点在页边距内） -->
        <section class="xfkj-region xfkj-region--heavy xfkj-region--id-card" aria-label="答题卡标识区">
          <h2 class="xfkj-region__title">答题卡标识</h2>
          <div class="xfkj-id-layout W">
            <div class="xfkj-id-text">
              <p class="xfkj-id-line">{{ seriesLabel }}</p>
              <p class="xfkj-id-line">科目标识：<strong>{{ displaySubjectLabel }}</strong></p>
              <p class="xfkj-id-line">
                题型分布：客观题 <strong>{{ objectiveScoreTotal }}</strong> 分，主观题 <strong>{{ subjectiveScoreTotal }}</strong> 分
              </p>
            </div>
            <div
              class="xfkj-barcode-zone"
              :class="{ 'xfkj-barcode-zone--primary': examIdMode === 'barcode' }"
              aria-label="条形码粘贴区"
            >
              <span class="xfkj-barcode-zone__lbl">条形码粘贴区</span>
              <span class="xfkj-barcode-zone__dim">50mm×20mm</span>
            </div>
          </div>
          <p class="xfkj-id-footnote W">注：印刷编号由考点发放；无条码时该区域可空白，不得遮挡四角定位点。</p>
        </section>

        <!-- 3 注意事项区（细边框，≤6 条） -->
        <section class="xfkj-region xfkj-region--light xfkj-region--notes" aria-label="注意事项">
          <h2 class="xfkj-region__title">注意事项</h2>
          <ol class="xfkz-notes-list">
            <li v-for="(line, idx) in notesLines" :key="'n-' + idx">{{ line }}</li>
          </ol>
        </section>

        <div class="xfkz-page-mark">{{ displayPageLabel }}</div>

        <div class="xfkj-questions">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SheetVisualMode } from '../../types/sheetLayout'

const props = withDefaults(
  defineProps<{
    /** 试卷主标题（可与科目标识相同或单独设置 subjectLabel） */
    title: string
    examIdMode: 'bubble' | 'barcode'
    absentMark: boolean
    pageLabel?: string
    pageIndex?: number
    pageTotal?: number
    examDigitColumns?: number
    visualMode?: SheetVisualMode
    showBindingHoles?: boolean
    /** 答题卡编号说明（印刷唯一编号） */
    seriesLabel?: string
    /** 科目标识展示文案，默认同 title */
    subjectLabel?: string
    objectiveScoreTotal?: number
    subjectiveScoreTotal?: number
    /** 第 6 条注意事项（学科专属提示，空则用通用句） */
    subjectNotesLine?: string
  }>(),
  {
    pageIndex: 1,
    pageTotal: 1,
    examDigitColumns: 9,
    visualMode: 'standard',
    showBindingHoles: false,
    seriesLabel: '答题卡编号：印刷时填写（每张唯一）',
    subjectLabel: '',
    objectiveScoreTotal: 0,
    subjectiveScoreTotal: 0,
    subjectNotesLine: '',
  },
)

const examDigitCols = computed(() =>
  Math.min(12, Math.max(6, Math.floor(props.examDigitColumns) || 9)),
)

const displayPageLabel = computed(() => {
  const custom = props.pageLabel?.trim()
  if (custom) return custom
  const i = Math.max(1, props.pageIndex || 1)
  const t = Math.max(1, props.pageTotal || 1)
  return `第${i}页/共${t}页`
})

const displaySubjectLabel = computed(() => props.subjectLabel?.trim() || props.title)

const digitBubbleHint = computed(() =>
  props.visualMode === 'lowerPrimary'
    ? '填涂格为 10mm×10mm（低年级），数字列间距 2mm；请用 2B 铅笔填涂，修改时擦净。'
    : '填涂格为 8mm×8mm，列间距 2mm；请用 2B 铅笔填涂，修改时擦净。',
)

const NOTES_FALLBACK_6 =
  '打印后请核对答题卡编号、四角定位点与条形码区完整清晰；考试中勿折叠污损答卷。'

const notesLines = computed(() => {
  const line6 = props.subjectNotesLine?.trim() || NOTES_FALLBACK_6
  return [
    '客观题用 2B 铅笔填涂，主观题用黑色签字笔书写；主观题不得使用铅笔、红笔。',
    '字迹清晰、工整，不得在答题区外书写；不得涂改、潦草。',
    '填涂须覆盖整个填涂格，修改时用橡皮擦干净，不得留痕迹。',
    '请勿在装订线内书写，否则答题无效。',
    '须在题号对应区域内作答，保持答卷清洁完整。',
    line6,
  ]
})
</script>

<style scoped>
/* 小帆式：主色 #1e9fff / #2d6fb8，卷面偏清爽蓝灰；打印另见底部全局样式还原黑色线条 */
.xfkj-preview-root {
  text-align: left;
  background: linear-gradient(165deg, #e4eaf4 0%, #eef2f9 45%, #f5f7fc 100%);
  padding: 14px 12px 22px;
  border-radius: 8px;
}

.xfkj-juan {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  min-height: 400px;
  padding: 12px 0 42px;
  border-radius: 6px;
  border: 1px solid #b8c9dc;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  box-shadow:
    0 12px 40px rgba(26, 86, 168, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
}

/* 规范：机读定位点 4mm×4mm，置于边距内、勿遮挡 */
.xfkj-corner {
  position: absolute;
  width: 4mm;
  height: 4mm;
  background: #000;
  z-index: 2;
  pointer-events: none;
}
.xfkj-corner--tl {
  top: 3mm;
  left: calc(15mm + 2mm);
}
.xfkj-corner--tr {
  top: 3mm;
  right: 3mm;
}
.xfkj-corner--bl {
  bottom: 3mm;
  left: calc(15mm + 2mm);
}
.xfkj-corner--br {
  bottom: 3mm;
  right: 3mm;
}

.xfkj-bind-strip {
  flex: 0 0 15mm;
  box-sizing: border-box;
  position: relative;
  border-right: 2px solid #1e9fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12mm;
  gap: 6px;
  background: linear-gradient(90deg, #f5f9ff 0%, #ffffff 100%);
}
.xfkj-bind-strip__line {
  display: none;
}
.xfkj-bind-strip__text {
  writing-mode: vertical-rl;
  font-size: 11px;
  font-weight: 700;
  font-family: 'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0.12em;
  color: #1565c0;
}
.xfkj-bind-strip__hint {
  writing-mode: vertical-rl;
  font-size: 10px;
  color: #5c7a99;
  max-height: 72mm;
  line-height: 1.4;
}

.xfkj-juan-main {
  position: relative;
  flex: 1;
  min-width: 0;
  padding-bottom: 28px;
}

.W {
  width: calc(100% - 16px);
  margin-left: 8px;
  margin-right: 8px;
  box-sizing: border-box;
}

.xfkj-paper-title {
  min-height: 56px;
  font-size: 18px;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;
  font-weight: 700;
  border: 1px dashed #2d6fb8;
  border-radius: 4px;
  text-align: center;
  line-height: 1.4;
  padding: 10px 14px;
  color: #1a2b3c;
  white-space: pre-line;
  background: linear-gradient(180deg, #fafcff 0%, #f3f8ff 100%);
  box-shadow: 0 1px 0 rgba(45, 111, 184, 0.12);
}

/* ——— 分区：小帆式蓝边 + 淡底（与旧 sheetview 接近） ——— */
.xfkj-region {
  margin-top: 10mm;
  box-sizing: border-box;
}
.xfkj-region--heavy {
  border: 1px solid #8ec5f2;
  border-radius: 4px;
  padding: 0 0 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(30, 159, 255, 0.06);
}
.xfkj-region--light {
  border: 1px solid #c5d5e5;
  border-radius: 4px;
  padding: 0 0 10px;
  background: #f8fafc;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.xfkj-region__title {
  margin: 0 0 0;
  padding: 8px 12px 8px 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Microsoft YaHei', 'SimHei', 'Heiti SC', sans-serif;
  color: #0d47a1;
  background: linear-gradient(90deg, #e3f2fd 0%, #f5f9ff 100%);
  border-bottom: 1px solid #90caf9;
  border-radius: 3px 3px 0 0;
}
.xfkj-region--student .xfkj-meta-row,
.xfkj-region--student .xfkj-student,
.xfkj-region--student .xfkj-exam-omr,
.xfkj-region--student .xfkj-exam-barcode-tip {
  padding-left: 10px;
  padding-right: 10px;
}
.xfkj-region--id-card .xfkj-id-layout,
.xfkj-region--id-card .xfkj-id-footnote {
  padding-left: 10px;
  padding-right: 10px;
}
.xfkj-region__title + * {
  margin-top: 10px;
}
.xfkj-region--notes .xfkz-notes-list {
  margin: 8px 12px 4px;
  padding-left: 1.35em;
}

.xfkj-meta-row {
  margin: 0 0 8px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  color: #000;
  line-height: 1.6;
}
.xfkj-meta-u {
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: normal;
}

.xfkj-student {
  display: block;
  margin-top: 4px;
  width: 100%;
  height: auto;
  max-height: 52px;
}
.xfkj-student__lbl {
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 14px;
  font-weight: 700;
}
.xfkj-student__lbl--sub {
  font-size: 12px;
  font-weight: normal;
}
.xfkj-student__line {
  stroke: #000;
  stroke-width: 0.8mm;
  fill: none;
}
.xfkj-student__line--light {
  stroke-width: 0.5mm;
  stroke-dasharray: 4 3;
}

.xfkj-exam-omr {
  margin-top: 10px;
}
.xfkj-exam-omr__caption {
  margin: 0 0 6px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  font-weight: 700;
  color: #000;
}
.xfkj-exam-barcode-tip {
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px dashed #42a5f5;
  border-radius: 4px;
  background: #f0f9ff;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  line-height: 1.5;
  color: #334155;
}
.xfkj-exam-barcode-tip b {
  font-weight: 700;
}

.xfkz-bubble-hint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: #333;
  text-align: left;
}

.xfkz-inner-table {
  border-collapse: collapse;
  border-width: 0;
}
.xfkz-inner-table--full {
  width: 100%;
}
.xfkz-digit-col-head {
  font-size: 13px;
  font-weight: 700;
  padding: 2px 1mm;
  font-family: 'SimSun', 'Songti SC', serif;
}
.xfkz-codes-header td,
.xfkz-codes-row td {
  text-align: center;
  border: 1px solid #000;
  border-width: 0 1px 0 0;
  vertical-align: top;
}
.xfkz-codes-header td {
  border-bottom: 1px solid #000;
}
.xfkz-codes-header td:last-child,
.xfkz-codes-row td:last-child {
  border-right: none;
}

.xfkz-digit-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2mm;
  padding: 2mm 1mm 3mm;
  box-sizing: border-box;
}
.xfkz-digit-col img {
  width: 8mm;
  height: 8mm;
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}

.xfkz-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  padding: 6px 4px 0;
}
.xfkz-legend--below {
  border-top: 1px solid #000;
  margin-top: 8px;
  padding-top: 8px;
}
.xfkz-legend-t {
  margin: 5px;
  height: 20px;
  line-height: 20px;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
}
.xfkz-legend-fill {
  margin: 5px;
  width: 8mm;
  height: 8mm;
  background: #000;
  flex-shrink: 0;
  border: 1px solid #000;
  box-sizing: border-box;
}
.xfkz-legend-box {
  margin: 5px;
  width: 8mm;
  height: 8mm;
  border: 2px solid #000;
  flex-shrink: 0;
  box-sizing: border-box;
}
.xfkz-legend-box.is-checked {
  background: #000;
}

/* 标识区排版 */
.xfkj-id-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10mm 8px;
}
.xfkj-id-text {
  flex: 1;
  min-width: min(100%, 140mm);
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  line-height: 1.65;
  color: #000;
}
.xfkj-id-line {
  margin: 0 0 6px;
}
.xfkj-id-line:last-child {
  margin-bottom: 0;
}
.xfkj-id-footnote {
  margin: 8px 0 0;
  font-size: 11px;
  color: #444;
  line-height: 1.45;
}

/* 条形码区：规范 50mm×20mm，区内勿印无关内容 */
.xfkj-barcode-zone {
  width: 50mm;
  height: 20mm;
  flex-shrink: 0;
  border: 1px dashed #1e9fff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: linear-gradient(180deg, #f8fcff 0%, #ffffff 100%);
}
.xfkj-barcode-zone--primary {
  border: 2px solid #1e9fff;
  border-style: solid;
  font-weight: 700;
  box-shadow: 0 0 0 3px rgba(30, 159, 255, 0.12);
}
.xfkj-barcode-zone__lbl {
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  font-weight: 700;
  color: #1565c0;
}
.xfkj-barcode-zone__dim {
  font-size: 10px;
  color: #64748b;
}

.xfkz-notes-list {
  margin: 0;
  padding-left: 1.25em;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
  line-height: 1.55;
  color: #334155;
}
.xfkz-notes-list li {
  margin-bottom: 4px;
}
.xfkz-notes-list li:last-child {
  margin-bottom: 0;
}

.xfkz-page-mark {
  position: absolute;
  right: 10px;
  bottom: 6px;
  left: auto;
  width: auto;
  line-height: 1.3;
  text-align: right;
  color: #94a3b8;
  font-size: 12px;
  font-family: 'SimSun', 'Songti SC', serif;
}

.xfkj-questions {
  margin-top: 10mm;
  padding: 0 8px 8px;
}

.xfkj-bind-holes {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 42mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20mm;
  z-index: 0;
  pointer-events: none;
}
.xfkj-bind-hole {
  width: 3mm;
  height: 3mm;
  border-radius: 50%;
  border: 0.35mm solid #000;
  background: #fff;
  box-sizing: border-box;
  flex-shrink: 0;
}

/* 低年级：标题 18、题干 14、填涂 10mm（四角定位点仍为 4mm 以利机读） */
.xfkj-visual--lower-primary .xfkj-paper-title {
  font-size: 18px;
  min-height: 60px;
  padding: 10px 12px;
}
.xfkj-visual--lower-primary .xfkj-student__lbl {
  font-size: 15px;
}
.xfkj-visual--lower-primary .xfkj-student__lbl--sub {
  font-size: 13px;
}
.xfkj-visual--lower-primary .xfkz-bubble-hint,
.xfkj-visual--lower-primary .xfkj-exam-omr__caption,
.xfkj-visual--lower-primary .xfkj-meta-row {
  font-size: 14px;
}
.xfkj-visual--lower-primary .xfkz-digit-col-head {
  font-size: 15px;
}
.xfkj-visual--lower-primary .xfkz-digit-col {
  gap: 4mm;
}
.xfkj-visual--lower-primary .xfkz-digit-col img {
  width: 10mm;
  height: 10mm;
}
.xfkj-visual--lower-primary .xfkz-legend-fill,
.xfkj-visual--lower-primary .xfkz-legend-box {
  width: 10mm;
  height: 10mm;
}
.xfkj-visual--lower-primary .xfkz-notes-list {
  font-size: 14px;
}
.xfkj-visual--lower-primary .xfkj-barcode-zone__lbl {
  font-size: 13px;
}
.xfkj-visual--lower-primary .xfkz-page-mark {
  font-size: 13px;
}
</style>
