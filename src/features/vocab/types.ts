import type { JlptLevel } from '@/shared/types/api'

export interface Vocab {
  id: string
  word: string
  reading: string
  meaning: string
  exampleSentence: string | null
  exampleSentenceMeaning: string | null
  level: JlptLevel
  hasImage?: boolean
}

export type CreateVocabRequest = Omit<Vocab, 'id' | 'hasImage'>
export type UpdateVocabContentRequest = Pick<Vocab, 'meaning' | 'exampleSentence' | 'exampleSentenceMeaning'>

export interface GetVocabListParams {
  level?: JlptLevel | null
  search?: string
  pageNumber?: number
  pageSize?: number
}
