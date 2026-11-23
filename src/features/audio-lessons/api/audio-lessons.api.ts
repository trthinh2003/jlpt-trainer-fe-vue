import { ApiError, request } from '@/shared/api/http'
import type { JlptLevel } from '@/shared/types/api'

export interface AudioLesson {
  id: string
  title: string
  level: JlptLevel
}

export interface AudioLessonPage {
  items: AudioLesson[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface AudioPlayback {
  audioUrl: string
  coverUrl: string
  lyrics: LyricLine[]
}

export interface LyricLine {
  startMs: number
  text: string
}

export interface AudioLessonWord {
  id: string
  word: string
  reading: string
  meaning: string
}

const base = '/audio-lessons'
const path = (id: string) => `${base}/${encodeURIComponent(id)}`

function isLyricTimeline(value: unknown): value is LyricLine[] {
  if (!Array.isArray(value) || !value.length) return false
  let previous = -1
  for (const line of value as unknown[]) {
    if (typeof line !== 'object' || line === null ||
        !('startMs' in line) || typeof line.startMs !== 'number' ||
        !Number.isSafeInteger(line.startMs) || line.startMs <= previous ||
        !('text' in line) || typeof line.text !== 'string') return false
    previous = line.startMs
  }
  return true
}

function invalidLyricsResponse(): ApiError {
  return new ApiError(0, 'Máy chủ trả lời bài nghe không hợp lệ. Vui lòng thử lại.', 'invalid-response')
}

export const audioLessonsApi = {
  list(level: JlptLevel | '', page: number, signal: AbortSignal): Promise<AudioLessonPage> {
    const query = new URLSearchParams({ pageNumber: String(page) })
    if (level !== '') query.set('level', String(level))
    return request(`${base}?${query}`, { signal })
  },
  playback(id: string, signal: AbortSignal): Promise<AudioPlayback> {
    return request(`${path(id)}/playback`, { signal, cache: 'no-store' }, async response => {
      const data: unknown = await response.json()
      if (typeof data !== 'object' || data === null ||
          !('audioUrl' in data) || typeof data.audioUrl !== 'string' || !data.audioUrl ||
          !('coverUrl' in data) || typeof data.coverUrl !== 'string' || !data.coverUrl ||
          !('lyrics' in data) || !isLyricTimeline(data.lyrics)) throw invalidLyricsResponse()
      return { audioUrl: data.audioUrl, coverUrl: data.coverUrl, lyrics: data.lyrics }
    })
  },
  previewLyrics(lyrics: string, signal: AbortSignal): Promise<LyricLine[]> {
    return request(`${base}/preview-lyrics`, {
      method: 'POST', body: JSON.stringify({ lyrics }), signal, cache: 'no-store',
    }, async response => {
      const data: unknown = await response.json()
      if (!isLyricTimeline(data)) throw invalidLyricsResponse()
      return data
    })
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
