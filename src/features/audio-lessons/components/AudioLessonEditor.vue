<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { vocabApi } from '@/features/vocab/api/vocab.api'
import type { Vocab } from '@/features/vocab/types'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { JlptLevel } from '@/shared/types/api'
import { audioLessonsApi } from '../api/audio-lessons.api'
import type { LyricLine } from '../types'
import AudioLyricPlayer from './AudioLyricPlayer.vue'

interface AudioPreview {
  audioUrl: string
  coverUrl?: string
  lyrics: LyricLine[]
}

const emit = defineEmits<{ published: [level: JlptLevel]; forbidden: []; busy: [value: boolean] }>()
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const title = ref('')
const level = ref(JlptLevel.N5)
const lyrics = ref('')
const lyricsField = ref<HTMLTextAreaElement>()
const audio = ref<File>()
const cover = ref<File>()
const query = ref('')
const results = ref<Vocab[]>([])
const selected = ref<Vocab[]>([])
const markWordId = ref('')
const markError = ref('')
const searching = ref(false)
const searchError = ref('')
const busy = ref(false)
const error = ref('')
const readingLyrics = ref(false)
const lyricsError = ref('')
const preview = ref<AudioPreview>()
const previewLoading = ref(false)
const previewError = ref('')
const upload = new AbortController()
let previewRequest: AbortController | undefined
let lyricReadVersion = 0
const maxLyrics = 28_000
const maxWords = 20
const maxAudioBytes = 25 * 1024 * 1024
const maxCoverBytes = 5 * 1024 * 1024

watch([audio, cover, lyrics], closePreview, { flush: 'sync' })
watch(() => selected.value.map(word => word.id), (ids) => {
  if (!ids.includes(markWordId.value)) markWordId.value = ids[0] ?? ''
  markError.value = ''
  closePreview()
}, { flush: 'sync' })

watch(query, (value, _, onCleanup) => {
  const controller = new AbortController()
  const search = value.trim()
  results.value = []
  searchError.value = ''
  searching.value = Boolean(search)
  const timer = window.setTimeout(async () => {
    if (!search) return
    try {
      const response = await vocabApi.getList({ search, pageSize: 8 }, controller.signal)
      if (!controller.signal.aborted) results.value = response.items
    } catch (cause) {
      if (!controller.signal.aborted) searchError.value = getErrorMessage(cause)
    } finally {
      if (!controller.signal.aborted) searching.value = false
    }
  }, 250)
  onCleanup(() => {
    clearTimeout(timer)
    controller.abort()
  })
})

function fileFrom(event: Event): File | undefined {
  return event.target instanceof HTMLInputElement ? event.target.files?.[0] : undefined
}

function cancelLyricsRead(): void {
  lyricReadVersion++
  readingLyrics.value = false
  lyricsError.value = ''
  markError.value = ''
}

const wordMarker = /\[\[([^\[\]|\r\n]+)\|([0-9a-f]{32})\]\]/giu

async function markLyricWord(): Promise<void> {
  const field = lyricsField.value
  if (!field || !markWordId.value) return
  const source = lyrics.value
  const start = field.selectionStart
  const end = field.selectionEnd
  const surface = source.slice(start, end)
  const lineStart = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1
  const timestamps = source.slice(lineStart).match(/^\s*(?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+/u)?.[0]
  const overlaps = [...source.matchAll(wordMarker)].some(match =>
    start < match.index + match[0].length && end > match.index)
  if (!surface.trim() || /[\[\]|\r\n]/u.test(surface) || !timestamps ||
      start < lineStart + timestamps.length || overlaps) {
    markError.value = 'Bôi đen phần lời Nhật cần gắn từ. Chọn trong một dòng và bỏ qua mốc thời gian.'
    field.focus()
    return
  }

  const text = surface.trim()
  const offset = start + surface.indexOf(text)
  const marker = `[[${text}|${markWordId.value.replaceAll('-', '')}]]`
  if (source.length - text.length + marker.length > maxLyrics) {
    markError.value = 'Lời vượt quá 28.000 ký tự sau khi gắn từ.'
    return
  }
  markError.value = ''
  lyrics.value = source.slice(0, offset) + marker + source.slice(offset + text.length)
  await nextTick()
  field.focus()
  field.setSelectionRange(offset + marker.length, offset + marker.length)
}

function removeWord(index: number): void {
  const [word] = selected.value.splice(index, 1)
  if (!word) return
  const id = word.id.replaceAll('-', '').toLowerCase()
  lyrics.value = lyrics.value.replace(wordMarker, (marker, text: string, target: string) =>
    id === target.toLowerCase() ? text : marker)
}

async function importLyrics(event: Event): Promise<void> {
  cancelLyricsRead()
  const file = fileFrom(event)
  if (!file) return
  closePreview()
  const version = lyricReadVersion
  readingLyrics.value = true
  try {
    if (file.size > maxLyrics * 4) throw new Error()
    const text = await file.text()
    if (version !== lyricReadVersion) return
    if (text.length > maxLyrics) throw new Error()
    lyrics.value = text
  } catch {
    if (version === lyricReadVersion) {
      lyricsError.value = 'Không đọc được file LRC hoặc lời vượt quá 28.000 ký tự.'
    }
  } finally {
    if (version === lyricReadVersion) readingLyrics.value = false
  }
}

function closePreview(): void {
  previewRequest?.abort()
  previewRequest = undefined
  previewLoading.value = false
  previewError.value = ''
  if (!preview.value) return
  URL.revokeObjectURL(preview.value.audioUrl)
  if (preview.value.coverUrl) URL.revokeObjectURL(preview.value.coverUrl)
  preview.value = undefined
}

function mediaTooLarge(audioFile: File, coverFile?: File): boolean {
  return audioFile.size > maxAudioBytes || (coverFile?.size ?? 0) > maxCoverBytes
}

async function showPreview(): Promise<void> {
  const audioFile = audio.value
  const coverFile = cover.value
  if (!audioFile || !lyrics.value.trim() || readingLyrics.value || previewLoading.value || busy.value) return
  closePreview()
  if (mediaTooLarge(audioFile, coverFile)) {
    previewError.value = 'Audio tối đa 25 MB và ảnh bìa tối đa 5 MB.'
    return
  }

  const request = new AbortController()
  previewRequest = request
  previewLoading.value = true
  try {
    const timeline = await audioLessonsApi.previewLyrics(lyrics.value, selected.value.map(word => word.id), request.signal)
    if (request.signal.aborted) return
    preview.value = {
      audioUrl: URL.createObjectURL(audioFile),
      coverUrl: coverFile ? URL.createObjectURL(coverFile) : undefined,
      lyrics: timeline,
    }
  } catch (cause) {
    if (request.signal.aborted) return
    if (cause instanceof ApiError && cause.status === 403) emit('forbidden')
    else previewError.value = getErrorMessage(cause)
  } finally {
    if (previewRequest === request) {
      previewRequest = undefined
      previewLoading.value = false
    }
  }
}

async function publish(): Promise<void> {
  if (busy.value || readingLyrics.value || !audio.value || !cover.value) return
  if (mediaTooLarge(audio.value, cover.value)) {
    error.value = 'Audio tối đa 25 MB và ảnh bìa tối đa 5 MB.'
    return
  }
  if (!selected.value.length) {
    error.value = 'Chọn ít nhất một mục từ để ôn sau khi nghe.'
    return
  }

  closePreview()
  const body = new FormData()
  body.set('title', title.value.trim())
  body.set('level', String(level.value))
  body.set('lyrics', lyrics.value)
  body.set('audio', audio.value)
  body.set('cover', cover.value)
  selected.value.forEach(word => body.append('vocabIds', word.id))
  busy.value = true
  emit('busy', true)
  error.value = ''
  try {
    await audioLessonsApi.publish(body, upload.signal)
    if (!upload.signal.aborted) emit('published', level.value)
  } catch (cause) {
    if (upload.signal.aborted) return
    if (cause instanceof ApiError && cause.status === 403) emit('forbidden')
    else error.value = getErrorMessage(cause)
  } finally {
    busy.value = false
    emit('busy', false)
  }
}

onUnmounted(() => {
  cancelLyricsRead()
  closePreview()
  upload.abort()
})
</script>

<template>
  <form class="create-panel" @submit.prevent="publish">
    <fieldset :disabled="busy">
      <div class="form-grid">
        <div class="field">
          <label for="audio-title">Tiêu đề</label>
          <input id="audio-title" v-model="title" required maxlength="150" />
        </div>
        <div class="field">
          <label for="audio-level">Cấp JLPT</label>
          <select id="audio-level" v-model.number="level">
            <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
          </select>
        </div>
        <div class="field">
          <label for="audio-file">Audio MP3 hoặc WAV, tối đa 25 MB</label>
          <input id="audio-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" required @change="audio = fileFrom($event)" />
        </div>
        <div class="field">
          <label for="audio-cover">Ảnh bìa JPEG, PNG hoặc WebP, tối đa 5 MB</label>
          <input id="audio-cover" type="file" accept="image/jpeg,image/png,image/webp" required @change="cover = fileFrom($event)" />
        </div>
      </div>
      <div class="field">
        <label for="audio-lrc">Nạp lời từ file .lrc</label>
        <input id="audio-lrc" type="file" accept=".lrc,.txt,text/plain" @change="importLyrics" />
        <label for="audio-lyrics">Lời Nhật có mốc thời gian</label>
        <textarea id="audio-lyrics" ref="lyricsField" v-model="lyrics" rows="5" :maxlength="maxLyrics" required @input="cancelLyricsRead"
          placeholder="[00:05.20]おはよう。" />
        <small class="muted">Đặt dòng tiếng Nhật trước. Romaji và bản dịch có thể dùng cùng mốc thời gian ở các dòng kế tiếp.</small>
        <p v-if="readingLyrics" class="muted" role="status">Đang đọc file LRC…</p>
        <p v-if="lyricsError" class="error" role="alert">{{ lyricsError }}</p>
        <div v-if="selected.length" class="mark-lyric">
          <small class="muted">Bôi đen chữ trong một dòng lời Nhật, rồi gắn với từ đã chọn.</small>
          <div class="mark-lyric-actions">
            <label for="audio-lyric-word">Từ gắn vào lời</label>
            <select id="audio-lyric-word" v-model="markWordId">
              <option v-for="word in selected" :key="word.id" :value="word.id">{{ word.word }}（{{ word.reading }}）</option>
            </select>
            <button type="button" class="text-button" :disabled="readingLyrics" @click="markLyricWord">Gắn vào lời</button>
          </div>
          <p v-if="markError" class="error" role="alert">{{ markError }}</p>
        </div>
        <div class="preview-actions">
          <button type="button" class="text-button" aria-controls="audio-lyrics-preview"
            :aria-expanded="Boolean(preview)"
            :disabled="!audio || !lyrics.trim() || readingLyrics || previewLoading || (Boolean(preview) && !previewError)"
            @click="showPreview">Xem trước lời</button>
          <button v-if="preview" type="button" class="text-button" @click="closePreview">Đóng xem trước</button>
        </div>
        <div id="audio-lyrics-preview" class="lyrics-preview">
          <AppLoading v-if="previewLoading" compact label="Đang kiểm tra mốc lời…" />
          <p v-if="previewError" class="error" role="alert">{{ previewError }}</p>
          <AudioLyricPlayer v-if="preview" :title="title.trim() || 'Bài nghe xem trước'"
            :audio-url="preview.audioUrl" :cover-url="preview.coverUrl" :lyrics="preview.lyrics"
            @failed="previewError = 'Không phát được file audio đã chọn. Hãy kiểm tra hoặc chọn file khác.'" />
        </div>
      </div>
      <div class="field">
        <label for="audio-word-search">Tìm từ vựng để ôn sau khi nghe</label>
        <input id="audio-word-search" v-model="query" type="search" maxlength="100" />
        <p v-if="searchError" class="error" role="alert">{{ searchError }}</p>
        <p v-else-if="searching" class="muted" role="status">Đang tìm…</p>
        <p v-else-if="query.trim() && !results.length" class="muted">Không tìm thấy từ.</p>
        <ul v-if="results.length" class="word-picker">
          <li v-for="word in results" :key="word.id">
            <span><b lang="ja">{{ word.word }}</b> · {{ word.meaning }}</span>
            <button type="button" class="text-button" :aria-label="`Chọn ${word.word}`"
              :disabled="selected.length === maxWords || selected.some(item => item.id === word.id)" @click="selected.push(word)">Chọn</button>
          </li>
        </ul>
        <ul v-if="selected.length" class="word-picker selected-words" aria-label="Từ đã chọn">
          <li v-for="(word, index) in selected" :key="word.id">
            <span lang="ja">{{ word.word }}</span>
            <button type="button" class="text-button" :aria-label="`Bỏ ${word.word}`" @click="removeWord(index)">Bỏ</button>
          </li>
        </ul>
      </div>
    </fieldset>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button type="submit" class="primary-button" :disabled="busy || readingLyrics">{{ busy ? 'Đang tải lên…' : 'Xuất bản' }}</button>
  </form>
</template>

<style scoped>
fieldset { padding: 0; margin: 0; border: 0; min-width: 0; }
input[type=file], textarea { width: 100%; }
textarea { resize: vertical; border: 1px solid #d5caba; border-radius: 8px; padding: 8px 12px; font: inherit; }
.preview-actions { display: flex; flex-wrap: wrap; gap: 4px 14px; }
.mark-lyric-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; }
.lyrics-preview { min-width: 0; }
.word-picker { padding: 0; margin: 4px 0; list-style: none; }
.word-picker li { display: flex; justify-content: space-between; align-items: center; gap: 8px; overflow-wrap: anywhere; }
.selected-words { display: flex; flex-wrap: wrap; gap: 8px; }
.selected-words li { padding: 0 8px; border-radius: 8px; background: #ebe4d7; }
</style>
