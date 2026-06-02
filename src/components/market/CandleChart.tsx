'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts'
import { useCandles } from '@/hooks/useCandles'
import { useWhaleStore } from '@/store/whaleStore'
import { calcRsi, calcMacd } from '@/lib/indicators'
import { MONITORED_COINS } from '@/lib/constants'
import {
  detectFVGs,
  detectOrderBlocks,
  detectLiquidityLevels,
  generateICTSignals,
} from '@/lib/ict'
import { ZoneBoxesPrimitive, type ZoneBox } from '@/lib/ict-primitives'

const KST_OFFSET = 9 * 3600 // UTC+9 초 단위 오프셋

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

function formatVol(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(0)
}

export function CandleChart() {
  const { selectedCoin } = useWhaleStore()
  const coin = selectedCoin === 'ALL' ? MONITORED_COINS[0] : selectedCoin
  const [bar, setBar] = useState<Timeframe>('1m')

  const { data: bars = [] } = useCandles(coin, bar)
  const [ictEnabled, setIctEnabled] = useState(false)
  const [volLabel, setVolLabel] = useState<string | null>(null)

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

    // pane 0 — 캔들
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#00c076',
      downColor: '#ff3b5c',
      borderUpColor: '#00c076',
      borderDownColor: '#ff3b5c',
      wickUpColor: '#00c076',
      wickDownColor: '#ff3b5c',
    }, 0)

    // pane 1 — 거래량
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 1)

    // pane 2 — RSI
    const rsi = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 2)

    // pane 3 — MACD
    const macdHist = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 3)

    const macdLine = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 3)

    const signalLine = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 3)

    // pane 비율: 캔들 55% · Volume 15% · RSI 15% · MACD 15%
    const panes = chart.panes()
    if (panes[0]) panes[0].setStretchFactor(0.55)
    if (panes[1]) panes[1].setStretchFactor(0.15)
    if (panes[2]) panes[2].setStretchFactor(0.15)
    if (panes[3]) panes[3].setStretchFactor(0.15)

    // hover 시 거래량 수치 표시
    chart.subscribeCrosshairMove((param) => {
      const volSeries = refs.current.volume
      if (!volSeries) return
      const d = param.seriesData.get(volSeries) as { value: number } | undefined
      setVolLabel(d?.value != null ? formatVol(d.value) : null)
    })

    const seriesMarkers = createSeriesMarkers(candle, [])

    const ictPrimitive = new ZoneBoxesPrimitive()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(candle as any).attachPrimitive(ictPrimitive)

    refs.current = { chart, candle, volume, rsi, macdHist, macdLine, signalLine, seriesMarkers, ictPrimitive }

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
    const { candle, volume, rsi, macdHist, macdLine, signalLine, chart } = refs.current
    if (!bars.length || !candle) return

    const isNewContext = refs.current.lastCoin !== coin || refs.current.lastBar !== bar

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

    volume.setData(
      bars.map(b => ({
        time: (b.ts / 1000) as number,
        value: b.vol,
        color: b.close >= b.open ? '#00c07644' : '#ff3b5c44',
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

    if (isNewContext || !refs.current.initialized) {
      chart.timeScale().fitContent()
      refs.current.initialized = true
      refs.current.lastCoin = coin
      refs.current.lastBar = bar
    }
  }, [bars, coin, bar])

  // ICT 오버레이 업데이트 (bars 또는 ictEnabled 변경 시)
  useEffect(() => {
    const { seriesMarkers, ictPrimitive } = refs.current
    if (!seriesMarkers || !ictPrimitive) return

    seriesMarkers.setMarkers([])
    ictPrimitive.updateZones([])

    if (!ictEnabled || !bars.length) return

    // 현재가 기준 ±1.5% 범위 필터
    const currentPrice = bars[bars.length - 1].close
    const RANGE = 0.015
    const priceMin = currentPrice * (1 - RANGE)
    const priceMax = currentPrice * (1 + RANGE)
    const inRange = (price: number) => price >= priceMin && price <= priceMax
    const zoneInRange = (top: number, bottom: number) => top >= priceMin && bottom <= priceMax

    const zones: ZoneBox[] = []

    // FVG: 미충전 + 현재가 범위 내, 최근 4개
    const fvgs = detectFVGs(bars).filter(f => !f.filled && zoneInRange(f.top, f.bottom)).slice(-4)
    for (const fvg of fvgs) {
      zones.push({
        top: fvg.top,
        bottom: fvg.bottom,
        startTs: fvg.ts / 1000,
        color: fvg.type === 'bullish' ? '#3b82f6' : '#ef4444',
        alpha: 0.12,
        label: fvg.type === 'bullish' ? 'FVG↑' : 'FVG↓',
      })
    }

    // OB: 미위반 + 현재가 범위 내, 최근 3개
    const obs = detectOrderBlocks(bars).filter(o => !o.violated && zoneInRange(o.top, o.bottom)).slice(-3)
    for (const ob of obs) {
      zones.push({
        top: ob.top,
        bottom: ob.bottom,
        startTs: ob.ts / 1000,
        color: ob.type === 'bullish' ? '#f97316' : '#a855f7',
        alpha: 0.15,
        label: ob.type === 'bullish' ? 'OB↑' : 'OB↓',
      })
    }

    // 유동성 레벨: 미스윕 + 현재가 범위 내, 최근 4개 (얇은 박스로 표시)
    const TICK = currentPrice * 0.0004
    const levels = detectLiquidityLevels(bars, 10).filter(l => !l.swept && inRange(l.price)).slice(-4)
    for (const level of levels) {
      zones.push({
        top: level.price + TICK,
        bottom: level.price - TICK,
        startTs: level.ts / 1000,
        color: level.type === 'BSL' ? '#fbbf24' : '#22d3ee',
        alpha: 0.25,
        label: level.type,
      })
    }

    ictPrimitive.updateZones(zones)

    // 매수/매도 신호 마커 (createSeriesMarkers v5 API)
    const signals = generateICTSignals(bars)
    const markers = signals.map(s => ({
      time: s.ts / 1000 as number,
      position: s.type === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
      color: s.type === 'BUY' ? '#00c076' : '#ff3b5c',
      shape: s.type === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
      text: s.type === 'BUY'
        ? `BUY${s.strength === 'strong' ? '★' : ''}`
        : `SELL${s.strength === 'strong' ? '★' : ''}`,
      size: 1,
    }))
    seriesMarkers.setMarkers(markers)
  }, [bars, ictEnabled])

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
          {volLabel && (
            <span className="ml-1.5 text-xs" style={{ color: '#64748b' }}>
              · Vol: {volLabel}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5">
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
          <span style={{ color: 'var(--border)', fontSize: 10, margin: '0 2px' }}>|</span>
          <button
            onClick={() => setIctEnabled(v => !v)}
            className="px-2 py-0.5 text-xs font-mono rounded transition-colors"
            style={{
              background: ictEnabled ? '#f59e0b' : 'transparent',
              color: ictEnabled ? '#000' : 'var(--text-muted)',
              fontWeight: ictEnabled ? 700 : 400,
              border: ictEnabled ? 'none' : '1px solid var(--border)',
            }}
          >
            ICT
          </button>
        </div>
      </div>

      {/* 차트 컨테이너 */}
      <div ref={containerRef} className="flex-1" />

      {/* 범례 */}
      <div
        className="flex items-center gap-3 px-3 py-1 border-t shrink-0 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
      >
        <LegendDot color="#64748b" label="Vol" />
        <LegendDot color="#f59e0b" label="RSI" />
        <LegendDot color="#3b82f6" label="MACD" />
        <LegendDot color="#ef4444" label="Signal" />
        {ictEnabled && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
            <LegendLine color="#3b82f6" label="FVG↑" />
            <LegendLine color="#ef4444" label="FVG↓" />
            <LegendLine color="#f97316" label="OB↑" />
            <LegendLine color="#a855f7" label="OB↓" />
            <LegendLine color="#fbbf24" label="BSL" />
            <LegendLine color="#22d3ee" label="SSL" />
            <LegendDot color="#00c076" label="BUY" />
            <LegendDot color="#ff3b5c" label="SELL" />
          </>
        )}
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

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-3 shrink-0" style={{ height: 1, background: color, display: 'inline-block' }} />
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </span>
  )
}
