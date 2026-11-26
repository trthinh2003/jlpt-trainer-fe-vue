<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { AudioLessonWord, LyricLine } from '../types'
import AudioLyricText from './AudioLyricText.vue'

const props = defineProps<{
  title: string
  audioUrl: string
  coverUrl?: string
  lyrics: LyricLine[]
  startAtMs?: number
}>()
const emit = defineEmits<{ ended: []; failed: [positionMs: number] }>()
const player = ref<HTMLAudioElement>()
const lyricBox = ref<HTMLElement>()
const captionLines = ref<HTMLElement>()
const lyricProgress = ref<HTMLProgressElement>()
const lyrics = computed(() => props.lyrics.map(line => {
  const [text, ...support] = line.text.split('\n')
  return { startMs: line.startMs, text, support: support.filter(Boolean), links: line.links }
}))
const failed = ref(false)
const coverFailed = ref(false)
const durationMs = ref(0)
const activeLyric = ref(-1)
const currentLyric = computed(() => activeLyric.value < 0 ? undefined : lyrics.value[activeLyric.value])
const ready = ref(false)
const lookupWord = ref<AudioLessonWord>()
const closeButton = ref<HTMLButtonElement>()
let lookupTrigger: HTMLElement | undefined
let positionMs = 0
let frame: number | undefined

watch(activeLyric, (index, previous) => {
  if (captionLines.value?.scrollTop) captionLines.value.scrollTop = 0

  const box = lyricBox.value
  if (!box) return
  const line = box.querySelector('[aria-current="true"]')?.closest('li')
  if (!line) {
    box.scrollTo({ top: 0, behavior: 'instant' })
    return
  }

  const top = line.offsetTop
  const height = line.offsetHeight
  const viewportTop = box.scrollTop
  const viewportHeight = box.clientHeight
  const center = top + height / 2 - viewportTop
  const fullyVisible = top >= viewportTop && top + height <= viewportTop + viewportHeight
  const jumped = player.value?.seeking === true || Math.abs(index - previous) > 1
  if (!jumped && fullyVisible && center >= viewportHeight * .25 && center <= viewportHeight * .75) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  box.scrollTo({
    top: top - (viewportHeight - height) / 2,
    behavior: jumped || !fullyVisible || reduceMotion ? 'instant' : 'smooth',
  })
}, { flush: 'post' })

function updateTime(): void {
  if (!ready.value || !player.value) return
  positionMs = Math.round(player.value.currentTime * 1000)
  const lines = lyrics.value
  const next = lines.findIndex(line => line.startMs > positionMs)
  activeLyric.value = next < 0 ? lines.length - 1 : next - 1

  if (!lyricProgress.value) return
  const line = currentLyric.value
  const endMs = lines[activeLyric.value + 1]?.startMs ?? durationMs.value
  lyricProgress.value.value = line && endMs > line.startMs
    ? Math.min(1, Math.max(0, (positionMs - line.startMs) / (endMs - line.startMs)))
    : 0
}

function startClock(): void {
  if (frame !== undefined || !player.value || player.value.paused || player.value.ended) return
  updateTime()
  frame = requestAnimationFrame(() => {
    frame = undefined
    startClock()
  })
}

function stopClock(): void {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
}

function updateDuration(): void {
  const duration = player.value?.duration ?? 0
  durationMs.value = Number.isFinite(duration) ? duration * 1000 : 0
}

function onMetadata(): void {
  if (!player.value) return
  updateDuration()
  if (props.startAtMs && durationMs.value > 0) {
    player.value.currentTime = Math.min(props.startAtMs, durationMs.value) / 1000
  }
  ready.value = true
  updateTime()
}

function seek(startMs: number): void {
  if (!player.value || !canSeek(startMs)) return
  player.value.currentTime = startMs / 1000
  updateTime()
}

function canSeek(startMs: number): boolean {
  return ready.value && (durationMs.value <= 0 || startMs <= durationMs.value)
}

async function showWord(word: AudioLessonWord, event: MouseEvent): Promise<void> {
  player.value?.pause()
  lookupTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
  lookupWord.value = word
  await nextTick()
  closeButton.value?.focus()
}

function closeLookup(): void {
  lookupWord.value = undefined
  if (lookupTrigger?.isConnected) lookupTrigger.focus()
  lookupTrigger = undefined
}

function audioError(): void {
  stopClock()
  ready.value = false
  failed.value = true
  emit('failed', positionMs)
}

function audioEnded(): void {
  stopClock()
  updateTime()
  emit('ended')
}

function timestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const wholeTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const milliseconds = ms % 1000
  return milliseconds ? `${wholeTime}.${String(milliseconds).padStart(3, '0').replace(/0+$/, '')}` : wholeTime
}

onUnmounted(stopClock)
</script>

<template>
  <div>
    <div class="listening-stage" :class="{ 'cover-missing': !coverUrl || coverFailed }">
      <div class="caption">
        <div ref="captionLines" class="caption-lines">
          <p v-if="currentLyric?.text" class="caption-japanese" lang="ja">
            <AudioLyricText v-if="currentLyric.links?.length" :text="currentLyric.text"
              :links="currentLyric.links" @lookup="showWord" />
            <template v-else>{{ currentLyric.text }}</template>
          </p>
          <p v-else-if="!failed" class="caption-idle">{{ ready ? '♪' : 'Đang tải audio…' }}</p>
          <p v-for="(line, index) in currentLyric?.support" :key="index" class="caption-support">{{ line }}</p>
        </div>
        <progress ref="lyricProgress" class="caption-progress" max="1" value="0" aria-label="Tiến độ dòng lời"></progress>
      </div>
      <div v-if="coverUrl && !coverFailed" class="cover-frame">
        <img :src="coverUrl" :alt="`Ảnh bìa ${title}`"
          referrerpolicy="no-referrer" @error="coverFailed = true" />
      </div>
      <audio v-if="!failed" ref="player" :src="audioUrl" :aria-label="title" controls
        preload="metadata" @timeupdate="updateTime" @seeking="updateTime" @seeked="updateTime"
        @durationchange="updateDuration"
        @loadedmetadata="onMetadata" @playing="startClock" @pause="stopClock" @waiting="stopClock"
        @ended="audioEnded" @error="audioError" />
    </div>
    <section v-if="lookupWord" class="lyric-lookup" aria-label="Tra từ trong lời" @keydown.esc="closeLookup">
      <div>
        <strong lang="ja">{{ lookupWord.word }}</strong>
        <span lang="ja">（{{ lookupWord.reading }}）</span>
        <p>{{ lookupWord.meaning }}</p>
      </div>
      <button ref="closeButton" type="button" class="text-button" @click="closeLookup">Đóng tra từ</button>
    </section>
    <ol ref="lyricBox" class="lyrics" aria-label="Lời tiếng Nhật">
      <li v-for="(line, index) in lyrics" :key="line.startMs" class="lyric-row"
        :class="{ active: index === activeLyric, seekable: canSeek(line.startMs) }" @click="seek(line.startMs)">
        <button type="button" class="lyric-time" :aria-current="index === activeLyric ? 'true' : undefined"
          :aria-label="`Tua đến ${timestamp(line.startMs)}, ${line.text || 'nhạc nền'}`"
          :disabled="!canSeek(line.startMs)" @click.stop="seek(line.startMs)">
          {{ timestamp(line.startMs) }}
        </button>
        <AudioLyricText v-if="line.links?.length" :text="line.text" :links="line.links" @lookup="showWord" />
        <span v-else lang="ja">{{ line.text || '♪' }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.listening-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .78fr);
  align-items: center;
  gap: 20px;
  padding: clamp(14px, 3vw, 30px);
  border-radius: 14px;
  color: #fff7ea;
  background: radial-gradient(ellipse at top right, #55405c 0%, transparent 65%),
    linear-gradient(145deg, #202842, #322631);
}
.caption { min-width: 0; height: clamp(164px, 22vw, 218px); display: grid; grid-template-rows: minmax(0, 1fr) auto; }
.caption-lines { overflow: auto; align-content: safe center; scrollbar-width: thin; }
.cover-missing .caption { grid-column: 1 / -1; }
.caption p { margin: 0; overflow-wrap: anywhere; }
.caption-japanese { font-size: clamp(1.3rem, 3vw, 2.1rem); font-weight: 750; line-height: 1.5; }
.caption-japanese { --lyric-word-color: #ffcb9f; }
.caption .caption-support { color: #e7d8d7; font-size: .975rem; margin-top: 4px; }
.caption-idle { color: #e7d8d7; }
.caption-progress { appearance: none; width: 100%; height: 5px; border: 0; border-radius: 6px; overflow: hidden; margin-top: 16px; background: #574b62; color: #f3b786; }
.caption-progress::-webkit-progress-bar { background: #574b62; }
.caption-progress::-webkit-progress-value { background: #f3b786; }
.caption-progress::-moz-progress-bar { background: #f3b786; }
.cover-frame { margin: 0; border: 5px solid #f3e5de; border-radius: 10px; overflow: hidden; background: #2b2636; box-shadow: 0 8px 23px #16152192; }
.cover-frame img { display: block; width: 100%; height: clamp(130px, 23vw, 240px); object-fit: contain; }
audio { display: block; width: 100%; grid-column: 1 / -1; }
.lyrics { position: relative; max-height: 220px; overflow-y: auto; overscroll-behavior: contain; margin: 12px 0 0; padding: 8px; border-radius: 10px; background: #f1ede2; list-style: none; }
.lyric-row { display: grid; grid-template-columns: 4.25rem minmax(0, 1fr); gap: 6px; align-items: start; padding: 9px 10px; border-radius: 8px; color: #514c41; overflow-wrap: anywhere; }
.lyric-row.active { background: #fffdf8; color: #852229; }
.lyric-row.seekable, .lyric-time:not(:disabled) { cursor: pointer; }
.lyric-time { justify-self: start; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: .825rem; font-variant-numeric: tabular-nums; }
.lyric-lookup { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: start; gap: 4px 12px; margin-top: 10px; padding: 10px 12px; border: 1px solid #ded0c0; border-radius: 10px; background: #fffdf8; overflow-wrap: anywhere; }
.lyric-lookup p { margin: 3px 0 0; }
@media (max-width: 620px) {
  .listening-stage { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .caption { height: 150px; grid-row: 2; }
  .cover-missing .caption { grid-row: 1; }
  .cover-frame { grid-row: 1; }
  .cover-frame img { height: 145px; }
  .lyrics { max-height: 170px; }
}
</style>
