<script setup lang="ts">
import { onUnmounted, ref, useId } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import { vocabApi } from '../api/vocab.api'
import type { Vocab } from '../types'
import VocabImagePreview from './VocabImagePreview.vue'

const props = defineProps<{ vocab: Vocab }>()
const emit = defineEmits<{ updated: [hasImage: boolean]; forbidden: [] }>()
const fieldId = useId()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File>()
const saving = ref(false)
const feedback = ref('')
const error = ref('')
const revision = ref(0)
const maxBytes = 5 * 1024 * 1024
let request: AbortController | undefined
onUnmounted(() => request?.abort())

function selectFile(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  feedback.value = ''
  error.value = file && (file.size === 0 || file.size > maxBytes)
    ? 'Chọn ảnh có dung lượng từ 1 byte đến 5 MB.'
    : ''
  selectedFile.value = error.value ? undefined : file
}

async function changeImage(file: File | null): Promise<void> {
  if (saving.value) return
  const controller = new AbortController()
  request = controller
  saving.value = true
  error.value = ''
  feedback.value = ''
  try {
    if (file) await vocabApi.uploadImage(props.vocab.id, file, controller.signal)
    else await vocabApi.removeImage(props.vocab.id, controller.signal)
    if (controller.signal.aborted) return
    feedback.value = file ? 'Đã lưu ảnh minh họa.' : 'Đã gỡ ảnh minh họa.'
    selectedFile.value = undefined
    if (fileInput.value) fileInput.value.value = ''
    revision.value += 1
    emit('updated', file !== null)
  } catch (cause) {
    if (controller.signal.aborted) return
    if (cause instanceof ApiError && cause.status === 403) emit('forbidden')
    else error.value = getErrorMessage(cause)
  } finally {
    if (!controller.signal.aborted) saving.value = false
  }
}
</script>

<template>
  <section class="create-panel" :aria-labelledby="`${fieldId}-heading`">
    <h2 :id="`${fieldId}-heading`">Ảnh minh họa · <span lang="ja">{{ vocab.word }}</span></h2>
    <VocabImagePreview v-if="vocab.hasImage" :key="revision" :vocab-id="vocab.id" :word="vocab.word" />
    <div class="field">
      <label :for="fieldId">Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB</label>
      <input :id="fieldId" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp"
        :disabled="saving" @change="selectFile" />
    </div>
    <div class="image-actions">
      <button type="button" class="primary-button" :disabled="saving || !selectedFile"
        @click="selectedFile && changeImage(selectedFile)">
        {{ saving ? 'Đang lưu…' : 'Lưu ảnh' }}
      </button>
      <button v-if="vocab.hasImage" type="button" class="text-button danger" :disabled="saving" @click="changeImage(null)">
        Gỡ ảnh
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="feedback" class="muted" role="status">{{ feedback }}</p>
  </section>
</template>

<style scoped>
.field { margin-top: 12px; }
.field input { width: 100%; }
.image-actions { display: flex; flex-wrap: wrap; gap: 8px 12px; }
</style>
