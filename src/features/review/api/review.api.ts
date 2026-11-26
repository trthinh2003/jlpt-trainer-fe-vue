import { ApiError, request } from '@/shared/api/http'
import { CardType, type DueCard, type GrammarPoint, type JlptLevel, type Kanji, type PagedResult, type ReviewGrade, type SubmitReviewResult } from '@/shared/types/api'
import { vocabApi } from '@/features/vocab/api/vocab.api'
import type { StudyCardFilters, StudyCardItem } from '../types'

export interface ReviewContent {
  prompt: string
  meaning: string
  reading?: string
  onYomi?: string
  kunYomi?: string
  example?: string | null
  exampleMeaning?: string | null
  imageVocabId?: string
}

export interface ReviewCardAddition {
  addedIds: string[]
  alreadyAddedIds: string[]
  missingIds: string[]
}

export interface DueCardFilters {
  cardType?: CardType
  level?: JlptLevel
}

const path = '/reviewcards'

export const reviewApi = {
  list(filters: StudyCardFilters, signal: AbortSignal): Promise<PagedResult<StudyCardItem>> {
    const params = new URLSearchParams({ pageNumber: String(filters.pageNumber) })
    if (filters.cardType !== undefined) params.set('cardType', String(filters.cardType))
    if (filters.level !== undefined) params.set('level', String(filters.level))
    if (filters.due !== undefined) params.set('due', String(filters.due))
    if (filters.search) params.set('search', filters.search)
    return request(`${path}?${params}`, { signal })
  },
  remove(id: string, signal: AbortSignal): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
  },
  add(cardType: CardType, referenceId: string, signal?: AbortSignal): Promise<string> {
    return request(path, { method: 'POST', body: JSON.stringify({ cardType, referenceId }), signal })
  },
  addBatch(cardType: CardType, referenceIds: string[], signal: AbortSignal): Promise<ReviewCardAddition> {
    return request(`${path}/batch`, {
      method: 'POST', body: JSON.stringify({ cardType, referenceIds }), signal,
    })
  },
  getDue(filters: DueCardFilters, signal: AbortSignal): Promise<DueCard[]> {
    const params = new URLSearchParams()
    if (filters.cardType !== undefined) params.set('cardType', String(filters.cardType))
    if (filters.level !== undefined) params.set('level', String(filters.level))
    const query = params.size ? `?${params}` : ''
    return request(`${path}/due${query}`, { signal })
  },
  submit(reviewCardId: string, grade: ReviewGrade, requestId: string): Promise<SubmitReviewResult> {
    return request(`${path}/${encodeURIComponent(reviewCardId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ grade, requestId }),
    })
  },
  async getContent(card: DueCard, signal: AbortSignal): Promise<ReviewContent> {
    const id = encodeURIComponent(card.referenceId)
    switch (card.cardType) {
      case CardType.Vocab: {
        const vocab = await vocabApi.getById(card.referenceId, signal)
        return {
          prompt: vocab.word,
          reading: vocab.reading,
          meaning: vocab.meaning,
          example: vocab.exampleSentence,
          exampleMeaning: vocab.exampleSentenceMeaning,
          imageVocabId: vocab.hasImage ? vocab.id : undefined,
        }
      }
      case CardType.Kanji: {
        const kanji = await request<Kanji>(`/kanjis/${id}`, { signal })
        return {
          prompt: kanji.character,
          onYomi: kanji.onYomi,
          kunYomi: kanji.kunYomi,
          meaning: kanji.meaning,
        }
      }
      case CardType.Grammar: {
        const grammar = await request<GrammarPoint>(`/grammarpoints/${id}`, { signal })
        return {
          prompt: grammar.pattern,
          meaning: grammar.meaning,
          example: grammar.exampleSentence,
          exampleMeaning: grammar.exampleSentenceMeaning,
        }
      }
      default:
        throw new ApiError(422, 'Loại thẻ này chưa được hỗ trợ.')
    }
  },
}
