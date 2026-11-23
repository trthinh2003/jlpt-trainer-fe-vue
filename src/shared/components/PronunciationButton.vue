<script lang="ts">
let stopActiveSpeech: (() => void) | undefined
let lastVoiceUri: string | undefined
const speech = typeof window === 'undefined' ? undefined : window.speechSynthesis
speech?.getVoices()
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ text: string; reading?: string | null; label?: string }>()
const spokenText = computed(() => props.reading?.trim() || props.text.trim())
const label = computed(() => props.label ?? props.text)
const isPlaying = ref(false)
const feedback = ref('')
let stopOwnSpeech: (() => void) | undefined

function toggleSpeech(): void {
  feedback.value = ''
  if (stopOwnSpeech) {
    stopOwnSpeech()
    return
  }
  if (!speech || typeof SpeechSynthesisUtterance === 'undefined') {
    feedback.value = 'Trình duyệt này chưa hỗ trợ phát âm.'
    return
  }

  const voices = speech.getVoices().filter(voice => /^ja(?:-|$)/i.test(voice.lang))
  const lastVoiceIndex = voices.findIndex(voice => voice.voiceURI === lastVoiceUri)
  const voice = lastVoiceIndex < 0
    ? voices.find(item => item.default) ?? voices[0]
    : voices[(lastVoiceIndex + 1) % voices.length]
  if (!voice) {
    feedback.value = 'Chưa tìm thấy giọng tiếng Nhật. Hãy kiểm tra cài đặt giọng đọc rồi thử lại.'
    return
  }

  stopActiveSpeech?.()
  const utterance = new SpeechSynthesisUtterance(spokenText.value)
  utterance.voice = voice
  utterance.lang = voice.lang
  function clearPlayback(): void {
    stopActiveSpeech = undefined
    stopOwnSpeech = undefined
    isPlaying.value = false
  }
  function stop(): void {
    clearPlayback()
    speech?.cancel()
  }
  function finish(error?: SpeechSynthesisErrorEvent): void {
    if (stopOwnSpeech !== stop) return
    clearPlayback()
    if (error && error.error !== 'canceled' && error.error !== 'interrupted') {
      feedback.value = 'Chưa phát được âm thanh. Hãy thử lại.'
    }
  }
  utterance.onend = () => finish()
  utterance.onerror = finish
  stopActiveSpeech = stop
  stopOwnSpeech = stop
  isPlaying.value = true
  lastVoiceUri = voice.voiceURI
  speech.speak(utterance)
}

watch([spokenText, label], () => {
  stopOwnSpeech?.()
  feedback.value = ''
})
onBeforeUnmount(() => stopOwnSpeech?.())
</script>

<template>
  <span v-if="spokenText" class="pronunciation">
    <button
      class="pronunciation-button" type="button"
      :aria-label="isPlaying ? `Dừng đọc ${label}` : `Nghe ${props.label ?? `phát âm ${text}`}`"
      :title="isPlaying ? 'Dừng đọc' : 'Nghe phát âm'"
      @click="toggleSpeech"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
        stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <rect v-if="isPlaying" x="6" y="6" width="12" height="12" rx="2" />
        <template v-else>
          <path d="M3 9v6h4l5 4V5L7 9H3z" />
          <path d="M15.5 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" />
        </template>
      </svg>
    </button>
    <span class="pronunciation-feedback" role="status">{{ feedback }}</span>
  </span>
</template>

<style scoped>
.pronunciation { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.pronunciation-button {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid #e8dccf;
  border-radius: 8px;
  background: #fffdf8;
  color: #852229;
  cursor: pointer;
}
.pronunciation-button:hover { background: #f3eee4; }
.pronunciation-button:focus-visible { outline: 2px solid #1e2a4a; outline-offset: 2px; }
.pronunciation-feedback { color: #852229; font-size: .8rem; }
.pronunciation-feedback:empty { position: absolute; }
</style>
