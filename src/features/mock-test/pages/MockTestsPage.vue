<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/shared/api/http'
import { JlptLevel, type PagedResult } from '@/shared/types/api'
import { mockTestApi } from '../api/mock-test.api'
import type { MockTestSummary } from '../types'

const router = useRouter()
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const level = ref(JlptLevel.N5)
const questionCount = ref(10)
const starting = ref(false)
const startError = ref('')
const loading = ref(false)
const historyError = ref('')
const history = ref<PagedResult<MockTestSummary> | null>(null)
const dates = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const controller = new AbortController()

async function start(): Promise<void> {
  if (starting.value) return
  starting.value = true
  startError.value = ''
  try {
    const attempt = await mockTestApi.start(level.value, questionCount.value, controller.signal)
    if (!controller.signal.aborted) await router.push({ name: 'mock-test-attempt', params: { id: attempt.id } })
  } catch (error) {
    if (!controller.signal.aborted) startError.value = getErrorMessage(error)
  } finally {
    starting.value = false
  }
}

async function loadHistory(page = 1): Promise<void> {
  if (loading.value) return
  loading.value = true
  historyError.value = ''
  try {
    history.value = await mockTestApi.getHistory(page, controller.signal)
  } catch (error) {
    if (!controller.signal.aborted) historyError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onUnmounted(() => controller.abort())
void loadHistory()
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Bài luyện từ vựng</h1>
      <nav class="study-links" aria-label="Điều hướng học tập">
        <RouterLink class="text-button" :to="{ name: 'vocabs' }">Kho từ vựng</RouterLink>
        <RouterLink class="text-button" :to="{ name: 'dashboard' }">Tiến độ</RouterLink>
      </nav>
    </header>

    <section class="vocab-card">
      <h2>Tạo bài luyện</h2>
      <p class="muted">Bạn có 15 phút làm bài. Số câu thực tế tùy vào lượng từ vựng của cấp đã chọn.</p>
      <form @submit.prevent="start">
        <div class="form-grid">
          <div class="field">
            <label for="quiz-level">Cấp độ</label>
            <select id="quiz-level" v-model="level" :disabled="starting">
              <option v-for="item in levels" :key="item" :value="item">{{ JlptLevel[item] }}</option>
            </select>
          </div>
          <div class="field">
            <label for="question-count">Số câu</label>
            <input id="question-count" v-model.number="questionCount" type="number" min="1" max="50" required
              :disabled="starting" />
          </div>
        </div>
        <p v-if="startError" class="error" role="alert">{{ startError }}</p>
        <button class="primary-button" type="submit" :disabled="starting">
          {{ starting ? 'Đang tạo bài…' : 'Bắt đầu' }}
        </button>
      </form>
    </section>

    <section class="vocab-card history">
      <h2>Lịch sử làm bài</h2>
      <p v-if="loading" class="muted" role="status">Đang tải lịch sử…</p>
      <template v-else-if="historyError">
        <p class="error" role="alert">{{ historyError }}</p>
        <button class="text-button" type="button" @click="loadHistory(history?.pageNumber)">Thử lại</button>
      </template>
      <p v-else-if="!history?.items.length" class="muted">Bạn chưa nộp bài luyện nào.</p>
      <ul v-else>
        <li v-for="item in history.items" :key="item.id">
          <RouterLink :to="{ name: 'mock-test-result', params: { id: item.id } }">
            {{ JlptLevel[item.level] }} · {{ dates.format(new Date(item.takenAt)) }}
          </RouterLink>
          <span>{{ item.correctAnswers }} / {{ item.totalQuestions }} câu đúng</span>
        </li>
      </ul>
      <nav v-if="history && history.totalPages > 1" class="pagination" aria-label="Phân trang lịch sử">
        <button type="button" :disabled="loading || history.pageNumber <= 1" @click="loadHistory(history.pageNumber - 1)">
          Trước
        </button>
        <span>{{ history.pageNumber }} / {{ history.totalPages }}</span>
        <button type="button" :disabled="loading || history.pageNumber >= history.totalPages" @click="loadHistory(history.pageNumber + 1)">
          Sau
        </button>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.study-links, .history li { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.history { margin-top: 16px; }
.history ul { list-style: none; padding: 0; margin: 0; }
.history li { justify-content: space-between; padding: 10px 0; border-top: 1px solid #ded8ca; }
</style>
