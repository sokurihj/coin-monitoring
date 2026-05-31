'use client'
import { useFundingRates } from '@/hooks/useFundingRates'
import { formatPct } from '@/lib/formatters'

export function FundingRateBar() {
  const { data: rates = [] } = useFundingRates()

  return (
    <div
      className="p-3 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>FUNDING RATE</div>
      <div className="flex flex-col gap-1">
        {rates.slice(0, 8).map(r => {
          const isPositive = r.fundingRate >= 0
          const isExtreme = Math.abs(r.fundingRate) >= 0.0005
          return (
            <div key={r.instId} className="flex items-center justify-between text-xs font-mono">
              <span style={{ color: 'var(--text-muted)' }}>{r.coin}</span>
              <span
                style={{
                  color: isExtreme ? 'var(--warning)' : isPositive ? 'var(--buy)' : 'var(--sell)',
                  fontWeight: isExtreme ? 700 : 400,
                }}
              >
                {formatPct(r.fundingRate)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
