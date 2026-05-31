import { NextResponse } from 'next/server'
import { getSwapTickers } from '@/lib/okx/public-api'
import { TickerInfo } from '@/types/whale'
import { MONITORED_COINS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await getSwapTickers()
    const monitoredSet = new Set(MONITORED_COINS.map(c => `${c}-USDT-SWAP`))

    const tickers: TickerInfo[] = raw
      .filter(t => monitoredSet.has(t.instId))
      .map(t => {
        const price = Number(t.last)
        const open = Number(t.open24h || t.sodUtc0)
        return {
          instId: t.instId,
          coin: t.instId.split('-')[0],
          price,
          change24h: price - open,
          changePct24h: open ? (price - open) / open : 0,
          vol24h: Number(t.volCcy24h),
        }
      })
      .sort((a, b) => MONITORED_COINS.indexOf(a.coin) - MONITORED_COINS.indexOf(b.coin))

    return NextResponse.json({ tickers, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
