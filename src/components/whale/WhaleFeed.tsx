'use client'
import { useWhaleStream } from '@/hooks/useWhaleStream'
import { useWhaleStore } from '@/store/whaleStore'
import { WhaleFeedRow } from './WhaleFeedRow'

export function WhaleFeed() {
  useWhaleStream()
  const { trades, selectedCoin } = useWhaleStore()

  const filtered = selectedCoin === 'ALL'
    ? trades
    : trades.filter(t => t.coin === selectedCoin)

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b text-xs shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-panel)' }}
      >
        <span className="w-10">등급</span>
        <span className="w-10">코인</span>
        <span className="w-20">규모</span>
        <span className="w-12">방향</span>
        <span className="flex-1">가격</span>
        <span>시각</span>
      </div>

      {/* 피드 목록 */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="text-2xl">🐋</div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              고래 거래 감지 중...
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              50만 달러 이상 체결 시 표시됩니다
            </p>
          </div>
        ) : (
          filtered.map(trade => (
            <WhaleFeedRow key={trade.id} trade={trade} />
          ))
        )}
      </div>
    </div>
  )
}
