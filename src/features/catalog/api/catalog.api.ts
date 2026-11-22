import { request } from '@/shared/api/http'
import type { GrammarPoint, JlptLevel, Kanji, PagedResult } from '@/shared/types/api'
import { catalog, type CatalogBrowseItem, type CatalogContent, type CatalogImportResult, type CatalogKind } from '../types'

export const catalogApi = {
  async getList(
    kind: 'kanji' | 'grammar', filters: { level: JlptLevel | ''; page: number; search: string }, signal: AbortSignal,
  ): Promise<PagedResult<CatalogBrowseItem>> {
    const query = new URLSearchParams({ pageNumber: String(filters.page), pageSize: '20' })
    if (filters.level !== '') query.set('level', String(filters.level))
    if (filters.search) query.set('search', filters.search)
    const path = `${catalog[kind].path}?${query}`
    if (kind === 'kanji') {
      const result = await request<PagedResult<Kanji>>(path, { signal })
      const items = result.items.map<CatalogBrowseItem>(({ id, character, onYomi, kunYomi, meaning, strokeCount, level }) => ({
        id, title: character, level, content: { kind, meaning, onYomi, kunYomi },
        reading: [onYomi, kunYomi].filter(Boolean).join(' · '),
        detail: `${strokeCount} nét`,
      }))
      return { ...result, items }
    }
    const result = await request<PagedResult<GrammarPoint>>(path, { signal })
    const items = result.items.map<CatalogBrowseItem>(({ id, pattern, meaning, level, exampleSentence, exampleSentenceMeaning }) => ({
      id, title: pattern, level,
      content: { kind, meaning, exampleSentence, exampleSentenceMeaning },
    }))
    return { ...result, items }
  },
  updateContent(id: string, { kind, ...content }: CatalogContent, signal: AbortSignal): Promise<void> {
    return request(`${catalog[kind].path}/${encodeURIComponent(id)}/content`, {
      method: 'PUT',
      body: JSON.stringify(content),
      signal,
    })
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
