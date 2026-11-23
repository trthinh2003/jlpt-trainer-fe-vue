<script setup lang="ts">
import { computed } from 'vue'
import PronunciationButton from '@/shared/components/PronunciationButton.vue'

const props = defineProps<{ character: string; onYomi?: string | null; kunYomi?: string | null }>()
const readings = computed(() => [
  { label: 'On', text: props.onYomi?.trim() ?? '' },
  { label: 'Kun', text: props.kunYomi?.trim() ?? '' },
].filter(reading => reading.text))

function spokenReading(reading: string): string {
  // Dictionary dots mark the kana ending. Hyphens mark a reading used in compounds.
  return reading.replace(/[.．\-－]/g, '').replace(/[・／/]/g, '、')
}
</script>

<template>
  <p v-for="reading in readings" :key="reading.label" class="reading pronunciation-line">
    <span>Âm {{ reading.label }} <span lang="ja">{{ reading.text }}</span></span>
    <PronunciationButton :text="spokenReading(reading.text)"
      :label="`âm ${reading.label} của ${character}`" />
  </p>
</template>
