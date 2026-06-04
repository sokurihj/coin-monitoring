'use client'
import { create } from 'zustand'
import { LiquidationEvent } from '@/types/whale'

const MAX_SIZE = 500

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

    const seen = new Set<string>()
    const merged = [...newItems, ...events]
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SIZE)

    set({ events: merged, seenIds: seen })
  },
}))
