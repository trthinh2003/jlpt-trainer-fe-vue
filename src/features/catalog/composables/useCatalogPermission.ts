import { onUnmounted, ref } from 'vue'
import { authApi } from '@/features/auth/api/auth.api'

export function useCatalogPermission() {
  const canManageCatalog = ref(false)
  const permissionError = ref(false)
  let request: AbortController | undefined

  async function loadCatalogPermission(): Promise<void> {
    request?.abort()
    const current = new AbortController()
    request = current
    permissionError.value = false
    try {
      const account = await authApi.getCurrentAccount(current.signal)
      if (!current.signal.aborted) canManageCatalog.value = account.canManageCatalog
    } catch {
      if (!current.signal.aborted) {
        canManageCatalog.value = false
        permissionError.value = true
      }
    }
  }

  function refreshAfterForbidden(): void {
    canManageCatalog.value = false
    void loadCatalogPermission()
  }

  onUnmounted(() => request?.abort())
  void loadCatalogPermission()
  return { canManageCatalog, permissionError, loadCatalogPermission, refreshAfterForbidden }
}
