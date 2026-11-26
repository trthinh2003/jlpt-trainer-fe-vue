<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import type { CardType, JlptLevel, PagedResult } from '@/shared/types/api'
import { reviewApi } from '../api/review.api'
import { cardTypeLabels, reviewCardTypes, reviewLevels, type StudyCardItem } from '../types'

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const cardType = ref<CardType | ''>('')
const level = ref<JlptLevel | ''>('')
const schedule = ref<'due' | 'scheduled' | ''>('')
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const result = ref<PagedResult<StudyCardItem>>()
const loading = ref(false)
const listError = ref('')
const confirming = ref<string>()
const removing = ref(false)
const removeError = ref('')
const feedback = ref('')
const feedbackStatus = ref<HTMLElement>()
let listRequest: AbortController | undefined
let removeRequest: AbortController | undefined

async function load(): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  loading.value = true
  listError.value = ''
  try {
    const data = await reviewApi.list({
      pageNumber: page.value,
      cardType: cardType.value === '' ? undefined : cardType.value,
      level: level.value === '' ? undefined : level.value,
      due: schedule.value === '' ? undefined : schedule.value === 'due',
      search: search.value,
    }, request.signal)
    if (request.signal.aborted) return
    const lastPage = Math.max(1, data.totalPages)
    if (page.value > lastPage) page.value = lastPage
    else result.value = data
  } catch (error) {
    if (!request.signal.aborted) listError.value = getErrorMessage(error)
  } finally {
    if (listRequest === request) loading.value = false
  }
}

async function confirmRemoval(id: string): Promise<void> {
  confirming.value = id
  removeError.value = ''
  feedback.value = ''
  await nextTick()
  document.getElementById('cancel-study-card-removal')?.focus()
}

async function cancelRemoval(id: string): Promise<void> {
  confirming.value = undefined
  await nextTick()
  document.getElementById(`remove-card-${id}`)?.focus()
}

async function remove(card: StudyCardItem): Promise<void> {
  if (removing.value || confirming.value !== card.id) return
  const request = new AbortController()
  removeRequest = request
  removing.value = true
  removeError.value = ''
  try {
    await reviewApi.remove(card.id, request.signal)
  } catch (error) {
    if (request.signal.aborted) return
    if (!(error instanceof ApiError && error.status === 404)) {
      removeError.value = getErrorMessage(error)
      return
    }
  } finally {
    removing.value = false
  }
  if (request.signal.aborted) return
  confirming.value = undefined
  feedback.value = `Đã gỡ ${card.prompt} khỏi bộ ôn.`
  await load()
  await nextTick()
  if (!request.signal.aborted) feedbackStatus.value?.focus({ preventScroll: true })
}

watch(searchInput, (value, _, onCleanup) => {
  const timer = window.setTimeout(() => { search.value = value.trim() }, 250)
  onCleanup(() => window.clearTimeout(timer))
})
watch([cardType, level, schedule, search], () => {
  page.value = 1
  feedback.value = ''
})
watch([cardType, level, schedule, search, page], () => {
  confirming.value = undefined
  removeError.value = ''
  void load()
}, { immediate: true })
onUnmounted(() => {
  listRequest?.abort()
  removeRequest?.abort()
})
</script>

<template>
  <main class="content study-cards">
    <header class="page-heading">
      <h1>Bộ ôn cá nhân</h1>
      <RouterLink class="primary-button" :to="{ name: 'review' }">Ôn thẻ đến hạn</RouterLink>
    </header>

    <fieldset class="study-filters" aria-label="Lọc bộ ôn" :disabled="removing">
      <div class="field study-search">
        <label for="study-search">Tìm chữ, cách đọc hoặc nghĩa</label>
        <input id="study-search" v-model="searchInput" type="search" maxlength="100" />
      </div>
      <div class="field">
        <label for="study-type">Loại thẻ</label>
        <select id="study-type" v-model="cardType">
          <option value="">Tất cả</option>
          <option v-for="type in reviewCardTypes" :key="type" :value="type">{{ cardTypeLabels[type] }}</option>
        </select>
      </div>
      <div class="field">
        <label for="study-level">Cấp JLPT</label>
        <select id="study-level" v-model="level">
          <option value="">Tất cả</option>
          <option v-for="item in reviewLevels" :key="item" :value="item">N{{ item }}</option>
        </select>
      </div>
      <div class="field study-schedule">
        <label for="study-schedule">Lịch ôn</label>
        <select id="study-schedule" v-model="schedule">
          <option value="">Tất cả</option>
          <option value="due">Đến hạn</option>
          <option value="scheduled">Chưa đến hạn</option>
        </select>
      </div>
    </fieldset>

    <p v-if="feedback" ref="feedbackStatus" class="muted" role="status" tabindex="-1">{{ feedback }}</p>
    <AppLoading v-if="loading" label="Đang tải bộ ôn…" />
    <div v-else-if="listError" class="vocab-card">
      <p class="error" role="alert">{{ listError }}</p>
      <button type="button" class="text-button" @click="load">Tải lại bộ ôn</button>
    </div>
    <template v-else-if="result">
      <p v-if="!result.items.length" class="muted status">
        {{ cardType !== '' || level !== '' || schedule || search ? 'Không có thẻ phù hợp.' : 'Bộ ôn của bạn chưa có thẻ.' }}
      </p>
      <template v-else>
        <p class="result-count">{{ result.totalCount }} thẻ</p>
        <div class="vocab-list">
          <article v-for="card in result.items" :key="card.id" class="vocab-card study-card">
            <div class="word-line">
              <h2 lang="ja">{{ card.prompt }}</h2>
              <span class="level-badge">{{ cardTypeLabels[card.cardType] }} · N{{ card.level }}</span>
            </div>
            <p class="meaning">{{ card.meaning }}</p>
            <div class="card-schedule">
              <p :class="{ due: card.isDue }">
                <strong>{{ card.isDue ? 'Đến hạn' : 'Ôn tiếp' }}</strong>
                <time :datetime="card.nextReviewDate">{{ dateFormat.format(new Date(card.nextReviewDate)) }}</time>
              </p>
              <p v-if="card.lastReviewedAt" class="muted">Ôn gần nhất
                <time :datetime="card.lastReviewedAt">{{ dateFormat.format(new Date(card.lastReviewedAt)) }}</time>
              </p>
            </div>
            <div v-if="confirming === card.id" class="remove-card">
              <p>Gỡ thẻ này? Lịch ôn sẽ bắt đầu lại nếu bạn thêm thẻ lần nữa.</p>
              <p v-if="removeError" class="error" role="alert">{{ removeError }}</p>
              <div class="remove-actions">
                <button type="button" class="text-button danger" :disabled="removing" @click="remove(card)">
                  {{ removing ? 'Đang gỡ…' : 'Xác nhận gỡ' }}
                </button>
                <button id="cancel-study-card-removal" type="button" class="text-button" :disabled="removing"
                  @click="cancelRemoval(card.id)">Hủy</button>
              </div>
            </div>
            <button v-else :id="`remove-card-${card.id}`" type="button" class="text-button" :aria-label="`Gỡ thẻ ${card.prompt}`"
              :disabled="removing" @click="confirmRemoval(card.id)">Gỡ thẻ</button>
          </article>
        </div>
      </template>
      <nav v-if="result.totalPages > 1" class="pagination" aria-label="Phân trang bộ ôn">
        <button type="button" :disabled="page <= 1 || removing" @click="page -= 1">Trước</button>
        <span>Trang {{ result.pageNumber }} / {{ result.totalPages }}</span>
        <button type="button" :disabled="page >= result.totalPages || removing" @click="page += 1">Sau</button>
      </nav>
    </template>
  </main>
</template>

<style scoped>
.study-cards { max-width: 860px; }
.page-heading { flex-wrap: wrap; align-items: center; gap: 8px 20px; margin-bottom: 24px; }
.page-heading h1 { margin: 0; }
.study-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 0;
  margin: 0 0 20px;
  border: 0;
}
.study-filters .field { margin: 0; }
.study-search { grid-column: 1 / -1; }
.result-count { margin: 0 0 8px; }
.study-card h2, .study-card .meaning { overflow-wrap: anywhere; }
.card-schedule { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 12px 0 4px; font-size: .875rem; }
.card-schedule p { margin: 0; }
.card-schedule time { margin-left: 4px; }
.card-schedule .due { color: #852229; }
.remove-card { margin-top: 8px; }
.remove-card p { margin: 0; }
.remove-actions { display: flex; gap: 12px; }
.study-card button { min-height: 40px; }
@media (max-width: 520px) {
  .study-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .study-schedule { grid-column: 1 / -1; }
}
</style>
