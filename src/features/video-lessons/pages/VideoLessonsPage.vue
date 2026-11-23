<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import CatalogNavigation from '@/features/catalog/components/CatalogNavigation.vue'
import { useCatalogPermission } from '@/features/catalog/composables/useCatalogPermission'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { JlptLevel } from '@/shared/types/api'
import { videoLessonsApi, type VideoLesson } from '../api/video-lessons.api'
import VideoLessonPlayer from '../components/VideoLessonPlayer.vue'

const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const { canManageCatalog, refreshAfterForbidden } = useCatalogPermission()
const filter = ref<JlptLevel | ''>('')
const result = ref<Awaited<ReturnType<typeof videoLessonsApi.list>>>()
const totalPages = computed(() => result.value ? Math.max(1, Math.ceil(result.value.totalCount / result.value.pageSize)) : 1)
const selected = ref<VideoLesson>()
const loading = ref(false)
const listError = ref('')
const actionError = ref('')
const feedback = ref('')
const writing = ref(false)
const showEditor = ref(false)
const draft = reactive({ title: '', description: '', level: JlptLevel.N5 })
const file = ref<File>()
const maxBytes = 50 * 1024 * 1024
const writeRequest = new AbortController()
let listRequest: AbortController | undefined

async function load(pageNumber = 1): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  loading.value = true
  listError.value = ''
  try {
    const page = await videoLessonsApi.list(filter.value, pageNumber, request.signal)
    if (request.signal.aborted) return
    const last = Math.max(1, Math.ceil(page.totalCount / page.pageSize))
    if (pageNumber > last) await load(last)
    else result.value = page
  } catch (cause) {
    if (!request.signal.aborted) listError.value = getErrorMessage(cause)
  } finally {
    if (listRequest === request) loading.value = false
  }
}

function selectFile(event: Event): void {
  const next = (event.target as HTMLInputElement).files?.[0]
  actionError.value = next && (next.size > maxBytes || next.size === 0) ? 'Chọn video có dung lượng từ 1 byte đến 50 MB.' : ''
  file.value = actionError.value ? undefined : next
}

function handleWriteError(cause: unknown): void {
  if (writeRequest.signal.aborted) return
  actionError.value = getErrorMessage(cause)
  if (cause instanceof ApiError && cause.status === 403) {
    showEditor.value = false
    refreshAfterForbidden()
  }
}

async function publish(): Promise<void> {
  const upload = file.value
  if (!upload || !draft.title.trim() || writing.value) return
  writing.value = true
  actionError.value = ''
  feedback.value = ''
  try {
    await videoLessonsApi.publish({ ...draft, title: draft.title.trim() }, upload, writeRequest.signal)
    if (writeRequest.signal.aborted) return
    feedback.value = 'Đã đăng bài học.'
    filter.value = draft.level
    showEditor.value = false
    file.value = undefined
    Object.assign(draft, { title: '', description: '' })
    await load()
  } catch (cause) {
    handleWriteError(cause)
  } finally {
    writing.value = false
  }
}

async function unpublish(lesson: VideoLesson): Promise<void> {
  if (writing.value || !window.confirm(`Gỡ bài học “${lesson.title}”?`)) return
  writing.value = true
  actionError.value = ''
  feedback.value = ''
  try {
    await videoLessonsApi.unpublish(lesson.id, writeRequest.signal)
    if (writeRequest.signal.aborted) return
    if (selected.value?.id === lesson.id) selected.value = undefined
    feedback.value = 'Đã gỡ bài học.'
    await load(result.value?.pageNumber)
  } catch (cause) {
    handleWriteError(cause)
  } finally {
    writing.value = false
  }
}

onUnmounted(() => {
  writeRequest.abort()
  listRequest?.abort()
})
void load()
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Bài học video</h1>
      <button v-if="canManageCatalog" class="primary-button" type="button" :disabled="writing"
        :aria-expanded="showEditor" @click="showEditor = !showEditor; file = undefined; actionError = ''">
        {{ showEditor ? 'Đóng form' : 'Đăng video' }}
      </button>
    </header>
    <CatalogNavigation />

    <form v-if="showEditor && canManageCatalog" class="create-panel" @submit.prevent="publish">
      <div class="form-grid">
        <div class="field">
          <label for="video-title">Tiêu đề</label>
          <input id="video-title" v-model="draft.title" required maxlength="150" :disabled="writing" />
        </div>
        <div class="field">
          <label for="video-level">Cấp JLPT</label>
          <select id="video-level" v-model.number="draft.level" :disabled="writing">
            <option v-for="level in levels" :key="level" :value="level">N{{ level }}</option>
          </select>
        </div>
        <div class="field">
          <label for="video-description">Mô tả</label>
          <textarea id="video-description" v-model="draft.description" rows="3" maxlength="1000" :disabled="writing" />
        </div>
        <div class="field">
          <label for="video-file">Video MP4, tối đa 50 MB</label>
          <input id="video-file" type="file" accept=".mp4,video/mp4" required :disabled="writing" @change="selectFile" />
          <small class="muted">Ưu tiên MP4 với video H.264 và âm thanh AAC.</small>
        </div>
      </div>
      <button class="primary-button" type="submit" :disabled="writing || !file || !draft.title.trim()">
        {{ writing ? 'Đang tải lên…' : 'Xuất bản' }}
      </button>
    </form>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-if="feedback" class="muted" role="status">{{ feedback }}</p>

    <VideoLessonPlayer v-if="selected" :key="selected.id" :lesson="selected" />

    <div class="toolbar">
      <label for="lessons-filter">Cấp JLPT</label>
      <select id="lessons-filter" v-model.number="filter" @change="load()">
        <option value="">Tất cả</option>
        <option v-for="level in levels" :key="level" :value="level">N{{ level }}</option>
      </select>
    </div>
    <AppLoading v-if="loading" compact label="Đang tải bài học…" />
    <p v-else-if="listError" class="error" role="alert">
      {{ listError }}
      <button class="text-button" type="button" @click="load()">Thử lại</button>
    </p>
    <p v-else-if="result?.items.length === 0" class="muted status">Chưa có bài học video ở cấp này.</p>
    <div v-else-if="result" class="vocab-list">
      <article v-for="lesson in result.items" :key="lesson.id" class="vocab-card lesson-item">
        <div>
          <div class="word-line"><h2>{{ lesson.title }}</h2><span class="level-badge">N{{ lesson.level }}</span></div>
          <p v-if="lesson.description" class="muted lesson-description">{{ lesson.description }}</p>
        </div>
        <div class="lesson-actions">
          <button class="primary-button" type="button" :aria-label="`Xem ${lesson.title}`"
            :disabled="selected?.id === lesson.id" @click="selected = lesson">Xem video</button>
          <button v-if="canManageCatalog" class="text-button danger" type="button" :disabled="writing"
            :aria-label="`Gỡ ${lesson.title}`" @click="unpublish(lesson)">Gỡ bài</button>
        </div>
      </article>
      <nav v-if="totalPages > 1" class="pagination" aria-label="Phân trang bài học">
        <button type="button" :disabled="result.pageNumber === 1" @click="load(result.pageNumber - 1)">Trước</button>
        <span>Trang {{ result.pageNumber }} / {{ totalPages }}</span>
        <button type="button" :disabled="result.pageNumber === totalPages" @click="load(result.pageNumber + 1)">Sau</button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.lesson-item { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.lesson-item h2, .lesson-description { overflow-wrap: anywhere; }
.lesson-description { margin: 6px 0 0; white-space: pre-wrap; }
.lesson-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
textarea { width: 100%; resize: vertical; border: 1px solid #d5caba; border-radius: 8px; padding: 8px 12px; font: inherit; }
input[type="file"] { width: 100%; }
</style>
