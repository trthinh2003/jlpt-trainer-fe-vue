import { request } from '@/shared/api/http'
import type { JlptLevel, PagedResult } from '@/shared/types/api'
import type { MockTestAttempt, MockTestReview, MockTestSummary } from '../types'

const path = '/mocktests'

export const mockTestApi = {
  start(level: JlptLevel, questionCount: number, signal: AbortSignal): Promise<MockTestAttempt> {
    return request(`${path}/attempts`, {
      method: 'POST', body: JSON.stringify({ level, questionCount }), signal,
    })
  },
  getAttempt(id: string, signal: AbortSignal): Promise<MockTestAttempt> {
    return request(`${path}/attempts/${encodeURIComponent(id)}`, { signal })
  },
  submit(id: string, selectedChoices: (number | null)[], signal: AbortSignal): Promise<string> {
    return request(`${path}/attempts/${encodeURIComponent(id)}/submit`, {
      method: 'POST', body: JSON.stringify({ selectedChoices }), signal,
    })
  },
  getHistory(page: number, signal: AbortSignal): Promise<PagedResult<MockTestSummary>> {
    return request(`${path}/history?pageNumber=${page}&pageSize=10`, { signal })
  },
  getReview(id: string, signal: AbortSignal): Promise<MockTestReview> {
    return request(`${path}/${encodeURIComponent(id)}`, { signal })
  },
  getPdf(id: string, signal: AbortSignal): Promise<Blob> {
    return request(`${path}/${encodeURIComponent(id)}/pdf`, { signal }, (response) => response.blob())
  },
}
