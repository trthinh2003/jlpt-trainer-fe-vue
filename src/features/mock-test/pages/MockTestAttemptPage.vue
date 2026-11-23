<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import PronunciationButton from '@/shared/components/PronunciationButton.vue'
import { JlptLevel } from '@/shared/types/api'
import { mockTestApi } from '../api/mock-test.api'
import type { MockTestAttempt } from '../types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const attempt = ref<MockTestAttempt | null>(null)
const choices = ref<(number | null)[]>([])
const loading = ref(true)
const submitting = ref(false)
const confirming = ref(false)
const uncertain = ref(false)
const loadError = ref('')
const submitError = ref('')
const remaining = ref(0)
let deadline = 0
let loadRequest: AbortController | undefined
let submitRequest: AbortController | undefined

const answered = computed(() => choices.value.filter((choice) => choice !== null).length)
const clock = computed(() => `${Math.floor(remaining.value / 60)}:${String(remaining.value % 60).padStart(2, '0')}`)
const questionControlsDisabled = computed(() => submitting.value || confirming.value || uncertain.value || remaining.value === 0)
const timer = window.setInterval(updateTime, 250)

function updateTime(): void {
  remaining.value = Math.max(0, Math.ceil((deadline - performance.now()) / 1000))
}

function draftKey(id: string): string {
  return `jlpt_mock_test_${id}`
}

function readDraft(data: MockTestAttempt): (number | null)[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(draftKey(data.id)) ?? 'null')
    if (Array.isArray(saved) && saved.length === data.questions.length) {
      return data.questions.map((question, index) => {
        const choice: unknown = saved[index]
        return typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice < question.choices.length
          ? choice : null
      })
    }
  } catch {
    // Storage is optional. The test remains usable in this tab.
  }
  return data.questions.map(() => null)
}

function choose(question: number, choice: number): void {
  if (!attempt.value) return
  choices.value[question] = choice
  try {
    sessionStorage.setItem(draftKey(attempt.value.id), JSON.stringify(choices.value))
  } catch {
    // Keep the selection in memory when storage is unavailable.
  }
}

async function openResult(id: string, resultId: string): Promise<void> {
  try {
    sessionStorage.removeItem(draftKey(id))
  } catch {
    // The saved result is already available on the server.
  }
  await router.replace({ name: 'mock-test-result', params: { id: resultId } })
}

async function load(id: string): Promise<void> {
  loadRequest?.abort()
  submitRequest?.abort()
  const request = new AbortController()
  loadRequest = request
  loading.value = true
  confirming.value = false
  uncertain.value = false
  loadError.value = ''
  submitError.value = ''
  attempt.value = null
  try {
    const data = await mockTestApi.getAttempt(id, request.signal)
    if (request.signal.aborted) return
    if (data.resultId) {
      await openResult(id, data.resultId)
      return
    }
    deadline = performance.now() + Date.parse(data.expiresAt) - Date.parse(data.serverTime)
    updateTime()
    choices.value = readDraft(data)
    attempt.value = data
  } catch (error) {
    if (!request.signal.aborted) loadError.value = getErrorMessage(error)
  } finally {
    if (loadRequest === request) loading.value = false
  }
}

async function submit(): Promise<void> {
  const data = attempt.value
  if (!data || submitting.value) return
  updateTime()
  if (remaining.value === 0 && !uncertain.value) return
  const request = new AbortController()
  submitRequest = request
  submitting.value = true
  submitError.value = ''
  try {
    const resultId = await mockTestApi.submit(data.id, choices.value, request.signal)
    if (!request.signal.aborted) await openResult(data.id, resultId)
  } catch (error) {
    if (request.signal.aborted) return
    if (error instanceof ApiError && error.status === 409) {
      await load(data.id)
      return
    }
    if (error instanceof ApiError && error.status === 410) {
      deadline = 0
      updateTime()
    }
    uncertain.value = !(error instanceof ApiError && error.status >= 400 && error.status < 500)
    submitError.value = getErrorMessage(error)
  } finally {
    if (submitRequest === request) submitting.value = false
  }
}

watch(() => props.id, load, { immediate: true })
onUnmounted(() => {
  window.clearInterval(timer)
  loadRequest?.abort()
  submitRequest?.abort()
})
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Bài luyện {{ attempt ? JlptLevel[attempt.level] : 'từ vựng' }}</h1>
      <RouterLink class="text-button" :to="{ name: 'mock-tests' }">Về danh sách bài luyện</RouterLink>
    </header>
    <AppLoading v-if="loading" label="Đang tải đề…" />
    <section v-else-if="loadError" class="vocab-card">
      <p class="error" role="alert">{{ loadError }}</p>
      <button class="text-button" type="button" @click="load(id)">Tải lại đề</button>
    </section>
    <form v-else-if="attempt" @submit.prevent="confirming = true">
      <div class="attempt-status">
        <span>Đã chọn {{ answered }} / {{ attempt.questions.length }} câu</span>
        <strong role="timer">Còn {{ clock }}</strong>
      </div>
      <p v-if="remaining === 0 && !uncertain" class="error" role="status">Phiên làm bài đã hết thời gian.</p>
      <fieldset v-for="(question, index) in attempt.questions" :key="index" class="vocab-card question"
        :disabled="questionControlsDisabled">
        <legend>{{ index + 1 }}. <strong lang="ja">{{ question.word }}</strong></legend>
        <p class="reading pronunciation-line">
          <span lang="ja">{{ question.reading }}</span>
          <PronunciationButton v-if="!questionControlsDisabled"
            :text="question.word" :reading="question.reading" />
        </p>
        <label v-for="(option, optionIndex) in question.choices" :key="optionIndex">
          <input type="radio" :name="`question-${index}`" :checked="choices[index] === optionIndex"
            @change="choose(index, optionIndex)" />
          {{ option }}
        </label>
      </fieldset>
      <p v-if="submitError" class="error" role="alert">{{ submitError }}</p>
      <div v-if="(confirming && remaining > 0) || submitting || uncertain" class="vocab-card confirmation">
        <p v-if="uncertain">Bạn có thể gửi lại bộ câu trả lời vừa nộp.</p>
        <p v-else-if="!submitting">Nộp {{ answered }} / {{ attempt.questions.length }} câu đã chọn?</p>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Đang nộp…' : uncertain ? 'Gửi lại' : 'Xác nhận nộp' }}
        </button>
        <button v-if="!submitting && !uncertain" type="button" class="text-button" @click="confirming = false">Làm tiếp</button>
      </div>
      <button v-else-if="remaining > 0" type="submit" class="primary-button">Nộp bài</button>
      <RouterLink v-else class="text-button" :to="{ name: 'mock-tests' }">Chọn bài luyện mới</RouterLink>
    </form>
  </main>
</template>

<style scoped>
.attempt-status {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 0;
  margin-bottom: 12px;
  background: #f1ede2;
}
.question { min-width: 0; margin: 0 0 16px; }
.question legend { padding: 0 6px; }
.question legend strong { font-size: 1.25rem; }
.question label { display: flex; align-items: start; gap: 8px; padding: 6px 0; overflow-wrap: anywhere; }
.question input { flex: none; accent-color: #1e2a4a; }
.confirmation button + button { margin-left: 12px; }
</style>
