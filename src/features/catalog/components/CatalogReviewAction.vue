<script setup lang="ts">
import type { CatalogReview } from '../composables/useCatalogReview'

const props = defineProps<{ review: CatalogReview; itemId: string; title: string; disabled?: boolean }>()
const { selecting, selected, adding, added, canSelectItem, addOne } = props.review
</script>

<template>
  <label v-if="selecting && !adding.has(itemId) && !added.has(itemId)" class="review-choice">
    <input v-model="selected" type="checkbox" :value="itemId" :aria-label="`Chọn ${title}`"
      :disabled="disabled || !canSelectItem(itemId)" />
    Chọn
  </label>
  <button v-else class="text-button" type="button" :disabled="disabled || adding.has(itemId) || added.has(itemId)"
    @click="addOne(itemId, title)">
    {{ added.has(itemId) ? 'Đã có trong bộ ôn' : adding.has(itemId) ? 'Đang thêm…' : 'Thêm vào bộ ôn' }}
  </button>
</template>

<style scoped>
.review-choice { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; }
.review-choice input { width: 18px; height: 18px; margin: 0; accent-color: #1e2a4a; }
</style>
