'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts'
import { useCandles } from '@/hooks/useCandles'
import { useWhaleStore } from '@/store/whaleStore'
import { calcRsi, calcMacd } from '@/lib/indicators'
import { MONITORED_COINS } from '@/lib/constants'

const KST_OFFSET = 9 * 3600 // UTC+9 초 단위 오프셋

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

export function CandleChart() {
  const { selectedCoin } = useWhaleStore()
  const coin = selectedCoin === 'ALL' ? MONITORED_COINS[0] : selectedCoin
  const [bar, setBar] = useState<Timeframe>('1m')

  const { data: bars = [] } = useCandles(coin, bar)

  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refs = useRef<Record<string, any>>({})

  // 차트 초기화 — 마운트 시 한 번만
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0c0f' },
        textColor: '#64748b',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e2330' },
        horzLines: { color: '#1e2330' },
      },
      crosshair: { mode: 1 },
      localization: {
        // crosshair tooltip 시간 → KST
        timeFormatter: (ts: number) => {
          const d = new Date((ts + KST_OFFSET) * 1000)
          return d.toISOString().slice(0, 16).replace('T', ' ')
        },
      },
      timeScale: {
        borderColor: '#1e2330',
        timeVisible: true,
        secondsVisible: false,
        // x축 눈금 라벨 → KST
        tickMarkFormatter: (ts: number) => {
          const d = new Date((ts + KST_OFFSET) * 1000)
          const hh = String(d.getUTCHours()).padStart(2, '0')
          const mm = String(d.getUTCMinutes()).padStart(2, '0')
          return `${hh}:${mm}`
        },
      },
      rightPriceScale: { borderColor: '#1e2330' },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#00c076',
      downColor: '#ff3b5c',
      borderUpColor: '#00c076',
      borderDownColor: '#ff3b5c',
      wickUpColor: '#00c076',
      wickDownColor: '#ff3b5c',
    }, 0)

    const rsi = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 1)

    const macdHist = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 2)

    const macdLine = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 2)

    const signalLine = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 2)

    // pane 비율: 캔들 60% · RSI 20% · MACD 20%
    const panes = chart.panes()
    if (panes[0]) panes[0].setStretchFactor(0.6)
    if (panes[1]) panes[1].setStretchFactor(0.2)
    if (panes[2]) panes[2].setStretchFactor(0.2)

    refs.current = { chart, candle, rsi, macdHist, macdLine, signalLine }

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        chart.resize(e.contentRect.width, e.contentRect.height)
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      refs.current = {}
    }
  }, [])

  // 데이터 업데이트
  useEffect(() => {
    const { candle, rsi, macdHist, macdLine, signalLine, chart } = refs.current
    if (!bars.length || !candle) return

    const closes = bars.map(b => b.close)
    const rsiVals = calcRsi(closes)
    const { macd, signal, histogram } = calcMacd(closes)

    candle.setData(
      bars.map(b => ({
        time: (b.ts / 1000) as number,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    )

    rsi.setData(
      bars
        .map((b, i) => ({ time: (b.ts / 1000) as number, value: rsiVals[i] }))
        .filter(d => !isNaN(d.value)),
    )

    macdHist.setData(
      bars
        .map((b, i) => ({
          time: (b.ts / 1000) as number,
          value: histogram[i],
          color: (histogram[i] ?? 0) >= 0 ? '#00c07666' : '#ff3b5c66',
        }))
        .filter(d => !isNaN(d.value)),
    )

    macdLine.setData(
      bars
        .map((b, i) => ({ time: (b.ts / 1000) as number, value: macd[i] }))
        .filter(d => !isNaN(d.value)),
    )

    signalLine.setData(
      bars
        .map((b, i) => ({ time: (b.ts / 1000) as number, value: signal[i] }))
        .filter(d => !isNaN(d.value)),
    )

    chart.timeScale().fitContent()
  }, [bars])

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
      >
        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          {coin}
          <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            RSI(14) · MACD(12,26,9)
          </span>
        </span>
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setBar(tf)}
              className="px-2 py-0.5 text-xs font-mono rounded transition-colors"
              style={{
                background: bar === tf ? 'var(--buy)' : 'transparent',
                color: bar === tf ? '#000' : 'var(--text-muted)',
                fontWeight: bar === tf ? 700 : 400,
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 컨테이너 */}
      <div ref={containerRef} className="flex-1" />

      {/* 범례 */}
      <div
        className="flex items-center gap-3 px-3 py-1 border-t shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
      >
        <LegendDot color="#f59e0b" label="RSI" />
        <LegendDot color="#3b82f6" label="MACD" />
        <LegendDot color="#ef4444" label="Signal" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </span>
  )
}
