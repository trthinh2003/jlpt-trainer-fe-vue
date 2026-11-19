<script setup lang="ts">
import { onUnmounted, ref, useId } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { downloadBlob } from '@/shared/download'
import { catalogApi } from '../api/catalog.api'
import { catalog, type CatalogImportResult, type CatalogKind } from '../types'

const props = defineProps<{ kind: CatalogKind }>()
const emit = defineEmits<{ imported: [CatalogImportResult]; forbidden: [] }>()
const fileInputId = useId()
const maxBytes = 5 * 1024 * 1024
const controller = new AbortController()
const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const importing = ref(false)
const downloading = ref(false)
const errorMessage = ref('')
const downloadError = ref('')
const result = ref<CatalogImportResult | null>(null)

function selectFile(event: Event): void {
  const input = event.target as HTMLInputElement
  const candidate = input.files?.item(0)
  file.value = null
  result.value = null
  errorMessage.value = ''
  if (!candidate) return

  if (!candidate.name.toLowerCase().endsWith('.xlsx') || candidate.size === 0 || candidate.size > maxBytes) {
    errorMessage.value = 'Chọn file .xlsx có dữ liệu và dung lượng tối đa 5 MB.'
    input.value = ''
    return
  }
  file.value = candidate
}

async function downloadTemplate(): Promise<void> {
  if (downloading.value) return
  downloading.value = true
  downloadError.value = ''
  try {
    const blob = await catalogApi.getTemplate(props.kind, controller.signal)
    if (!controller.signal.aborted) downloadBlob(blob, catalog[props.kind].template)
  } catch (error) {
    if (!controller.signal.aborted) downloadError.value = getErrorMessage(error)
  } finally {
    downloading.value = false
  }
}

async function submit(): Promise<void> {
  if (!file.value || importing.value) return
  importing.value = true
  result.value = null
  errorMessage.value = ''
  try {
    const summary = await catalogApi.import(props.kind, file.value, controller.signal)
    if (controller.signal.aborted) return
    result.value = summary
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    emit('imported', summary)
  } catch (error) {
    if (controller.signal.aborted) return
    if (error instanceof ApiError && error.status === 403) emit('forbidden')
    else if (error instanceof ApiError && error.status === 413) errorMessage.value = 'File vượt giới hạn tải lên.'
    else errorMessage.value = getErrorMessage(error)
  } finally {
    importing.value = false
  }
}

onUnmounted(() => controller.abort())
</script>

<template>
  <section class="create-panel import-panel">
    <header>
      <h2>Nhập {{ catalog[kind].label.toLowerCase() }} từ Excel</h2>
      <button class="text-button" type="button" :disabled="downloading" @click="downloadTemplate">
        {{ downloading ? 'Đang tải mẫu…' : 'Tải file mẫu' }}
      </button>
    </header>
    <p v-if="downloadError" class="error" role="alert">{{ downloadError }}</p>
    <form @submit.prevent="submit" :aria-busy="importing">
      <div class="field">
        <label :for="fileInputId">File Excel (.xlsx, tối đa 5 MB)</label>
        <input :id="fileInputId" ref="fileInput" type="file" accept=".xlsx" :disabled="importing" @change="selectFile" />
        <p class="muted">Giữ tên cột ở dòng đầu và đặt dữ liệu trong trang tính đầu tiên.</p>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="importing || !file">Nhập học liệu</button>
    </form>
    <AppLoading v-if="importing" compact label="Đang nhập học liệu…" />
    <div v-if="result" class="import-summary">
      <p role="status">
        Đã nhập <strong>{{ result.successCount }}</strong> / {{ result.totalRows }} dòng
        · {{ result.skippedDuplicateCount }} dòng trùng · {{ result.errors.length }} dòng lỗi
      </p>
      <div v-if="result.errors.length" class="import-errors" tabindex="0" role="region" aria-label="Lỗi theo dòng Excel">
        <table>
          <thead><tr><th scope="col">Dòng Excel</th><th scope="col">Lỗi</th></tr></thead>
          <tbody>
            <tr v-for="error in result.errors" :key="error.rowNumber">
              <td>{{ error.rowNumber }}</td><td>{{ error.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.import-panel header { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 8px 16px; }
.import-panel h2 { margin: 0 0 12px; }
.import-panel input { max-width: 100%; }
.import-panel .field p { margin: 0; font-size: 0.85rem; }
.import-summary { margin-top: 16px; }
.import-errors { max-height: 18rem; overflow: auto; }
.import-errors table { width: 100%; border-collapse: collapse; text-align: left; }
.import-errors th, .import-errors td { padding: 8px 10px; border-bottom: 1px solid #e1d8ca; }
.import-errors th { position: sticky; top: 0; background: #f1ede2; white-space: nowrap; }
.import-errors td { overflow-wrap: anywhere; }
</style>
