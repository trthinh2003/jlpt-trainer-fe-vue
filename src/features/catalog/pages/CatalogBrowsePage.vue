<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { reviewApi } from '@/features/review/api/review.api'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { JlptLevel, type PagedResult } from '@/shared/types/api'
import { catalogApi } from '../api/catalog.api'
import CatalogImportPanel from '../components/CatalogImportPanel.vue'
import CatalogNavigation from '../components/CatalogNavigation.vue'
import { useCatalogPermission } from '../composables/useCatalogPermission'
import { catalog, type CatalogBrowseItem, type CatalogImportResult } from '../types'

const props = defineProps<{ kind: 'kanji' | 'grammar' }>()
const metadata = computed(() => catalog[props.kind])
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const level = ref<JlptLevel | ''>('')
const page = ref(1)
const result = ref<PagedResult<CatalogBrowseItem> | null>(null)
const loading = ref(false)
const listError = ref('')
const actionError = ref('')
const showImport = ref(false)
const adding = ref(new Set<string>())
const added = ref(new Set<string>())
const { canManageCatalog, permissionError, loadCatalogPermission, refreshAfterForbidden } = useCatalogPermission()
let listRequest: AbortController | undefined
let reviewRequest = new AbortController()

async function load(): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  loading.value = true
  listError.value = ''
  try {
    const data = await catalogApi.getList(props.kind, level.value, page.value, request.signal)
    if (!request.signal.aborted) {
      const lastPage = Math.max(1, data.totalPages)
      if (page.value > lastPage) page.value = lastPage
      else result.value = data
    }
  } catch (error) {
    if (!request.signal.aborted) listError.value = getErrorMessage(error)
  } finally {
    if (listRequest === request) loading.value = false
  }
}

function handleForbidden(): void {
  showImport.value = false
  actionError.value = 'Bạn không có quyền thay đổi kho học liệu.'
  refreshAfterForbidden()
}

function refreshAfterImport(summary: CatalogImportResult): void {
  if (summary.successCount > 0) void load()
}

async function addToReview(item: CatalogBrowseItem): Promise<void> {
  if (adding.value.has(item.id) || added.value.has(item.id)) return
  const { signal } = reviewRequest
  adding.value.add(item.id)
  actionError.value = ''
  try {
    await reviewApi.add(metadata.value.cardType, item.id, signal)
    if (!signal.aborted) added.value.add(item.id)
  } catch (error) {
    if (signal.aborted) return
    if (error instanceof ApiError && error.status === 409) added.value.add(item.id)
    else actionError.value = getErrorMessage(error)
  } finally {
    if (!signal.aborted) adding.value.delete(item.id)
  }
}

watch(() => props.kind, () => {
  reviewRequest.abort()
  reviewRequest = new AbortController()
  result.value = null
  showImport.value = false
  actionError.value = ''
  adding.value.clear()
  added.value.clear()
  page.value = 1
})
watch(level, () => { page.value = 1 })
watch([() => props.kind, level, page], load, { immediate: true })
onUnmounted(() => {
  listRequest?.abort()
  reviewRequest.abort()
})
</script>

<template>
  <main class="content">
    <header class="page-heading">
      <h1>Kho {{ metadata.label.toLowerCase() }}</h1>
      <button v-if="canManageCatalog" class="primary-button" type="button" :aria-expanded="showImport"
        @click="showImport = !showImport">{{ showImport ? 'Đóng nhập Excel' : 'Nhập Excel' }}</button>
    </header>
    <CatalogNavigation />
    <CatalogImportPanel v-if="canManageCatalog" v-show="showImport" :key="kind" :kind="kind"
      @imported="refreshAfterImport" @forbidden="handleForbidden" />
    <div class="toolbar">
      <label for="catalog-level">Cấp độ</label>
      <select id="catalog-level" v-model.number="level">
        <option value="">Tất cả</option>
        <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
      </select>
      <span v-if="result" class="result-count">{{ result.totalCount }} mục</span>
    </div>
    <p v-if="permissionError" class="muted" role="status">
      Chưa tải được quyền quản lý kho.
      <button class="text-button" type="button" @click="loadCatalogPermission">Thử lại</button>
    </p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-if="listError" class="error" role="alert">
      {{ listError }} <button class="text-button" type="button" @click="load">Tải lại danh sách</button>
    </p>
    <AppLoading v-if="loading" :compact="result !== null" label="Đang tải học liệu…" />
    <p v-if="!loading && result?.items.length === 0" class="muted status">Chưa có học liệu ở cấp độ này.</p>
    <div v-if="result" class="vocab-list" :aria-busy="loading">
      <article v-for="item in result.items" :key="item.id" class="vocab-card">
        <div class="catalog-item">
          <div>
            <div class="word-line"><h2 lang="ja">{{ item.title }}</h2><span class="level-badge">N{{ item.level }}</span></div>
            <p v-if="item.reading" class="reading" lang="ja">{{ item.reading }}</p>
            <p v-if="item.detail" class="muted">{{ item.detail }}</p>
            <p class="meaning">{{ item.meaning }}</p>
            <p v-if="item.example" class="example">
              <span lang="ja">{{ item.example }}</span><span v-if="item.exampleMeaning"> — {{ item.exampleMeaning }}</span>
            </p>
          </div>
          <button class="text-button" type="button" :disabled="adding.has(item.id) || added.has(item.id)"
            @click="addToReview(item)">
            {{ added.has(item.id) ? 'Đã có trong bộ ôn' : adding.has(item.id) ? 'Đang thêm…' : 'Thêm vào bộ ôn' }}
          </button>
        </div>
      </article>
    </div>
    <nav v-if="result && result.totalPages > 1" class="pagination" aria-label="Phân trang học liệu">
      <button type="button" :disabled="page <= 1 || loading" @click="page -= 1">Trước</button>
      <span>Trang {{ result.pageNumber }} / {{ result.totalPages }}</span>
      <button type="button" :disabled="page >= result.totalPages || loading" @click="page += 1">Sau</button>
    </nav>
  </main>
</template>

<style scoped>
.catalog-item { display: flex; align-items: start; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; }
.catalog-item h2 { overflow-wrap: anywhere; }
.catalog-item p { overflow-wrap: anywhere; }
</style>
