<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue'
import AppLoading from '@/shared/components/AppLoading.vue'
import completionSound from '../assets/practice-complete.wav'
import { checkMemoryWriting, checkPracticeStroke, createStrokeGuide } from '../practice'
import type { KanjiPracticeMode, Stroke } from '../types'
import KanjiDrawingCanvas from './KanjiDrawingCanvas.vue'

const props = withDefaults(defineProps<{ character: string; mode?: KanjiPracticeMode }>(), { mode: 'guided' })
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const helpId = useId()
const model = shallowRef<{ status: 'loading' | 'missing' | 'error' } | { status: 'ready'; guide: Stroke[] }>({ status: 'loading' })
const strokes = shallowRef<Stroke[]>([])
const completionAudio = ref<HTMLAudioElement>()
const drawing = ref(false)
const feedback = ref<'direction' | 'trace' | 'memory' | ''>('')
const memory = computed(() => props.mode === 'memory')
const hintVisible = ref(false)
const allStrokesDrawn = computed(() => model.value.status === 'ready' && strokes.value.length === model.value.guide.length)
const complete = computed(() => allStrokesDrawn.value && !feedback.value)

watch([() => props.character, () => props.mode], async ([character], _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  model.value = { status: 'loading' }
  reset()
  hintVisible.value = false
  try {
    const { default: templates } = await import('../data/templates')
    if (stale) return
    const template = templates.find(([glyph]) => glyph === character.normalize('NFC'))
    model.value = template ? { status: 'ready', guide: createStrokeGuide(template) } : { status: 'missing' }
  } catch {
    if (!stale) model.value = { status: 'error' }
  }
}, { immediate: true })
onBeforeUnmount(() => completionAudio.value?.pause())

function submitStroke(stroke: Stroke): void {
  if (model.value.status !== 'ready' || allStrokesDrawn.value) return
  const guide = model.value.guide
  if (!memory.value) {
    const result = checkPracticeStroke(stroke, guide[strokes.value.length])
    if (result !== 'accepted') {
      feedback.value = result
      return
    }
  }

  strokes.value = [...strokes.value, stroke]
  feedback.value = ''
  if (!allStrokesDrawn.value) return
  if (memory.value && !checkMemoryWriting(strokes.value, guide)) {
    feedback.value = 'memory'
    return
  }
  const audio = completionAudio.value
  if (audio) {
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }
}

function undo(): void {
  strokes.value = strokes.value.slice(0, -1)
  feedback.value = ''
}

function reset(): void {
  strokes.value = []
  drawing.value = false
  feedback.value = ''
}
</script>

<template>
  <section class="kanji-practice" :aria-labelledby="titleId">
    <header class="practice-header">
      <h3 :id="titleId">
        <template v-if="memory">Viết theo nghĩa</template>
        <template v-else>Luyện viết <span lang="ja">{{ character }}</span></template>
      </h3>
      <button type="button" class="text-button" @click="emit('close')">Đóng luyện viết</button>
    </header>
    <AppLoading v-if="model.status === 'loading'" compact label="Đang tải mẫu nét…" />
    <p v-else-if="model.status === 'missing'" class="muted" role="status">Chữ này chưa có mẫu luyện viết.</p>
    <p v-else-if="model.status === 'error'" class="error" role="alert">Chưa tải được mẫu nét. Hãy tải lại trang để thử lại.</p>
    <div v-else-if="model.status === 'ready'" class="practice-workspace">
      <audio ref="completionAudio" :src="completionSound" preload="auto" hidden />
      <KanjiDrawingCanvas :strokes="strokes" :guide="!memory || hintVisible ? model.guide : undefined"
        :disabled="allStrokesDrawn" :label="memory ? 'Ô viết từ trí nhớ' : `Ô luyện viết ${character}`"
        :described-by="helpId" @stroke="submitStroke" @drawing="drawing = $event" />
      <div class="practice-status">
        <progress :value="strokes.length" :max="model.guide.length" aria-label="Tiến độ luyện viết" />
        <p :id="helpId" role="status" aria-atomic="true">
          <strong v-if="complete">Đã viết xong {{ model.guide.length }} nét.</strong>
          <template v-else-if="memory">
            <strong>{{ strokes.length }} / {{ model.guide.length }} nét</strong>
            <span v-if="feedback === 'memory'">Hãy thử lại và kiểm tra vị trí, thứ tự, hướng nét.</span>
            <span v-else-if="hintVisible">Đặt bút ở chấm xanh và đi theo mũi tên.</span>
            <span v-else>Viết chữ dựa vào nghĩa trên thẻ.</span>
          </template>
          <template v-else>
            <strong>Nét {{ strokes.length + 1 }} / {{ model.guide.length }}</strong>
            <span v-if="feedback === 'direction'">Thử lại theo hướng mũi tên, bắt đầu từ chấm xanh.</span>
            <span v-else-if="feedback === 'trace'">Thử lại nét này, đi sát đường mẫu từ chấm xanh.</span>
            <span v-else>Đặt bút ở chấm xanh, đi theo nét đang tô đậm.</span>
          </template>
        </p>
        <div class="practice-actions">
          <button v-if="memory" type="button" class="text-button" :disabled="drawing" @click="hintVisible = !hintVisible">
            {{ hintVisible ? 'Ẩn gợi ý' : 'Hiện gợi ý' }}
          </button>
          <button type="button" class="text-button" :disabled="!strokes.length || drawing" @click="undo">Lùi một nét</button>
          <button type="button" class="text-button" :disabled="(!strokes.length && !feedback) || drawing"
            @click="reset">Viết lại cả chữ</button>
        </div>
        <small class="muted">Mẫu nét từ
          <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener noreferrer">KanjiVG</a>
          · CC BY-SA 3.0</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kanji-practice { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e5ddd0; }
.practice-header, .practice-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.practice-header { justify-content: space-between; margin-bottom: 10px; }
.practice-header h3 { margin: 0; }
.practice-header button, .practice-actions button { min-height: 40px; }
.practice-workspace { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 12px 20px; }
.practice-status progress { display: block; width: min(100%, 180px); height: 8px; accent-color: #287673; }
.practice-status p { margin: 8px 0; }
.practice-status p span, .practice-status small { display: block; }
.practice-status small { margin-top: 8px; }
@media (max-width: 680px) {
  .practice-workspace { grid-template-columns: minmax(0, 1fr); }
  .practice-status { grid-row: 1; }
}
</style>
