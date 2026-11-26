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
  links?: LyricWordLink[] | null
}

export interface LyricWordLink {
  start: number
  length: number
  word: AudioLessonWord
}

export interface AudioLessonWord {
  id: string
  word: string
  reading: string
  meaning: string
}
