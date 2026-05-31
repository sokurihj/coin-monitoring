'use client'
import { useLiquidationStore } from '@/store/liquidationStore'

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
  const display = events.slice(0, 10)

  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
        LIQUIDATIONS
      </div>

      {display.length === 0 ? (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>조용한 시장</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {display.map(event => (
            <div key={event.id} className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: 'var(--text-muted)', width: 28 }}
                >
                  {event.coin}
                </span>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{
                    color: event.posSide === 'long' ? 'var(--color-sell)' : 'var(--color-buy)',
                  }}
                >
                  {event.posSide === 'long' ? 'LONG' : 'SHRT'} LIQ
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {formatUsd(event.sizeUsd)}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {formatTime(event.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
