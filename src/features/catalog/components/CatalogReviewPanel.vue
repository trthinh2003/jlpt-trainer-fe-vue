<script setup lang="ts">
import AppLoading from '@/shared/components/AppLoading.vue'
import { reviewSelectionLimit, type CatalogReview } from '../composables/useCatalogReview'
import { catalog, type CatalogKind } from '../types'

const props = defineProps<{ kind: CatalogKind; review: CatalogReview }>()
const units = { vocab: 'từ', kanji: 'chữ', grammar: 'mẫu' } as const
const {
  selecting, selected, addingBatch, batchResult, error, pageSelected, canTogglePage,
  toggleSelection, togglePage, addSelected,
} = props.review
</script>

<template>
  <div class="review-selection">
    <button class="text-button" type="button" :aria-expanded="selecting" :disabled="addingBatch"
      @click="toggleSelection">
      {{ selecting ? 'Đóng chọn nhiều' : `Chọn nhiều ${kind === 'kanji' ? catalog[kind].label : catalog[kind].label.toLowerCase()}` }}
    </button>
    <div v-if="selecting" class="selection-panel">
      <div class="selection-actions">
        <span role="status">Đã chọn {{ selected.size }} / {{ reviewSelectionLimit }} {{ units[kind] }}</span>
        <button class="text-button" type="button" :disabled="!canTogglePage" @click="togglePage">
          {{ pageSelected ? 'Bỏ chọn trang này' : 'Chọn trang này' }}
        </button>
        <button class="text-button" type="button" :disabled="addingBatch || !selected.size"
          @click="selected.clear()">Bỏ chọn hết</button>
      </div>
      <button class="primary-button" type="button" :disabled="addingBatch || !selected.size" @click="addSelected">
        Thêm {{ units[kind] }} đã chọn vào bộ ôn
      </button>
      <AppLoading v-if="addingBatch" compact :label="`Đang thêm ${units[kind]} vào bộ ôn…`" />
      <p v-if="batchResult" class="batch-result" role="status">
        Đã thêm {{ batchResult.addedIds.length }} {{ units[kind] }}
        <span v-if="batchResult.alreadyAddedIds.length"> · {{ batchResult.alreadyAddedIds.length }} {{ units[kind] }} đã có trong bộ ôn</span>
        <span v-if="batchResult.missingIds.length"> · {{ batchResult.missingIds.length }} {{ units[kind] }} không còn trong kho</span>
      </p>
      <RouterLink v-if="batchResult && (batchResult.addedIds.length || batchResult.alreadyAddedIds.length)"
        class="text-button" :to="{ name: 'review' }">Mở Ôn tập</RouterLink>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.review-selection { margin-bottom: 18px; }
.selection-panel {
  display: grid;
  justify-items: start;
  gap: 10px;
  margin-top: 8px;
  padding: 12px;
  background: #faf8f2;
  border: 1px solid #d8cebf;
}
.selection-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.batch-result { margin: 0; }
</style>
