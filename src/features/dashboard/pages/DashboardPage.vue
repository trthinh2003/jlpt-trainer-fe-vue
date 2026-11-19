<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { CardType, JlptLevel } from '@/shared/types/api'
import { dashboardApi } from '../api/dashboard.api'
import type { HeatmapEntry, ProgressStats } from '../types'

const heatmapDays = 84
const cardTypes = [
  { value: CardType.Vocab, label: 'Từ vựng' },
  { value: CardType.Kanji, label: 'Kanji' },
  { value: CardType.Grammar, label: 'Ngữ pháp' },
]
const numbers = new Intl.NumberFormat('vi-VN')
const scores = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const dates = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'UTC' })
const loading = ref(true)
const errorMessage = ref('')
const heatmap = ref<HeatmapEntry[]>([])
const progress = ref<ProgressStats | null>(null)
const today = ref(new Date())
const selectedDate = ref('')
let activeRequest: AbortController | undefined

const reviewTotal = computed(() => heatmap.value.reduce((total, day) => total + day.reviewCount, 0))
const mastery = computed(() => cardTypes.map(({ value, label }) => {
  const stats = progress.value?.cardProgress.find((row) => row.cardType === value)
  return { value, label, total: stats?.totalCards ?? 0, mastered: stats?.masteredCount ?? 0 }
}))
const recentResults = computed(() => progress.value?.mockTestTrend.slice(-12).reverse() ?? [])
const days = computed(() => {
  const counts = new Map(heatmap.value.map(({ studyDate, reviewCount }) => [studyDate, reviewCount]))
  const end = today.value
  return Array.from({ length: heatmapDays }, (_, index) => {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + index - heatmapDays + 1))
    const key = date.toISOString().slice(0, 10)
    const count = counts.get(key) ?? 0
    return {
      key,
      count,
      intensity: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3,
      label: `${dates.format(date)} · ${numbers.format(count)} lượt ôn`,
    }
  })
})
const highlightedDay = computed(() => days.value.find((day) => day.key === selectedDate.value) ?? days.value.at(-1))

function moveHeatmapFocus(event: KeyboardEvent, index: number): void {
  const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
  const step = steps[event.key]
  if (step === undefined) return
  event.preventDefault()
  const next = Math.max(0, Math.min(index + step, days.value.length - 1))
  const cell = event.currentTarget as HTMLButtonElement
  const target = cell.parentElement?.children.item(next)
  if (target instanceof HTMLButtonElement) target.focus()
}

async function loadDashboard(): Promise<void> {
  activeRequest?.abort()
  const controller = new AbortController()
  activeRequest = controller
  loading.value = true
  errorMessage.value = ''
  try {
    const [activity, stats] = await Promise.all([
      dashboardApi.getHeatmap(heatmapDays, controller.signal),
      dashboardApi.getProgress(controller.signal),
    ])
    if (activeRequest !== controller) return
    today.value = new Date()
    heatmap.value = activity
    progress.value = stats
    selectedDate.value = ''
  } catch (error) {
    if (activeRequest === controller) errorMessage.value = getErrorMessage(error)
  } finally {
    controller.abort()
    if (activeRequest === controller) {
      loading.value = false
      activeRequest = undefined
    }
  }
}

onUnmounted(() => {
  activeRequest?.abort()
  activeRequest = undefined
})
void loadDashboard()
</script>

<template>
  <main class="app-page">
    <div class="content">
      <header class="page-heading">
        <h1>Tiến độ học</h1>
        <nav class="dashboard-nav" aria-label="Điều hướng học tập">
          <RouterLink class="text-button" :to="{ name: 'vocabs' }">Kho từ vựng</RouterLink>
          <RouterLink class="text-button" :to="{ name: 'review' }">Ôn tập</RouterLink>
          <RouterLink class="text-button" :to="{ name: 'mock-tests' }">Bài luyện</RouterLink>
        </nav>
      </header>

      <AppLoading v-if="loading" label="Đang tải tiến độ…" />
      <section v-else-if="errorMessage" class="vocab-card">
        <p class="error" role="alert">{{ errorMessage }}</p>
        <button class="text-button" type="button" @click="loadDashboard">Thử lại</button>
      </section>
      <div v-else class="dashboard-grid">
        <section class="vocab-card activity" aria-labelledby="activity-title">
          <h2 id="activity-title">Lịch ôn tập</h2>
          <p class="muted">{{ numbers.format(reviewTotal) }} lượt trong {{ heatmapDays }} ngày gần nhất (UTC)</p>
          <div class="heatmap" role="group" aria-label="Lượt ôn theo ngày. Dùng phím mũi tên để chuyển ngày.">
            <button
              v-for="(day, index) in days"
              :key="day.key"
              type="button"
              :title="day.label"
              :aria-label="day.label"
              :aria-pressed="highlightedDay?.key === day.key"
              :tabindex="highlightedDay?.key === day.key ? 0 : -1"
              :data-intensity="day.intensity"
              @focus="selectedDate = day.key"
              @click="selectedDate = day.key"
              @keydown="moveHeatmapFocus($event, index)"
            ></button>
          </div>
          <p class="day-detail" role="status">{{ highlightedDay?.label }}</p>
          <ul class="legend muted" aria-label="Chú giải số lượt ôn">
            <li><span data-intensity="0"></span>0</li>
            <li><span data-intensity="1"></span>1–2</li>
            <li><span data-intensity="2"></span>3–5</li>
            <li><span data-intensity="3"></span>6+</li>
          </ul>
        </section>

        <section class="vocab-card" aria-labelledby="mastery-title">
          <h2 id="mastery-title">Mức độ ghi nhớ</h2>
          <p class="muted">Thẻ thành thạo có ít nhất 3 lần ghi nhớ liên tiếp.</p>
          <ul class="metric-list">
            <li v-for="row in mastery" :key="row.value">
              <div class="metric-label">
                <strong>{{ row.label }}</strong>
                <span>{{ numbers.format(row.mastered) }} / {{ numbers.format(row.total) }} thẻ</span>
              </div>
              <progress :aria-label="`Thẻ thành thạo · ${row.label}`" :value="row.mastered" :max="row.total || 1"></progress>
            </li>
          </ul>
        </section>

        <section class="vocab-card" aria-labelledby="scores-title">
          <h2 id="scores-title">Điểm bài luyện</h2>
          <p v-if="!recentResults.length" class="muted">Bạn chưa có kết quả bài luyện.</p>
          <template v-else>
            <p class="muted">Điểm trung bình theo ngày UTC và cấp độ, tối đa 12 nhóm gần nhất.</p>
            <ol class="metric-list">
              <li v-for="row in recentResults" :key="`${row.takenDate}-${row.level}`">
                <div class="metric-label">
                  <strong>
                    {{ JlptLevel[row.level] }} ·
                    <time :datetime="row.takenDate">{{ dates.format(new Date(row.takenDate)) }}</time>
                  </strong>
                  <span>{{ scores.format(row.averageScore) }}% · {{ numbers.format(row.testCount) }} bài</span>
                </div>
                <meter :aria-label="`Điểm trung bình ${JlptLevel[row.level]} ngày ${dates.format(new Date(row.takenDate))}`"
                  min="0" max="100" :value="row.averageScore"></meter>
              </li>
            </ol>
          </template>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard-nav, .legend, .legend li, .metric-label { display: flex; align-items: center; gap: 12px; }
.dashboard-nav { flex-wrap: wrap; }
.dashboard-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.activity { grid-column: 1 / -1; }
.heatmap {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, auto);
  grid-auto-columns: minmax(0, 1fr);
  gap: clamp(3px, 1vw, 8px);
  max-width: 640px;
}
.heatmap button {
  aspect-ratio: 1.25;
  min-width: 0;
  padding: 0;
  border: 1px solid rgb(30 42 74 / 15%);
  border-radius: 3px;
}
.heatmap button:focus-visible { outline: 2px solid #1e2a4a; outline-offset: 1px; }
.heatmap button[aria-pressed="true"] { border-color: #1e2a4a; }
[data-intensity="0"] { background: #ebe4d7; }
[data-intensity="1"] { background: #efb8aa; }
[data-intensity="2"] { background: #c75c53; }
[data-intensity="3"] { background: #96242f; }
.day-detail { margin: 12px 0 8px; font-weight: 700; }
.legend, .metric-list { padding: 0; list-style: none; margin: 0; }
.legend li { gap: 4px; }
.legend span { width: 12px; height: 12px; border-radius: 2px; }
.metric-list { display: grid; gap: 16px; }
.metric-label { justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; }
progress, meter { width: 100%; accent-color: #96242f; }
@media (max-width: 620px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
