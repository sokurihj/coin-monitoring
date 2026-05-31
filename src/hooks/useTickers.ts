'use client'
import { useQuery } from '@tanstack/react-query'
import { TickerInfo } from '@/types/whale'
import { POLL_INTERVAL } from '@/lib/constants'

async function fetchTickers(): Promise<TickerInfo[]> {
  const res = await fetch('/api/tickers')
  const data = await res.json()
  return data.tickers ?? []
}

export function useTickers() {
  return useQuery({
    queryKey: ['tickers'],
    queryFn: fetchTickers,
    refetchInterval: POLL_INTERVAL,
    staleTime: 0,
  })
}
