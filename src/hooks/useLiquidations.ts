'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLiquidationStore } from '@/store/liquidationStore'
import { LiquidationEvent } from '@/types/whale'

async function fetchLiquidations(): Promise<LiquidationEvent[]> {
  const res = await fetch('/api/liquidations')
  const data = await res.json()
  return data.events ?? []
}

export function useLiquidations() {
  const addEvents = useLiquidationStore(s => s.addEvents)

  const query = useQuery({
    queryKey: ['liquidations'],
    queryFn: fetchLiquidations,
    refetchInterval: 10_000,
    staleTime: 0,
  })

  useEffect(() => {
    if (query.data) addEvents(query.data)
  }, [query.data, addEvents])
}
