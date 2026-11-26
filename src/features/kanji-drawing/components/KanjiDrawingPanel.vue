<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import AppLoading from '@/shared/components/AppLoading.vue'
import { findKanjiCandidates } from '../recognition'
import type { Stroke } from '../types'
import KanjiDrawingCanvas from './KanjiDrawingCanvas.vue'

const emit = defineEmits<{ choose: [character: string] }>()
const strokes = shallowRef<Stroke[]>([])
const drawing = ref(false)
const recognitionDelayMs = 450
const recognition = shallowRef<
  { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; suggestions: string[] }
>({ status: 'idle' })

watch([strokes, drawing], ([completed, active], _, onCleanup) => {
  recognition.value = { status: 'idle' }
  if (active || !completed.length) return

  let stale = false
  const timer = window.setTimeout(async () => {
    recognition.value = { status: 'loading' }
    try {
      const { default: templates } = await import('../data/templates')
      if (!stale) recognition.value = { status: 'ready', suggestions: findKanjiCandidates(completed, templates) }
    } catch {
      if (!stale) recognition.value = { status: 'error' }
    }
  }, recognitionDelayMs)

  onCleanup(() => {
    stale = true
    window.clearTimeout(timer)
  })
})
</script>

<template>
  <section id="kanji-drawing-panel" class="create-panel drawing-panel" aria-labelledby="kanji-drawing-title">
    <h2 id="kanji-drawing-title">Vẽ Kanji để tra</h2>
    <p id="kanji-drawing-help" class="muted">Viết từng nét. Gợi ý tự hiện khi bạn dừng vẽ.</p>
    <div class="drawing-workspace">
      <KanjiDrawingCanvas :strokes="strokes" label="Ô vẽ Kanji" described-by="kanji-drawing-help"
        @stroke="strokes = [...strokes, $event]" @drawing="drawing = $event" />
      <div class="drawing-results">
        <div class="drawing-actions">
          <button type="button" class="text-button" :disabled="!strokes.length || drawing"
            @click="strokes = strokes.slice(0, -1)">Hoàn tác nét</button>
          <button type="button" class="text-button" :disabled="!strokes.length || drawing"
            @click="strokes = []">Xóa nét vẽ</button>
        </div>
        <p class="muted">{{ strokes.length }} nét</p>
        <AppLoading v-if="recognition.status === 'loading'" compact label="Đang tìm chữ Kanji…" />
        <p v-else-if="recognition.status === 'error'" class="error" role="alert">Chưa tải được mẫu Kanji. Hãy tải lại trang để thử lại.</p>
        <div v-else-if="recognition.status === 'ready'" aria-live="polite">
          <template v-if="recognition.suggestions.length">
            <p class="suggestion-label">Chọn chữ bạn muốn học</p>
            <div class="suggestions">
              <button v-for="character in recognition.suggestions" :key="character" type="button"
                :aria-label="`Học chữ ${character}`" @click="emit('choose', character)">
                <span lang="ja">{{ character }}</span>
              </button>
            </div>
          </template>
          <p v-else class="muted">Chưa tìm thấy chữ gần giống. Thử dùng đúng số nét hoặc vẽ lại rõ hơn.</p>
        </div>
        <small class="muted drawing-credit">Mẫu nét N5–N3 từ
          <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener noreferrer">KanjiVG</a>
          · CC BY-SA 3.0</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.drawing-panel { margin-top: 12px; margin-bottom: 16px; }
.drawing-panel h2 { margin-top: 0; }
.drawing-workspace { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); align-items: start; gap: 14px 24px; }
.drawing-actions, .suggestions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.drawing-results p { margin: 10px 0; }
.suggestion-label { font-weight: 650; }
.suggestions button {
  min-width: 48px;
  min-height: 48px;
  padding: 4px 8px;
  border: 1px solid #cfc3b3;
  border-radius: 8px;
  background: #fffdf8;
  color: #263650;
  font: inherit;
  font-size: 1.45rem;
  cursor: pointer;
}
.suggestions button:hover { border-color: #984141; }
.drawing-credit { display: block; margin-top: 14px; }
@media (max-width: 680px) {
  .drawing-workspace { grid-template-columns: minmax(0, 1fr); }
}
</style>
