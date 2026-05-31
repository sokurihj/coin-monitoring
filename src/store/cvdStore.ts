'use client'
import { create } from 'zustand'
import { CvdSnapshot } from '@/types/whale'

const MAX_HISTORY = 60  // 5s × 60 = 5분 분량

export interface CvdPoint {
  value: number   // 누적 CVD
  ts: number
}

interface CvdStore {
  cumulative: Record<string, number>      // 코인별 누적 CVD
  history: Record<string, CvdPoint[]>    // 코인별 스파크라인용 이력
  addSnapshots: (snapshots: CvdSnapshot[]) => void
}

export const useCvdStore = create<CvdStore>((set, get) => ({
  cumulative: {},
  history: {},
  addSnapshots: (snapshots) => {
    const { cumulative, history } = get()
    const nextCumulative = { ...cumulative }
    const nextHistory = { ...history }

    for (const { coin, delta, fetchedAt } of snapshots) {
      const prev = nextCumulative[coin] ?? 0
      const next = prev + delta
      nextCumulative[coin] = next

      const pts = nextHistory[coin] ?? []
      const updated = [...pts, { value: next, ts: fetchedAt }]
      nextHistory[coin] = updated.length > MAX_HISTORY
        ? updated.slice(updated.length - MAX_HISTORY)
        : updated
    }

    set({ cumulative: nextCumulative, history: nextHistory })
  },
}))
