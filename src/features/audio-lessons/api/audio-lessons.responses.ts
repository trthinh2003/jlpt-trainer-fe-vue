import { ApiError } from '@/shared/api/http'
import type { AudioLessonWord, AudioPlayback, LyricLine } from '../types'

function isLessonWord(value: unknown): value is AudioLessonWord {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'word' in value && typeof value.word === 'string' &&
    'reading' in value && typeof value.reading === 'string' &&
    'meaning' in value && typeof value.meaning === 'string'
}

function hasValidLinks(value: unknown, japaneseLength: number): boolean {
  if (value === null || value === undefined) return true
  if (!Array.isArray(value)) return false
  let end = 0
  for (const link of value as unknown[]) {
    if (typeof link !== 'object' || link === null ||
        !('start' in link) || typeof link.start !== 'number' || !Number.isSafeInteger(link.start) || link.start < end ||
        !('length' in link) || typeof link.length !== 'number' || !Number.isSafeInteger(link.length) || link.length < 1 ||
        !('word' in link) || !isLessonWord(link.word)) return false
    end = link.start + link.length
    if (end > japaneseLength) return false
  }
  return true
}

function isLyricTimeline(value: unknown): value is LyricLine[] {
  if (!Array.isArray(value) || !value.length) return false
  let previous = -1
  for (const line of value as unknown[]) {
    if (typeof line !== 'object' || line === null ||
        !('startMs' in line) || typeof line.startMs !== 'number' ||
        !Number.isSafeInteger(line.startMs) || line.startMs <= previous ||
        !('text' in line) || typeof line.text !== 'string') return false
    const firstBreak = line.text.indexOf('\n')
    if ('links' in line && !hasValidLinks(line.links, firstBreak < 0 ? line.text.length : firstBreak)) return false
    previous = line.startMs
  }
  return true
}

function invalidLyricsResponse(): ApiError {
  return new ApiError(0, 'Máy chủ trả lời bài nghe không hợp lệ. Vui lòng thử lại.', 'invalid-response')
}

export async function readAudioPlayback(response: Response): Promise<AudioPlayback> {
  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null ||
      !('audioUrl' in data) || typeof data.audioUrl !== 'string' || !data.audioUrl ||
      !('coverUrl' in data) || typeof data.coverUrl !== 'string' || !data.coverUrl ||
      !('lyrics' in data) || !isLyricTimeline(data.lyrics)) throw invalidLyricsResponse()

  return { audioUrl: data.audioUrl, coverUrl: data.coverUrl, lyrics: data.lyrics }
}

export async function readLyricTimeline(response: Response): Promise<LyricLine[]> {
  const data: unknown = await response.json()
  if (!isLyricTimeline(data)) throw invalidLyricsResponse()
  return data
}
