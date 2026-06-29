'use client'
import { useQuery } from '@tanstack/react-query'
import { OIMover } from '@/types/whale'
import { OI_POLL_INTERVAL } from '@/lib/constants'

async function fetchOIMovers(): Promise<OIMover[]> {
  const res = await fetch('/api/oi-movers')
  const data = await res.json()
  return data.movers ?? []
}

export function useOIMovers() {
  return useQuery({
    queryKey: ['oi-movers'],
    queryFn: fetchOIMovers,
    refetchInterval: OI_POLL_INTERVAL,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 0,
  })
}
