'use client'
import { useQuery } from '@tanstack/react-query'
import { PendingLimitOrder } from '@/types/trading'

interface LimitOrdersResponse {
  available: boolean
  orders?: PendingLimitOrder[]
  error?: string
}

async function fetchLimitOrders(): Promise<LimitOrdersResponse> {
  const res = await fetch('/api/limit-orders')
  return res.json()
}

export function useLimitOrders() {
  return useQuery({
    queryKey: ['limit-orders'],
    queryFn: fetchLimitOrders,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 15_000,
  })
}
