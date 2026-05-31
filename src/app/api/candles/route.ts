import { NextRequest, NextResponse } from 'next/server'
import { getCandles } from '@/lib/okx/public-api'
import { MONITORED_COINS } from '@/lib/constants'
import { CandleBar } from '@/types/whale'

export const dynamic = 'force-dynamic'

const VALID_COINS = new Set(MONITORED_COINS)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const coin = searchParams.get('coin') ?? 'BTC'
  const bar = searchParams.get('bar') ?? '1m'

  if (!VALID_COINS.has(coin)) {
    return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
  }

  try {
    const instId = `${coin}-USDT-SWAP`
    const raw = await getCandles(instId, bar, 100).catch(() => [])

    const bars: CandleBar[] = raw.map(c => ({
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
