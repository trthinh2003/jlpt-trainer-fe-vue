<script setup lang="ts">
import { ref, watch } from 'vue'
import { vocabApi } from '../api/vocab.api'

const props = defineProps<{ vocabId: string; word: string }>()
const url = ref('')
const loading = ref(false)
const failed = ref(false)
const attempt = ref(0)

watch([() => props.vocabId, attempt], async ([id], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  failed.value = false
  url.value = ''
  try {
    const result = await vocabApi.getImage(id, controller.signal)
    if (!controller.signal.aborted) url.value = result?.url ?? ''
  } catch {
    if (!controller.signal.aborted) failed.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

function imageFailed(): void {
  url.value = ''
  failed.value = true
}
</script>

<template>
  <p v-if="loading" class="muted image-status" role="status">Đang tải ảnh minh họa…</p>
  <p v-else-if="failed" class="muted image-status" role="status">
    Chưa tải được ảnh.
    <button type="button" class="text-button" @click="attempt += 1">Tải lại ảnh</button>
  </p>
  <img v-else-if="url" :src="url" :alt="`Ảnh minh họa cho ${word}`"
    class="vocab-image" referrerpolicy="no-referrer" decoding="async" @error="imageFailed" />
</template>

<style scoped>
.vocab-image {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 15rem;
  margin: 12px auto 0;
  border-radius: 12px;
  object-fit: contain;
}
.image-status { margin: 8px 0 0; font-size: .875rem; }
</style>
