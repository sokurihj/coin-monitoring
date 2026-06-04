'use client'
import { useMemo } from 'react'
import { useWhaleStore } from '@/store/whaleStore'

const BUCKET_COUNT = 20
const BAR_HEIGHT = 9
const BAR_GAP = 1

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (price >= 100) return price.toLocaleString(undefined, { maximumFractionDigits: 1 })
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`
  return `$${usd.toFixed(0)}`
}

export function WhaleVolumeProfile() {
  const { trades, selectedCoin } = useWhaleStore()

  const filtered = useMemo(() => {
    if (selectedCoin === 'ALL') return []
    return trades.filter(t => t.coin === selectedCoin)
  }, [trades, selectedCoin])

  const profile = useMemo(() => {
    if (filtered.length === 0) return null

    const prices = filtered.map(t => t.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice

    const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      mid: range === 0
        ? minPrice
        : minPrice + (range * (i + 0.5)) / BUCKET_COUNT,
      buyUsd: 0,
      sellUsd: 0,
    }))

    filtered.forEach(t => {
      const idx = range === 0
        ? 0
        : Math.min(Math.floor(((t.price - minPrice) / range) * BUCKET_COUNT), BUCKET_COUNT - 1)
      if (t.side === 'buy') buckets[idx].buyUsd += t.sizeUsd
      else buckets[idx].sellUsd += t.sizeUsd
    })

    const maxUsd = Math.max(...buckets.map(b => Math.max(b.buyUsd, b.sellUsd)))
    if (maxUsd === 0) return null

    // 높은 가격이 위에 오도록 역순, 빈 버킷 제거
    const filled = [...buckets].reverse().filter(b => b.buyUsd > 0 || b.sellUsd > 0)
    return { buckets: filled, maxUsd }
  }, [filtered])

  if (selectedCoin === 'ALL') {
    return (
      <div
        className="shrink-0 border-b flex items-center justify-center"
        style={{ borderColor: 'var(--border)', height: 36 }}
      >
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          코인 탭을 선택하면 가격대별 볼륨 프로파일을 표시합니다
        </span>
      </div>
    )
  }

  if (!profile) return null

  const { buckets, maxUsd } = profile

  const totalBuyUsd = buckets.reduce((s, b) => s + b.buyUsd, 0)
  const totalSellUsd = buckets.reduce((s, b) => s + b.sellUsd, 0)

  return (
    <div
      className="shrink-0 border-b"
      style={{ borderColor: 'var(--border)', padding: '8px 8px 6px', background: 'var(--bg-panel)' }}
    >
      {/* 제목 + 합계 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          가격대별 고래 볼륨
        </span>
        <span className="text-xs font-mono gap-2 flex">
          <span style={{ color: 'var(--buy)' }}>B {formatUsd(totalBuyUsd)}</span>
          <span style={{ color: 'var(--sell)' }}>S {formatUsd(totalSellUsd)}</span>
        </span>
      </div>

      {/* 프로파일 바 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BAR_GAP }}>
        {buckets.map((bucket, i) => {
          const buyPct = (bucket.buyUsd / maxUsd) * 100
          const sellPct = (bucket.sellUsd / maxUsd) * 100

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', height: BAR_HEIGHT }}>
              {/* 가격 레이블 — 데이터 있는 버킷에 항상 표시 */}
              <span
                style={{
                  width: 72,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                  paddingRight: 5,
                  flexShrink: 0,
                }}
              >
                {formatPrice(bucket.mid)}
              </span>

              {/* sell 바 (중심 좌측으로) */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                {bucket.sellUsd > 0 && (
                  <div
                    title={`SELL ${formatUsd(bucket.sellUsd)}`}
                    style={{
                      width: `${sellPct}%`,
                      minWidth: 2,
                      height: BAR_HEIGHT,
                      background: 'var(--sell)',
                      opacity: 0.75,
                      borderRadius: '2px 0 0 2px',
                    }}
                  />
                )}
              </div>

              {/* 중심선 */}
              <div style={{ width: 1, height: BAR_HEIGHT + 2, background: 'var(--border)', flexShrink: 0 }} />

              {/* buy 바 (중심 우측으로) */}
              <div style={{ flex: 1 }}>
                {bucket.buyUsd > 0 && (
                  <div
                    title={`BUY ${formatUsd(bucket.buyUsd)}`}
                    style={{
                      width: `${buyPct}%`,
                      minWidth: 2,
                      height: BAR_HEIGHT,
                      background: 'var(--buy)',
                      opacity: 0.75,
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 축 레이블 */}
      <div
        className="flex mt-1"
        style={{ paddingLeft: 72, fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)' }}
      >
        <div style={{ flex: 1, textAlign: 'right', paddingRight: 4 }}>SELL ←</div>
        <div style={{ width: 1 }} />
        <div style={{ flex: 1, paddingLeft: 4 }}>→ BUY</div>
      </div>
    </div>
  )
}
