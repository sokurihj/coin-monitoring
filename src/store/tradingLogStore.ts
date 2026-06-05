'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TradeTag, TpTag, SlTag } from '@/types/trading'

interface TradingLogStore {
  notes: Record<string, string>
  tags: Record<string, TradeTag[]>
  tpTags: Record<string, TpTag[]>
  slTags: Record<string, SlTag[]>
  setNote: (fillKey: string, note: string) => void
  toggleTag: (fillKey: string, tag: TradeTag) => void
  toggleTpTag: (fillKey: string, tag: TpTag) => void
  toggleSlTag: (fillKey: string, tag: SlTag) => void
}

export const useTradingLogStore = create<TradingLogStore>()(
  persist(
    (set, get) => ({
      notes: {},
      tags: {},
      tpTags: {},
      slTags: {},
      setNote: (fillKey, note) =>
        set(s => ({ notes: { ...s.notes, [fillKey]: note } })),
      toggleTag: (fillKey, tag) => {
        const current = get().tags[fillKey] ?? []
        const next = current.includes(tag)
          ? current.filter(t => t !== tag)
          : [...current, tag]
        set(s => ({ tags: { ...s.tags, [fillKey]: next } }))
      },
      toggleTpTag: (fillKey, tag) => {
        const current = get().tpTags[fillKey] ?? []
        const next = current.includes(tag)
          ? current.filter(t => t !== tag)
          : [...current, tag]
        set(s => ({ tpTags: { ...s.tpTags, [fillKey]: next } }))
      },
      toggleSlTag: (fillKey, tag) => {
        const current = get().slTags[fillKey] ?? []
        const next = current.includes(tag)
          ? current.filter(t => t !== tag)
          : [...current, tag]
        set(s => ({ slTags: { ...s.slTags, [fillKey]: next } }))
      },
    }),
    { name: 'trading-notes' }
  )
)
