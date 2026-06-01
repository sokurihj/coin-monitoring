'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWhaleStore } from '@/store/whaleStore'
import { useFrequencyStore } from '@/store/frequencyStore'
import { WhaleTradeEvent } from '@/types/whale'
import { POLL_INTERVAL } from '@/lib/constants'

async function fetchWhaleFeed(): Promise<WhaleTradeEvent[]> {
  const res = await fetch('/api/whale-feed')
  const data = await res.json()
  return data.trades ?? []
}

export function useWhaleStream() {
  const addTrades = useWhaleStore(s => s.addTrades)
  const recompute = useFrequencyStore(s => s.recompute)

  const query = useQuery({
    queryKey: ['whale-feed'],
    queryFn: fetchWhaleFeed,
    refetchInterval: POLL_INTERVAL,
    staleTime: 0,
  })

  useEffect(() => {
    if (query.data) {
      addTrades(query.data)
      recompute(useWhaleStore.getState().trades)
    }
  }, [query.data, addTrades, recompute])

  return {
    isConnected: !query.isError,
    lastFetch: query.dataUpdatedAt,
  }
}
