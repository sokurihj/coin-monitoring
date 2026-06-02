import type { CandleBar } from '@/types/whale'

export interface FVG {
  type: 'bullish' | 'bearish'
  top: number
  bottom: number
  ts: number
  filled: boolean
}

export interface OrderBlock {
  type: 'bullish' | 'bearish'
  top: number
  bottom: number
  ts: number           // OB 캔들 자체의 타임스탬프
  confirmedTs: number  // OB를 확정한 엔겔핑 캔들의 타임스탬프
  violated: boolean
}

export interface LiquidityLevel {
  type: 'BSL' | 'SSL'
  price: number
  ts: number
  swept: boolean
}

export interface StructurePoint {
  type: 'BOS_UP' | 'BOS_DOWN' | 'CHOCH_UP' | 'CHOCH_DOWN'
  price: number
  ts: number
}

export interface ICTSignal {
  type: 'BUY' | 'SELL'
  strength: 'strong' | 'medium'
  price: number
  ts: number
  reasons: string[]
}

// 갭 크기가 가격의 0.3% 이상인 FVG만 유효
const MIN_FVG_RATIO = 0.003

// 세 캔들 사이 가격 불균형 구간 감지
export function detectFVGs(bars: CandleBar[]): FVG[] {
  const fvgs: FVG[] = []

  for (let i = 2; i < bars.length - 1; i++) {
    const c1 = bars[i - 2]
    const c2 = bars[i - 1]
    const c3 = bars[i]
    const refPrice = c2.close

    // Bullish FVG: 캔들1 고가 < 캔들3 저가
    if (c1.high < c3.low) {
      const top = c3.low
      const bottom = c1.high
      if ((top - bottom) / refPrice < MIN_FVG_RATIO) continue
      const mid = (top + bottom) / 2
      const filled = bars.slice(i + 1).some(b => b.close <= mid)
      fvgs.push({ type: 'bullish', top, bottom, ts: c2.ts, filled })
    }

    // Bearish FVG: 캔들1 저가 > 캔들3 고가
    if (c1.low > c3.high) {
      const top = c1.low
      const bottom = c3.high
      if ((top - bottom) / refPrice < MIN_FVG_RATIO) continue
      const mid = (top + bottom) / 2
      const filled = bars.slice(i + 1).some(b => b.close >= mid)
      fvgs.push({ type: 'bearish', top, bottom, ts: c2.ts, filled })
    }
  }

  return fvgs
}

// 다음 캔들이 현재 캔들 몸통을 덮으면 OB로 감지
export function detectOrderBlocks(bars: CandleBar[]): OrderBlock[] {
  const obs: OrderBlock[] = []

  for (let i = 0; i < bars.length - 1; i++) {
    const ob = bars[i]
    const next = bars[i + 1]
    const body = Math.abs(ob.close - ob.open)
    if (body === 0) continue

    // Bullish OB: 빨간 캔들을 다음 초록 캔들이 몸통까지 덮음
    if (ob.close < ob.open && next.close > ob.open) {
      const top = ob.open
      const bottom = ob.close
      const violated = bars.slice(i + 1).some(b => b.close < bottom)
      obs.push({ type: 'bullish', top, bottom, ts: ob.ts, confirmedTs: next.ts, violated })
    }

    // Bearish OB: 초록 캔들을 다음 빨간 캔들이 몸통까지 덮음
    if (ob.close > ob.open && next.close < ob.open) {
      const top = ob.close
      const bottom = ob.open
      const violated = bars.slice(i + 1).some(b => b.close > top)
      obs.push({ type: 'bearish', top, bottom, ts: ob.ts, confirmedTs: next.ts, violated })
    }
  }

  return obs
}

// 스윙 고/저점 기반 유동성 풀 감지 (lookback 캔들 기준)
export function detectLiquidityLevels(bars: CandleBar[], lookback = 15): LiquidityLevel[] {
  const levels: LiquidityLevel[] = []

  for (let i = lookback; i < bars.length - lookback; i++) {
    const bar = bars[i]

    // 스윙 고점 = BSL (매수측 유동성)
    const isSwingHigh =
      bars.slice(i - lookback, i).every(b => b.high < bar.high) &&
      bars.slice(i + 1, i + lookback + 1).every(b => b.high < bar.high)
    if (isSwingHigh) {
      const swept = bars.slice(i + 1).some(b => b.high > bar.high)
      levels.push({ type: 'BSL', price: bar.high, ts: bar.ts, swept })
    }

    // 스윙 저점 = SSL (매도측 유동성)
    const isSwingLow =
      bars.slice(i - lookback, i).every(b => b.low > bar.low) &&
      bars.slice(i + 1, i + lookback + 1).every(b => b.low > bar.low)
    if (isSwingLow) {
      const swept = bars.slice(i + 1).some(b => b.low < bar.low)
      levels.push({ type: 'SSL', price: bar.low, ts: bar.ts, swept })
    }
  }

  return levels
}

// 구조 돌파(BOS) 및 추세 전환(CHoCH) 감지
export function detectMarketStructure(bars: CandleBar[]): StructurePoint[] {
  const levels = detectLiquidityLevels(bars)
  const points: StructurePoint[] = []

  const highs = levels.filter(l => l.type === 'BSL').sort((a, b) => a.ts - b.ts)
  const lows = levels.filter(l => l.type === 'SSL').sort((a, b) => a.ts - b.ts)

  for (let i = 1; i < highs.length; i++) {
    if (highs[i].price > highs[i - 1].price) {
      points.push({ type: 'BOS_UP', price: highs[i].price, ts: highs[i].ts })
    }
  }

  for (let i = 1; i < lows.length; i++) {
    if (lows[i].price < lows[i - 1].price) {
      points.push({ type: 'BOS_DOWN', price: lows[i].price, ts: lows[i].ts })
    }
  }

  // 인접한 BOS 방향이 뒤바뀌면 CHoCH로 재분류
  const sorted = points.sort((a, b) => a.ts - b.ts)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].type === 'BOS_UP' && sorted[i].type === 'BOS_DOWN') {
      sorted[i] = { ...sorted[i], type: 'CHOCH_DOWN' }
    } else if (sorted[i - 1].type === 'BOS_DOWN' && sorted[i].type === 'BOS_UP') {
      sorted[i] = { ...sorted[i], type: 'CHOCH_UP' }
    }
  }

  return sorted.slice(-10)
}

// 현재 유효한 FVG/OB/레벨 기준으로 신호 생성 — 차트에 보이는 레벨과 일치
export function generateICTSignals(bars: CandleBar[]): ICTSignal[] {
  if (bars.length < 15) return []

  // 전체 봉 기준으로 한 번만 계산 — 현재 미충전/미위반/미스윕 레벨만 사용
  const allFvgs = detectFVGs(bars).filter(f => !f.filled)
  const allObs = detectOrderBlocks(bars).filter(o => !o.violated)
  const allLevels = detectLiquidityLevels(bars).filter(l => !l.swept)
  const structure = detectMarketStructure(bars)

  const signals: ICTSignal[] = []

  // 마지막 봉(현재 진행 중인 봉) 제외, 15봉부터 전체 검사
  for (let idx = 15; idx < bars.length - 1; idx++) {
    const bar = bars[idx]
    const buyReasons: string[] = []
    const sellReasons: string[] = []

    // 현재 미충전 FVG 중 이 봉 이전에 생성된 것에 접촉
    for (const fvg of allFvgs.filter(f => f.ts < bar.ts)) {
      if (fvg.type === 'bullish' && bar.low <= fvg.top && bar.high >= fvg.bottom) {
        if (!buyReasons.includes('FVG↑')) buyReasons.push('FVG↑')
      }
      if (fvg.type === 'bearish' && bar.high >= fvg.bottom && bar.low <= fvg.top) {
        if (!sellReasons.includes('FVG↓')) sellReasons.push('FVG↓')
      }
    }

    // 현재 미위반 OB 중 이 봉 이전에 확정된 것에 접촉 (엔겔핑 봉 마감 이후만 유효)
    for (const ob of allObs.filter(o => o.confirmedTs < bar.ts)) {
      if (ob.type === 'bullish' && bar.low <= ob.top && bar.high >= ob.bottom) {
        if (!buyReasons.includes('OB↑')) buyReasons.push('OB↑')
      }
      if (ob.type === 'bearish' && bar.high >= ob.bottom && bar.low <= ob.top) {
        if (!sellReasons.includes('OB↓')) sellReasons.push('OB↓')
      }
    }

    // 현재 미스윕 레벨 중 이 봉 이전에 생성된 것에 스윕
    for (const level of allLevels.filter(l => l.ts < bar.ts)) {
      if (level.type === 'SSL' && bar.low < level.price && bar.close > level.price) {
        if (!buyReasons.includes('SSL스윕')) buyReasons.push('SSL스윕')
      }
      if (level.type === 'BSL' && bar.high > level.price && bar.close < level.price) {
        if (!sellReasons.includes('BSL스윕')) sellReasons.push('BSL스윕')
      }
    }

    // 프리미엄/할인 구간 (이전 20봉 레인지 기준)
    const ctx = bars.slice(Math.max(0, idx - 20), idx)
    if (ctx.length >= 10) {
      const hi = Math.max(...ctx.map(b => b.high))
      const lo = Math.min(...ctx.map(b => b.low))
      const mid = (hi + lo) / 2
      if (bar.close < mid) buyReasons.push('할인구간')
      else sellReasons.push('프리미엄')
    }

    // 최근 BOS/CHoCH 방향 컨텍스트 (최근 20봉 이내만 유효)
    const bosLookbackTs = bars[Math.max(0, idx - 20)].ts
    const prevStructure = structure.filter(s => s.ts < bar.ts && s.ts >= bosLookbackTs)
    const lastBos = prevStructure[prevStructure.length - 1]
    if (lastBos?.type === 'BOS_UP' || lastBos?.type === 'CHOCH_UP') buyReasons.push('BOS↑')
    if (lastBos?.type === 'BOS_DOWN' || lastBos?.type === 'CHOCH_DOWN') sellReasons.push('BOS↓')

    // 컨플루언스 3개 이상 + FVG/OB 접촉 필수 + 캔들 방향 확인 (중복 신호 방지)
    const hasBuyZone = buyReasons.includes('FVG↑') || buyReasons.includes('OB↑')
    const hasSellZone = sellReasons.includes('FVG↓') || sellReasons.includes('OB↓')
    const alreadySignaled = signals.some(s => s.ts === bar.ts)
    if (!alreadySignaled) {
      if (buyReasons.length >= 3 && hasBuyZone && bar.close > bar.open) {
        signals.push({
          type: 'BUY',
          strength: buyReasons.length >= 4 ? 'strong' : 'medium',
          price: bar.close,
          ts: bar.ts,
          reasons: buyReasons,
        })
      } else if (sellReasons.length >= 3 && hasSellZone && bar.close < bar.open) {
        signals.push({
          type: 'SELL',
          strength: sellReasons.length >= 4 ? 'strong' : 'medium',
          price: bar.close,
          ts: bar.ts,
          reasons: sellReasons,
        })
      }
    }
  }

  return signals
}
