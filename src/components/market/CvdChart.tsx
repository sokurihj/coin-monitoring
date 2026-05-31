'use client'
import { useCvdStore, CvdPoint } from '@/store/cvdStore'
import { MONITORED_COINS } from '@/lib/constants'

const W = 100
const H = 28

function Sparkline({ points }: { points: CvdPoint[] }) {
  if (points.length < 2) {
    return <div style={{ width: W, height: H, background: 'var(--bg-row-hover)', borderRadius: 3 }} />
  }

  const values = points.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((p.value - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last = points[points.length - 1].value
  const rising = points.length >= 2 && last >= points[points.length - 2].value
  const color = rising ? 'var(--color-buy)' : 'var(--color-sell)'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
      />
    </svg>
  )
}

function formatCvd(value: number): string {
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '-'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export function CvdChart() {
  const history = useCvdStore(s => s.history)
  const cumulative = useCvdStore(s => s.cumulative)

  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
        CVD
      </div>
      <div className="flex flex-col gap-2">
        {MONITORED_COINS.map(coin => {
          const pts = history[coin] ?? []
          const cum = cumulative[coin] ?? 0
          const rising = cum >= 0

          return (
            <div key={coin}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {coin}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: rising ? 'var(--color-buy)' : 'var(--color-sell)' }}
                >
                  {formatCvd(cum)}
                </span>
              </div>
              <Sparkline points={pts} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
