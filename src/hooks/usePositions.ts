'use client'
import { useQuery } from '@tanstack/react-query'
import { Position } from '@/types/trading'

interface PositionsResponse {
  available: boolean
  positions?: Position[]
  error?: string
}

async function fetchPositions(): Promise<PositionsResponse> {
  const res = await fetch('/api/positions')
  return res.json()
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 15_000,
  })
}
