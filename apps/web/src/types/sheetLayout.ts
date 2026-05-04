/** 答题卡设计器 sheetLayout JSON 中的题目块（与后端 Prisma Json 一致，仅前端契约） */

/** 画布视觉模式：低年级用大号填涂格与字号（与学校打印规范一致） */
export type SheetVisualMode = 'standard' | 'lowerPrimary'

/** sheetLayout 中「注意事项第6条」学科预设，与卷头说明一致 */
export type SheetSubjectPreset =
  | 'generic'
  | 'chinese'
  | 'math'
  | 'english'
  | 'science'
  | 'humanities'

export type SheetBlockKind =
  | 'objective'
  | 'fill'
  | 'answer'
  | 'essayEn'
  | 'essayZh'
  | 'experimentDiagram'
  | 'reserve'

export type ObjectiveSegmentTag = 'single' | 'multi' | 'judge'

export type ObjectiveSegment = {
  tag: ObjectiveSegmentTag
  from: number
  to: number
  scorePerItem: number
  options: number
}

export type FillBlankKind = 'short' | 'long'

export type FillItemRow = {
  n: number
  blankKind: FillBlankKind
  score: number
  totalBlanks: number
  blanksPerRow: number
}

/** 客观题：支持小帆式 segments；legacy 为 count/scorePerItem/options */
export type ObjectiveSheetBlock = {
  id: string
  kind: 'objective'
  optionSpacing?: number
  /** 画布上行排列的小题数（小帆「每行题数」），竖排时忽略 */
  questionsPerRow?: number
  bigQuestionCode?: string | null
  questionTitle?: string
  segments?: ObjectiveSegment[]
  count?: number
  scorePerItem?: number
  options?: number
}

/** 填空题：支持 items 明细；legacy 为 count/scorePerItem/charPerBlank */
export type FillSheetBlock = {
  id: string
  kind: 'fill'
  bigQuestionCode?: string | null
  title?: string
  items?: FillItemRow[]
  count?: number
  scorePerItem?: number
  charPerBlank?: number
}

export type SheetBlock =
  | ObjectiveSheetBlock
  | FillSheetBlock
  | {
      id: string
      kind: 'answer'
      count: number
      scorePerItem: number
      lines: number
    }
  | {
      id: string
      kind: 'essayEn'
      totalScore: number
      lineChars: number
    }
  | {
      id: string
      kind: 'essayZh'
      totalScore: number
      lineChars: number
    }
  | {
      id: string
      kind: 'experimentDiagram'
      /** 大题名称，如「实验装置图」 */
      title?: string
      /** 作图区宽（mm），默认 80（理科规范） */
      widthMm?: number
      /** 作图区高（mm），默认 60 */
      heightMm?: number
      /** 区内简短说明 */
      note?: string
    }
  | {
      id: string
      kind: 'reserve'
      note?: string
    }

export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `b-${crypto.randomUUID()}`
  }
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const KIND_LABEL: Record<SheetBlockKind, string> = {
  objective: '客观题',
  fill: '填空题',
  answer: '解答题',
  essayEn: '作文(英)',
  essayZh: '作文(语)',
  experimentDiagram: '装置图区',
  reserve: '非作答区',
}

export function sheetBlockKindLabel(kind: SheetBlockKind): string {
  return KIND_LABEL[kind]
}

/** 大题序号展示：一、二、三…（与设计页块顺序一致，可与 bigQuestionCode 覆盖配合） */
export function chineseSectionOrdinal(zeroBasedIndex: number): string {
  const n = zeroBasedIndex + 1
  const digit = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (n <= 10)
    return ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n - 1] ?? String(n)
  if (n < 20) return '十' + digit[n % 10]
  if (n === 20) return '二十'
  if (n < 30) return '二十' + digit[n % 10]
  return String(n)
}

function objectiveSegmentTotalQuestions(s: ObjectiveSegment): number {
  const a = Math.min(s.from, s.to)
  const b = Math.max(s.from, s.to)
  return Math.max(0, b - a + 1)
}

/** 画布所见即所得：客观题扁平小题行（与弹层预览一致） */
export type ObjectivePreviewRow = {
  n: number
  tag: ObjectiveSegmentTag
  score: number
  options: number
}

export function objectiveBlockPreviewRows(b: ObjectiveSheetBlock): ObjectivePreviewRow[] {
  if (b.segments && b.segments.length > 0) {
    const rows: ObjectivePreviewRow[] = []
    for (const seg of b.segments) {
      const a = Math.min(seg.from, seg.to)
      const c = Math.max(seg.from, seg.to)
      for (let n = a; n <= c; n++) {
        rows.push({ n, tag: seg.tag, score: seg.scorePerItem, options: seg.options })
      }
    }
    return rows
  }
  const cnt = Math.max(0, Math.floor(b.count ?? 0))
  const rows: ObjectivePreviewRow[] = []
  const opts = clamp(Math.floor(b.options ?? 4), 2, 10)
  for (let i = 1; i <= cnt; i++) {
    rows.push({
      n: i,
      tag: 'single',
      score: b.scorePerItem ?? 0,
      options: opts,
    })
  }
  return rows
}

/** 画布所见即所得：填空题小题（无 items 时由 legacy 字段合成） */
export function fillBlockPreviewItems(b: FillSheetBlock): FillItemRow[] {
  if (b.items && b.items.length > 0) return b.items
  const cnt = Math.max(0, Math.floor(b.count ?? 0))
  const rows: FillItemRow[] = []
  const sp = b.scorePerItem ?? 0
  const br = clamp(Math.floor(b.charPerBlank ?? 4), 1, 20)
  for (let i = 1; i <= cnt; i++) {
    rows.push({
      n: i,
      blankKind: 'short',
      score: sp,
      totalBlanks: 3,
      blanksPerRow: Math.min(10, Math.max(1, br)),
    })
  }
  return rows
}

export function objectiveTagLabelZh(tag: ObjectiveSegmentTag): string {
  if (tag === 'single') return '单'
  if (tag === 'multi') return '多'
  return '判'
}

export function optionLetters(count: number): string[] {
  const n = clamp(Math.floor(count), 2, 10)
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
}

export function sheetBlockScore(b: SheetBlock): number {
  switch (b.kind) {
    case 'objective': {
      if (b.segments && b.segments.length > 0) {
        return b.segments.reduce(
          (acc, s) => acc + objectiveSegmentTotalQuestions(s) * Math.max(0, s.scorePerItem),
          0,
        )
      }
      const c = b.count ?? 0
      const sp = b.scorePerItem ?? 0
      return Math.max(0, c) * Math.max(0, sp)
    }
    case 'fill': {
      if (b.items && b.items.length > 0) {
        return b.items.reduce((acc, r) => acc + Math.max(0, r.score), 0)
      }
      const c = b.count ?? 0
      const sp = b.scorePerItem ?? 0
      return Math.max(0, c) * Math.max(0, sp)
    }
    case 'answer':
      return Math.max(0, b.count) * Math.max(0, b.scorePerItem)
    case 'essayEn':
    case 'essayZh':
      return Math.max(0, b.totalScore)
    case 'experimentDiagram':
    case 'reserve':
      return 0
  }
}

export function sumSheetBlocks(blocks: SheetBlock[]): number {
  return blocks.reduce((s, b) => s + sheetBlockScore(b), 0)
}

export function createDefaultSheetBlock(kind: SheetBlockKind): SheetBlock {
  const id = newBlockId()
  switch (kind) {
    case 'objective':
      return {
        id,
        kind: 'objective',
        optionSpacing: 5,
        questionsPerRow: 5,
        bigQuestionCode: null,
        questionTitle: '选择题',
        segments: [{ tag: 'single', from: 1, to: 5, scorePerItem: 2, options: 4 }],
        count: 5,
        scorePerItem: 2,
        options: 4,
      }
    case 'fill':
      return {
        id,
        kind: 'fill',
        bigQuestionCode: null,
        title: '填空题',
        count: 5,
        scorePerItem: 3,
        charPerBlank: 4,
      }
    case 'answer':
      return { id, kind: 'answer', count: 3, scorePerItem: 5, lines: 8 }
    case 'essayEn':
      return { id, kind: 'essayEn', totalScore: 25, lineChars: 12 }
    case 'essayZh':
      return { id, kind: 'essayZh', totalScore: 60, lineChars: 22 }
    case 'experimentDiagram':
      return {
        id,
        kind: 'experimentDiagram',
        title: '实验装置图',
        widthMm: 80,
        heightMm: 60,
        note: '在框内用黑色签字笔绘制装置图，线条清晰；可标注仪器名称。',
      }
    case 'reserve':
      return { id, kind: 'reserve', note: '注意事项 / 贴码区等' }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeObjectiveSegment(o: Record<string, unknown>): ObjectiveSegment | null {
  const tag = o.tag
  if (tag !== 'single' && tag !== 'multi' && tag !== 'judge') return null
  return {
    tag,
    from: clamp(Math.floor(Number(o.from)) || 1, 1, 999),
    to: clamp(Math.floor(Number(o.to)) || 1, 1, 999),
    scorePerItem: clamp(Number(o.scorePerItem) || 0, 0, 1000),
    options: clamp(Math.floor(Number(o.options)) || 4, 2, 10),
  }
}

function normalizeFillItem(o: Record<string, unknown>): FillItemRow | null {
  const bk = o.blankKind
  if (bk !== 'short' && bk !== 'long') return null
  return {
    n: clamp(Math.floor(Number(o.n)) || 1, 1, 999),
    blankKind: bk,
    score: clamp(Number(o.score) || 0, 0, 1000),
    totalBlanks: clamp(Math.floor(Number(o.totalBlanks)) || 1, 1, 50),
    blanksPerRow: clamp(Math.floor(Number(o.blanksPerRow)) || 1, 1, 20),
  }
}

/** 从任意 JSON 尽量恢复 SheetBlock[]，丢弃非法项 */
export function normalizeSheetBlocks(raw: unknown): SheetBlock[] {
  if (!Array.isArray(raw)) return []
  const out: SheetBlock[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : newBlockId()
    const kind = o.kind
    if (kind === 'objective') {
      let segments: ObjectiveSegment[] | undefined
      if (Array.isArray(o.segments)) {
        segments = []
        for (const s of o.segments) {
          if (s && typeof s === 'object') {
            const seg = normalizeObjectiveSegment(s as Record<string, unknown>)
            if (seg) segments.push(seg)
          }
        }
        if (segments.length === 0) segments = undefined
      }
      const base: ObjectiveSheetBlock = {
        id,
        kind: 'objective',
        optionSpacing:
          typeof o.optionSpacing === 'number' ? clamp(o.optionSpacing, 1, 30) : undefined,
        questionsPerRow:
          typeof o.questionsPerRow === 'number' ? clamp(Math.floor(o.questionsPerRow), 1, 12) : undefined,
        bigQuestionCode:
          o.bigQuestionCode === null || o.bigQuestionCode === undefined
            ? null
            : String(o.bigQuestionCode),
        questionTitle: typeof o.questionTitle === 'string' ? o.questionTitle.slice(0, 80) : undefined,
        segments,
        count: clamp(Math.floor(Number(o.count)) || 1, 1, 500),
        scorePerItem: clamp(Number(o.scorePerItem) || 1, 0, 1000),
        options: clamp(Math.floor(Number(o.options)) || 4, 2, 10),
      }
      if (segments && segments.length > 0) {
        const totalQ = segments.reduce((acc, s) => acc + objectiveSegmentTotalQuestions(s), 0)
        const totalScore = segments.reduce(
          (acc, s) => acc + objectiveSegmentTotalQuestions(s) * s.scorePerItem,
          0,
        )
        base.count = totalQ
        base.scorePerItem = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) / 100 : 0
      }
      out.push(base)
    } else if (kind === 'fill') {
      let items: FillItemRow[] | undefined
      if (Array.isArray(o.items)) {
        items = []
        for (const it of o.items) {
          if (it && typeof it === 'object') {
            const row = normalizeFillItem(it as Record<string, unknown>)
            if (row) items.push(row)
          }
        }
        if (items.length === 0) items = undefined
      }
      const base: FillSheetBlock = {
        id,
        kind: 'fill',
        bigQuestionCode:
          o.bigQuestionCode === null || o.bigQuestionCode === undefined
            ? null
            : String(o.bigQuestionCode),
        title: typeof o.title === 'string' ? o.title.slice(0, 80) : undefined,
        items,
        count: clamp(Math.floor(Number(o.count)) || 1, 1, 500),
        scorePerItem: clamp(Number(o.scorePerItem) || 1, 0, 1000),
        charPerBlank: clamp(Math.floor(Number(o.charPerBlank)) || 4, 1, 50),
      }
      if (items && items.length > 0) {
        const sum = items.reduce((a, r) => a + r.score, 0)
        base.count = items.length
        base.scorePerItem = Math.round((sum / items.length) * 100) / 100
      }
      out.push(base)
    } else if (kind === 'answer') {
      out.push({
        id,
        kind: 'answer',
        count: clamp(Math.floor(Number(o.count)) || 1, 1, 100),
        scorePerItem: clamp(Number(o.scorePerItem) || 1, 0, 1000),
        lines: clamp(Math.floor(Number(o.lines)) || 5, 1, 50),
      })
    } else if (kind === 'essayEn') {
      out.push({
        id,
        kind: 'essayEn',
        totalScore: clamp(Number(o.totalScore) || 25, 0, 1000),
        lineChars: clamp(Math.floor(Number(o.lineChars)) || 12, 1, 80),
      })
    } else if (kind === 'essayZh') {
      out.push({
        id,
        kind: 'essayZh',
        totalScore: clamp(Number(o.totalScore) || 60, 0, 1000),
        lineChars: clamp(Math.floor(Number(o.lineChars)) || 22, 1, 80),
      })
    } else if (kind === 'experimentDiagram') {
      out.push({
        id,
        kind: 'experimentDiagram',
        title: typeof o.title === 'string' ? o.title.slice(0, 80) : undefined,
        widthMm: clamp(Math.floor(Number(o.widthMm)) || 80, 40, 200),
        heightMm: clamp(Math.floor(Number(o.heightMm)) || 60, 40, 200),
        note: typeof o.note === 'string' ? o.note.slice(0, 300) : undefined,
      })
    } else if (kind === 'reserve') {
      out.push({
        id,
        kind: 'reserve',
        note: typeof o.note === 'string' ? o.note.slice(0, 200) : undefined,
      })
    }
  }
  return out
}

/** 题块在画布上的摘要文案 */
export function sheetBlockSummary(b: SheetBlock): string {
  switch (b.kind) {
    case 'objective': {
      const title = b.questionTitle?.trim() || '选择题'
      if (b.segments && b.segments.length > 0) {
        const nSeg = b.segments.length
        const nQ =
          b.count ??
          b.segments.reduce((a, s) => a + objectiveSegmentTotalQuestions(s), 0)
        return `${title} · ${nSeg} 个分段 · 共 ${nQ} 小题`
      }
      return `${title} · ${b.count ?? 0} 题 × ${b.scorePerItem ?? 0} 分 · ${b.options ?? 0} 选项`
    }
    case 'fill': {
      const t = b.title?.trim() || '填空题'
      if (b.items && b.items.length > 0) {
        return `${t} · ${b.items.length} 小题（短/长填空）`
      }
      return `${t} · ${b.count ?? 0} 空 × ${b.scorePerItem ?? 0} 分 · 每空 ${b.charPerBlank ?? 0} 字符`
    }
    case 'answer':
      return `${b.count} 题 × ${b.scorePerItem} 分 · 约 ${b.lines} 行`
    case 'essayEn':
      return `共 ${b.totalScore} 分 · 约 ${b.lineChars} 字符/行`
    case 'essayZh':
      return `共 ${b.totalScore} 分 · 约 ${b.lineChars} 字符/行`
    case 'experimentDiagram': {
      const w = b.widthMm ?? 80
      const h = b.heightMm ?? 60
      const t = b.title?.trim() || '装置图'
      return `${t} · 作图区 ${w}×${h} mm`
    }
    case 'reserve':
      return b.note?.trim() ? b.note.trim() : '不计分'
    default:
      return ''
  }
}
