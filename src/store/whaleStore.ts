'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WhaleTradeEvent } from '@/types/whale'
import { MAX_WHALE_FEED_SIZE } from '@/lib/constants'

interface WhaleStore {
  trades: WhaleTradeEvent[]
  seenIds: Set<string>
  selectedCoin: string
  addTrades: (incoming: WhaleTradeEvent[]) => void
  setSelectedCoin: (coin: string) => void
}

export const useWhaleStore = create<WhaleStore>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: 'whale-feed',
      // trades만 저장, seenIds(Set)는 JSON 직렬화 불가라 제외
      partialize: (state) => ({ trades: state.trades }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.seenIds = new Set(state.trades.map(t => t.id))
        }
      },
    }
  )
)
