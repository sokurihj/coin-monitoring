'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTradingLog } from '@/hooks/useTradingLog'
import { useAccountBalance } from '@/hooks/useAccountBalance'
import { useTradingLogStore } from '@/store/tradingLogStore'
import { useWhaleStore } from '@/store/whaleStore'
import { TradingFill, TRADE_TAGS, TP_TAGS, SL_TAGS, TradeTag, TpTag, SlTag } from '@/types/trading'

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
  return fill.ordId || fill.id || `${fill.ordId}-${fill.ts}`
}

function groupFillsByOrder(fills: TradingFill[]): TradingFill[] {
  const groups = new Map<string, TradingFill[]>()
  for (const fill of fills) {
    const key = fill.ordId || fill.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(fill)
  }
  return Array.from(groups.values()).map(group => {
    if (group.length === 1) return group[0]
    const totalSize = group.reduce((sum, f) => sum + f.size, 0)
    const weightedPrice = group.reduce((sum, f) => sum + f.price * f.size, 0) / totalSize
    const totalPnl = group.reduce((sum, f) => sum + f.pnl, 0)
    const latest = group.reduce((a, b) => a.ts >= b.ts ? a : b)
    return { ...latest, id: latest.ordId || latest.id, price: weightedPrice, size: totalSize, pnl: totalPnl }
  })
}

function TagButton({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded text-[11px] font-mono transition-colors"
      style={{
        background: active ? color : 'var(--bg-base)',
        color: active ? '#000' : 'var(--text-secondary)',
        border: `1px solid ${active ? color : 'var(--border)'}`,
      }}
    >
      {label}
    </button>
  )
}

function FillRow({ fill }: { fill: TradingFill }) {
  const [expanded, setExpanded] = useState(false)
  const { notes, tags, tpTags, slTags, setNote, toggleTag, toggleTpTag, toggleSlTag } = useTradingLogStore()
  const key = fillKey(fill)
  const note = notes[key] ?? ''
  const selectedTags = tags[key] ?? []
  const selectedTpTags = tpTags[key] ?? []
  const selectedSlTags = slTags[key] ?? []

  const directionColor = fill.posSide === 'long' ? 'var(--buy)' : 'var(--sell)'
  const hasAnyTag = selectedTags.length + selectedTpTags.length + selectedSlTags.length > 0

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
        {/* 태그 전체 + 메모 인라인 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex gap-1 flex-wrap shrink-0">
            {!hasAnyTag && <span style={{ color: 'var(--text-muted)' }}>—</span>}
            {selectedTags.map(tag => (
              <span key={`e-${tag}`} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                {tag}
              </span>
            ))}
            {selectedTpTags.map(tag => (
              <span key={`tp-${tag}`} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ color: '#16a34a', border: '1px solid #16a34a', background: 'var(--bg-panel)', opacity: 0.9 }}>
                {tag}
              </span>
            ))}
            {selectedSlTags.map(tag => (
              <span key={`sl-${tag}`} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ color: 'var(--sell)', border: '1px solid var(--sell)', background: 'var(--bg-panel)', opacity: 0.9 }}>
                {tag}
              </span>
            ))}
          </div>
          {note && (
            <span className="text-[10px] font-mono truncate flex-1" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {note}
            </span>
          )}
        </div>
        <span
          className="text-[10px] shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none' }}
        >
          ▶
        </span>
      </div>

      {expanded && (
        <div
          className="px-3 pt-3 pb-3 border-b flex flex-col gap-3"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* 진입 근거 */}
          <div>
            <p className="text-[10px] mb-1.5 font-mono uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              진입 근거
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRADE_TAGS.map(tag => (
                <TagButton key={tag} label={tag} active={selectedTags.includes(tag)} color="var(--buy)"
                  onClick={() => toggleTag(key, tag as TradeTag)} />
              ))}
            </div>
          </div>

          {/* 익절 근거 */}
          <div>
            <p className="text-[10px] mb-1.5 font-mono uppercase tracking-wide" style={{ color: '#16a34a', opacity: 0.8 }}>
              익절 근거
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TP_TAGS.map(tag => (
                <TagButton key={tag} label={tag} active={selectedTpTags.includes(tag)} color="#16a34a"
                  onClick={() => toggleTpTag(key, tag as TpTag)} />
              ))}
            </div>
          </div>

          {/* 손절 근거 */}
          <div>
            <p className="text-[10px] mb-1.5 font-mono uppercase tracking-wide" style={{ color: 'var(--sell)', opacity: 0.8 }}>
              손절 근거
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SL_TAGS.map(tag => (
                <TagButton key={tag} label={tag} active={selectedSlTags.includes(tag)} color="var(--sell)"
                  onClick={() => toggleSlTag(key, tag as SlTag)} />
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
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
        </div>
      )}
    </div>
  )
}

function BalancePanel() {
  const { data } = useAccountBalance()
  if (!data?.available || !data.balance) return null

  const { totalEq, availEq, usedMargin, unrealizedPnl } = data.balance
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

  return (
    <div
      className="grid grid-cols-4 gap-0 border-b shrink-0 text-[10px]"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
    >
      {[
        { label: '총 자산', sub: '', value: `$${fmt(totalEq)}` },
        { label: '가용 증거금', sub: '지금 당장 쓸 수 있는 돈', value: `$${fmt(availEq)}` },
        { label: '사용 증거금', sub: '이미 묶인 돈', value: `$${fmt(usedMargin)}`, highlight: usedMargin > 0 },
        { label: '미실현 손익', sub: '', value: `${unrealizedPnl >= 0 ? '+' : ''}$${fmt(unrealizedPnl)}`, highlight: unrealizedPnl < 0 },
      ].map(({ label, sub, value, highlight }) => (
        <div key={label} className="flex flex-col items-center py-2 gap-0.5">
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          {sub && <span className="text-[9px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{sub}</span>}
          <span
            className="font-mono font-semibold text-[11px]"
            style={{ color: highlight ? 'var(--sell)' : 'var(--text-primary)' }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function getMonthKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월`
}

function groupByMonth(fills: TradingFill[]) {
  const groups = new Map<string, TradingFill[]>()
  for (const fill of fills) {
    const key = getMonthKey(fill.ts)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(fill)
  }
  return Array.from(groups.entries()).map(([month, monthFills]) => ({ month, fills: monthFills }))
}

function MonthlyHeader({ month, fills }: { month: string; fills: TradingFill[] }) {
  const withPnl = fills.filter(f => f.pnl !== 0)
  const totalPnl = withPnl.reduce((sum, f) => sum + f.pnl, 0)
  const winners = withPnl.filter(f => f.pnl > 0).length
  const losers = withPnl.filter(f => f.pnl < 0).length
  const winRate = withPnl.length > 0 ? (winners / withPnl.length) * 100 : null

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 text-[11px] font-mono sticky top-0 z-10"
      style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}
    >
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{month}</span>
      <span style={{ color: 'var(--text-muted)' }}>{fills.length}건</span>
      {winRate !== null && (
        <>
          <span style={{ color: 'var(--text-muted)' }}>
            승률{' '}
            <span style={{ color: winRate >= 50 ? 'var(--buy)' : 'var(--sell)' }}>
              {winRate.toFixed(0)}%
            </span>
          </span>
          <span style={{ color: 'var(--buy)' }}>{winners}승</span>
          <span style={{ color: 'var(--sell)' }}>{losers}패</span>
          <span style={{ color: 'var(--text-muted)' }}>
            P&L{' '}
            <span className="font-semibold" style={{ color: totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </span>
          </span>
        </>
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

  const [olderFills, setOlderFills] = useState<TradingFill[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)

  // 코인 필터 변경 시 이전 페이지 데이터 초기화
  useEffect(() => {
    setOlderFills([])
    setHasMore(true)
    cursorRef.current = null
  }, [coin])

  const allFills = useMemo(() => {
    const latest = data?.fills ?? []
    const merged = [...latest, ...olderFills]
    const seen = new Set<string>()
    const deduped = merged.filter(f => {
      const key = f.id || `${f.ordId}-${f.ts}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return groupFillsByOrder(deduped).sort((a, b) => b.ts - a.ts)
  }, [data?.fills, olderFills])

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return
    const after = cursorRef.current ?? data?.nextCursor
    if (!after) return

    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (coin) params.set('coin', coin)
      params.set('after', after)
      const res = await fetch(`/api/trading-log?${params}`)
      const json = await res.json()
      const newFills: TradingFill[] = json.fills ?? []
      setOlderFills(prev => [...prev, ...newFills])
      cursorRef.current = json.nextCursor ?? null
      if (!json.nextCursor) setHasMore(false)
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false)
    }
  }

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

  if (allFills.length === 0 && !isLoading) {
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
      <BalancePanel />
      <SummaryBar fills={allFills} />

      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b text-[10px] shrink-0 uppercase tracking-wide"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-panel)' }}
      >
        <span className="w-28 shrink-0">시각</span>
        <span className="w-10 shrink-0">코인</span>
        <span className="w-10 shrink-0">방향</span>
        <span className="w-20 shrink-0">가격</span>
        <span className="w-16 shrink-0">P&L</span>
        <span className="flex-1">근거</span>
      </div>

      <div className="overflow-y-auto flex-1">
        {groupByMonth(allFills).map(({ month, fills: monthFills }) => (
          <div key={month}>
            <MonthlyHeader month={month} fills={monthFills} />
            {monthFills.map((fill, i) => (
              <FillRow key={fill.id || `${fill.ordId}-${fill.ts}-${i}`} fill={fill} />
            ))}
          </div>
        ))}

        {/* 더 보기 버튼 */}
        {hasMore && data?.nextCursor && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-4 py-1.5 rounded text-xs font-mono transition-opacity"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                color: isLoadingMore ? 'var(--text-muted)' : 'var(--text-secondary)',
                opacity: isLoadingMore ? 0.5 : 1,
              }}
            >
              {isLoadingMore ? '불러오는 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
