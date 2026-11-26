<script setup lang="ts">
import { computed } from 'vue'
import type { AudioLessonWord, LyricWordLink } from '../types'

const props = defineProps<{ text: string; links: LyricWordLink[] }>()
const emit = defineEmits<{ lookup: [word: AudioLessonWord, event: MouseEvent] }>()

const parts = computed(() => {
  const result: { text: string; word?: AudioLessonWord }[] = []
  let offset = 0
  for (const link of props.links) {
    if (link.start > offset) result.push({ text: props.text.slice(offset, link.start) })
    offset = link.start + link.length
    result.push({ text: props.text.slice(link.start, offset), word: link.word })
  }
  if (offset < props.text.length) result.push({ text: props.text.slice(offset) })
  return result
})
</script>

<template>
  <span lang="ja">
    <template v-for="(part, index) in parts" :key="index">
      <button v-if="part.word" type="button" class="lyric-word" :aria-label="`Tra từ ${part.text}`"
        @click.stop="emit('lookup', part.word, $event)">{{ part.text }}</button>
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.lyric-word {
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--lyric-word-color, #852229);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: .18em;
  cursor: pointer;
}
</style>
