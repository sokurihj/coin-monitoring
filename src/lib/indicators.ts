// RSI, EMA, MACD 기술적 지표 계산

export function calcEma(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let ema = data[0]
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[0] : data[i] * k + ema * (1 - k)
    result.push(ema)
  }
  return result
}

// Wilder's smoothing EMA
export function calcRsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => NaN)

  const result: number[] = new Array(period).fill(NaN)

  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) avgGain += diff
    else avgLoss -= diff
  }
  avgGain /= period
  avgLoss /= period

  result.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-10)))

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period
    result.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-10)))
  }

  return result
}

export function calcMacd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = calcEma(closes, fast)
  const slowEma = calcEma(closes, slow)
  const macdLine = fastEma.map((v, i) => v - slowEma[i])

  // 충분한 데이터가 쌓인 시점(slow-1)부터 signal 계산
  const offset = slow - 1
  const signalInput = macdLine.slice(offset)
  const signalEma = calcEma(signalInput, signalPeriod)
  const signalLine = [...new Array(offset).fill(NaN), ...signalEma]

  const histogram = macdLine.map((v, i) =>
    isNaN(signalLine[i]) ? NaN : v - signalLine[i],
  )

  return { macd: macdLine, signal: signalLine, histogram }
}
