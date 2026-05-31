'use client'
import { create } from 'zustand'
import { LiquidationEvent } from '@/types/whale'

const MAX_SIZE = 50

interface LiquidationStore {
  events: LiquidationEvent[]
  seenIds: Set<string>
  addEvents: (incoming: LiquidationEvent[]) => void
}

export const useLiquidationStore = create<LiquidationStore>((set, get) => ({
  events: [],
  seenIds: new Set(),
  addEvents: (incoming) => {
    const { events, seenIds } = get()
    const newItems = incoming.filter(e => !seenIds.has(e.id))
    if (newItems.length === 0) return

    const nextSeenIds = new Set(seenIds)
    for (const e of newItems) nextSeenIds.add(e.id)

    const merged = [...newItems, ...events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SIZE)

    // seenIds는 현재 보관 중인 항목 기준으로 재구성 (메모리 누수 방지)
    const trimmedIds = new Set(merged.map(e => e.id))

    set({ events: merged, seenIds: trimmedIds })
  },
}))
