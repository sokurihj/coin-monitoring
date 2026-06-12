import { NextRequest, NextResponse } from 'next/server'
import { getCandles } from '@/lib/okx/public-api'
import { MONITORED_COINS } from '@/lib/constants'
import { CandleBar } from '@/types/whale'

export const dynamic = 'force-dynamic'

const VALID_COINS = new Set(MONITORED_COINS)

// OKX 기본 1D/1W는 UTC+8 기준 — 공식 차트와 맞추려면 UTC 변형 사용
const UTC_BAR_MAP: Record<string, string> = {
  '1D': '1Dutc', '2D': '2Dutc', '3D': '3Dutc',
  '1W': '1Wutc', '1M': '1Mutc',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const coin = searchParams.get('coin') ?? 'BTC'
  const bar = searchParams.get('bar') ?? '1m'

  if (!VALID_COINS.has(coin)) {
    return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
  }

  try {
    const instId = `${coin}-USDT-SWAP`
    const apiBar = UTC_BAR_MAP[bar] ?? bar
    const first = await getCandles(instId, apiBar, 300).catch(() => [])
    const oldest = first.at(-1)
    const second = oldest
      ? await getCandles(instId, apiBar, 300, Number(oldest[0])).catch(() => [])
      : []
    const raw = [...first, ...second]

    const bars: CandleBar[] = raw
      .filter(c => Number(c[1]) > 0) // open=0인 빈 봉 제거
      .map(c => ({
        ts: Number(c[0]),
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
        vol: Number(c[5]),
      }))

    // OKX는 최신 캔들이 앞에 오므로 시간순 정렬
    bars.sort((a, b) => a.ts - b.ts)

    return NextResponse.json({ bars, coin, bar, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
