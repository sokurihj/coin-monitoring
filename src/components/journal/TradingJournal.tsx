'use client'
import { useState } from 'react'
import { useTradingLog } from '@/hooks/useTradingLog'
import { useTradingLogStore } from '@/store/tradingLogStore'
import { useWhaleStore } from '@/store/whaleStore'
import { TradingFill, TRADE_TAGS, TradeTag } from '@/types/trading'

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}

function formatPrice(price: number) {
  return price >= 1000
    ? price.toLocaleString('en-US', { maximumFractionDigits: 1 })
    : price.toFixed(4)
}

function PnlBadge({ pnl }: { pnl: number }) {
  if (pnl === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const positive = pnl > 0
  return (
    <span className="text-xs font-mono font-semibold" style={{ color: positive ? 'var(--buy)' : 'var(--sell)' }}>
      {positive ? '+' : ''}{pnl.toFixed(2)}
    </span>
  )
}

function fillKey(fill: TradingFill) {
  return `${fill.ordId}-${fill.ts}`
}

function FillRow({ fill }: { fill: TradingFill }) {
  const [expanded, setExpanded] = useState(false)
  const { notes, tags, setNote, toggleTag } = useTradingLogStore()
  const key = fillKey(fill)
  const note = notes[key] ?? ''
  const selectedTags = tags[key] ?? []

  const directionColor = fill.posSide === 'long' ? 'var(--buy)' : 'var(--sell)'

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:opacity-80 transition-opacity text-xs"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => setExpanded(e => !e)}
      >
        <span className="w-28 shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
          {formatTime(fill.ts)}
        </span>
        <span className="w-10 shrink-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
          {fill.coin}
        </span>
        <span className="w-10 shrink-0 font-mono font-bold" style={{ color: directionColor }}>
          {fill.posSide === 'long' ? 'LONG' : 'SHORT'}
        </span>
        <span className="w-20 shrink-0 font-mono" style={{ color: 'var(--text-primary)' }}>
          {formatPrice(fill.price)}
        </span>
        <span className="w-16 shrink-0">
          <PnlBadge pnl={fill.pnl} />
        </span>
        {/* 선택된 태그 미리보기 */}
        <div className="flex gap-1 flex-1 flex-wrap">
          {selectedTags.length > 0
            ? selectedTags.map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: 'var(--bg-panel)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  {tag}
                </span>
              ))
            : <span style={{ color: 'var(--text-muted)' }}>—</span>
          }
        </div>
        {note && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>📝</span>}
        <span
          className="text-[10px] shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none' }}
        >
          ▶
        </span>
      </div>

      {expanded && (
        <div
          className="px-3 py-3 border-b"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* 태그 선택 */}
          <p className="text-[10px] mb-2 font-mono uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            진입 근거
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TRADE_TAGS.map(tag => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(key, tag as TradeTag)}
                  className="px-2 py-1 rounded text-[11px] font-mono transition-colors"
                  style={{
                    background: active ? 'var(--buy)' : 'var(--bg-base)',
                    color: active ? '#000' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--buy)' : 'var(--border)'}`,
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>

          {/* 메모 */}
          <p className="text-[10px] mb-1 font-mono uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            메모
          </p>
          <textarea
            className="w-full text-xs font-mono resize-none rounded px-2 py-1.5 focus:outline-none"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              minHeight: '56px',
            }}
            placeholder="거래 근거, 반성 등..."
            value={note}
            onChange={e => setNote(key, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

function SummaryBar({ fills }: { fills: TradingFill[] }) {
  const withPnl = fills.filter(f => f.pnl !== 0)
  const totalPnl = withPnl.reduce((sum, f) => sum + f.pnl, 0)
  const winners = withPnl.filter(f => f.pnl > 0).length
  const winRate = withPnl.length > 0 ? (winners / withPnl.length) * 100 : null

  return (
    <div
      className="flex items-center gap-4 px-3 py-2 border-b text-xs shrink-0"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <span style={{ color: 'var(--text-muted)' }}>체결 {fills.length}건</span>
      {winRate !== null && (
        <span style={{ color: 'var(--text-muted)' }}>
          승률{' '}
          <span className="font-mono" style={{ color: winRate >= 50 ? 'var(--buy)' : 'var(--sell)' }}>
            {winRate.toFixed(0)}%
          </span>
        </span>
      )}
      {withPnl.length > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>
          총 P&L{' '}
          <span className="font-mono font-semibold" style={{ color: totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </span>
        </span>
      )}
    </div>
  )
}

export function TradingJournal() {
  const { selectedCoin } = useWhaleStore()
  const coin = selectedCoin === 'ALL' ? undefined : selectedCoin
  const { data, isLoading, error } = useTradingLog(coin)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>체결 내역 불러오는 중...</span>
      </div>
    )
  }

  if (error || data?.error) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--sell)' }}>
          오류: {String(error ?? data?.error)}
        </span>
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2" style={{ background: 'var(--bg-base)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>OKX API 키가 설정되지 않았습니다</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          .env.local에 OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE를 설정하세요
        </span>
      </div>
    )
  }

  const fills = data.fills ?? []

  if (fills.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {coin ? `${coin} 체결 내역 없음` : '체결 내역 없음'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <SummaryBar fills={fills} />

      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b text-[10px] shrink-0 uppercase tracking-wide"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-panel)' }}
      >
        <span className="w-28 shrink-0">시각</span>
        <span className="w-10 shrink-0">코인</span>
        <span className="w-10 shrink-0">방향</span>
        <span className="w-20 shrink-0">가격</span>
        <span className="w-16 shrink-0">P&L</span>
        <span className="flex-1">진입 근거</span>
      </div>

      <div className="overflow-y-auto flex-1">
        {fills.map((fill, i) => (
          <FillRow key={`${fill.ordId}-${fill.ts}-${i}`} fill={fill} />
        ))}
      </div>
    </div>
  )
}
