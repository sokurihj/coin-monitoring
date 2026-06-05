'use client'
import { useQuery } from '@tanstack/react-query'
import { AccountBalance } from '@/types/trading'

interface BalanceResponse {
  available: boolean
  balance?: AccountBalance
  error?: string
}

async function fetchAccountBalance(): Promise<BalanceResponse> {
  const res = await fetch('/api/account-balance')
  return res.json()
}

export function useAccountBalance() {
  return useQuery({
    queryKey: ['account-balance'],
    queryFn: fetchAccountBalance,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
