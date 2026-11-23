<script setup lang="ts">
import PronunciationButton from './PronunciationButton.vue'

defineProps<{ sentence: string; translation?: string | null }>()
</script>

<template>
  <div v-if="sentence.trim()" class="example">
    <div class="pronunciation-line">
      <span lang="ja">{{ sentence }}</span>
      <PronunciationButton :text="sentence" />
    </div>
    <p v-if="translation" class="example-translation">{{ translation }}</p>
  </div>
</template>

<style scoped>
.example { white-space: pre-line; overflow-wrap: anywhere; }
.example-translation { margin: 4px 0 0; }
</style>
