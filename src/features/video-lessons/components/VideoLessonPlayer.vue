<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { videoLessonsApi, type VideoLesson } from '../api/video-lessons.api'

const props = defineProps<{ lesson: VideoLesson }>()
const controller = new AbortController()
const player = ref<HTMLVideoElement>()
const url = ref('')
const loading = ref(false)
const error = ref('')
const unavailable = ref(false)
let position = 0

async function loadVideo(): Promise<void> {
  loading.value = true
  error.value = ''
  url.value = ''
  try {
    const result = await videoLessonsApi.playback(props.lesson.id, controller.signal)
    if (!controller.signal.aborted) url.value = result.url
  } catch (cause) {
    if (controller.signal.aborted) return
    unavailable.value = cause instanceof ApiError && cause.status === 404
    error.value = unavailable.value ? 'Bài học đã được gỡ.' : getErrorMessage(cause)
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function rememberPosition(): void {
  const current = player.value?.currentTime
  if (current !== undefined && Number.isFinite(current)) position = current
}

function restorePosition(): void {
  if (player.value && position > 0) player.value.currentTime = Math.min(position, player.value.duration)
}

function playbackError(): void {
  rememberPosition()
  url.value = ''
  error.value = 'Video không phát được. Hãy tải lại để tiếp tục.'
}

onUnmounted(() => controller.abort())
void loadVideo()
</script>

<template>
  <section class="vocab-card video-lesson-player" aria-label="Trình phát bài học">
    <h2>{{ lesson.title }}</h2>
    <p v-if="lesson.description" class="lesson-description">{{ lesson.description }}</p>
    <AppLoading v-if="loading" compact label="Đang tải video…" />
    <div v-else-if="error">
      <p class="error" role="status">{{ error }}</p>
      <button v-if="!unavailable" class="text-button" type="button" @click="loadVideo">Tải lại video</button>
    </div>
    <video v-else-if="url" ref="player" :src="url" :aria-label="lesson.title"
      controls playsinline preload="metadata" @error="playbackError"
      @timeupdate="rememberPosition" @loadedmetadata="restorePosition" />
  </section>
</template>

<style scoped>
.video-lesson-player { margin-bottom: 16px; }
.video-lesson-player h2, .lesson-description { overflow-wrap: anywhere; }
.lesson-description { white-space: pre-wrap; }
video { display: block; width: 100%; max-height: min(55vh, 550px); background: #171612; border-radius: 10px; }
</style>
