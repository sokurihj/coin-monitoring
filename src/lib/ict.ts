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

export interface BreakerBlock {
  type: 'bullish' | 'bearish'  // 전환된 방향 — 원래 OB와 반대
  top: number
  bottom: number
  ts: number           // 원래 OB 캔들 ts
  confirmedTs: number  // OB 확정 ts (엔겔핑 봉)
  breakerTs: number    // violation 유발 첫 번째 봉 ts
  mitigated: boolean
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
  ts: number        // 돌파 봉 타임스탬프
  originTs: number  // 깨진 스윙 원점 봉 타임스탬프
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
// 엔겔핑 캔들 몸통과 OB 캔들 몸통의 차이가 가격의 0.3% 이상인 OB만 유효
const MIN_OB_RATIO = 0.003

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
      const filled = bars.slice(i + 1).some(b => b.low <= bottom)
      fvgs.push({ type: 'bullish', top, bottom, ts: c2.ts, filled })
    }

    // Bearish FVG: 캔들1 저가 > 캔들3 고가
    if (c1.low > c3.high) {
      const top = c1.low
      const bottom = c3.high
      if ((top - bottom) / refPrice < MIN_FVG_RATIO) continue
      const filled = bars.slice(i + 1).some(b => b.high >= top)
      fvgs.push({ type: 'bearish', top, bottom, ts: c2.ts, filled })
    }
  }

  return fvgs
}


// 다음 캔들이 현재 캔들 몸통을 덮으면 OB로 감지
export function detectOrderBlocks(bars: CandleBar[]): OrderBlock[] {
  const obs: OrderBlock[] = []

  // bars.length - 2: next가 현재 진행 중인 봉(마지막)이 되지 않도록 제외
  for (let i = 0; i < bars.length - 2; i++) {
    const ob = bars[i]
    const next = bars[i + 1]
    const body = Math.abs(ob.close - ob.open)
    if (body === 0) continue
    const nextBody = Math.abs(next.close - next.open)
    if ((nextBody - body) / ob.close < MIN_OB_RATIO) continue

    // Bullish OB: 빨간 캔들을 다음 초록 캔들이 몸통까지 덮음 (next.open은 OB 몸통 안 또는 아래에서 시작)
    if (ob.close < ob.open && next.open <= ob.open && next.close > ob.open) {
      const top = ob.open
      const bottom = ob.close
      const violated = bars.slice(i + 1, -1).some(b => b.close < bottom)
      obs.push({ type: 'bullish', top, bottom, ts: ob.ts, confirmedTs: next.ts, violated })
    }

    // Bearish OB: 초록 캔들을 다음 빨간 캔들이 몸통까지 덮음 (next.open은 OB 몸통 안 또는 위에서 시작)
    if (ob.close > ob.open && next.open >= ob.open && next.close < ob.open) {
      const top = ob.close
      const bottom = ob.open
      const violated = bars.slice(i + 1, -1).some(b => b.close > top)
      obs.push({ type: 'bearish', top, bottom, ts: ob.ts, confirmedTs: next.ts, violated })
    }
  }

  return obs
}

// violated OB에서 파생 — 극성 반전 후 미소멸 존만 반환
export function detectBreakerBlocks(bars: CandleBar[]): BreakerBlock[] {
  const breakers: BreakerBlock[] = []

  for (const ob of detectOrderBlocks(bars)) {
    if (!ob.violated) continue

    const afterConfirm = bars.filter(b => b.ts > ob.confirmedTs)

    if (ob.type === 'bullish') {
      // Bullish OB violated → Bearish Breaker (저항으로 전환)
      const violator = afterConfirm.find(b => b.close < ob.bottom)
      if (!violator) continue
      const breakerTs = violator.ts
      const mitigated = bars.filter(b => b.ts > breakerTs).some(b => b.close > ob.top)
      if (!mitigated) {
        breakers.push({ type: 'bearish', top: ob.top, bottom: ob.bottom, ts: ob.ts, confirmedTs: ob.confirmedTs, breakerTs, mitigated })
      }
    } else {
      // Bearish OB violated → Bullish Breaker (지지로 전환)
      const violator = afterConfirm.find(b => b.close > ob.top)
      if (!violator) continue
      const breakerTs = violator.ts
      const mitigated = bars.filter(b => b.ts > breakerTs).some(b => b.close < ob.bottom)
      if (!mitigated) {
        breakers.push({ type: 'bullish', top: ob.top, bottom: ob.bottom, ts: ob.ts, confirmedTs: ob.confirmedTs, breakerTs, mitigated })
      }
    }
  }

  return breakers
}

// 스윙 고/저점 기반 유동성 풀 감지 (lookback 캔들 기준)
export function detectLiquidityLevels(bars: CandleBar[], leftLookback = 15, rightLookback = 5): LiquidityLevel[] {
  const levels: LiquidityLevel[] = []

  for (let i = leftLookback; i < bars.length - rightLookback; i++) {
    const bar = bars[i]

    // 스윙 고점 = BSL (매수측 유동성)
    const isSwingHigh =
      bars.slice(i - leftLookback, i).every(b => b.high < bar.high) &&
      bars.slice(i + 1, i + rightLookback + 1).every(b => b.high < bar.high)
    if (isSwingHigh) {
      const swept = bars.slice(i + 1).some(b => b.high > bar.high)
      levels.push({ type: 'BSL', price: bar.high, ts: bar.ts, swept })
    }

    // 스윙 저점 = SSL (매도측 유동성)
    const isSwingLow =
      bars.slice(i - leftLookback, i).every(b => b.low > bar.low) &&
      bars.slice(i + 1, i + rightLookback + 1).every(b => b.low > bar.low)
    if (isSwingLow) {
      const swept = bars.slice(i + 1).some(b => b.low < bar.low)
      levels.push({ type: 'SSL', price: bar.low, ts: bar.ts, swept })
    }
  }

  return levels
}

// 구조 돌파(BOS) 및 추세 전환(CHoCH) 감지
// 좌측 10봉 + 우측 5봉으로 스윙 확정 — 직전 상승/하락 구간의 꼭지/바닥을 기준으로 삼음
// - BOS: 현재 추세 방향과 같은 스윙 레벨 돌파 (추세 지속)
// - CHoCH: 현재 추세 반대 방향 스윙 레벨 돌파 (추세 반전)
export function detectMarketStructure(bars: CandleBar[]): StructurePoint[] {
  const points: StructurePoint[] = []
  const leftLookback = 10
  const rightLookback = 5

  let lastSwingHigh: { price: number; ts: number } | null = null
  let lastSwingLow: { price: number; ts: number } | null = null
  let trend: 'up' | 'down' | null = null
  let peakInDowntrend: { price: number; ts: number } | null = null
  let valleyInUptrend: { price: number; ts: number } | null = null

  // 루프 밖 초기 봉(0~leftLookback-1)도 포함해 누적 최고/최저 추적
  // → 루프가 leftLookback부터 시작해도 그 이전 꼭지/바닥을 놓치지 않음
  let runningMaxHigh: { price: number; ts: number } | null = null
  let runningMinLow: { price: number; ts: number } | null = null
  for (let j = 0; j < Math.min(leftLookback, bars.length); j++) {
    if (runningMaxHigh === null || bars[j].high > runningMaxHigh.price)
      runningMaxHigh = { price: bars[j].high, ts: bars[j].ts }
    if (runningMinLow === null || bars[j].low < runningMinLow.price)
      runningMinLow = { price: bars[j].low, ts: bars[j].ts }
  }

  for (let i = leftLookback; i < bars.length - rightLookback; i++) {
    const bar = bars[i]
    const left = bars.slice(i - leftLookback, i)
    const right = bars.slice(i + 1, i + 1 + rightLookback)

    // 구조 체크 전 누적 최고/최저 업데이트
    if (runningMaxHigh === null || bar.high > runningMaxHigh.price)
      runningMaxHigh = { price: bar.high, ts: bar.ts }
    if (runningMinLow === null || bar.low < runningMinLow.price)
      runningMinLow = { price: bar.low, ts: bar.ts }

    // 구조 돌파 — 봉당 하나만 발동 (if-else 체인)
    if (trend === 'down' && peakInDowntrend !== null && bar.close > peakInDowntrend.price) {
      // CHoCH_UP: 하락 추세에서 원래 꼭지를 몸통 돌파 → 추세 반전
      points.push({ type: 'CHOCH_UP', price: peakInDowntrend.price, ts: bar.ts, originTs: peakInDowntrend.ts })
      trend = 'up'
      lastSwingHigh = null
      peakInDowntrend = null
      runningMaxHigh = null  // 새 상승 추세 시작: 이후 최고점 누적 리셋
      if (lastSwingLow === null) lastSwingLow = { price: bar.low, ts: bar.ts }
      valleyInUptrend = lastSwingLow
    } else if (trend !== 'down' && lastSwingHigh !== null && bar.close > lastSwingHigh.price) {
      // BOS_UP: 직전 스윙 고점 돌파 → 추세 지속
      points.push({ type: 'BOS_UP', price: lastSwingHigh.price, ts: bar.ts, originTs: lastSwingHigh.ts })
      trend = 'up'
      lastSwingHigh = null
      runningMaxHigh = null  // 새 상승 추세 시작: 이후 최고점 누적 리셋
      if (lastSwingLow === null) lastSwingLow = { price: bar.low, ts: bar.ts }
      valleyInUptrend = lastSwingLow
    } else if (trend === 'up' && valleyInUptrend !== null && bar.close < valleyInUptrend.price) {
      // CHoCH_DOWN: 상승 추세에서 원래 바닥을 몸통 돌파 → 추세 반전
      points.push({ type: 'CHOCH_DOWN', price: valleyInUptrend.price, ts: bar.ts, originTs: valleyInUptrend.ts })
      trend = 'down'
      lastSwingLow = null
      valleyInUptrend = null
      runningMinLow = null  // 새 하락 추세 시작: 이후 최저점 누적 리셋
      if (lastSwingHigh === null) lastSwingHigh = { price: bar.high, ts: bar.ts }
      peakInDowntrend = runningMaxHigh ?? lastSwingHigh
    } else if (trend !== 'up' && lastSwingLow !== null && bar.close < lastSwingLow.price) {
      // BOS_DOWN: 직전 스윙 저점 돌파 → 추세 지속
      points.push({ type: 'BOS_DOWN', price: lastSwingLow.price, ts: bar.ts, originTs: lastSwingLow.ts })
      trend = 'down'
      lastSwingLow = null
      runningMinLow = null  // 새 하락 추세 시작: 이후 최저점 누적 리셋
      if (lastSwingHigh === null) lastSwingHigh = { price: bar.high, ts: bar.ts }
      peakInDowntrend = runningMaxHigh ?? lastSwingHigh
    }

    // 스윙 고점 확정 (항상 최신으로 업데이트)
    if (left.every(b => b.high < bar.high) && right.every(b => b.high < bar.high)) {
      lastSwingHigh = { price: bar.high, ts: bar.ts }
      if (trend === 'down' && (peakInDowntrend === null || bar.high > peakInDowntrend.price)) {
        peakInDowntrend = { price: bar.high, ts: bar.ts }
      }
    }

    // 스윙 저점 확정 (항상 최신으로 업데이트)
    if (left.every(b => b.low > bar.low) && right.every(b => b.low > bar.low)) {
      lastSwingLow = { price: bar.low, ts: bar.ts }
      if (trend === 'up' && (valleyInUptrend === null || bar.low < valleyInUptrend.price)) {
        valleyInUptrend = { price: bar.low, ts: bar.ts }
      }
    }
  }

  return points.slice(-10)
}

// 봉 마감 시점 기준으로 신호 생성 — 각 봉을 그 당시 상황(bars[0..idx])으로 평가해 소급 방지
export function generateICTSignals(bars: CandleBar[]): ICTSignal[] {
  if (bars.length < 15) return []

  const signals: ICTSignal[] = []

  // 마지막 봉(현재 진행 중인 봉) 제외, 15봉부터 검사
  for (let idx = 15; idx < bars.length - 1; idx++) {
    const bar = bars[idx]
    // 이 봉이 마감된 시점까지의 데이터로만 레벨 계산 (소급 방지)
    const sub = bars.slice(0, idx + 1)
    const fvgs = detectFVGs(sub).filter(f => !f.filled)
    const obs = detectOrderBlocks(sub).filter(o => !o.violated)
    const levels = detectLiquidityLevels(sub).filter(l => !l.swept)

    const buyReasons: string[] = []
    const sellReasons: string[] = []
    const prevBar = bars[idx - 1]

    // 이 봉 이전에 생성된 미충전 FVG에 접촉 (이전 봉이 이미 접촉 중이면 새 진입 아님 → 제외)
    for (const fvg of fvgs.filter(f => f.ts < bar.ts)) {
      if (fvg.type === 'bullish' && bar.low <= fvg.top && bar.high >= fvg.bottom) {
        const prevTouching = prevBar && prevBar.low <= fvg.top && prevBar.high >= fvg.bottom
        if (!prevTouching && !buyReasons.includes('FVG↑')) buyReasons.push('FVG↑')
      }
      if (fvg.type === 'bearish' && bar.high >= fvg.bottom && bar.low <= fvg.top) {
        const prevTouching = prevBar && prevBar.high >= fvg.bottom && prevBar.low <= fvg.top
        if (!prevTouching && !sellReasons.includes('FVG↓')) sellReasons.push('FVG↓')
      }
    }

    // 이 봉 이전에 확정된 미위반 OB에 접촉
    for (const ob of obs.filter(o => o.confirmedTs < bar.ts)) {
      if (ob.type === 'bullish' && bar.low <= ob.top && bar.high >= ob.bottom) {
        if (!buyReasons.includes('OB↑')) buyReasons.push('OB↑')
      }
      if (ob.type === 'bearish' && bar.high >= ob.bottom && bar.low <= ob.top) {
        if (!sellReasons.includes('OB↓')) sellReasons.push('OB↓')
      }
    }

    // 이 봉 이전에 확정된 미소멸 Breaker Block에 접촉
    const breakers = detectBreakerBlocks(sub)
    for (const bb of breakers.filter(b => b.breakerTs < bar.ts)) {
      if (bb.type === 'bullish' && bar.low <= bb.top && bar.high >= bb.bottom) {
        if (!buyReasons.includes('BB↑')) buyReasons.push('BB↑')
      }
      if (bb.type === 'bearish' && bar.high >= bb.bottom && bar.low <= bb.top) {
        if (!sellReasons.includes('BB↓')) sellReasons.push('BB↓')
      }
    }

    // 이 봉 이전에 생성된 미스윕 레벨 스윕
    for (const level of levels.filter(l => l.ts < bar.ts)) {
      if (level.type === 'SSL' && bar.low < level.price && bar.close > level.price) {
        if (!buyReasons.includes('SSL스윕')) buyReasons.push('SSL스윕')
      }
      if (level.type === 'BSL' && bar.high > level.price && bar.close < level.price) {
        if (!sellReasons.includes('BSL스윕')) sellReasons.push('BSL스윕')
      }
    }

    // 컨플루언스 3개 이상 + FVG/OB 접촉 필수 + 캔들 방향 확인 (중복 신호 방지)
    const hasBuyZone = buyReasons.includes('FVG↑') || buyReasons.includes('OB↑') || buyReasons.includes('BB↑')
    const hasSellZone = sellReasons.includes('FVG↓') || sellReasons.includes('OB↓') || sellReasons.includes('BB↓')
    const alreadySignaled = signals.some(s => s.ts === bar.ts)
    if (!alreadySignaled) {
      if (buyReasons.length >= 3 && hasBuyZone) {
        signals.push({
          type: 'BUY',
          strength: buyReasons.length >= 4 ? 'strong' : 'medium',
          price: bar.close,
          ts: bar.ts,
          reasons: buyReasons,
        })
      } else if (sellReasons.length >= 3 && hasSellZone) {
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
