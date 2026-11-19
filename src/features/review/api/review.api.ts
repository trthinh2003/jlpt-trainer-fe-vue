import { ApiError, request } from '@/shared/api/http'
import { CardType, type DueCard, type GrammarPoint, type Kanji, type ReviewGrade, type SubmitReviewResult } from '@/shared/types/api'
import { vocabApi } from '@/features/vocab/api/vocab.api'

export interface ReviewContent {
  prompt: string
  meaning: string
  reading?: string
  example?: string | null
  exampleMeaning?: string | null
}

const path = '/reviewcards'

export const reviewApi = {
  add(cardType: CardType, referenceId: string, signal?: AbortSignal): Promise<string> {
    return request(path, { method: 'POST', body: JSON.stringify({ cardType, referenceId }), signal })
  },
  getDue(): Promise<DueCard[]> {
    return request(`${path}/due`)
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
        }
      }
      case CardType.Kanji: {
        const kanji = await request<Kanji>(`/kanjis/${id}`, { signal })
        return {
          prompt: kanji.character,
          reading: [kanji.onYomi && `Âm On: ${kanji.onYomi}`, kanji.kunYomi && `Âm Kun: ${kanji.kunYomi}`]
            .filter(Boolean)
            .join(' · '),
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
