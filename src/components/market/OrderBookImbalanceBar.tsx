'use client'
import { useOrderBook } from '@/hooks/useOrderBook'

export function OrderBookImbalanceBar() {
  const { data: imbalances = [] } = useOrderBook()

  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
        ORDER BOOK
      </div>
      <div className="flex flex-col gap-2">
        {imbalances.map(({ coin, imbalance, totalBid, totalAsk }) => {
          const total = totalBid + totalAsk
          const bidPct = total === 0 ? 50 : (totalBid / total) * 100
          const askPct = 100 - bidPct
          const isPositive = imbalance >= 0

          return (
            <div key={coin}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {coin}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: isPositive ? 'var(--color-buy)' : 'var(--color-sell)' }}
                >
                  {isPositive ? '+' : ''}{(imbalance * 100).toFixed(1)}%
                </span>
              </div>
              <div
                className="flex rounded-sm overflow-hidden"
                style={{ height: 5, background: 'var(--bg-row-hover)' }}
              >
                <div style={{ width: `${bidPct}%`, background: 'var(--color-buy)', opacity: 0.75 }} />
                <div style={{ width: `${askPct}%`, background: 'var(--color-sell)', opacity: 0.75 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
