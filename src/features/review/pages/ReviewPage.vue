<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { CardType, ReviewGrade, type DueCard } from '@/shared/types/api'
import { reviewApi, type ReviewContent } from '../api/review.api'

const grades = [
  { value: ReviewGrade.Again, label: 'Quên' },
  { value: ReviewGrade.Hard, label: 'Khó' },
  { value: ReviewGrade.Good, label: 'Nhớ' },
  { value: ReviewGrade.Easy, label: 'Dễ' },
]
const cardTypeLabels = {
  [CardType.Vocab]: 'Từ vựng',
  [CardType.Kanji]: 'Kanji',
  [CardType.Grammar]: 'Ngữ pháp',
}
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const cards = ref<DueCard[]>([])
const currentCard = computed(() => cards.value[0])
const totalCards = ref(0)
const skippedCards = ref(0)
const savedGrades = ref<ReviewGrade[]>([])
const processedCards = computed(() => totalCards.value - cards.value.length)
const summary = computed(() => grades.map(grade => ({
  ...grade,
  count: savedGrades.value.filter(value => value === grade.value).length,
})))
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
const revealButton = ref<HTMLButtonElement | null>(null)
const answerHeading = ref<HTMLHeadingElement | null>(null)
const summaryHeading = ref<HTMLHeadingElement | null>(null)
const retryContentButton = ref<HTMLButtonElement | null>(null)

async function loadDueCards(): Promise<void> {
  if (queueLoading.value) return
  queueLoading.value = true
  queueError.value = ''
  try {
    cards.value = await reviewApi.getDue()
    totalCards.value = cards.value.length
    skippedCards.value = 0
    savedGrades.value = []
    submitFeedback.value = ''
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

watch([revealButton, retryContentButton, summaryHeading], ([reveal, retry, finished]) => {
  if (processedCards.value > 0) (reveal ?? retry ?? finished)?.focus({ preventScroll: true })
}, { flush: 'post' })

async function revealAnswer(): Promise<void> {
  if (!content.value || isRevealed.value) return
  isRevealed.value = true
  await nextTick()
  answerHeading.value?.focus({ preventScroll: true })
}

function skipCard(): void {
  skippedCards.value += 1
  cards.value.shift()
}

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
    savedGrades.value.push(grade)
    cards.value.shift()
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      pendingGrade.value = null
    }
    if (error instanceof ApiError && error.status === 404) {
      submitFeedback.value = 'Thẻ này không còn trong bộ ôn.'
      skipCard()
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

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.repeat || event.isComposing ||
      event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !content.value) return
  const target = event.target
  if (target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))) return

  if (event.code === 'Space' && !isRevealed.value) {
    if (target instanceof HTMLElement && target.closest('button, a, [role="button"]')) return
    event.preventDefault()
    void revealAnswer()
    return
  }

  if (!isRevealed.value || !/^[1-4]$/.test(event.key)) return
  const grade = grades[Number(event.key) - 1]
  if (!grade) return
  event.preventDefault()
  void submitGrade(grade.value)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  void loadDueCards()
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <main class="app-page">
    <div class="content review-content">
      <div class="page-heading">
        <h1>Ôn tập</h1>
        <nav class="review-actions" aria-label="Điều hướng học tập">
          <RouterLink class="text-button" :to="{ name: 'vocabs' }">Kho từ vựng</RouterLink>
          <RouterLink class="text-button" :to="{ name: 'dashboard' }">Tiến độ</RouterLink>
        </nav>
      </div>

      <AppLoading v-if="queueLoading" label="Đang tải thẻ đến hạn…" />
      <section v-else-if="queueError" class="vocab-card">
        <p class="error" role="alert">{{ queueError }}</p>
        <button class="text-button" type="button" @click="loadDueCards">Tải lại danh sách</button>
      </section>
      <section v-else-if="totalCards === 0" class="vocab-card">
        <h2>Chưa có thẻ đến hạn</h2>
        <button class="primary-button" type="button" @click="loadDueCards">Kiểm tra thẻ đến hạn</button>
      </section>
      <template v-else>
        <div class="review-progress">
          <img src="/jlpt-mark.svg" width="32" height="32" alt="" />
          <div>
            <div class="progress-label">
              <span>Tiến độ lượt ôn</span>
              <span>{{ processedCards }} / {{ totalCards }} thẻ</span>
            </div>
            <progress :value="processedCards" :max="totalCards" aria-label="Tiến độ lượt ôn" />
          </div>
        </div>

        <section v-if="!currentCard" class="vocab-card review-summary">
          <h2 ref="summaryHeading" tabindex="-1">Hoàn thành lượt ôn</h2>
          <p>Đã lưu {{ savedGrades.length }} thẻ<span v-if="skippedCards"> · Bỏ qua {{ skippedCards }} thẻ</span></p>
          <dl class="grade-summary">
            <div v-for="grade in summary" :key="grade.value">
              <dt>{{ grade.label }}</dt>
              <dd>{{ grade.count }}</dd>
            </div>
          </dl>
          <button class="primary-button" type="button" @click="loadDueCards">Kiểm tra thẻ đến hạn</button>
        </section>
        <section v-else-if="contentError" class="vocab-card review-placeholder">
          <p class="error" role="alert">{{ contentError }}</p>
          <div class="review-actions">
            <button ref="retryContentButton" class="text-button" type="button" @click="contentAttempt += 1">
              Thử tải lại thẻ
            </button>
            <button class="text-button" type="button" @click="skipCard">Bỏ qua trong lượt này</button>
          </div>
        </section>
        <div v-else-if="!content" class="vocab-card review-placeholder">
          <AppLoading label="Đang tải nội dung thẻ…" />
        </div>
        <article v-else class="vocab-card review-card">
          <div class="card-labels">
            <span>{{ cardTypeLabels[currentCard.cardType] }}</span>
            <span>{{ isRevealed ? 'Mặt sau' : 'Mặt trước' }}</span>
          </div>
          <div v-if="!isRevealed" class="card-face card-front">
            <h2 lang="ja">{{ content.prompt }}</h2>
          </div>
          <div v-else class="card-face card-back">
            <p class="card-prompt" lang="ja">{{ content.prompt }}</p>
            <h2 ref="answerHeading" tabindex="-1">{{ content.meaning }}</h2>
            <p v-if="content.reading" class="reading">{{ content.reading }}</p>
            <div v-if="content.example" class="card-example">
              <p lang="ja">{{ content.example }}</p>
              <p v-if="content.exampleMeaning" class="muted">{{ content.exampleMeaning }}</p>
            </div>
          </div>
          <footer class="card-controls">
            <template v-if="!isRevealed">
              <button
                ref="revealButton" class="primary-button reveal-button" type="button"
                aria-keyshortcuts="Space" @click="revealAnswer"
              >Hiện đáp án</button>
              <span class="shortcut-hint muted"><kbd>Space</kbd> để lật thẻ</span>
            </template>
            <template v-else>
              <p v-if="submitError" class="error" role="alert">{{ submitError }}</p>
              <div class="grade-actions" role="group" aria-label="Mức độ ghi nhớ">
                <button
                  v-for="(grade, index) in grades" :key="grade.value" class="grade-button" type="button"
                  :disabled="isSubmitting || (pendingGrade !== null && pendingGrade.grade !== grade.value)"
                  :aria-keyshortcuts="String(index + 1)" @click="submitGrade(grade.value)"
                >
                  <kbd aria-hidden="true">{{ index + 1 }}</kbd>
                  {{ grade.label }}
                </button>
              </div>
              <p v-if="isSubmitting" class="save-status muted" role="status">Đang lưu lượt ôn…</p>
            </template>
          </footer>
        </article>
        <p class="review-feedback muted" role="status">{{ submitFeedback }}</p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.review-content { max-width: 740px; }
.review-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.review-progress {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: .875rem;
  font-weight: 700;
}
.review-progress progress {
  display: block;
  width: 100%;
  height: 8px;
  margin-top: 6px;
  appearance: none;
  border: 0;
  border-radius: 8px;
  background: #e8dccf;
}
.review-progress progress::-webkit-progress-bar { border-radius: 8px; background: #e8dccf; }
.review-progress progress::-webkit-progress-value { border-radius: 8px; background: #b7282e; }
.review-progress progress::-moz-progress-bar { border-radius: 8px; background: #b7282e; }
.review-card,
.review-placeholder,
.review-summary { border-radius: 14px; }
.review-card,
.review-placeholder { min-height: 21rem; }
.review-card { display: flex; flex-direction: column; }
.review-placeholder { display: grid; align-content: center; justify-items: center; text-align: center; }
.card-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #6b6558;
  font-size: .875rem;
  font-weight: 700;
}
.card-face {
  flex: 1;
  display: grid;
  align-content: center;
  min-height: 13rem;
  padding-block: 20px;
  text-align: center;
  overflow-wrap: anywhere;
  animation: show-face 160ms ease-out;
}
.card-face h2 { margin: 0; }
.card-back h2:focus,
.review-summary h2:focus { outline: none; }
.card-front h2 { font-size: clamp(1.65rem, 5.5vw, 2.75rem); }
.card-back h2 { font-size: clamp(1.25rem, 3.5vw, 1.75rem); }
.card-prompt { margin-bottom: 8px; color: #6b6558; font-weight: 700; }
.card-back .reading { margin: 10px 0 0; font-size: .95rem; }
.card-example { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8dccf; }
.card-example p { margin: 0; white-space: pre-line; }
.card-example p + p { margin-top: 4px; font-size: .875rem; }
.card-controls { text-align: center; }
.reveal-button { min-width: min(100%, 14rem); }
.shortcut-hint { display: inline-block; margin-left: 12px; font-size: .875rem; }
kbd {
  padding: 1px 5px;
  border: 1px solid #d8cebf;
  border-radius: 4px;
  background: #fffdf8;
  font-size: .75rem;
}
.grade-actions,
.grade-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.grade-button {
  min-height: 44px;
  padding: 6px;
  border: 1px solid #d8cebf;
  border-radius: 8px;
  background: #f3eee4;
  color: #1e2a4a;
  font-weight: 700;
}
.grade-button:hover:enabled { background: #e8dccf; }
.grade-button:disabled { opacity: .55; cursor: not-allowed; }
.grade-button kbd { margin-right: 4px; }
.save-status,
.review-feedback { margin: 10px 0 0; font-size: .875rem; }
.grade-summary { margin: 20px 0; text-align: center; }
.grade-summary div { padding: 8px 4px; border-radius: 8px; background: #f3eee4; }
.grade-summary dt { color: #6b6558; font-size: .875rem; }
.grade-summary dd { margin: 4px 0 0; font-size: 1.25rem; font-weight: 700; }
@keyframes show-face {
  from { opacity: 0; transform: translateY(4px); }
}
@media (max-width: 450px) {
  .review-card { padding-inline: 16px; }
  .reveal-button { width: 100%; }
}
@media (pointer: coarse) {
  .shortcut-hint,
  .grade-button kbd { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .card-face { animation: none; }
}
</style>
