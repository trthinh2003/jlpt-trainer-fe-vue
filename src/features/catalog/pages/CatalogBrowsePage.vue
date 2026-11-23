<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import JapaneseExample from '@/shared/components/JapaneseExample.vue'
import { JlptLevel, type PagedResult } from '@/shared/types/api'
import { catalogApi } from '../api/catalog.api'
import CatalogImportPanel from '../components/CatalogImportPanel.vue'
import CatalogNavigation from '../components/CatalogNavigation.vue'
import CatalogReviewAction from '../components/CatalogReviewAction.vue'
import CatalogReviewPanel from '../components/CatalogReviewPanel.vue'
import KanjiReadings from '../components/KanjiReadings.vue'
import { useCatalogPermission } from '../composables/useCatalogPermission'
import { useCatalogReview } from '../composables/useCatalogReview'
import { catalog, type CatalogBrowseItem, type CatalogImportResult } from '../types'

const props = defineProps<{ kind: 'kanji' | 'grammar' }>()
const metadata = computed(() => catalog[props.kind])
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const level = ref<JlptLevel | ''>('')
const searchInput = ref('')
const search = ref('')
const searchLabel = computed(() => props.kind === 'kanji' ? 'Tìm chữ, cách đọc hoặc nghĩa' : 'Tìm mẫu câu hoặc nghĩa')
const page = ref(1)
const result = ref<PagedResult<CatalogBrowseItem> | null>(null)
const loading = ref(false)
const listError = ref('')
const actionError = ref('')
const showImport = ref(false)
const editing = ref<CatalogBrowseItem | null>(null)
const editorInput = ref<HTMLInputElement | null>(null)
const editError = ref('')
const saving = ref(false)
const review = useCatalogReview({
  cardType: () => metadata.value.cardType,
  visibleIds: () => result.value?.items.map(item => item.id) ?? [],
  canSelectPage: () => !loading.value && !listError.value && searchInput.value.trim() === search.value,
  onMissing: () => { void load() },
})
const { canManageCatalog, permissionError, loadCatalogPermission, refreshAfterForbidden } = useCatalogPermission()
let listRequest: AbortController | undefined
let editRequest: AbortController | undefined

async function load(): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  loading.value = true
  listError.value = ''
  try {
    const data = await catalogApi.getList(props.kind, {
      level: level.value, page: page.value, search: search.value,
    }, request.signal)
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
  editing.value = null
  actionError.value = 'Bạn không có quyền thay đổi kho học liệu.'
  refreshAfterForbidden()
}

async function edit(item: CatalogBrowseItem): Promise<void> {
  editing.value = { ...item, content: { ...item.content } }
  editError.value = ''
  await nextTick()
  editorInput.value?.focus()
}

async function save(): Promise<void> {
  const item = editing.value
  if (!item || !canManageCatalog.value || saving.value) return
  const meaning = item.content.meaning.trim()
  if (!meaning) {
    editError.value = 'Nhập nghĩa của học liệu.'
    return
  }
  const request = new AbortController()
  editRequest = request
  saving.value = true
  editError.value = ''

  try {
    await catalogApi.updateContent(item.id, { ...item.content, meaning }, request.signal)
    if (!request.signal.aborted) {
      editing.value = null
      void load()
    }
  } catch (error) {
    if (request.signal.aborted) return
    if (error instanceof ApiError && error.status === 403) handleForbidden()
    else editError.value = getErrorMessage(error)
  } finally {
    if (editRequest === request) saving.value = false
  }
}

function clearSearch(): void {
  searchInput.value = ''
  search.value = ''
}

function refreshAfterImport(summary: CatalogImportResult): void {
  if (summary.successCount > 0) void load()
}

watch(() => props.kind, () => {
  result.value = null
  showImport.value = false
  editing.value = null
  editRequest?.abort()
  saving.value = false
  clearSearch()
  actionError.value = ''
  page.value = 1
})
watch(searchInput, (value, _, onCleanup) => {
  const timer = setTimeout(() => { search.value = value.trim() }, 250)
  onCleanup(() => clearTimeout(timer))
})
watch([level, search], () => { page.value = 1 })
watch([() => props.kind, level, search, page], load, { immediate: true })
onUnmounted(() => {
  listRequest?.abort()
  editRequest?.abort()
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
    <form v-if="canManageCatalog && editing" class="create-panel" @submit.prevent="save">
      <h2>Sửa <span lang="ja">{{ editing.title }}</span></h2>
      <div class="form-grid">
        <div class="field">
          <label for="catalog-meaning">Nghĩa</label>
          <input id="catalog-meaning" ref="editorInput" v-model="editing.content.meaning" required maxlength="500" :disabled="saving" />
        </div>
        <template v-if="editing.content.kind === 'kanji'">
          <div class="field">
            <label for="catalog-onyomi">Âm On</label>
            <input id="catalog-onyomi" v-model="editing.content.onYomi" lang="ja" maxlength="200" :disabled="saving" />
          </div>
          <div class="field">
            <label for="catalog-kunyomi">Âm Kun</label>
            <input id="catalog-kunyomi" v-model="editing.content.kunYomi" lang="ja" maxlength="200" :disabled="saving" />
          </div>
        </template>
        <template v-else>
          <div class="field">
            <label for="catalog-example">Ví dụ tiếng Nhật</label>
            <input id="catalog-example" v-model="editing.content.exampleSentence" lang="ja" :disabled="saving" />
          </div>
          <div class="field">
            <label for="catalog-example-meaning">Nghĩa ví dụ</label>
            <input id="catalog-example-meaning" v-model="editing.content.exampleSentenceMeaning" :disabled="saving" />
          </div>
        </template>
      </div>
      <p v-if="editError" class="error" role="alert">{{ editError }}</p>
      <div class="catalog-actions">
        <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Đang lưu…' : 'Lưu' }}</button>
        <button class="text-button" type="button" :disabled="saving" @click="editing = null">Hủy</button>
      </div>
    </form>
    <div class="field search-field">
      <label for="catalog-search">{{ searchLabel }}</label>
      <div class="search-controls">
        <input id="catalog-search" v-model="searchInput" type="search" maxlength="100" />
        <button v-if="searchInput" class="text-button" type="button" @click="clearSearch">Xóa tìm kiếm</button>
      </div>
    </div>
    <div class="toolbar">
      <label for="catalog-level">Cấp độ</label>
      <select id="catalog-level" v-model.number="level">
        <option value="">Tất cả</option>
        <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
      </select>
      <span v-if="result" class="result-count">{{ result.totalCount }} mục</span>
    </div>
    <CatalogReviewPanel :kind="kind" :review="review" />
    <p v-if="permissionError" class="muted" role="status">
      Chưa tải được quyền quản lý kho.
      <button class="text-button" type="button" @click="loadCatalogPermission">Thử lại</button>
    </p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-if="listError" class="error" role="alert">
      {{ listError }} <button class="text-button" type="button" @click="load">Tải lại danh sách</button>
    </p>
    <AppLoading v-if="loading" :compact="result !== null" label="Đang tải học liệu…" />
    <p v-if="!loading && !listError && result?.items.length === 0" class="muted status">
      {{ search ? 'Không tìm thấy học liệu phù hợp.' : 'Chưa có học liệu ở cấp độ này.' }}
    </p>
    <div v-if="result" class="vocab-list" :aria-busy="loading">
      <article v-for="item in result.items" :key="item.id" class="vocab-card">
        <div class="catalog-item">
          <div>
            <div class="word-line"><h2 lang="ja">{{ item.title }}</h2><span class="level-badge">N{{ item.level }}</span></div>
            <KanjiReadings v-if="item.content.kind === 'kanji'" :character="item.title"
              :on-yomi="item.content.onYomi" :kun-yomi="item.content.kunYomi" />
            <p v-if="item.detail" class="muted">{{ item.detail }}</p>
            <p class="meaning">{{ item.content.meaning }}</p>
            <JapaneseExample v-if="item.content.kind === 'grammar' && item.content.exampleSentence"
              :sentence="item.content.exampleSentence" :translation="item.content.exampleSentenceMeaning" />
          </div>
          <div class="catalog-actions">
            <CatalogReviewAction :review="review" :item-id="item.id" :title="item.title" />
            <button v-if="canManageCatalog" class="text-button" type="button"
              :aria-label="`Sửa ${item.title}`" :disabled="saving || editing?.id === item.id" @click="edit(item)">Sửa</button>
          </div>
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
.catalog-actions, .search-controls { display: flex; align-items: center; gap: 12px; }
.catalog-actions { flex-wrap: wrap; }
.search-field { max-width: 540px; }
.search-controls input { flex: 1; min-width: 0; }
.search-controls button { flex-shrink: 0; }
</style>
