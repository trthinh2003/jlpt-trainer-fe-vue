<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, useSession } from '@/features/auth/store/session'
import { getErrorMessage } from '@/shared/api/http'
import { JlptLevel, type PagedResult } from '@/shared/types/api'
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
    if (currentRequest === requestId) result.value = data
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
  if (!window.confirm(`Xóa từ "${vocab.word}"?`)) return
  deletingId.value = vocab.id
  actionError.value = ''
  try {
    await vocabApi.delete(vocab.id)
    if (result.value?.items.length === 1 && page.value > 1) page.value -= 1
    else await loadVocabs()
  } catch (error) {
    actionError.value = getErrorMessage(error)
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
      <div class="brand"><span class="brand-mark">験</span><span>JLPT Trainer</span></div>
      <div class="account">
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
            <button class="text-button danger" type="button" :disabled="deletingId === vocab.id" @click="deleteVocab(vocab)">
              {{ deletingId === vocab.id ? 'Đang xóa...' : 'Xóa' }}
            </button>
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
