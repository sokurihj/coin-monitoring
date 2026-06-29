'use client'
import { useQuery } from '@tanstack/react-query'
import { FundingRateInfo } from '@/types/whale'
import { POLL_INTERVAL } from '@/lib/constants'

async function fetchFunding(): Promise<FundingRateInfo[]> {
  const res = await fetch('/api/funding')
  const data = await res.json()
  return data.rates ?? []
}

export function useFundingRates() {
  return useQuery({
    queryKey: ['funding-rates'],
    queryFn: fetchFunding,
    refetchInterval: POLL_INTERVAL * 2,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 0,
  })
}
