import { request } from '@/shared/api/http'
import type { PagedResult } from '@/shared/types/api'
import type { CreateVocabRequest, GetVocabListParams, Vocab } from '../types'

const path = '/vocabs'

export const vocabApi = {
  getList(params: GetVocabListParams = {}): Promise<PagedResult<Vocab>> {
    const query = new URLSearchParams({
      pageNumber: String(params.pageNumber ?? 1),
      pageSize: String(params.pageSize ?? 20),
    })
    if (params.level != null) query.set('level', String(params.level))
    return request(`${path}?${query}`)
  },
  getById(id: string): Promise<Vocab> {
    return request(`${path}/${encodeURIComponent(id)}`)
  },
  create(payload: CreateVocabRequest): Promise<string> {
    return request(path, { method: 'POST', body: JSON.stringify(payload) })
  },
  delete(id: string): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
