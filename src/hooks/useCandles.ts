'use client'
import { useQuery } from '@tanstack/react-query'
import { CandleBar } from '@/types/whale'

async function fetchCandles(coin: string, bar: string): Promise<CandleBar[]> {
  const res = await fetch(`/api/candles?coin=${coin}&bar=${bar}`)
  const data = await res.json()
  return data.bars ?? []
}

export function useCandles(coin: string, bar = '1m') {
  return useQuery({
    queryKey: ['candles', coin, bar],
    queryFn: () => fetchCandles(coin, bar),
    refetchInterval: 15_000,
    staleTime: 0,
  })
}
