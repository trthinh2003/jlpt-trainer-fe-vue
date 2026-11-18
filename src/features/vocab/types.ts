import type { JlptLevel } from '@/shared/types/api'

export interface Vocab {
  id: string
  word: string
  reading: string
  meaning: string
  exampleSentence: string | null
  exampleSentenceMeaning: string | null
  level: JlptLevel
}

export type CreateVocabRequest = Omit<Vocab, 'id'>

export interface GetVocabListParams {
  level?: JlptLevel | null
  pageNumber?: number
  pageSize?: number
}
