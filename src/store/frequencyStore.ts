'use client'
import { create } from 'zustand'
import { WhaleTradeEvent } from '@/types/whale'
import { MONITORED_COINS } from '@/lib/constants'

function computeSpikes(trades: WhaleTradeEvent[]): Record<string, boolean> {
  const now = Date.now()
  const result: Record<string, boolean> = {}

  for (const coin of MONITORED_COINS) {
    const coinTrades = trades.filter(t => t.coin === coin)
    const last60s = coinTrades.filter(t => now - t.timestamp <= 60_000).length
    const last300s = coinTrades.filter(t => now - t.timestamp <= 300_000).length
    // 5분 구간을 60s 단위 5개로 나눈 평균
    const avgPer60s = last300s / 5
    result[coin] = avgPer60s > 0 && last60s > avgPer60s * 2
  }

  return result
}

interface FrequencyStore {
  spikes: Record<string, boolean>
  recompute: (trades: WhaleTradeEvent[]) => void
}

export const useFrequencyStore = create<FrequencyStore>((set) => ({
  spikes: {},
  recompute: (trades) => set({ spikes: computeSpikes(trades) }),
}))
