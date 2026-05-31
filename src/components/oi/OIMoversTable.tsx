'use client'
import { useOIMovers } from '@/hooks/useOIMovers'
import { formatPrice, formatUsd, formatPct } from '@/lib/formatters'

export function OIMoversTable() {
  const { data: movers = [], isLoading } = useOIMovers()

  return (
    <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs mb-2 flex items-center justify-between">
        <span style={{ color: 'var(--text-muted)' }}>OPEN INTEREST</span>
        {isLoading && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>갱신 중...</span>}
      </div>

      <div className="flex flex-col gap-0.5">
        {/* 헤더 */}
        <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span className="w-10 shrink-0">코인</span>
          <span className="flex-1 text-right">OI</span>
          <span className="w-16 text-right">24h변동</span>
          <span className="w-14 text-right">펀딩비</span>
        </div>

        {movers.slice(0, 8).map(m => {
          const isOiUp = m.oiDeltaPct >= 0
          const isExtremeFunding = Math.abs(m.fundingRate) >= 0.0005
          return (
            <div key={m.instId} className="flex items-center gap-2 text-xs font-mono py-0.5">
              <span className="w-10 shrink-0 font-bold" style={{ color: 'var(--text-primary)' }}>
                {m.coin}
              </span>
              <span className="flex-1 text-right" style={{ color: 'var(--text-muted)' }}>
                {formatUsd(m.oiUsd)}
              </span>
              <span
                className="w-16 text-right font-bold"
                style={{ color: isOiUp ? 'var(--buy)' : 'var(--sell)' }}
              >
                {formatPct(m.oiDeltaPct)}
              </span>
              <span
                className="w-14 text-right"
                style={{ color: isExtremeFunding ? 'var(--warning)' : m.fundingRate >= 0 ? 'var(--buy)' : 'var(--sell)' }}
              >
                {formatPct(m.fundingRate)}
              </span>
            </div>
          )
        })}

        {movers.length === 0 && !isLoading && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>데이터 로딩 중...</span>
        )}
      </div>
    </div>
  )
}
