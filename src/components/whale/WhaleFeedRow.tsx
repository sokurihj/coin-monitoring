'use client'
import { WhaleTradeEvent, WhaleTier } from '@/types/whale'
import { formatPrice, formatTime, formatUsd } from '@/lib/formatters'

const TIER_LABELS: Record<WhaleTier, string> = {
  mega: 'MEGA',
  large: 'LARGE',
  medium: 'MED',
}

const TIER_COLORS: Record<WhaleTier, string> = {
  mega: '#ff6b00',
  large: 'var(--text-primary)',
  medium: 'var(--text-muted)',
}

export function WhaleFeedRow({ trade }: { trade: WhaleTradeEvent }) {
  const isBuy = trade.side === 'buy'
  const isMega = trade.tier === 'mega'

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 border-b text-xs font-mono transition-colors animate-slide-in"
      style={{
        borderColor: 'var(--border)',
        background: isMega
          ? isBuy ? 'var(--mega-buy-glow)' : 'var(--mega-sell-glow)'
          : 'transparent',
      }}
    >
      {/* Tier 배지 */}
      <span
        className="w-10 text-center shrink-0 rounded px-0.5"
        style={{
          color: TIER_COLORS[trade.tier],
          border: `1px solid ${TIER_COLORS[trade.tier]}`,
          fontSize: '9px',
          opacity: 0.9,
        }}
      >
        {TIER_LABELS[trade.tier]}
      </span>

      {/* 코인 */}
      <span className="w-10 shrink-0 font-bold" style={{ color: 'var(--text-primary)' }}>
        {trade.coin}
      </span>

      {/* 달러 금액 */}
      <span className="w-20 shrink-0 font-bold" style={{ color: isBuy ? 'var(--buy)' : 'var(--sell)' }}>
        {formatUsd(trade.sizeUsd)}
      </span>

      {/* 방향 */}
      <span
        className="w-12 shrink-0 font-bold"
        style={{ color: isBuy ? 'var(--buy)' : 'var(--sell)' }}
      >
        {isBuy ? '▲ BUY' : '▼ SELL'}
      </span>

      {/* 가격 */}
      <span className="flex-1" style={{ color: 'var(--text-muted)' }}>
        {formatPrice(trade.price)}
      </span>

      {/* 시각 */}
      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
        {formatTime(trade.timestamp)}
      </span>
    </div>
  )
}
