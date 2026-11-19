import { request } from '@/shared/api/http'
import type { GrammarPoint, JlptLevel, Kanji, PagedResult } from '@/shared/types/api'
import { catalog, type CatalogBrowseItem, type CatalogImportResult, type CatalogKind } from '../types'

export const catalogApi = {
  async getList(
    kind: 'kanji' | 'grammar', level: JlptLevel | '', page: number, signal: AbortSignal,
  ): Promise<PagedResult<CatalogBrowseItem>> {
    const query = new URLSearchParams({ pageNumber: String(page), pageSize: '20' })
    if (level !== '') query.set('level', String(level))
    const path = `${catalog[kind].path}?${query}`
    if (kind === 'kanji') {
      const result = await request<PagedResult<Kanji>>(path, { signal })
      const items = result.items.map(({ id, character, onYomi, kunYomi, meaning, strokeCount, level }) => ({
        id, title: character, meaning, level, reading: [onYomi, kunYomi].filter(Boolean).join(' · '),
        detail: `${strokeCount} nét`,
      }))
      return { ...result, items }
    }
    const result = await request<PagedResult<GrammarPoint>>(path, { signal })
    const items = result.items.map(({ id, pattern, meaning, level, exampleSentence, exampleSentenceMeaning }) => ({
      id, title: pattern, meaning, level, example: exampleSentence, exampleMeaning: exampleSentenceMeaning,
    }))
    return { ...result, items }
  },
  getTemplate(kind: CatalogKind, signal: AbortSignal): Promise<Blob> {
    return request(`${catalog[kind].path}/import/template`, { signal }, (response) => response.blob())
  },
  import(kind: CatalogKind, file: File, signal: AbortSignal): Promise<CatalogImportResult> {
    const body = new FormData()
    body.append('file', file)
    return request(`${catalog[kind].path}/import`, { method: 'POST', body, signal, timeoutMs: 90_000 })
  },
}
