import type { JlptLevel } from '@/shared/types/api'

export interface MockTestQuestion {
  word: string
  reading: string
  choices: string[]
}

export interface MockTestAttempt {
  id: string
  level: JlptLevel
  expiresAt: string
  serverTime: string
  resultId: string | null
  questions: MockTestQuestion[]
}

export interface MockTestSummary {
  id: string
  level: JlptLevel
  totalQuestions: number
  correctAnswers: number
  scorePercentage: number
  takenAt: string
}

export interface MockTestReview extends MockTestSummary {
  questions: (MockTestQuestion & {
    selectedChoiceIndex: number | null
    correctChoiceIndex: number
    reviewVocabId: string | null
  })[] | null
}
