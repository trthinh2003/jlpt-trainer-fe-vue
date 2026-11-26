<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import CatalogNavigation from '@/features/catalog/components/CatalogNavigation.vue'
import { useCatalogPermission } from '@/features/catalog/composables/useCatalogPermission'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { JlptLevel } from '@/shared/types/api'
import { audioLessonsApi } from '../api/audio-lessons.api'
import type { AudioLesson, AudioLessonPage } from '../types'
import AudioLessonEditor from '../components/AudioLessonEditor.vue'
import AudioLessonPlayer from '../components/AudioLessonPlayer.vue'

const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const { canManageCatalog, refreshAfterForbidden } = useCatalogPermission()
const filter = ref<JlptLevel | ''>('')
const result = ref<AudioLessonPage>()
const totalPages = computed(() => result.value ? Math.max(1, Math.ceil(result.value.totalCount / result.value.pageSize)) : 1)
const selected = ref<AudioLesson>()
const loading = ref(false)
const listError = ref('')
const actionError = ref('')
const feedback = ref('')
const showEditor = ref(false)
const uploading = ref(false)
const unpublishing = ref(false)
const writeRequest = new AbortController()
let listRequest: AbortController | undefined

async function load(page = 1): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  loading.value = true
  listError.value = ''
  try {
    const data = await audioLessonsApi.list(filter.value, page, request.signal)
    if (request.signal.aborted) return
    const lastPage = Math.max(1, Math.ceil(data.totalCount / data.pageSize))
    if (page > lastPage) await load(lastPage)
    else result.value = data
  } catch (cause) {
    if (!request.signal.aborted) listError.value = getErrorMessage(cause)
  } finally {
    if (listRequest === request) loading.value = false
  }
}

function forbidden(): void {
  showEditor.value = false
  actionError.value = 'Bạn không có quyền thay đổi kho học liệu.'
  refreshAfterForbidden()
}

function published(level: JlptLevel): void {
  showEditor.value = false
  feedback.value = 'Đã đăng bài nghe.'
  filter.value = level
  void load()
}

async function unpublish(lesson: AudioLesson): Promise<void> {
  if (unpublishing.value || uploading.value || !window.confirm(`Gỡ bài nghe “${lesson.title}”?`)) return
  unpublishing.value = true
  feedback.value = ''
  actionError.value = ''
  try {
    await audioLessonsApi.unpublish(lesson.id, writeRequest.signal)
    if (writeRequest.signal.aborted) return
    if (selected.value?.id === lesson.id) selected.value = undefined
    feedback.value = 'Đã gỡ bài nghe.'
    await load(result.value?.pageNumber)
  } catch (cause) {
    if (writeRequest.signal.aborted) return
    if (cause instanceof ApiError && cause.status === 403) forbidden()
    else actionError.value = getErrorMessage(cause)
  } finally {
    unpublishing.value = false
  }
}

onUnmounted(() => {
  listRequest?.abort()
  writeRequest.abort()
})
void load()
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Học qua audio</h1>
      <button v-if="canManageCatalog" type="button" class="primary-button" :aria-expanded="showEditor"
        :disabled="uploading || unpublishing" @click="showEditor = !showEditor; actionError = ''; feedback = ''">
        {{ showEditor ? 'Đóng form' : 'Đăng bài nghe' }}
      </button>
    </header>
    <CatalogNavigation />
    <AudioLessonEditor v-if="showEditor && canManageCatalog" @published="published" @forbidden="forbidden"
      @busy="uploading = $event" />
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-if="feedback" class="muted" role="status">{{ feedback }}</p>
    <AudioLessonPlayer v-if="selected" :key="selected.id" :lesson="selected" />
    <div class="toolbar">
      <label for="audio-filter">Cấp JLPT</label>
      <select id="audio-filter" v-model.number="filter" @change="load()">
        <option value="">Tất cả</option>
        <option v-for="level in levels" :key="level" :value="level">N{{ level }}</option>
      </select>
    </div>
    <AppLoading v-if="loading" compact label="Đang tải danh sách bài nghe…" />
    <p v-else-if="listError" class="error" role="alert">
      {{ listError }}
      <button type="button" class="text-button" @click="load()">Thử lại</button>
    </p>
    <p v-else-if="result?.items.length === 0" class="muted status">Chưa có bài nghe ở cấp này.</p>
    <div v-else-if="result" class="vocab-list">
      <article v-for="lesson in result.items" :key="lesson.id" class="vocab-card lesson">
        <div class="word-line"><h2>{{ lesson.title }}</h2><span class="level-badge">N{{ lesson.level }}</span></div>
        <div class="actions">
          <button type="button" class="primary-button" :aria-label="`Nghe ${lesson.title}`"
            :disabled="selected?.id === lesson.id" @click="selected = lesson">Nghe bài</button>
          <button v-if="canManageCatalog" type="button" class="text-button danger" :aria-label="`Gỡ ${lesson.title}`"
            :disabled="uploading || unpublishing" @click="unpublish(lesson)">Gỡ bài</button>
        </div>
      </article>
      <nav v-if="totalPages > 1" class="pagination" aria-label="Phân trang bài nghe">
        <button type="button" :disabled="result.pageNumber === 1" @click="load(result.pageNumber - 1)">Trước</button>
        <span>Trang {{ result.pageNumber }} / {{ totalPages }}</span>
        <button type="button" :disabled="result.pageNumber === totalPages" @click="load(result.pageNumber + 1)">Sau</button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.lesson { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.lesson h2 { overflow-wrap: anywhere; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
</style>
