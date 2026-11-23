import { request } from '@/shared/api/http'
import type { PagedResult } from '@/shared/types/api'
import type { CreateVocabRequest, GetVocabListParams, UpdateVocabContentRequest, Vocab } from '../types'

const path = '/vocabs'

export const vocabApi = {
  getList(params: GetVocabListParams = {}, signal?: AbortSignal): Promise<PagedResult<Vocab>> {
    const query = new URLSearchParams({
      pageNumber: String(params.pageNumber ?? 1),
      pageSize: String(params.pageSize ?? 20),
    })
    if (params.level != null) query.set('level', String(params.level))
    if (params.search) query.set('search', params.search)
    return request(`${path}?${query}`, { signal })
  },
  getById(id: string, signal?: AbortSignal): Promise<Vocab> {
    return request(`${path}/${encodeURIComponent(id)}`, { signal })
  },
  create(payload: CreateVocabRequest): Promise<string> {
    return request(path, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateContent(id: string, payload: UpdateVocabContentRequest): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}/content`, {
      method: 'PUT', body: JSON.stringify(payload),
    })
  },
  getImage(id: string, signal: AbortSignal): Promise<{ url: string } | undefined> {
    return request(`${path}/${encodeURIComponent(id)}/image`, { signal, cache: 'no-store' })
  },
  uploadImage(id: string, file: File, signal: AbortSignal): Promise<void> {
    const body = new FormData()
    body.set('file', file)
    return request(`${path}/${encodeURIComponent(id)}/image`, { method: 'PUT', body, signal, timeoutMs: 60_000 })
  },
  removeImage(id: string, signal: AbortSignal): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}/image`, { method: 'DELETE', signal })
  },
  delete(id: string): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
