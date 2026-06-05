'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  LineStyle,
} from 'lightweight-charts'
import { useCandles } from '@/hooks/useCandles'
import { useWhaleStore } from '@/store/whaleStore'
import { calcRsi, calcMacd } from '@/lib/indicators'
import { MONITORED_COINS } from '@/lib/constants'
import {
  detectFVGs,

  detectOrderBlocks,
  detectBreakerBlocks,
  detectLiquidityLevels,
  detectMarketStructure,
  generateICTSignals,
  type ICTSignal,
} from '@/lib/ict'
import { ZoneBoxesPrimitive, type ZoneBox } from '@/lib/ict-primitives'
import { useTradingLog } from '@/hooks/useTradingLog'
import { usePositions } from '@/hooks/usePositions'
import { useLimitOrders } from '@/hooks/useLimitOrders'
import { type TradingFill } from '@/types/trading'

const KST_OFFSET = 9 * 3600 // UTC+9 초 단위 오프셋

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

const PROXIMITY_RANGE: Record<Timeframe, number> = {
  '1m': 0.02, '5m': 0.02,
  '15m': 0.03, '1H': 0.03,
  '4H': 0.05, '1D': 0.05, '1W': 0.05,
}

// fill이 속하는 봉의 timestamp(초) 반환 — bars는 ts 오름차순
function findBarTs(fillTs: number, bars: { ts: number }[]): number | null {
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i].ts <= fillTs) return bars[i].ts / 1000
  }
  return null
}

function fmtPnl(pnl: number): string {
  const abs = Math.round(Math.abs(pnl))
  return pnl >= 0 ? `+$${abs}` : `-$${abs}`
}

type FillMarkerData = { time: number; fill: TradingFill }

function formatVol(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(0)
}

function formatPrice(v: number): string {
  if (v >= 10000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(2)
  return v.toFixed(4)
}

export function CandleChart() {
  const { selectedCoin } = useWhaleStore()
  const coin = selectedCoin === 'ALL' ? MONITORED_COINS[0] : selectedCoin
  const [bar, setBar] = useState<Timeframe>('1m')
  const barRef = useRef<Timeframe>('1m')
  const [proximityFilter, setProximityFilter] = useState(true)
  const [selectionBox, setSelectionBox] = useState<{ startX: number; endX: number } | null>(null)

  const { data: bars = [] } = useCandles(coin, bar)
  const { data: tradingData } = useTradingLog(coin)
  const { data: positionsData } = usePositions()
  const { data: limitOrdersData } = useLimitOrders()
  const [volLabel, setVolLabel] = useState<string | null>(null)
  const [ohlcLabel, setOhlcLabel] = useState<{ o: number; h: number; l: number; c: number } | null>(null)
  const [signalTooltip, setSignalTooltip] = useState<{ x: number; y: number; signal: ICTSignal } | null>(null)
  const [fillTooltip, setFillTooltip] = useState<{ x: number; y: number; fill: TradingFill } | null>(null)

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
      crosshair: { mode: 0 },
      handleScale: { mouseWheel: false },
      localization: {
        // crosshair tooltip 시간 → KST
        timeFormatter: (ts: number) => {
          const d = new Date((ts + KST_OFFSET) * 1000)
          if (barRef.current === '1D' || barRef.current === '1W') {
            return d.toISOString().slice(0, 10)
          }
          return d.toISOString().slice(0, 16).replace('T', ' ')
        },
      },
      timeScale: {
        borderColor: '#1e2330',
        timeVisible: true,
        secondsVisible: false,
        // x축 눈금 라벨 → KST (일봉/주봉은 날짜 형식)
        tickMarkFormatter: (ts: number) => {
          const d = new Date((ts + KST_OFFSET) * 1000)
          if (barRef.current === '1D' || barRef.current === '1W') {
            const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
            const dd = String(d.getUTCDate()).padStart(2, '0')
            return `${mo}/${dd}`
          }
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

    // hover 시 OHLC + 거래량 수치 표시
    chart.subscribeCrosshairMove((param) => {
      const { candle: candleSeries, volume: volSeries } = refs.current
      if (!volSeries) return
      const d = param.seriesData.get(volSeries) as { value: number } | undefined
      setVolLabel(d?.value != null ? formatVol(d.value) : null)

      if (candleSeries) {
        const cd = param.seriesData.get(candleSeries) as
          | { open: number; high: number; low: number; close: number }
          | undefined
        setOhlcLabel(cd ? { o: cd.open, h: cd.high, l: cd.low, c: cd.close } : null)
      }

      // 신호 마커 툴팁 (ICT 신호 우선, 없으면 fill 툴팁)
      const sigs = refs.current.signals as ICTSignal[] | undefined
      if (sigs && param.time != null && param.point) {
        const matched = sigs.find(s => s.ts / 1000 === param.time)
        if (matched) {
          setSignalTooltip({ x: param.point.x, y: param.point.y, signal: matched })
          setFillTooltip(null)
        } else {
          setSignalTooltip(null)
          const fms = refs.current.fillMarkers as FillMarkerData[] | undefined
          const matchedFill = fms?.find(fm => fm.time === param.time)
          setFillTooltip(matchedFill ? { x: param.point.x, y: param.point.y, fill: matchedFill.fill } : null)
        }
      } else {
        setSignalTooltip(null)
        setFillTooltip(null)
      }
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

    // 커스텀 휠 줌 — 커서 위치 기준으로 확대/축소, 한 틱에 35% 변화
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const ts = chart.timeScale()
      const range = ts.getVisibleLogicalRange()
      if (!range) return
      const factor = e.deltaY > 0 ? 1.35 : 1 / 1.35
      const logical = ts.coordinateToLogical(e.offsetX)
      if (logical !== null) {
        const fromRatio = (logical - range.from) / (range.to - range.from)
        const span = (range.to - range.from) * factor
        ts.setVisibleLogicalRange({ from: logical - fromRatio * span, to: logical + (1 - fromRatio) * span })
      } else {
        const mid = (range.from + range.to) / 2
        const half = (range.to - range.from) / 2 * factor
        ts.setVisibleLogicalRange({ from: mid - half, to: mid + half })
      }
    }

    // Shift+드래그 범위 줌
    const dragRef = { startX: 0, active: false }
    let prevRange: { from: number; to: number } | null = null

    const handleMouseDown = (e: MouseEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      dragRef.active = true
      dragRef.startX = e.offsetX
      prevRange = chart.timeScale().getVisibleLogicalRange() ?? null
      chart.applyOptions({ handleScroll: false })
      setSelectionBox({ startX: e.offsetX, endX: e.offsetX })
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.active) return
      setSelectionBox(prev => prev ? { ...prev, endX: e.offsetX } : null)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragRef.active) return
      dragRef.active = false
      chart.applyOptions({ handleScroll: true })
      const ts = chart.timeScale()
      const from = ts.coordinateToLogical(Math.min(dragRef.startX, e.offsetX))
      const to   = ts.coordinateToLogical(Math.max(dragRef.startX, e.offsetX))
      if (from !== null && to !== null && to > from + 1) {
        ts.setVisibleLogicalRange({ from, to })
      } else {
        prevRange = null
      }
      setSelectionBox(null)
    }

    const handleDblClick = () => {
      if (prevRange) {
        chart.timeScale().setVisibleLogicalRange(prevRange)
        prevRange = null
      } else {
        chart.timeScale().fitContent()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && containerRef.current) containerRef.current.style.cursor = 'crosshair'
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && containerRef.current) containerRef.current.style.cursor = ''
    }

    const el = containerRef.current
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('dblclick', handleDblClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('dblclick', handleDblClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      ro.disconnect()
      chart.remove()
      refs.current = {}
    }
  }, [])

  // 데이터 업데이트
  useEffect(() => {
    const { candle, volume, rsi, macdHist, macdLine, signalLine, chart } = refs.current
    if (!bars.length || !candle) return

    barRef.current = bar
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

  // ICT 오버레이 업데이트 (bars, 체결 내역, 근접 필터 변경 시)
  useEffect(() => {
    const { seriesMarkers, ictPrimitive } = refs.current
    if (!seriesMarkers || !ictPrimitive) return

    seriesMarkers.setMarkers([])
    ictPrimitive.updateZones([])
    refs.current.signals = []
    refs.current.fillMarkers = []

    if (!bars.length) {
      setSignalTooltip(null)
      setFillTooltip(null)
      return
    }

    const currentPrice = bars[bars.length - 1].close
    const range = proximityFilter ? PROXIMITY_RANGE[bar] : null
    const inRange = (top: number, bottom: number) =>
      !range || (top >= currentPrice * (1 - range) && bottom <= currentPrice * (1 + range))
    const zones: ZoneBox[] = []

    // FVG: 미충전 존 전체, 최근 4개
    const fvgs = detectFVGs(bars).filter(f => !f.filled).slice(-4)
    for (const fvg of fvgs) {
      if (!inRange(fvg.top, fvg.bottom)) continue
      zones.push({
        top: fvg.top,
        bottom: fvg.bottom,
        startTs: fvg.ts / 1000,
        color: '#ffffff',
        alpha: 0.08,
        label: fvg.type === 'bullish' ? 'FVG↑' : 'FVG↓',
      })
    }

    // OB: 미위반 존 전체, 최근 4개
    const obs = detectOrderBlocks(bars).filter(o => !o.violated).slice(-4)
    for (const ob of obs) {
      if (!inRange(ob.top, ob.bottom)) continue
      zones.push({
        top: ob.top,
        bottom: ob.bottom,
        startTs: ob.ts / 1000,
        color: ob.type === 'bullish' ? '#f97316' : '#a855f7',
        alpha: 0.15,
        label: ob.type === 'bullish' ? 'OB↑' : 'OB↓',
      })
    }

    // Breaker Block: 미소멸 존, 최근 4개
    const breakers = detectBreakerBlocks(bars).slice(-4)
    for (const bb of breakers) {
      if (!inRange(bb.top, bb.bottom)) continue
      zones.push({
        top: bb.top,
        bottom: bb.bottom,
        startTs: bb.ts / 1000,
        color: bb.type === 'bullish' ? '#00c076' : '#ff3b5c',
        alpha: 0.1,
        label: bb.type === 'bullish' ? 'BB↑' : 'BB↓',
      })
    }

    // 유동성 레벨: 0.3% 이내 클러스터 병합 후 최근 2개씩
    const allLevels = detectLiquidityLevels(bars, 15).filter(l => !l.swept)

    const bslSorted = allLevels.filter(l => l.type === 'BSL').sort((a, b) => b.price - a.price)
    const bslDeduped: typeof bslSorted = []
    for (const l of bslSorted) {
      const prev = bslDeduped[bslDeduped.length - 1]
      if (!prev || (prev.price - l.price) / prev.price > 0.003) bslDeduped.push(l)
    }

    const sslSorted = allLevels.filter(l => l.type === 'SSL').sort((a, b) => a.price - b.price)
    const sslDeduped: typeof sslSorted = []
    for (const l of sslSorted) {
      const prev = sslDeduped[sslDeduped.length - 1]
      if (!prev || (l.price - prev.price) / prev.price > 0.003) sslDeduped.push(l)
    }

    const levels = [...bslDeduped.slice(-2), ...sslDeduped.slice(-2)]
    for (const level of levels) {
      if (!inRange(level.price, level.price)) continue
      zones.push({
        top: level.price,
        bottom: level.price,
        startTs: level.ts / 1000,
        color: level.type === 'BSL' ? '#fbbf24' : '#22d3ee',
        alpha: 0.25,
        label: level.type,
        lineMode: true,
      })
    }

    // BOS/CHoCH 구조 라인: 최근 4개 (수평 점선으로 표시)
    const bosLabels: Record<string, string> = { BOS_UP: 'BOS↑', BOS_DOWN: 'BOS↓', CHOCH_UP: 'CHoCH↑', CHOCH_DOWN: 'CHoCH↓' }
    const structure = detectMarketStructure(bars).slice(-4)
    for (const pt of structure) {
      const isDown = pt.type === 'BOS_DOWN' || pt.type === 'CHOCH_DOWN'
      zones.push({
        top: pt.price,
        bottom: pt.price,
        startTs: pt.originTs / 1000,
        endTs: pt.ts / 1000,
        color: '#ffffff',
        alpha: 0.25,
        label: bosLabels[pt.type] ?? pt.type,
        lineMode: true,
        labelBelow: isDown,
      })
    }

    ictPrimitive.updateZones(zones)

    // 매수/매도 신호 마커 (createSeriesMarkers v5 API)
    const signals = generateICTSignals(bars)
    refs.current.signals = signals
    const ictMarkers = signals.map(s => ({
      time: s.ts / 1000 as number,
      position: s.type === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
      color: s.type === 'BUY' ? '#00c076' : '#ff3b5c',
      shape: s.type === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
      text: s.type === 'BUY'
        ? `BUY${s.strength === 'strong' ? '★' : ''}`
        : `SELL${s.strength === 'strong' ? '★' : ''}`,
      size: 1,
    }))

    // 체결 내역 → 포지션 마커
    const fills = tradingData?.fills ?? []
    const fillMarkersData: FillMarkerData[] = []
    const fillMarkers = fills.flatMap(f => {
      const time = findBarTs(f.ts, bars)
      if (time == null) return []

      let shape: 'arrowUp' | 'arrowDown' | 'circle'
      let color: string
      let position: 'belowBar' | 'aboveBar'
      let text: string

      if (f.side === 'buy' && f.posSide === 'long') {
        shape = 'arrowUp'; color = '#00c076'; position = 'belowBar'; text = 'L'
      } else if (f.side === 'sell' && f.posSide === 'short') {
        shape = 'arrowDown'; color = '#ff3b5c'; position = 'aboveBar'; text = 'S'
      } else if (f.side === 'sell' && f.posSide === 'long') {
        shape = 'circle'; color = f.pnl >= 0 ? '#00c076' : '#ff3b5c'; position = 'aboveBar'; text = fmtPnl(f.pnl)
      } else {
        // side=buy, posSide=short → short 청산
        shape = 'circle'; color = f.pnl >= 0 ? '#00c076' : '#ff3b5c'; position = 'belowBar'; text = fmtPnl(f.pnl)
      }

      fillMarkersData.push({ time, fill: f })
      return [{ time, shape, color, position, text, size: 1 as const }]
    })
    refs.current.fillMarkers = fillMarkersData

    // ICT 신호 + 포지션 마커 병합 (time 오름차순 필수)
    const allMarkers = [...ictMarkers, ...fillMarkers].sort((a, b) => (a.time as number) - (b.time as number))
    seriesMarkers.setMarkers(allMarkers)
  }, [bars, tradingData, proximityFilter, bar])

  // TP/SL 수평선 업데이트 (포지션 변경 시)
  useEffect(() => {
    const { candle } = refs.current
    if (!candle) return

    // 이전 라인 제거
    for (const line of refs.current.tpslLines ?? []) {
      candle.removePriceLine(line)
    }
    refs.current.tpslLines = []

    const positions = positionsData?.positions ?? []
    const coinPositions = positions.filter(p => p.coin === coin)
    const lines: ReturnType<typeof candle.createPriceLine>[] = []

    for (const pos of coinPositions) {
      if (pos.tpTriggerPx) {
        lines.push(candle.createPriceLine({
          price: pos.tpTriggerPx,
          color: '#00c076',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP (${pos.posSide === 'long' ? 'L' : 'S'})`,
        }))
      }
      if (pos.slTriggerPx) {
        lines.push(candle.createPriceLine({
          price: pos.slTriggerPx,
          color: '#ff3b5c',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL (${pos.posSide === 'long' ? 'L' : 'S'})`,
        }))
      }
    }

    refs.current.tpslLines = lines
  }, [positionsData, coin])

  // Limit 주문 수평선 업데이트
  useEffect(() => {
    const { candle } = refs.current
    if (!candle) return

    for (const line of refs.current.limitLines ?? []) {
      candle.removePriceLine(line)
    }
    refs.current.limitLines = []

    const orders = limitOrdersData?.orders ?? []
    const coinOrders = orders.filter(o => o.coin === coin)
    const lines: ReturnType<typeof candle.createPriceLine>[] = []

    for (const order of coinOrders) {
      const isOpen = (order.side === 'buy' && order.posSide === 'long') || (order.side === 'sell' && order.posSide === 'short')
      const dir = isOpen ? 'Open' : 'Close'
      const pos = order.posSide === 'long' ? 'L' : order.posSide === 'short' ? 'S' : (order.side === 'buy' ? 'B' : 'S')
      lines.push(candle.createPriceLine({
        price: order.price,
        color: '#00c076',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: order.posSide === 'net' ? `Limit (${pos})` : `${dir} ${pos}`,
      }))
    }

    refs.current.limitLines = lines
  }, [limitOrdersData, coin])

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
          {ohlcLabel && (
            <span className="ml-2 text-xs font-mono flex items-center gap-1">
              <span style={{ color: '#64748b' }}>O</span>
              <span style={{ color: ohlcLabel.c >= ohlcLabel.o ? '#00c076' : '#ff3b5c' }}>{formatPrice(ohlcLabel.o)}</span>
              <span style={{ color: '#64748b' }}>H</span>
              <span style={{ color: '#00c076' }}>{formatPrice(ohlcLabel.h)}</span>
              <span style={{ color: '#64748b' }}>L</span>
              <span style={{ color: '#ff3b5c' }}>{formatPrice(ohlcLabel.l)}</span>
              <span style={{ color: '#64748b' }}>C</span>
              <span style={{ color: ohlcLabel.c >= ohlcLabel.o ? '#00c076' : '#ff3b5c' }}>{formatPrice(ohlcLabel.c)}</span>
            </span>
          )}
          {volLabel && (
            <span className="ml-1.5 text-xs" style={{ color: '#64748b' }}>
              · Vol: {volLabel}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
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
          </div>
          <button
            onClick={() => setProximityFilter(p => !p)}
            className="px-1.5 py-0.5 text-xs font-mono rounded transition-colors"
            style={{
              background: proximityFilter ? 'var(--buy)' : 'transparent',
              color: proximityFilter ? '#000' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            ±{(PROXIMITY_RANGE[bar] * 100).toFixed(0)}%
          </button>
        </div>
      </div>

      {/* 차트 컨테이너 */}
      <div ref={containerRef} className="flex-1 relative">
        {selectionBox && (
          <div
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: Math.min(selectionBox.startX, selectionBox.endX),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.3)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
        {signalTooltip && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(signalTooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 120),
              top: Math.max(signalTooltip.y - 60, 4),
              background: 'rgba(10,12,15,0.95)',
              border: `1px solid ${signalTooltip.signal.type === 'BUY' ? '#00c076' : '#ff3b5c'}`,
              borderRadius: 4,
              padding: '4px 8px',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: 80,
            }}
          >
            <div
              className="text-xs font-mono font-bold mb-0.5"
              style={{ color: signalTooltip.signal.type === 'BUY' ? '#00c076' : '#ff3b5c' }}
            >
              {signalTooltip.signal.type}{signalTooltip.signal.strength === 'strong' ? '★' : ''}
            </div>
            {signalTooltip.signal.reasons.map(r => (
              <div key={r} className="text-xs font-mono" style={{ color: '#94a3b8' }}>{r}</div>
            ))}
          </div>
        )}
        {fillTooltip && (() => {
          const f = fillTooltip.fill
          const isEntry = (f.side === 'buy' && f.posSide === 'long') || (f.side === 'sell' && f.posSide === 'short')
          const label = isEntry
            ? `${f.posSide === 'long' ? 'LONG' : 'SHORT'} 진입`
            : `${f.posSide === 'long' ? 'LONG' : 'SHORT'} 청산`
          const color = isEntry
            ? (f.posSide === 'long' ? '#00c076' : '#ff3b5c')
            : (f.pnl >= 0 ? '#00c076' : '#ff3b5c')
          return (
            <div
              style={{
                position: 'absolute',
                left: Math.min(fillTooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 130),
                top: Math.max(fillTooltip.y - 60, 4),
                background: 'rgba(10,12,15,0.95)',
                border: `1px solid ${color}`,
                borderRadius: 4,
                padding: '4px 8px',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: 100,
              }}
            >
              <div className="text-xs font-mono font-bold mb-0.5" style={{ color }}>{label}</div>
              <div className="text-xs font-mono" style={{ color: '#94a3b8' }}>@{f.price.toLocaleString()}</div>
              {!isEntry && (
                <div className="text-xs font-mono font-bold" style={{ color }}>{fmtPnl(f.pnl)}</div>
              )}
            </div>
          )
        })()}
      </div>

      {/* 범례 */}
      <div
        className="flex items-center gap-3 px-3 py-1 border-t shrink-0 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
      >
        <LegendDot color="#64748b" label="Vol" />
        <LegendDot color="#f59e0b" label="RSI" />
        <LegendDot color="#3b82f6" label="MACD" />
        <LegendDot color="#ef4444" label="Signal" />
        <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
        <LegendLine color="#ffffff" label="FVG" />

        <LegendLine color="#f97316" label="OB↑" />
        <LegendLine color="#a855f7" label="OB↓" />
        <LegendLine color="#fbbf24" label="BSL" />
        <LegendLine color="#22d3ee" label="SSL" />
        <LegendDot color="#00c076" label="BUY" />
        <LegendDot color="#ff3b5c" label="SELL" />
        {tradingData?.available && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
            <LegendDot color="#00c076" label="L진입" />
            <LegendDot color="#ff3b5c" label="S진입" />
            <LegendDot color="#94a3b8" label="청산" />
          </>
        )}
        {positionsData?.available && positionsData.positions && positionsData.positions.some(p => p.coin === coin && (p.tpTriggerPx || p.slTriggerPx)) && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
            <LegendDash color="#00c076" label="TP" />
            <LegendDash color="#ff3b5c" label="SL" />
          </>
        )}
        {limitOrdersData?.available && limitOrdersData.orders && limitOrdersData.orders.some(o => o.coin === coin) && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
            <LegendDash color="#00c076" label="Limit" />
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

function LegendDash({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="w-3 shrink-0"
        style={{
          height: 1,
          background: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`,
          display: 'inline-block',
        }}
      />
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </span>
  )
}
