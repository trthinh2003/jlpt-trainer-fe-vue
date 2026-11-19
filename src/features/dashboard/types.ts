import type { CardType, JlptLevel } from '@/shared/types/api'

export interface HeatmapEntry {
  studyDate: string
  reviewCount: number
}

export interface CardProgress {
  cardType: CardType
  totalCards: number
  masteredCount: number
}

export interface MockTestTrend {
  takenDate: string
  level: JlptLevel
  averageScore: number
  testCount: number
}

export interface ProgressStats {
  cardProgress: CardProgress[]
  mockTestTrend: MockTestTrend[]
}
