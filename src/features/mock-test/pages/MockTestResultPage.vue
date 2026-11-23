<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import { CardType, JlptLevel } from '@/shared/types/api'
import { reviewApi } from '@/features/review/api/review.api'
import AppLoading from '@/shared/components/AppLoading.vue'
import PronunciationButton from '@/shared/components/PronunciationButton.vue'
import { downloadBlob } from '@/shared/download'
import { mockTestApi } from '../api/mock-test.api'
import type { MockTestReview } from '../types'

const props = defineProps<{ id: string }>()
const result = ref<MockTestReview | null>(null)
const loading = ref(true)
const errorsOnly = ref(true)
const downloading = ref(false)
const loadError = ref('')
const downloadError = ref('')
const reviewActions = ref<Partial<Record<string, { status: 'adding' | 'added' | 'missing' | 'failed'; message?: string }>>>({})
let loadRequest: AbortController | undefined
let downloadRequest: AbortController | undefined
const dates = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const visibleQuestions = computed(() => (result.value?.questions ?? [])
  .map((question, index) => ({ ...question, index }))
  .filter((question) => !errorsOnly.value || question.selectedChoiceIndex !== question.correctChoiceIndex))

async function load(id: string): Promise<void> {
  loadRequest?.abort()
  downloadRequest?.abort()
  const request = new AbortController()
  loadRequest = request
  loading.value = true
  errorsOnly.value = true
  loadError.value = ''
  downloadError.value = ''
  reviewActions.value = {}
  result.value = null
  try {
    const data = await mockTestApi.getReview(id, request.signal)
    if (!request.signal.aborted) result.value = data
  } catch (error) {
    if (!request.signal.aborted) loadError.value = getErrorMessage(error)
  } finally {
    if (loadRequest === request) loading.value = false
  }
}

async function addToReview(vocabId: string): Promise<void> {
  const request = loadRequest
  const status = reviewActions.value[vocabId]?.status
  if (!request || (status && status !== 'failed')) return
  reviewActions.value[vocabId] = { status: 'adding' }
  try {
    await reviewApi.add(CardType.Vocab, vocabId, request.signal)
    if (!request.signal.aborted) reviewActions.value[vocabId] = { status: 'added' }
  } catch (error) {
    if (request.signal.aborted) return
    if (error instanceof ApiError && error.status === 409) {
      reviewActions.value[vocabId] = { status: 'added' }
    } else if (error instanceof ApiError && error.status === 404) {
      reviewActions.value[vocabId] = { status: 'missing' }
    } else {
      reviewActions.value[vocabId] = { status: 'failed', message: getErrorMessage(error) }
    }
  }
}

async function downloadPdf(): Promise<void> {
  if (downloading.value || !result.value) return
  const id = result.value.id
  const request = new AbortController()
  downloadRequest = request
  downloading.value = true
  downloadError.value = ''
  try {
    const pdf = await mockTestApi.getPdf(id, request.signal)
    if (request.signal.aborted) return
    downloadBlob(pdf, `mocktest_result_${id}.pdf`)
  } catch (error) {
    if (!request.signal.aborted) downloadError.value = getErrorMessage(error)
  } finally {
    if (downloadRequest === request) downloading.value = false
  }
}

watch(() => props.id, load, { immediate: true })
onUnmounted(() => {
  loadRequest?.abort()
  downloadRequest?.abort()
})
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Kết quả bài luyện</h1>
      <RouterLink class="text-button" :to="{ name: 'mock-tests' }">Về danh sách bài luyện</RouterLink>
    </header>
    <AppLoading v-if="loading" label="Đang tải kết quả…" />
    <section v-else-if="loadError" class="vocab-card">
      <p class="error" role="alert">{{ loadError }}</p>
      <button class="text-button" type="button" @click="load(id)">Thử lại</button>
    </section>
    <template v-else-if="result">
      <section class="vocab-card summary">
        <h2>{{ JlptLevel[result.level] }} · {{ result.correctAnswers }} / {{ result.totalQuestions }} câu đúng</h2>
        <p class="muted">
          {{ percent.format(result.scorePercentage) }}% ·
          <time :datetime="result.takenAt">{{ dates.format(new Date(result.takenAt)) }}</time>
        </p>
        <button class="text-button" type="button" :disabled="downloading" @click="downloadPdf">
          {{ downloading ? 'Đang tải PDF…' : 'Tải PDF' }}
        </button>
        <p v-if="downloadError" class="error" role="alert">{{ downloadError }}</p>
      </section>
      <p v-if="result.questions === null" class="muted">Bài luyện này chỉ có bản tổng kết.</p>
      <section v-else aria-labelledby="question-review">
        <h2 id="question-review">Xem lại câu trả lời</h2>
        <label class="filter"><input v-model="errorsOnly" type="checkbox" /> Chỉ hiện câu sai hoặc bỏ trống</label>
        <p v-if="!visibleQuestions.length" class="muted">Bạn đã trả lời đúng tất cả các câu.</p>
        <article v-for="question in visibleQuestions" :key="question.index" class="vocab-card answer">
          <div class="pronunciation-line">
            <h3>{{ question.index + 1 }}. <span lang="ja">{{ question.word }}</span></h3>
            <PronunciationButton :text="question.word" :reading="question.reading" />
          </div>
          <p class="reading" lang="ja">{{ question.reading }}</p>
          <dl>
            <dt>Bạn chọn</dt>
            <dd>{{ question.selectedChoiceIndex === null ? 'Bỏ trống' : question.choices[question.selectedChoiceIndex] }}</dd>
            <dt>Đáp án</dt>
            <dd>{{ question.choices[question.correctChoiceIndex] }}</dd>
          </dl>
          <div v-if="question.reviewVocabId" class="review-action">
            <p v-if="reviewActions[question.reviewVocabId]?.status === 'added'" class="muted" role="status">
              Đã có trong bộ ôn.
            </p>
            <p v-else-if="reviewActions[question.reviewVocabId]?.status === 'missing'" class="muted" role="status">
              Từ này đã được gỡ khỏi kho.
            </p>
            <template v-else>
              <button type="button" class="text-button"
                :disabled="reviewActions[question.reviewVocabId]?.status === 'adding'"
                @click="addToReview(question.reviewVocabId)">
                {{ reviewActions[question.reviewVocabId]?.status === 'adding' ? 'Đang thêm…' : 'Thêm vào bộ ôn' }}
              </button>
              <p v-if="reviewActions[question.reviewVocabId]?.status === 'failed'" class="error" role="alert">
                {{ reviewActions[question.reviewVocabId]?.message }}
              </p>
            </template>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.summary, .filter, .answer { margin-bottom: 16px; }
.filter { display: flex; gap: 8px; align-items: center; }
.answer h3 { margin: 0; }
.answer dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 16px; margin: 0; }
.answer dt { font-weight: 700; }
.answer dd { margin: 0; overflow-wrap: anywhere; }
.review-action { margin-top: 12px; }
.review-action p { margin: 4px 0 0; }
</style>
