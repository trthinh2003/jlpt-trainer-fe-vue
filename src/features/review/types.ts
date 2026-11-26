import { CardType, JlptLevel } from '@/shared/types/api'

export const cardTypeLabels: Record<CardType, string> = {
  [CardType.Vocab]: 'Từ vựng',
  [CardType.Kanji]: 'Kanji',
  [CardType.Grammar]: 'Ngữ pháp',
}

export const reviewCardTypes = [CardType.Vocab, CardType.Kanji, CardType.Grammar]
export const reviewLevels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]

export interface StudyCardItem {
  id: string
  cardType: CardType
  level: JlptLevel
  prompt: string
  meaning: string
  nextReviewDate: string
  lastReviewedAt: string | null
  isDue: boolean
}

export interface StudyCardFilters {
  pageNumber: number
  cardType?: CardType
  level?: JlptLevel
  due?: boolean
  search?: string
}
