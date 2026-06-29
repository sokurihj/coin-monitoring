'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCvdStore } from '@/store/cvdStore'
import { CvdSnapshot } from '@/types/whale'
import { POLL_INTERVAL } from '@/lib/constants'

async function fetchCvd(): Promise<CvdSnapshot[]> {
  const res = await fetch('/api/cvd')
  const data = await res.json()
  return data.snapshots ?? []
}

export function useCvd() {
  const addSnapshots = useCvdStore(s => s.addSnapshots)

  const query = useQuery({
    queryKey: ['cvd'],
    queryFn: fetchCvd,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (Vercel CPU 절감)
    staleTime: 0,
  })

  useEffect(() => {
    if (query.data) addSnapshots(query.data)
  }, [query.data, addSnapshots])
}
