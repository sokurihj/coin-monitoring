'use client'
import { useTickers } from '@/hooks/useTickers'
import { formatPrice } from '@/lib/formatters'

export function MarketOverviewStrip() {
  const { data: tickers = [] } = useTickers()

  if (tickers.length === 0) {
    return (
      <div
        className="h-8 flex items-center px-4 border-b shrink-0"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>시세 로딩 중...</span>
      </div>
    )
  }

  const doubled = [...tickers, ...tickers]

  return (
    <div
      className="h-8 border-b shrink-0 overflow-hidden"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {doubled.map((t, i) => {
          const isUp = t.changePct24h >= 0
          return (
            <span key={`${t.instId}-${i}`} className="flex items-center gap-2 px-4 text-xs font-mono shrink-0">
              <span style={{ color: 'var(--text-primary)' }}>{t.coin}</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatPrice(t.price)}</span>
              <span style={{ color: isUp ? 'var(--buy)' : 'var(--sell)' }}>
                {isUp ? '+' : ''}{(t.changePct24h * 100).toFixed(2)}%
              </span>
              <span style={{ color: 'var(--border)' }}>│</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
