import { request } from '@/shared/api/http'
import type { JlptLevel } from '@/shared/types/api'

export interface VideoLesson {
  id: string
  title: string
  description: string | null
  level: JlptLevel
}

interface VideoLessonPage {
  items: VideoLesson[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

const path = '/video-lessons'

export const videoLessonsApi = {
  list(level: JlptLevel | '', pageNumber: number, signal: AbortSignal): Promise<VideoLessonPage> {
    const query = new URLSearchParams({ pageNumber: String(pageNumber) })
    if (level !== '') query.set('level', String(level))
    return request(`${path}?${query}`, { signal })
  },
  playback(id: string, signal: AbortSignal): Promise<{ url: string; expiresAt: string }> {
    return request(`${path}/${encodeURIComponent(id)}/playback`, { signal, cache: 'no-store' })
  },
  publish(input: Omit<VideoLesson, 'id'>, file: File, signal: AbortSignal): Promise<string> {
    const body = new FormData()
    body.set('title', input.title)
    body.set('description', input.description ?? '')
    body.set('level', String(input.level))
    body.set('file', file)
    return request(path, { method: 'POST', body, signal, timeoutMs: 240_000 })
  },
  unpublish(id: string, signal: AbortSignal): Promise<void> {
    return request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
  },
}
