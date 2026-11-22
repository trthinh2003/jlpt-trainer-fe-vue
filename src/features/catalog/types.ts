import { CardType, type JlptLevel } from '@/shared/types/api'

export type CatalogKind = 'vocab' | 'kanji' | 'grammar'

export const catalog = {
  vocab: { path: '/vocabs', label: 'Từ vựng', route: 'vocabs', template: 'vocab_import_template.xlsx', cardType: CardType.Vocab },
  kanji: { path: '/kanjis', label: 'Kanji', route: 'kanjis', template: 'kanji_import_template.xlsx', cardType: CardType.Kanji },
  grammar: { path: '/grammarpoints', label: 'Ngữ pháp', route: 'grammar', template: 'grammar_point_import_template.xlsx', cardType: CardType.Grammar },
} as const

export interface CatalogImportResult {
  totalRows: number
  successCount: number
  skippedDuplicateCount: number
  errors: { rowNumber: number; message: string }[]
}

export interface CatalogBrowseItem {
  id: string
  title: string
  level: JlptLevel
  content: CatalogContent
  reading?: string
  detail?: string
}

export type CatalogContent =
  | { kind: 'kanji'; meaning: string; onYomi: string; kunYomi: string }
  | { kind: 'grammar'; meaning: string; exampleSentence: string | null; exampleSentenceMeaning: string | null }
