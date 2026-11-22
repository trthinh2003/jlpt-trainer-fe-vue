import { computed, onUnmounted, ref, watch } from 'vue'
import { reviewApi, type ReviewCardAddition } from '@/features/review/api/review.api'
import { ApiError, getErrorMessage } from '@/shared/api/http'
import type { CardType } from '@/shared/types/api'

export const reviewSelectionLimit = 20

interface CatalogReviewOptions {
  cardType: () => CardType
  visibleIds: () => string[]
  canSelectPage: () => boolean
  onMissing: () => void
}

export function useCatalogReview(options: CatalogReviewOptions) {
  const selecting = ref(false)
  const selected = ref(new Set<string>())
  const adding = ref(new Set<string>())
  const added = ref(new Set<string>())
  const addingBatch = ref(false)
  const batchResult = ref<ReviewCardAddition | null>(null)
  const error = ref('')
  const selectableOnPage = computed(() => options.visibleIds().filter(id => !adding.value.has(id) && !added.value.has(id)))
  const unselectedOnPage = computed(() => selectableOnPage.value.filter(id => !selected.value.has(id)))
  const pageSelected = computed(() => selectableOnPage.value.length > 0 && unselectedOnPage.value.length === 0)
  const canTogglePage = computed(() => options.canSelectPage() && !addingBatch.value && selectableOnPage.value.length > 0 &&
    selected.value.size + unselectedOnPage.value.length <= reviewSelectionLimit)
  let controller = new AbortController()

  function toggleSelection(): void {
    selecting.value = !selecting.value
    if (!selecting.value) selected.value.clear()
    batchResult.value = null
    error.value = ''
  }

  function togglePage(): void {
    if (!canTogglePage.value) return
    if (pageSelected.value) selectableOnPage.value.forEach(id => selected.value.delete(id))
    else unselectedOnPage.value.forEach(id => selected.value.add(id))
  }

  function canSelectItem(id: string): boolean {
    return options.canSelectPage() && !addingBatch.value &&
      (selected.value.has(id) || selected.value.size < reviewSelectionLimit)
  }

  async function addOne(id: string, title: string): Promise<void> {
    if (adding.value.has(id) || added.value.has(id)) return
    const { signal } = controller
    adding.value.add(id)
    error.value = ''
    try {
      await reviewApi.add(options.cardType(), id, signal)
      if (!signal.aborted) added.value.add(id)
    } catch (cause) {
      if (signal.aborted) return
      if (cause instanceof ApiError && cause.status === 409) added.value.add(id)
      else error.value = `Không thể thêm “${title}” vào bộ ôn. ${getErrorMessage(cause)}`
    } finally {
      if (!signal.aborted) adding.value.delete(id)
    }
  }

  async function addSelected(): Promise<void> {
    if (!selected.value.size || addingBatch.value) return
    const { signal } = controller
    addingBatch.value = true
    batchResult.value = null
    error.value = ''
    try {
      const response = await reviewApi.addBatch(options.cardType(), [...selected.value], signal)
      if (signal.aborted) return
      response.addedIds.forEach(id => added.value.add(id))
      response.alreadyAddedIds.forEach(id => added.value.add(id))
      selected.value.clear()
      batchResult.value = response
      if (response.missingIds.length) options.onMissing()
    } catch (cause) {
      if (!signal.aborted) error.value = getErrorMessage(cause)
    } finally {
      if (!signal.aborted) addingBatch.value = false
    }
  }

  watch(options.cardType, () => {
    controller.abort()
    controller = new AbortController()
    selecting.value = false
    selected.value.clear()
    adding.value.clear()
    added.value.clear()
    addingBatch.value = false
    batchResult.value = null
    error.value = ''
  })
  onUnmounted(() => controller.abort())

  return {
    selecting, selected, adding, added, addingBatch, batchResult, error, pageSelected, canTogglePage,
    toggleSelection, togglePage, canSelectItem, addOne, addSelected,
  }
}

export type CatalogReview = ReturnType<typeof useCatalogReview>
