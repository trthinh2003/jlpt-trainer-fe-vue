import { request } from '@/shared/api/http'
import type { JlptLevel } from '@/shared/types/api'
import type { AudioLessonPage, AudioLessonWord, AudioPlayback, LyricLine } from '../types'
import { readAudioPlayback, readLyricTimeline } from './audio-lessons.responses'

const base = '/audio-lessons'
const path = (id: string) => `${base}/${encodeURIComponent(id)}`

export const audioLessonsApi = {
  list(level: JlptLevel | '', page: number, signal: AbortSignal): Promise<AudioLessonPage> {
    const query = new URLSearchParams({ pageNumber: String(page) })
    if (level !== '') query.set('level', String(level))
    return request(`${base}?${query}`, { signal })
  },
  playback(id: string, signal: AbortSignal): Promise<AudioPlayback> {
    return request(`${path(id)}/playback`, { signal, cache: 'no-store' }, readAudioPlayback)
  },
  previewLyrics(lyrics: string, vocabIds: string[], signal: AbortSignal): Promise<LyricLine[]> {
    return request(`${base}/preview-lyrics`, {
      method: 'POST', body: JSON.stringify({ lyrics, vocabIds }), signal, cache: 'no-store',
    }, readLyricTimeline)
  },
  words(id: string, signal: AbortSignal): Promise<AudioLessonWord[]> {
    return request(`${path(id)}/words`, { signal })
  },
  publish(body: FormData, signal: AbortSignal): Promise<string> {
    return request(base, { method: 'POST', body, signal, timeoutMs: 240_000 })
  },
  unpublish(id: string, signal: AbortSignal): Promise<void> {
    return request(path(id), { method: 'DELETE', signal })
  },
}
