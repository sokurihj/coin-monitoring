'use client'
import { create } from 'zustand'
import { WhaleTradeEvent } from '@/types/whale'
import { MAX_WHALE_FEED_SIZE } from '@/lib/constants'

interface WhaleStore {
  trades: WhaleTradeEvent[]
  seenIds: Set<string>
  selectedCoin: string
  addTrades: (incoming: WhaleTradeEvent[]) => void
  setSelectedCoin: (coin: string) => void
}

export const useWhaleStore = create<WhaleStore>((set, get) => ({
  trades: [],
  seenIds: new Set(),
  selectedCoin: 'ALL',
  addTrades: (incoming) => {
    const { seenIds, trades } = get()
    const newTrades = incoming.filter(t => !seenIds.has(t.id))
    if (newTrades.length === 0) return

    const nextIds = new Set(seenIds)
    newTrades.forEach(t => nextIds.add(t.id))

    const merged = [...newTrades, ...trades]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_WHALE_FEED_SIZE)

    set({ trades: merged, seenIds: nextIds })
  },
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
}))
