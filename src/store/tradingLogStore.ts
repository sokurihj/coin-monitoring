'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TradeTag } from '@/types/trading'

interface TradingLogStore {
  notes: Record<string, string>
  tags: Record<string, TradeTag[]>
  setNote: (fillKey: string, note: string) => void
  toggleTag: (fillKey: string, tag: TradeTag) => void
}

export const useTradingLogStore = create<TradingLogStore>()(
  persist(
    (set, get) => ({
      notes: {},
      tags: {},
      setNote: (fillKey, note) =>
        set(s => ({ notes: { ...s.notes, [fillKey]: note } })),
      toggleTag: (fillKey, tag) => {
        const current = get().tags[fillKey] ?? []
        const next = current.includes(tag)
          ? current.filter(t => t !== tag)
          : [...current, tag]
        set(s => ({ tags: { ...s.tags, [fillKey]: next } }))
      },
    }),
    { name: 'trading-notes' }
  )
)
