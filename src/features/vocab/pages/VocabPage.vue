<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, useSession } from '@/features/auth/store/session'
import { reviewApi } from '@/features/review/api/review.api'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import { CardType, JlptLevel, type PagedResult } from '@/shared/types/api'
import { vocabApi } from '../api/vocab.api'
import type { Vocab } from '../types'

const router = useRouter()
const { currentUser } = useSession()
const levels = [JlptLevel.N5, JlptLevel.N4, JlptLevel.N3, JlptLevel.N2, JlptLevel.N1]
const level = ref<JlptLevel | ''>('')
const page = ref(1)
const result = ref<PagedResult<Vocab> | null>(null)
const isLoading = ref(false)
const listError = ref('')
const actionError = ref('')
const isSaving = ref(false)
const deletingId = ref<string | null>(null)
const addingToReview = ref(new Set<string>())
const inReview = ref(new Set<string>())
const reviewError = ref('')
const showCreateForm = ref(false)
const form = reactive({
  word: '',
  reading: '',
  meaning: '',
  exampleSentence: '',
  exampleSentenceMeaning: '',
  level: JlptLevel.N5,
})
let requestId = 0

async function loadVocabs(): Promise<void> {
  const currentRequest = ++requestId
  isLoading.value = true
  listError.value = ''
  try {
    const data = await vocabApi.getList({
      level: level.value === '' ? null : level.value,
      pageNumber: page.value,
      pageSize: 20,
    })
    if (currentRequest === requestId) {
      const lastPage = Math.max(1, data.totalPages)
      if (page.value > lastPage) page.value = lastPage
      else result.value = data
    }
  } catch (error) {
    if (currentRequest === requestId) listError.value = getErrorMessage(error)
  } finally {
    if (currentRequest === requestId) isLoading.value = false
  }
}

watch(level, () => { page.value = 1 })
watch([level, page], () => { void loadVocabs() }, { immediate: true })

async function createVocab(): Promise<void> {
  if (!form.word.trim() || !form.reading.trim() || !form.meaning.trim()) {
    actionError.value = 'Vui lòng nhập từ, cách đọc và nghĩa.'
    return
  }
  isSaving.value = true
  actionError.value = ''
  try {
    await vocabApi.create({
      word: form.word.trim(),
      reading: form.reading.trim(),
      meaning: form.meaning.trim(),
      exampleSentence: form.exampleSentence.trim() || null,
      exampleSentenceMeaning: form.exampleSentenceMeaning.trim() || null,
      level: form.level,
    })
    Object.assign(form, {
      word: '', reading: '', meaning: '',
      exampleSentence: '', exampleSentenceMeaning: '', level: JlptLevel.N5,
    })
    showCreateForm.value = false
    if (page.value !== 1) page.value = 1
    else await loadVocabs()
  } catch (error) {
    actionError.value = getErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

async function deleteVocab(vocab: Vocab): Promise<void> {
  if (deletingId.value || addingToReview.value.has(vocab.id)) return
  if (!window.confirm(`Xóa từ "${vocab.word}" khỏi kho chung và bộ ôn liên quan?`)) return
  deletingId.value = vocab.id
  actionError.value = ''
  try {
    await vocabApi.delete(vocab.id)
    inReview.value.delete(vocab.id)
    await loadVocabs()
  } catch (error) {
    actionError.value = getErrorMessage(error)
  } finally {
    deletingId.value = null
  }
}

async function addToReview(vocab: Vocab): Promise<void> {
  if (deletingId.value === vocab.id || addingToReview.value.has(vocab.id) || inReview.value.has(vocab.id)) return
  addingToReview.value.add(vocab.id)
  reviewError.value = ''
  try {
    await reviewApi.add(CardType.Vocab, vocab.id)
    inReview.value.add(vocab.id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) inReview.value.add(vocab.id)
    else reviewError.value = `Không thể thêm “${vocab.word}” vào bộ ôn. ${getErrorMessage(error)}`
  } finally {
    addingToReview.value.delete(vocab.id)
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
        <button class="primary-button create-toggle" type="button" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Đóng' : '+ Thêm từ' }}
        </button>
      </div>

      <form v-if="showCreateForm" class="create-panel" @submit.prevent="createVocab">
        <h2>Thêm từ vựng</h2>
        <div class="form-grid">
          <div class="field"><label for="word">Từ *</label><input id="word" v-model="form.word" required /></div>
          <div class="field"><label for="reading">Cách đọc *</label><input id="reading" v-model="form.reading" required /></div>
          <div class="field"><label for="meaning">Nghĩa *</label><input id="meaning" v-model="form.meaning" required /></div>
          <div class="field"><label for="create-level">Cấp độ</label>
            <select id="create-level" v-model.number="form.level">
              <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
            </select>
          </div>
          <div class="field"><label for="example">Ví dụ</label><input id="example" v-model="form.exampleSentence" /></div>
          <div class="field"><label for="example-meaning">Nghĩa ví dụ</label><input id="example-meaning" v-model="form.exampleSentenceMeaning" /></div>
        </div>
        <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
        <button class="primary-button" type="submit" :disabled="isSaving">{{ isSaving ? 'Đang lưu...' : 'Lưu từ' }}</button>
      </form>

      <div class="toolbar">
        <label for="level-filter">Cấp độ</label>
        <select id="level-filter" v-model.number="level">
          <option value="">Tất cả</option>
          <option v-for="item in levels" :key="item" :value="item">N{{ item }}</option>
        </select>
        <span v-if="result" class="result-count">{{ result.totalCount }} từ</span>
      </div>

      <p v-if="actionError && !showCreateForm" class="error" role="alert">{{ actionError }}</p>
      <p v-if="reviewError" class="error" role="alert">{{ reviewError }}</p>
      <p v-if="listError" class="error" role="alert">{{ listError }} <button class="text-button" @click="loadVocabs">Thử lại</button></p>
      <p v-else-if="isLoading" class="muted status">Đang tải từ vựng...</p>
      <p v-else-if="result?.items.length === 0" class="muted status">Chưa có từ vựng ở cấp độ này.</p>
      <div v-else-if="result" class="vocab-list">
        <article v-for="vocab in result.items" :key="vocab.id" class="vocab-card">
          <div class="vocab-main">
            <div>
              <div class="word-line"><h2>{{ vocab.word }}</h2><span class="level-badge">N{{ vocab.level }}</span></div>
              <p class="reading">{{ vocab.reading }}</p>
              <p class="meaning">{{ vocab.meaning }}</p>
              <p v-if="vocab.exampleSentence" class="example">{{ vocab.exampleSentence }}<span v-if="vocab.exampleSentenceMeaning"> — {{ vocab.exampleSentenceMeaning }}</span></p>
            </div>
            <div class="vocab-actions">
              <button
                class="text-button" type="button"
                :disabled="inReview.has(vocab.id) || addingToReview.has(vocab.id) || deletingId === vocab.id"
                @click="addToReview(vocab)"
              >{{ inReview.has(vocab.id) ? 'Đã có trong bộ ôn' : addingToReview.has(vocab.id) ? 'Đang thêm...' : 'Thêm vào bộ ôn' }}</button>
              <button
                class="text-button danger" type="button" :disabled="deletingId !== null || addingToReview.has(vocab.id)"
                @click="deleteVocab(vocab)"
              >{{ deletingId === vocab.id ? 'Đang xóa...' : 'Xóa' }}</button>
            </div>
          </div>
        </article>
      </div>

      <nav v-if="result && result.totalPages > 1" class="pagination" aria-label="Phân trang">
        <button type="button" :disabled="page <= 1 || isLoading" @click="page -= 1">Trước</button>
        <span>Trang {{ page }} / {{ result.totalPages }}</span>
        <button type="button" :disabled="page >= result.totalPages || isLoading" @click="page += 1">Sau</button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.vocab-actions { display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: flex-end; }
@media (max-width: 620px) {
  .vocab-main { flex-direction: column; }
  .vocab-actions { justify-content: flex-start; }
}
</style>
