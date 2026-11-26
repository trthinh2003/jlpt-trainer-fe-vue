<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import CatalogReviewAction from '@/features/catalog/components/CatalogReviewAction.vue'
import { useCatalogReview } from '@/features/catalog/composables/useCatalogReview'
import { getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import PronunciationButton from '@/shared/components/PronunciationButton.vue'
import { CardType } from '@/shared/types/api'
import { audioLessonsApi } from '../api/audio-lessons.api'
import type { AudioLesson, AudioLessonWord, AudioPlayback } from '../types'
import AudioLyricPlayer from './AudioLyricPlayer.vue'

const props = defineProps<{ lesson: AudioLesson }>()
const controller = new AbortController()
const playback = ref<AudioPlayback>()
const playerError = ref('')
const loading = ref(false)
const finished = ref(false)
const words = ref<AudioLessonWord[]>()
const wordsLoading = ref(false)
const wordsError = ref('')
let resumeAtMs = 0
const review = useCatalogReview({
  cardType: () => CardType.Vocab,
  visibleIds: () => words.value?.map(word => word.id) ?? [],
  canSelectPage: () => !wordsLoading.value,
  onMissing: () => { void loadWords() },
})
const { error: reviewError } = review

async function loadPlayback(): Promise<void> {
  if (loading.value) return
  loading.value = true
  playerError.value = ''
  playback.value = undefined
  try {
    const result = await audioLessonsApi.playback(props.lesson.id, controller.signal)
    if (!controller.signal.aborted) playback.value = result
  } catch (cause) {
    if (!controller.signal.aborted) playerError.value = getErrorMessage(cause)
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function audioError(positionMs: number): void {
  resumeAtMs = positionMs
  playerError.value = 'Chưa phát được audio. Hãy tải lại để tiếp tục.'
}

async function loadWords(): Promise<void> {
  if (wordsLoading.value) return
  wordsLoading.value = true
  wordsError.value = ''
  try {
    const result = await audioLessonsApi.words(props.lesson.id, controller.signal)
    if (!controller.signal.aborted) words.value = result
  } catch (cause) {
    if (!controller.signal.aborted) wordsError.value = getErrorMessage(cause)
  } finally {
    if (!controller.signal.aborted) wordsLoading.value = false
  }
}

function audioEnded(): void {
  if (finished.value) return
  finished.value = true
  void loadWords()
}

onUnmounted(() => controller.abort())
void loadPlayback()
</script>

<template>
  <section class="vocab-card audio-player" aria-label="Trình phát bài nghe">
    <h2>{{ lesson.title }}</h2>
    <AppLoading v-if="loading" compact label="Đang tải bài nghe…" />
    <div v-if="playerError" role="status">
      <p class="error">{{ playerError }}</p>
      <button class="text-button" type="button" @click="loadPlayback">Tải lại audio</button>
    </div>
    <AudioLyricPlayer v-if="playback" :title="lesson.title" :audio-url="playback.audioUrl"
      :cover-url="playback.coverUrl" :lyrics="playback.lyrics" :start-at-ms="resumeAtMs"
      @ended="audioEnded" @failed="audioError" />
    <section v-if="finished" class="word-section" aria-labelledby="audio-vocabulary">
      <h3 id="audio-vocabulary">Từ vựng trong bài</h3>
      <AppLoading v-if="wordsLoading" compact label="Đang tải từ vựng…" />
      <p v-else-if="wordsError" class="error">
        {{ wordsError }}
        <button type="button" class="text-button" @click="loadWords">Tải lại từ vựng</button>
      </p>
      <p v-else-if="!words?.length" class="muted">Các từ của bài nghe này đã được gỡ khỏi kho.</p>
      <ol v-else class="words">
        <li v-for="(word, index) in words" :key="word.id" :style="{ animationDelay: `${index * 180}ms` }">
          <div class="word-row">
            <div class="word-summary">
              <strong lang="ja">{{ word.word }}</strong>
              <span v-if="word.reading" class="word-reading" lang="ja">({{ word.reading }})</span>
              <span>{{ word.meaning }}</span>
            </div>
            <div class="word-actions">
              <PronunciationButton :text="word.word" :reading="word.reading" />
              <CatalogReviewAction :review="review" :item-id="word.id" :title="word.word" />
            </div>
          </div>
        </li>
      </ol>
      <p v-if="reviewError" class="error" role="alert">{{ reviewError }}</p>
    </section>
  </section>
</template>

<style scoped>
.audio-player { margin-bottom: 16px; }
.word-section { margin-top: 16px; }
.words { padding-inline-start: 2.1rem; }
.words li { border-bottom: 1px solid #e8dccf; padding: 7px 0 7px 5px; animation: reveal-word 230ms ease-out both; }
.words li::marker { color: #852229; font-weight: 700; font-variant-numeric: tabular-nums; }
.word-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 12px; }
.word-summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; overflow-wrap: anywhere; }
.word-summary strong { font-size: 1.12rem; }
.word-reading { color: #6b6558; }
.word-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
@keyframes reveal-word { from { opacity: 0; transform: translateY(8px); } }
@media (prefers-reduced-motion: reduce) { .words li { animation: none; } }
</style>
