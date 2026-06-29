'use client'
import { useQuery } from '@tanstack/react-query'
import { TradingFill } from '@/types/trading'

interface TradingLogResponse {
  available: boolean
  fills: TradingFill[]
  fetchedAt?: number
  error?: string
  nextCursor?: string
}

async function fetchTradingLog(coin?: string): Promise<TradingLogResponse> {
  const params = coin ? `?coin=${coin}` : ''
  const res = await fetch(`/api/trading-log${params}`)
  return res.json()
}

export function useTradingLog(coin?: string) {
  return useQuery({
    queryKey: ['trading-log', coin ?? 'all'],
    queryFn: () => fetchTradingLog(coin),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 30_000,
  })
}
