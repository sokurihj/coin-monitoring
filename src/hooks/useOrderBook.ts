'use client'
import { useQuery } from '@tanstack/react-query'
import { OrderBookImbalance } from '@/types/whale'

async function fetchOrderBook(): Promise<OrderBookImbalance[]> {
  const res = await fetch('/api/orderbook')
  const data = await res.json()
  return data.imbalances ?? []
}

export function useOrderBook() {
  return useQuery({
    queryKey: ['orderbook'],
    queryFn: fetchOrderBook,
    refetchInterval: 3_000,
    staleTime: 0,
  })
}
