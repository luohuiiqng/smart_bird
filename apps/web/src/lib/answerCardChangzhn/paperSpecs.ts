/**
 * 答题卡纸型与内容区尺寸（单位：mm）。
 *
 * 内容区在开源项目 [changzhn/answer-card](https://github.com/changzhn/answer-card) 基础上，
 * **按学校打印规范**调整为：上下边距 ≥20mm、左右边距 ≥15mm（可打印安全区），便于与纸质答题卡一致。
 * 后续分页 / 题目高度计算（splitSelf 一类）可在此基础上扩展，与 Vue 设计器共用同一套度量。
 */

/** 学校规范：装订区宽度（左侧不可书写区，与 canvas 左侧条一致） */
export const SCHOOL_BIND_STRIP_MM = 15

/** 学校规范：页边距（mm），用于推导 content 尺寸 */
export const SCHOOL_PRINT_MARGIN_MM = {
  top: 20,
  bottom: 20,
  left: 15,
  right: 15,
} as const

export type ChangzhnPaperKey = 'A4' | 'A3'

/** A4：整栏内容宽；A3：双栏时每栏宽与中线间距见 column / gutter */
export type ChangzhnPaperSpec =
  | {
      key: 'A4'
      actualWidthMm: number
      actualHeightMm: number
      contentWidthMm: number
      contentHeightMm: number
      /** 第一页上方考生信息区占用高度（与 PageClass 一致） */
      cardInfoHeightMm: number
    }
  | {
      key: 'A3'
      actualWidthMm: number
      actualHeightMm: number
      /** 双栏总内容宽 */
      contentWidthMm: number
      /** 单栏宽（两栏时） */
      columnWidthMm: number
      gutterMm: number
      contentHeightMm: number
      cardInfoHeightMm: number
    }

export const CHANGZHN_PAPER_SPECS: Record<ChangzhnPaperKey, ChangzhnPaperSpec> = {
  A4: {
    key: 'A4',
    actualWidthMm: 210,
    actualHeightMm: 297,
    /** 210 − 15 − 15 */
    contentWidthMm: 180,
    /** 297 − 20 − 20 */
    contentHeightMm: 257,
    cardInfoHeightMm: 28,
  },
  /** 竖版 A3：297×420mm（学校规范大型考试），边距上下≥20、左右≥15 */
  A3: {
    key: 'A3',
    actualWidthMm: 297,
    actualHeightMm: 420,
    /** 297 − 15 − 15 */
    contentWidthMm: 267,
    /** 双栏：(267 − gutter) / 2 */
    columnWidthMm: 123.5,
    gutterMm: 20,
    /** 420 − 20 − 20 */
    contentHeightMm: 380,
    cardInfoHeightMm: 32,
  },
}

export function getChangzhnPaperSpec(paper: ChangzhnPaperKey): ChangzhnPaperSpec {
  return CHANGZHN_PAPER_SPECS[paper]
}

/** 预览区画布推荐 max-width（CSS），与内容区宽度一致 */
export function changzhnCanvasMaxWidth(paper: ChangzhnPaperKey): string {
  const s = CHANGZHN_PAPER_SPECS[paper]
  return `${s.contentWidthMm}mm`
}
