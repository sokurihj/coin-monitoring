'use client'
import { useQuery } from '@tanstack/react-query'

export function SmartMoneyPanel() {
  const { data } = useQuery({
    queryKey: ['smartmoney-check'],
    queryFn: async () => {
      const res = await fetch('/api/smartmoney/signals')
      return res.json()
    },
    staleTime: 60_000,
  })

  if (!data || !data.available) {
    return (
      <div className="p-4">
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>SMART MONEY</div>
        <div
          className="rounded p-3 text-center"
          style={{ background: 'var(--bg-row-hover)', border: '1px solid var(--border)' }}
        >
          <div className="text-lg mb-2">🔑</div>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            API 키 연결 필요
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            .env.local에 OKX API 키를 설정하면
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            스마트머니 시그널을 확인할 수 있습니다
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>SMART MONEY</div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>데이터 로딩 중...</p>
    </div>
  )
}
