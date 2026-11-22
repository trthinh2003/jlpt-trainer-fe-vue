<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, useSession } from '@/features/auth/store/session'
import CatalogImportPanel from '@/features/catalog/components/CatalogImportPanel.vue'
import CatalogNavigation from '@/features/catalog/components/CatalogNavigation.vue'
import CatalogReviewAction from '@/features/catalog/components/CatalogReviewAction.vue'
import CatalogReviewPanel from '@/features/catalog/components/CatalogReviewPanel.vue'
import { useCatalogPermission } from '@/features/catalog/composables/useCatalogPermission'
import { useCatalogReview } from '@/features/catalog/composables/useCatalogReview'
import type { CatalogImportResult } from '@/features/catalog/types'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import AppLoading from '@/shared/components/AppLoading.vue'
import { CardType, JlptLevel, type PagedResult } from '@/shared/types/api'
import { vocabApi } from '../api/vocab.api'
import type { Vocab } from '../types'

const router = useRouter()
const { currentUser } = useSession()
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const level = ref<JlptLevel | ''>('')
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const result = ref<PagedResult<Vocab> | null>(null)
const isLoading = ref(false)
const listError = ref('')
const actionError = ref('')
const { canManageCatalog, permissionError, loadCatalogPermission, refreshAfterForbidden } = useCatalogPermission()
const isSaving = ref(false)
const deletingId = ref<string | null>(null)
const review = useCatalogReview({
  cardType: () => CardType.Vocab,
  visibleIds: () => result.value?.items.filter(item => item.id !== deletingId.value).map(item => item.id) ?? [],
  canSelectPage: () => !isLoading.value && !listError.value && searchInput.value.trim() === search.value,
  onMissing: () => { void loadVocabs() },
})
const { adding, added, selected, addingBatch } = review
const showCreateForm = ref(false)
const editingVocab = ref<Vocab | null>(null)
const showEditor = computed(() => showCreateForm.value || editingVocab.value !== null)
const meaningInput = ref<HTMLInputElement | null>(null)
const showImport = ref(false)
const emptyContent = {
  meaning: '',
  exampleSentence: '',
  exampleSentenceMeaning: '',
}
const emptyCreateForm = { word: '', reading: '', level: JlptLevel.N5, ...emptyContent }
const createForm = reactive({ ...emptyCreateForm })
const editForm = reactive({ ...emptyContent })
const contentForm = computed(() => editingVocab.value ? editForm : createForm)
let listRequest: AbortController | undefined

async function loadVocabs(): Promise<void> {
  listRequest?.abort()
  const request = new AbortController()
  listRequest = request
  isLoading.value = true
  listError.value = ''
  try {
    const data = await vocabApi.getList({
      level: level.value === '' ? null : level.value,
      search: search.value,
      pageNumber: page.value,
      pageSize: 20,
    }, request.signal)
    if (!request.signal.aborted) {
      const lastPage = Math.max(1, data.totalPages)
      if (page.value > lastPage) page.value = lastPage
      else result.value = data
    }
  } catch (error) {
    if (!request.signal.aborted) listError.value = getErrorMessage(error)
  } finally {
    if (listRequest === request) isLoading.value = false
  }
}

watch(searchInput, (value, _, onCleanup) => {
  const timer = setTimeout(() => { search.value = value.trim() }, 250)
  onCleanup(() => clearTimeout(timer))
})
watch([level, search], () => { page.value = 1 })
watch([level, search, page], () => { void loadVocabs() }, { immediate: true })

onUnmounted(() => listRequest?.abort())

function handleForbidden(): void {
  closeEditor()
  showImport.value = false
  actionError.value = 'Bạn không có quyền thay đổi kho học liệu.'
  refreshAfterForbidden()
}

function handleCatalogWriteError(error: unknown): void {
  if (error instanceof ApiError && error.status === 403) handleForbidden()
  else actionError.value = getErrorMessage(error)
}

function refreshAfterImport(summary: CatalogImportResult): void {
  if (summary.successCount > 0) void loadVocabs()
}

function closeEditor(): void {
  showCreateForm.value = false
  editingVocab.value = null
  actionError.value = ''
}

function toggleCreateForm(): void {
  if (showCreateForm.value) {
    closeEditor()
    return
  }
  closeEditor()
  showCreateForm.value = true
}

async function openEditor(vocab: Vocab): Promise<void> {
  closeEditor()
  editingVocab.value = vocab
  Object.assign(editForm, {
    meaning: vocab.meaning,
    exampleSentence: vocab.exampleSentence ?? '',
    exampleSentenceMeaning: vocab.exampleSentenceMeaning ?? '',
  })
  await nextTick()
  meaningInput.value?.focus()
}

function clearSearch(): void {
  searchInput.value = ''
  search.value = ''
}

async function saveVocab(): Promise<void> {
  if (!canManageCatalog.value || isSaving.value) return
  const vocab = editingVocab.value
  const draft = contentForm.value
  const content = {
    meaning: draft.meaning.trim(),
    exampleSentence: draft.exampleSentence.trim() || null,
    exampleSentenceMeaning: draft.exampleSentenceMeaning.trim() || null,
  }
  const word = createForm.word.trim()
  const reading = createForm.reading.trim()
  if (!content.meaning || (!vocab && (!word || !reading))) {
    actionError.value = vocab ? 'Vui lòng nhập nghĩa.' : 'Vui lòng nhập từ, cách đọc và nghĩa.'
    return
  }
  isSaving.value = true
  actionError.value = ''
  try {
    if (vocab) {
      await vocabApi.updateContent(vocab.id, content)
    } else {
      await vocabApi.create({ word, reading, level: createForm.level, ...content })
      Object.assign(createForm, emptyCreateForm)
    }
    closeEditor()
    if (!vocab && page.value !== 1) page.value = 1
    else await loadVocabs()
  } catch (error) {
    handleCatalogWriteError(error)
  } finally {
    isSaving.value = false
  }
}

async function deleteVocab(vocab: Vocab): Promise<void> {
  if (!canManageCatalog.value || deletingId.value || isSaving.value || adding.value.has(vocab.id) ||
      (addingBatch.value && selected.value.has(vocab.id))) return
  if (!window.confirm(`Xóa từ "${vocab.word}" khỏi kho chung và bộ ôn liên quan?`)) return
  deletingId.value = vocab.id
  actionError.value = ''
  try {
    await vocabApi.delete(vocab.id)
    added.value.delete(vocab.id)
    selected.value.delete(vocab.id)
    await loadVocabs()
  } catch (error) {
    handleCatalogWriteError(error)
  } finally {
    deletingId.value = null
  }
}

async function logout(): Promise<void> {
  clearSession()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div class="brand">
        <img src="/jlpt-mark.svg" width="32" height="32" alt="" />
        <span>JLPT Trainer</span>
      </div>
      <div class="account">
        <RouterLink class="text-button" :to="{ name: 'review' }">Ôn tập</RouterLink>
        <RouterLink class="text-button" :to="{ name: 'dashboard' }">Tiến độ</RouterLink>
        <RouterLink class="text-button" :to="{ name: 'change-password' }">Đổi mật khẩu</RouterLink>
        <span>{{ currentUser?.displayName }}</span>
        <button class="text-button" type="button" @click="logout">Đăng xuất</button>
      </div>
    </header>

    <div class="content">
      <div class="page-heading">
        <div>
          <p class="eyebrow">TỪ VỰNG · 語彙</p>
          <h1>Kho từ vựng</h1>
          <p class="muted">Học và quản lý từ vựng theo cấp độ JLPT.</p>
        </div>
        <div v-if="canManageCatalog" class="catalog-actions">
          <button class="text-button" type="button" :aria-expanded="showImport" @click="showImport = !showImport">
            {{ showImport ? 'Đóng nhập Excel' : 'Nhập Excel' }}
          </button>
          <button class="primary-button create-toggle" type="button" :aria-expanded="showCreateForm"
            :disabled="isSaving || deletingId !== null" @click="toggleCreateForm">
            {{ showCreateForm ? 'Đóng form' : '+ Thêm từ' }}
          </button>
        </div>
      </div>
      <CatalogNavigation />
      <p><RouterLink class="text-button" :to="{ name: 'mock-tests' }">Bài luyện từ vựng</RouterLink></p>
      <CatalogImportPanel v-if="canManageCatalog" v-show="showImport" kind="vocab"
        @imported="refreshAfterImport" @forbidden="handleForbidden" />

      <form v-if="showEditor && canManageCatalog" class="create-panel" @submit.prevent="saveVocab">
        <h2>{{ editingVocab ? `Sửa ${editingVocab.word} (${editingVocab.reading})` : 'Thêm từ vựng' }}</h2>
        <div class="form-grid">
          <template v-if="!editingVocab">
            <div class="field"><label for="word">Từ *</label><input id="word" v-model="createForm.word" maxlength="100" required /></div>
            <div class="field"><label for="reading">Cách đọc *</label><input id="reading" v-model="createForm.reading" maxlength="100" required /></div>
            <div class="field"><label for="create-level">Cấp độ</label>
              <select id="create-level" v-model.number="createForm.level">
                <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
              </select>
            </div>
          </template>
          <div class="field"><label for="meaning">Nghĩa *</label><input id="meaning" ref="meaningInput" v-model="contentForm.meaning" maxlength="500" required /></div>
          <div class="field"><label for="example">Ví dụ</label><input id="example" v-model="contentForm.exampleSentence" /></div>
          <div class="field"><label for="example-meaning">Nghĩa ví dụ</label><input id="example-meaning" v-model="contentForm.exampleSentenceMeaning" /></div>
        </div>
        <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
        <div class="editor-actions">
          <button class="primary-button" type="submit" :disabled="isSaving">{{ isSaving ? 'Đang lưu...' : 'Lưu từ' }}</button>
          <button class="text-button" type="button" :disabled="isSaving" @click="closeEditor">Hủy</button>
        </div>
      </form>

      <div class="field search-field">
        <label for="vocab-search">Tìm từ hoặc cách đọc</label>
        <div class="search-controls">
          <input id="vocab-search" v-model="searchInput" type="text" maxlength="100" placeholder="Ví dụ 食べる hoặc たべる" />
          <button v-if="searchInput" class="text-button" type="button" @click="clearSearch">Xóa tìm kiếm</button>
        </div>
      </div>
      <div class="toolbar">
        <label for="level-filter">Cấp độ</label>
        <select id="level-filter" v-model.number="level">
          <option value="">Tất cả</option>
          <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
        </select>
        <span v-if="result" class="result-count">{{ result.totalCount }} từ</span>
      </div>
      <CatalogReviewPanel kind="vocab" :review="review" />

      <p v-if="actionError && !(showEditor && canManageCatalog)" class="error" role="alert">{{ actionError }}</p>
      <p v-if="permissionError" class="muted" role="status">
        Chưa tải được quyền quản lý kho.
        <button class="text-button" type="button" @click="loadCatalogPermission">Thử lại</button>
      </p>
      <p v-if="listError" class="error" role="alert">{{ listError }} <button class="text-button" @click="loadVocabs">Thử lại</button></p>
      <AppLoading v-else-if="isLoading && !result" label="Đang tải từ vựng…" />
      <AppLoading v-if="isLoading && result" compact label="Đang cập nhật danh sách…" />
      <p v-if="!listError && !isLoading && result?.items.length === 0" class="muted status">
        {{ search ? 'Không tìm thấy từ phù hợp.' : 'Chưa có từ vựng ở cấp độ này.' }}
      </p>
      <div v-if="result" class="vocab-list" :aria-busy="isLoading">
        <article v-for="vocab in result.items" :key="vocab.id" class="vocab-card">
          <div class="vocab-main">
            <div>
              <div class="word-line"><h2>{{ vocab.word }}</h2><span class="level-badge">N{{ vocab.level }}</span></div>
              <p class="reading">{{ vocab.reading }}</p>
              <p class="meaning">{{ vocab.meaning }}</p>
              <p v-if="vocab.exampleSentence" class="example">{{ vocab.exampleSentence }}<span v-if="vocab.exampleSentenceMeaning"> — {{ vocab.exampleSentenceMeaning }}</span></p>
            </div>
            <div class="vocab-actions">
              <CatalogReviewAction :review="review" :item-id="vocab.id" :title="vocab.word" :disabled="deletingId === vocab.id" />
              <button v-if="canManageCatalog" class="text-button" type="button"
                :disabled="isSaving || deletingId !== null || editingVocab?.id === vocab.id"
                @click="openEditor(vocab)"
              >Sửa</button>
              <button
                v-if="canManageCatalog" class="text-button danger" type="button"
                :disabled="deletingId !== null || isSaving || editingVocab?.id === vocab.id || adding.has(vocab.id) ||
                  (addingBatch && selected.has(vocab.id))"
                @click="deleteVocab(vocab)"
              >{{ deletingId === vocab.id ? 'Đang xóa...' : 'Xóa' }}</button>
            </div>
          </div>
        </article>
      </div>

      <nav v-if="result && result.totalPages > 1" class="pagination" aria-label="Phân trang">
        <button type="button" :disabled="page <= 1 || isLoading" @click="page -= 1">Trước</button>
        <span>Trang {{ result.pageNumber }} / {{ result.totalPages }}</span>
        <button type="button" :disabled="page >= result.totalPages || isLoading" @click="page += 1">Sau</button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.vocab-actions { display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: flex-end; }
.catalog-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.editor-actions, .search-controls { display: flex; align-items: center; gap: 12px; }
.search-field { max-width: 540px; }
.search-controls input { flex: 1; min-width: 0; }
.search-controls button { flex-shrink: 0; }
@media (max-width: 620px) {
  .vocab-main { flex-direction: column; }
  .vocab-actions { justify-content: flex-start; }
}
</style>
