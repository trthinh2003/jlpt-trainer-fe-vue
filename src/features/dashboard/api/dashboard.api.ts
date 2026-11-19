import { request } from '@/shared/api/http'
import type { HeatmapEntry, ProgressStats } from '../types'

export const dashboardApi = {
  getHeatmap(days: number, signal: AbortSignal): Promise<HeatmapEntry[]> {
    return request(`/dashboard/heatmap?days=${days}`, { signal })
  },
  getProgress(signal: AbortSignal): Promise<ProgressStats> {
    return request('/dashboard/progress', { signal })
  },
}
