export interface PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export enum JlptLevel {
  N5 = 5,
  N4 = 4,
  N3 = 3,
  N2 = 2,
  N1 = 1,
}

export enum CardType {
  Vocab = 0,
  Kanji = 1,
  Grammar = 2,
}

export enum ReviewGrade {
  Again = 0,
  Hard = 1,
  Good = 2,
  Easy = 3,
}

export interface Kanji {
  id: string
  character: string
  onYomi: string
  kunYomi: string
  meaning: string
  strokeCount: number
  level: JlptLevel
  createdAt: string
}

export interface GrammarPoint {
  id: string
  pattern: string
  meaning: string
  exampleSentence: string | null
  exampleSentenceMeaning: string | null
  level: JlptLevel
  createdAt: string
}

export interface ReviewCard {
  id: string
  cardType: CardType
  referenceId: string
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewDate: string
  lastReviewedAt: string | null
}

export interface DueCard {
  reviewCardId: string
  cardType: CardType
  referenceId: string
  repetitions: number
  nextReviewDate: string
}

export interface SubmitReviewResult {
  reviewCardId: string
  intervalDays: number
  nextReviewDate: string
}
