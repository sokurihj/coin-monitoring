'use client'
import { useState } from 'react'
import { useLiquidationStore } from '@/store/liquidationStore'
import { MONITORED_COINS } from '@/lib/constants'

const COIN_TABS = ['ALL', ...MONITORED_COINS]

const FILTERS: { label: string; value: number }[] = [
  { label: 'ALL', value: 0 },
  { label: '10K+', value: 10_000 },
  { label: '50K+', value: 50_000 },
  { label: '100K+', value: 100_000 },
]

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function LiquidationFeed() {
  const events = useLiquidationStore(s => s.events)
  const [minUsd, setMinUsd] = useState(100_000)
  const [selectedCoin, setSelectedCoin] = useState('ALL')

  const display = events
    .filter(e => selectedCoin === 'ALL' || e.coin === selectedCoin)
    .filter(e => e.sizeUsd >= minUsd)

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ borderTop: '1px solid var(--border)' }}>
      {/* 헤더 + 금액 필터 */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5 shrink-0">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          LIQUIDATIONS
        </span>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setMinUsd(f.value)}
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                background: minUsd === f.value ? 'var(--border)' : 'transparent',
                color: minUsd === f.value ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 코인 탭 */}
      <div className="flex gap-0 px-3 pb-2 shrink-0">
        {COIN_TABS.map(coin => (
          <button
            key={coin}
            onClick={() => setSelectedCoin(coin)}
            className="px-2.5 py-0.5 text-xs font-mono border-b-2 transition-colors"
            style={{
              borderColor: selectedCoin === coin ? 'var(--buy)' : 'transparent',
              color: selectedCoin === coin ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {coin}
          </button>
        ))}
      </div>

      {display.length === 0 ? (
        <div className="px-3 text-xs" style={{ color: 'var(--text-muted)' }}>조용한 시장</div>
      ) : (
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 px-3 pb-3">
          {display.map(event => (
            <div key={event.id} className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {selectedCoin === 'ALL' && (
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: 'var(--text-muted)', width: 28 }}
                  >
                    {event.coin}
                  </span>
                )}
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{
                    color: event.posSide === 'long' ? 'var(--color-sell)' : 'var(--color-buy)',
                  }}
                >
                  {event.posSide === 'long' ? 'LONG' : 'SHRT'} LIQ
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                    {formatUsd(event.sizeUsd)}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  @{event.price.toLocaleString(undefined, { maximumFractionDigits: event.price >= 1000 ? 1 : 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

