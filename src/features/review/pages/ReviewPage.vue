<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import { ReviewGrade, type DueCard } from '@/shared/types/api'
import { reviewApi, type ReviewContent } from '../api/review.api'

const grades = [
  { value: ReviewGrade.Again, label: 'Quên' },
  { value: ReviewGrade.Hard, label: 'Khó' },
  { value: ReviewGrade.Good, label: 'Nhớ' },
  { value: ReviewGrade.Easy, label: 'Dễ' },
]
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const cards = ref<DueCard[]>([])
const currentCard = computed(() => cards.value[0])
const content = ref<ReviewContent | null>(null)
const contentAttempt = ref(0)
const queueLoading = ref(false)
const queueError = ref('')
const contentError = ref('')
const submitError = ref('')
const submitFeedback = ref('')
const isRevealed = ref(false)
const isSubmitting = ref(false)
const pendingGrade = ref<{ grade: ReviewGrade; requestId: string } | null>(null)

async function loadDueCards(): Promise<void> {
  if (queueLoading.value) return
  queueLoading.value = true
  queueError.value = ''
  try {
    cards.value = await reviewApi.getDue()
  } catch (error) {
    queueError.value = getErrorMessage(error)
  } finally {
    queueLoading.value = false
  }
}

watch([currentCard, contentAttempt], async ([card], _, onCleanup) => {
  content.value = null
  contentError.value = ''
  submitError.value = ''
  pendingGrade.value = null
  isRevealed.value = false
  if (!card) return

  const controller = new AbortController()
  onCleanup(() => controller.abort())
  try {
    const loaded = await reviewApi.getContent(card, controller.signal)
    if (!controller.signal.aborted) content.value = loaded
  } catch (error) {
    if (controller.signal.aborted) return
    contentError.value = error instanceof ApiError && error.status === 404
      ? 'Học liệu của thẻ này không còn trong kho.'
      : getErrorMessage(error)
  }
})

async function submitGrade(grade: ReviewGrade): Promise<void> {
  const card = currentCard.value
  if (!card || !isRevealed.value || isSubmitting.value) return
  if (pendingGrade.value && pendingGrade.value.grade !== grade) return
  isSubmitting.value = true
  submitError.value = ''
  submitFeedback.value = ''
  try {
    pendingGrade.value ??= { grade, requestId: crypto.randomUUID() }
    const result = await reviewApi.submit(card.reviewCardId, grade, pendingGrade.value.requestId)
    submitFeedback.value = `Đã lưu lượt ôn. Ôn lại lúc ${dateFormat.format(new Date(result.nextReviewDate))}.`
    cards.value.shift()
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      pendingGrade.value = null
    }
    if (error instanceof ApiError && error.status === 404) {
      submitFeedback.value = 'Thẻ này không còn trong bộ ôn.'
      cards.value.shift()
    } else {
      const message = getErrorMessage(error)
      submitError.value = pendingGrade.value
        ? `${message} Bấm lại cùng mức chấm để gửi lại lượt ôn.`
        : message
    }
  } finally {
    isSubmitting.value = false
  }
}

void loadDueCards()
</script>

<template>
  <main class="app-page">
    <div class="content">
      <div class="page-heading">
        <div>
          <h1>Ôn tập</h1>
          <p v-if="cards.length" class="muted">Còn {{ cards.length }} thẻ trong lượt này</p>
        </div>
        <nav class="review-actions" aria-label="Điều hướng học tập">
          <RouterLink class="text-button" :to="{ name: 'vocabs' }">Kho từ vựng</RouterLink>
          <RouterLink class="text-button" :to="{ name: 'dashboard' }">Tiến độ</RouterLink>
        </nav>
      </div>

      <p v-if="submitFeedback" class="muted" role="status">{{ submitFeedback }}</p>
      <p v-if="queueLoading" class="muted status" role="status">Đang tải thẻ đến hạn...</p>
      <section v-else-if="queueError" class="vocab-card">
        <p class="error" role="alert">{{ queueError }}</p>
        <button class="text-button" type="button" @click="loadDueCards">Tải lại danh sách</button>
      </section>
      <section v-else-if="!currentCard" class="vocab-card">
        <p>Không còn thẻ trong lượt này.</p>
        <button class="primary-button" type="button" @click="loadDueCards">Kiểm tra thẻ đến hạn</button>
      </section>
      <section v-else-if="contentError" class="vocab-card">
        <p class="error" role="alert">{{ contentError }}</p>
        <div class="review-actions">
          <button class="text-button" type="button" @click="contentAttempt += 1">Thử tải lại thẻ</button>
          <button class="text-button" type="button" @click="cards.shift()">Bỏ qua trong lượt này</button>
        </div>
      </section>
      <p v-else-if="!content" class="muted status" role="status">Đang tải nội dung thẻ...</p>
      <article v-else class="vocab-card review-card">
        <h2 lang="ja">{{ content.prompt }}</h2>
        <button v-if="!isRevealed" class="primary-button" type="button" @click="isRevealed = true">
          Hiện đáp án
        </button>
        <template v-else>
          <p v-if="content.reading" class="reading">{{ content.reading }}</p>
          <p>{{ content.meaning }}</p>
          <p v-if="content.example" class="example">
            <span lang="ja">{{ content.example }}</span>
            <span v-if="content.exampleMeaning"> — {{ content.exampleMeaning }}</span>
          </p>
          <p v-if="submitError" class="error" role="alert">{{ submitError }}</p>
          <div class="review-actions" role="group" aria-label="Mức độ ghi nhớ">
            <button
              v-for="grade in grades" :key="grade.value" class="primary-button" type="button"
              :disabled="isSubmitting || (pendingGrade !== null && pendingGrade.grade !== grade.value)"
              @click="submitGrade(grade.value)"
            >{{ grade.label }}</button>
          </div>
        </template>
      </article>
    </div>
  </main>
</template>

<style scoped>
.review-card { max-width: 640px; }
.review-card h2 { font-size: 2rem; }
.review-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.review-card .review-actions { margin-top: 24px; }
</style>
